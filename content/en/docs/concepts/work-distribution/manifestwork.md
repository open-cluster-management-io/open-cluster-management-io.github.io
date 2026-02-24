---
title: ManifestWork
weight: 1
aliases:
  - /concepts/manifestwork/
  - /docs/concepts/manifestwork/
---



## What is `ManifestWork`

`ManifestWork` is used to define a group of Kubernetes resources on the hub to be applied to the managed cluster. In the open-cluster-management project, a `ManifestWork` resource must be created in the cluster namespace. A work agent implemented in [work](https://github.com/open-cluster-management-io/ocm/tree/main/cmd/work) project is run on the managed cluster and monitors the `ManifestWork` resource in the cluster namespace on the hub cluster.

An example of `ManifestWork` to deploy a deployment to the managed cluster is shown in the following example.

```yaml
apiVersion: work.open-cluster-management.io/v1
kind: ManifestWork
metadata:
  namespace: <target managed cluster>
  name: hello-work-demo
spec:
  workload:
    manifests:
      - apiVersion: apps/v1
        kind: Deployment
        metadata:
          name: hello
          namespace: default
        spec:
          selector:
            matchLabels:
              app: hello
          template:
            metadata:
              labels:
                app: hello
            spec:
              containers:
                - name: hello
                  image: quay.io/asmacdo/busybox
                  command:
                    ["sh", "-c", 'echo "Hello, Kubernetes!" && sleep 3600']
```

## Status tracking

Work agent will track all the resources defined in `ManifestWork` and update its status. There are two types of status in manifestwork. The `resourceStatus` tracks the status of each manifest in the `ManifestWork` and `conditions` reflects the overall status of the `ManifestWork`. Work agent currently checks whether a resource is `Available`, meaning the resource exists on the managed cluster, and `Applied` means the resource defined in `ManifestWork` has been applied to the managed cluster.

Here is an example.

```yaml
apiVersion: work.open-cluster-management.io/v1
kind: ManifestWork
metadata: ...
spec: ...
status:
  conditions:
    - lastTransitionTime: "2021-06-15T02:26:02Z"
      message: Apply manifest work complete
      reason: AppliedManifestWorkComplete
      status: "True"
      type: Applied
    - lastTransitionTime: "2021-06-15T02:26:02Z"
      message: All resources are available
      reason: ResourcesAvailable
      status: "True"
      type: Available
  resourceStatus:
    manifests:
      - conditions:
          - lastTransitionTime: "2021-06-15T02:26:02Z"
            message: Apply manifest complete
            reason: AppliedManifestComplete
            status: "True"
            type: Applied
          - lastTransitionTime: "2021-06-15T02:26:02Z"
            message: Resource is available
            reason: ResourceAvailable
            status: "True"
            type: Available
        resourceMeta:
          group: apps
          kind: Deployment
          name: hello
          namespace: default
          ordinal: 0
          resource: deployments
          version: v1
```

### Fine-grained field values tracking

Optionally, we can let the work agent aggregate and report certain fields from
the distributed resources to the hub clusters by setting `FeedbackRule` for
the `ManifestWork`:

```yaml
apiVersion: work.open-cluster-management.io/v1
kind: ManifestWork
metadata: ...
spec:
  workload: ...
  manifestConfigs:
    - resourceIdentifier:
        group: apps
        resource: deployments
        namespace: default
        name: hello
      feedbackRules:
        - type: WellKnownStatus
        - type: JSONPaths
          jsonPaths:
            - name: isAvailable
              path: '.status.conditions[?(@.type=="Available")].status'
```

The feedback rules prescribe the work agent to periodically get the latest
states of the resources, and scrape merely those expected fields from them,
which is helpful for trimming the payload size of the status. Note that the
collected feedback values on the `ManifestWork` will not be updated unless
the latest value is changed/different from the previous recorded value.
Currently, it supports two kinds of `FeedbackRule`:

- `WellKnownStatus`: Using the pre-built template of feedback values for those
  well-known kubernetes resources.
- `JSONPaths`: A valid [Kubernetes JSON-Path](https://kubernetes.io/docs/reference/kubectl/jsonpath/)
  that selects a scalar field from the resource. Currently supported types are
  **Integer**, **String**, **Boolean** and **JsonRaw**. **JsonRaw** returns only when you have enabled
  the RawFeedbackJsonString feature gate on the agent. The agent will return the whole structure as a
  JSON string.

The default feedback value scraping interval is 30 second, and we can override
it by setting `--status-sync-interval` on your work agent. Too short period can
cause excessive burden to the control plane of the managed cluster, so generally
a recommended lower bound for the interval is 5 second.

### Feedback scrape types

By default, the work agent uses a polling mechanism to periodically scrape feedback values from resources.
You can configure the feedback collection mode using the `feedbackScrapeType` field in `manifestConfigs`.
There are two available modes:

- `Poll` (default): Periodically scrapes resource status at the interval specified by `--status-sync-interval` (default 30 seconds). This mode has lower overhead but provides delayed updates.
- `Watch`: Uses Kubernetes watch API with dynamic informer registration to get real-time status updates whenever the resource changes. This mode provides immediate feedback but requires more resources on the managed cluster.

Here is an example configuring watch-based feedback for a deployment:

```yaml
apiVersion: work.open-cluster-management.io/v1
kind: ManifestWork
metadata: ...
spec:
  workload: ...
  manifestConfigs:
    - resourceIdentifier:
        group: apps
        resource: deployments
        namespace: default
        name: hello
      feedbackScrapeType: Watch
      feedbackRules:
        - type: WellKnownStatus
```

**Important considerations for Watch mode:**

- Watch mode creates informers for each watched resource, which consumes more memory and API server connections on the managed cluster
- The work agent has a configurable limit on the maximum number of concurrent watches (controlled by the `--max-feedback-watch` flag)
- If the watch limit is reached, additional resources will automatically fall back to Poll mode
- Watch mode is recommended for resources that change frequently and require real-time status updates
- Poll mode is recommended for resources that change infrequently or when managing a large number of resources

When a `ManifestWork` is deleted or when `feedbackScrapeType` changes from Watch to Poll, the work agent automatically cleans up the associated informers to free resources.

In the end, the scraped values from feedback rules will be shown in the status:

```yaml
apiVersion: work.open-cluster-management.io/v1
kind: ManifestWork
metadata: ...
spec: ...
status:
  resourceStatus:
    manifests:
    - conditions: ...
      resourceMeta: ...
      statusFeedback:
        values:
        - fieldValue:
            integer: 1
            type: Integer
          name: ReadyReplicas
        - fieldValue:
            integer: 1
            type: Integer
          name: Replicas
        - fieldValue:
            integer: 1
            type: Integer
          name: AvailableReplicas
        - fieldValue:
            string: "True"
            type: String
          name: isAvailable
```

## Workload Completion

The workload completion feature allows `ManifestWork` to track when certain workloads have
completed their execution and optionally perform automatic garbage collection. This is particularly
useful for workloads that are expected to run once and then be cleaned up, such as Jobs or Pods with
specific restart policies.

### Overview

OCM traditionally recreates any resources that get deleted from managed clusters as long
as the `ManifestWork` exists. However, for workloads like Jobs with `ttlSecondsAfterFinished` or
Pods that exit and get cleaned up by cluster-autoscaler, this behavior is often undesirable.
The workload completion feature addresses this by:

- Tracking completion status of workloads using condition rules
- Preventing updates to completed workloads
- Optionally garbage collecting the entire `ManifestWork` after completion
- Supporting both well-known Kubernetes resources and custom completion logic

### Condition Rules

Condition rules are configured in the `manifestConfigs` section to define how completion should
be determined for specific manifests. You can specify condition rules using the `conditionRules` field:

```yaml
apiVersion: work.open-cluster-management.io/v1
kind: ManifestWork
metadata:
  namespace: cluster1
  name: example-job
spec:
  workload:
    manifests:
      - apiVersion: batch/v1
        kind: Job
        metadata:
          name: pi-calculation
          namespace: default
        spec:
          manualSelector: true
          selector:
            matchLabels:
              job: pi-calculation
          template:
            metadata:
              labels:
                job: pi-calculation
            spec:
              containers:
              - name: pi
                image: perl:5.34.0
                command: ["perl", "-Mbignum=bpi", "-wle", "print bpi(2000)"]
              restartPolicy: Never
          backoffLimit: 4
  manifestConfigs:
    - resourceIdentifier:
        group: batch
        resource: jobs
        namespace: default
        name: pi-calculation
      conditionRules:
        - type: WellKnownConditions
          condition: Complete
```

### Well-Known Completions

For common Kubernetes resources, you can use the `WellKnownConditions` type which provides
built-in completion logic:

**Job Completion**: A Job is considered complete when it has a condition of type `Complete` or `Failed`
with status `True`.

**Pod Completion**: A Pod is considered complete when its phase is `Succeeded` or `Failed`.

```yaml
manifestConfigs:
  - resourceIdentifier:
      group: batch
      resource: jobs
      namespace: default
      name: my-job
    conditionRules:
      - type: WellKnownConditions
        condition: Complete
```

### Custom CEL Expressions

For custom resources or more complex completion logic, you can use CEL (Common Expression Language) expressions:

```yaml
manifestConfigs:
  - resourceIdentifier:
      group: example.com
      resource: mycustomresources
      namespace: default
      name: my-custom-resource
    conditionRules:
      - condition: Complete
        type: CEL
        celExpressions:
          - |
            object.status.conditions.filter(
              c, c.type == 'Complete' || c.type == 'Failed'
            ).exists(
              c, c.status == 'True'
            )
        messageExpression: |
          result ? "Custom resource is complete" : "Custom resource is not complete"
```

In CEL expressions:
- `object`: The current instance of the manifest
- `result`: Boolean result of the CEL expressions (available in messageExpression)

### TTL and Automatic Garbage Collection

You can enable automatic garbage collection of the entire `ManifestWork` after all workloads
with completion rules have finished by setting `ttlSecondsAfterFinished` in the `deleteOption`:

```yaml
apiVersion: work.open-cluster-management.io/v1
kind: ManifestWork
metadata:
  namespace: cluster1
  name: job-with-cleanup
spec:
  deleteOption:
    ttlSecondsAfterFinished: 300  # Delete 5 minutes after completion
  workload:
    manifests:
      - apiVersion: batch/v1
        kind: Job
        # ... job specification
  manifestConfigs:
    - resourceIdentifier:
        group: batch
        resource: jobs
        namespace: default
        name: my-job
      conditionRules:
        - type: WellKnownConditions
          condition: Complete
```

**Important Notes:**
- If `ttlSecondsAfterFinished` is set but no completion rules are defined, the `ManifestWork` will never be considered finished
- If completion rules are set but no TTL is specified, the `ManifestWork` will complete but not be automatically deleted
- Setting `ttlSecondsAfterFinished: 0` makes the `ManifestWork` eligible for immediate deletion after completion

### Completion Behavior

Once a manifest is marked as completed:

1. **No Further Updates**: The work agent will no longer update or recreate the completed manifest, even if the `ManifestWork` specification changes
2. **ManifestWork Completion**: When all manifests with completion rules have completed, the entire `ManifestWork` is considered complete
3. **Mixed Completion**: If you want some manifests to complete but not the entire `ManifestWork`, set a completion rule with CEL expression `false` for at least one other manifest

### Status Tracking

Completion status is reflected in both manifest-level and `ManifestWork`-level conditions:

```yaml
status:
  conditions:
    - lastTransitionTime: "2025-02-20T18:53:40Z"
      message: "Job is finished"
      reason: "ConditionRulesAggregated"
      status: "True"
      type: Complete
  resourceStatus:
    manifests:
      - conditions:
          - lastTransitionTime: "2025-02-20T19:12:22Z"
            message: "Job is finished"
            reason: "ConditionRuleEvaluated"
            status: "True"
            type: Complete
        resourceMeta:
          group: batch
          kind: Job
          name: pi-calculation
          namespace: default
          ordinal: 0
          resource: jobs
          version: v1
```

All conditions with the same type from manifest-level are aggregated to `ManifestWork`-level status.conditions.

### Multiple Condition Types

You can define multiple condition rules for different condition types on the same manifest:

```yaml
manifestConfigs:
  - resourceIdentifier:
      group: example.com
      resource: mycustomresources
      namespace: default
      name: my-resource
    conditionRules:
      - condition: Complete
        type: CEL
        celExpressions:
          - expression: |
              object.status.conditions.exists(
                c, c.type == 'Complete' && c.status == 'True'
              )
        messageExpression: |
          result ? "Resource completed successfully" : "Resource not complete"
      - condition: Initialized
        type: CEL
        celExpressions:
          - expression: |
              object.status.conditions.exists(
                c, c.type == 'Initialized' && c.status == 'True'
              )
        messageExpression: |
          result ? "Resource is initialized" : "Resource not initialized"
```

### Examples

**Run a Job once without cleanup:**

```yaml
apiVersion: work.open-cluster-management.io/v1
kind: ManifestWork
metadata:
  namespace: cluster1
  name: one-time-job
spec:
  workload:
    manifests:
      - apiVersion: batch/v1
        kind: Job
        metadata:
          name: data-migration
          namespace: default
        spec:
          template:
            spec:
              containers:
              - name: migrator
                image: my-migration-tool:latest
                command: ["./migrate-data.sh"]
              restartPolicy: Never
  manifestConfigs:
    - resourceIdentifier:
        group: batch
        resource: jobs
        namespace: default
        name: data-migration
      conditionRules:
        - type: WellKnownConditions
          condition: Complete
```

**Run a Job and clean up after 30 seconds:**

```yaml
apiVersion: work.open-cluster-management.io/v1
kind: ManifestWork
metadata:
  namespace: cluster1
  name: temp-job-with-cleanup
spec:
  deleteOption:
    ttlSecondsAfterFinished: 30
  workload:
    manifests:
      - apiVersion: batch/v1
        kind: Job
        metadata:
          name: temp-task
          namespace: default
        spec:
          template:
            spec:
              containers:
              - name: worker
                image: busybox:latest
                command: ["echo", "Task completed"]
              restartPolicy: Never
  manifestConfigs:
    - resourceIdentifier:
        group: batch
        resource: jobs
        namespace: default
        name: temp-task
      conditionRules:
        - type: WellKnownConditions
          condition: Complete
```

## Garbage collection

To ensure the resources applied by `ManifestWork` are reliably recorded, the work agent creates an `AppliedManifestWork` on the managed cluster for each `ManifestWork` as an anchor for resources relating to `ManifestWork`. When `ManifestWork` is deleted, work agent runs a `Foreground deletion`, that `ManifestWork` will stay in deleting state until all its related resources has been fully cleaned in the managed cluster.

### Delete options

User can explicitly choose not to garbage collect the applied resources when a `ManifestWork` is deleted. The user should specify the `deleteOption` in the `ManifestWork`. By default, `deleteOption` is set as `Foreground`
which means the applied resources on the spoke will be deleted with the removal of `ManifestWork`. User can set it to
`Orphan` so the applied resources will not be deleted. Here is an example:

```yaml
apiVersion: work.open-cluster-management.io/v1
kind: ManifestWork
metadata: ...
spec:
  workload: ...
  deleteOption:
    propagationPolicy: Orphan
```

Alternatively, user can also specify a certain resource defined in the `ManifestWork` to be orphaned by setting the
`deleteOption` to be `SelectivelyOrphan`. Here is an example with `SelectivelyOrphan` specified. It ensures the removal of deployment resource specified in the `ManifestWork` while the service resource is kept.

```yaml
apiVersion: work.open-cluster-management.io/v1
kind: ManifestWork
metadata:
  name: selective-delete-work
spec:
  workload: ...
  deleteOption:
    propagationPolicy: SelectivelyOrphan
    selectivelyOrphans:
      orphaningRules:
      - group: ""
        resource: services
        namespace: default
        name: helloworld
```

## Resource Race and Adoption

It is possible to create two `ManifestWorks` for the same cluster with the same resource defined.
For example, the user can create two `Manifestworks` on cluster1, and both `Manifestworks` have the
deployment resource `hello` in default namespace. If the content of the resource is different, the
two `ManifestWorks` will fight, and it is desired since each `ManifestWork` is treated as equal and
each `ManifestWork` is declaring the ownership of the resource. If there is another controller on
the managed cluster that tries to manipulate the resource applied by a `ManifestWork`, this
controller will also fight with work agent.

When one of the `ManifestWork` is deleted, the applied resource will not be removed no matter
`DeleteOption` is set or not. The remaining `ManifestWork` will still keep the ownership of the resource.

 To resolve such conflict, user can choose a different update strategy to alleviate the resource conflict.

- `CreateOnly`: with this strategy, the work-agent will only ensure creation of the certain manifest if the
  resource does not exist. work-agent will not update the resource, hence the ownership of the whole resource
  can be taken over by another `ManifestWork` or controller.
- `ServerSideApply`: with this strategy, the work-agent will run server side apply for the certain manifest. The
  default field manager is `work-agent`, and can be customized. If another `ManifestWork` or controller takes the
  ownership of a certain field in the manifest, the original `ManifestWork` will report conflict. User can prune
  the original `ManifestWork` so only field that it will own maintains.
- `ReadOnly`: with this strategy, the work-agent will not apply manifests onto the cluster, but it still can read
   resource fields and return results when feedback rules are defined. Only metadata of the manifest is required to
   be defined in the spec of the `ManifestWork` with this strategy.

An example of using `ServerSideApply` strategy as following:

1. User creates a `ManifestWork` with `ServerSideApply` specified:

```yaml
apiVersion: work.open-cluster-management.io/v1
kind: ManifestWork
metadata:
  namespace: <target managed cluster>
  name: hello-work-demo
spec:
  workload: ...
  manifestConfigs:
    - resourceIdentifier:
        group: apps
        resource: deployments
        namespace: default
        name: hello
      updateStrategy:
        type: ServerSideApply
```

2. User creates another `ManifestWork` with `ServerSideApply` but with different field manager.

```yaml
apiVersion: work.open-cluster-management.io/v1
kind: ManifestWork
metadata:
  namespace: <target managed cluster>
  name: hello-work-replica-patch
spec:
  workload:
    manifests:
      - apiVersion: apps/v1
        kind: Deployment
        metadata:
          name: hello
          namespace: default
        spec:
          replicas: 3
  manifestConfigs:
    - resourceIdentifier:
        group: apps
        resource: deployments
        namespace: default
        name: hello
      updateStrategy:
        type: ServerSideApply
        serverSideApply:
          force: true
          fieldManager: work-agent-another
```

The second `ManifestWork` only defines `replicas` in the manifest, so it takes the ownership of `replicas`. If the
first `ManifestWork` is updated to add `replicas` field with different value, it will get conflict condition and
manifest will not be updated by it.

Instead of creating the second `ManifestWork`, user can also set HPA for this deployment. HPA will also take the ownership
of `replicas`, and the update of `replicas` field in the first `ManifestWork` will return conflict condition.

## Ignore fields in Server Side Apply

To avoid work-agent returning conflict error, when using ServerSideApply as the update strategy, users can specify certain
fields to be ignored, such that when work agent is applying the resource to the `ManagedCluster`, the change on the
specified fields will not be updated onto the resource.

It is useful when other actors on the `ManagedCluster` is updating the same field on the resources
that the `ManifestWork` is owning. One example as below:

```yaml
apiVersion: work.open-cluster-management.io/v1
kind: ManifestWork
metadata:
  namespace: <target managed cluster>
  name: hello-work-demo
spec:
  workload: ...
  manifestConfigs:
    - resourceIdentifier:
        resource: configmaps
        namespace: default
        name: some-configmap
      updateStrategy:
        type: ServerSideApply
        serverSideApply:
          force: true
          ignoreFields:
            - condition: OnSpokePresent
              jsonPaths:
                - .data
```

It indicates that when the configmap is applied on the `ManagedCluster`, any additional change
on the data field will be ignored by the work agent, no matter the change comes from another
actor on the `ManagedCluster`, or from this or another `ManifestWork`. It applies as long as the
configmap exists on the `ManagedCluster`.

Alternatively, user can also set the condition field in the above example to `OnSpokeChange`, which
indicates that the change of the data field will not be ignored if it comes from this `ManifestWork`
However, change from other actors on the `ManagedCluster` will be ignored.

## Permission setting for work agent

All workload manifests are applied to the managed cluster by the work-agent, and by default the work-agent has the
following permission for the managed cluster:

- clusterRole `admin`(instead of the `cluster-admin`) to apply kubernetes common resources
- managing `customresourcedefinitions`, but can not manage a specific custom resource instance
- managing `clusterrolebindings`, `rolebindings`, `clusterroles`, `roles`, including the `bind` and `escalate`
  permission, this is why we can grant work-agent service account extra permissions using ManifestWork

So if the workload manifests to be applied on the managed cluster exceeds the above permission, for example some
Custom Resource instances, there will be an error `... is forbidden: User "system:serviceaccount:open-cluster-management-agent:klusterlet-work-sa" cannot get resource ...`
reflected on the ManifestWork status.

To prevent this, the work-agent needs to be given the corresponding permissions. You can add the permission by creating
RBAC resources on the managed cluster directly, or by creating a ManifestWork including the RBAC resources on the hub
cluster, then the work-agent will apply the RBAC resources to the managed cluster. As for creating the RBAC resources,
there are several options:

- Option 1: Create clusterRoles with label `"open-cluster-management.io/aggregate-to-work": "true"` for your
  to-be-applied resources, the rules defined in the clusterRoles will be aggregated to the work-agent automatically;
  (Supported since OCM version >= v0.12.0, Recommended)
- Option 2: Create clusterRoles with label `rbac.authorization.k8s.io/aggregate-to-admin: "true"` for your
  to-be-applied resources, the rules defined in the clusterRoles will be aggregated to the work-agent automatically;
  (Deprecated since OCM version >= v0.12.0, use the Option 1 instead)
- Option 3: Create role/clusterRole roleBinding/clusterRoleBinding for the `klusterlet-work-sa` service account;
  (Deprecated since OCM version >= v0.12.0, use the Option 1 instead)

Below is an example using ManifestWork to give the work-agent permission for resource `machines.cluster.x-k8s.io`

- Option 1: Use label `"open-cluster-management.io/aggregate-to-work": "true"` to aggregate the permission; Recommended

```yaml
apiVersion: work.open-cluster-management.io/v1
kind: ManifestWork
metadata:
  namespace: cluster1
  name: permission-set
spec:
  workload:
    manifests:
      - apiVersion: rbac.authorization.k8s.io/v1
        kind: ClusterRole
        metadata:
          name: open-cluster-management:klusterlet-work:my-role
          labels:
            open-cluster-management.io/aggregate-to-work: "true"  # with this label, the clusterRole will be selected to aggregate
        rules:
          # Allow agent to managed machines
          - apiGroups: ["cluster.x-k8s.io"]
            resources: ["machines"]
            verbs: ["get", "list", "watch", "create", "update", "patch", "delete"]
```

- Option 2: Use clusterRole and clusterRoleBinding; Deprecated since OCM version >= v0.12.0, use the Option 1 instead.
  Because the work-agent might be running in a different namespace than the `open-cluster-management-agent`

```yaml
apiVersion: work.open-cluster-management.io/v1
kind: ManifestWork
metadata:
  namespace: cluster1
  name: permission-set
spec:
  workload:
    manifests:
      - apiVersion: rbac.authorization.k8s.io/v1
        kind: ClusterRole
        metadata:
          name: open-cluster-management:klusterlet-work:my-role
        rules:
          # Allow agent to managed machines
          - apiGroups: ["cluster.x-k8s.io"]
            resources: ["machines"]
            verbs: ["get", "list", "watch", "create", "update", "patch", "delete"]
      - apiVersion: rbac.authorization.k8s.io/v1
        kind: ClusterRoleBinding
        metadata:
          name: open-cluster-management:klusterlet-work:my-binding
        roleRef:
          apiGroup: rbac.authorization.k8s.io
          kind: ClusterRole
          name: open-cluster-management:klusterlet-work:my-role
        subjects:
          - kind: ServiceAccount
            name: klusterlet-work-sa
            namespace: open-cluster-management-agent
```

## Treating defaulting/immutable fields in API

The kube-apiserver sets the defaulting/immutable fields for some APIs if the user does not set them. And it may fail to
deploy these APIs using `ManifestWork`. Because in the reconcile loop, the work agent will try to update the immutable
or default field after comparing the desired manifest in the `ManifestWork` and existing resource in the cluster, and
the update will fail or not take effect.

Let's use Job as an example. The kube-apiserver will set a default selector and label on the Pod of Job if the user does
not set `spec.Selector` in the Job. The fields are immutable, so the `ManifestWork` will report `AppliedManifestFailed`
when we apply a Job without `spec.Selector` using `ManifestWork`.

```yaml
apiVersion: work.open-cluster-management.io/v1
kind: ManifestWork
metadata:
  namespace: cluster1
  name: exmaple-job
spec:
  workload:
    manifests:
      - apiVersion: batch/v1
        kind: Job
        metadata:
          name: pi
          namespace: default
        spec:
          template:
            spec:
              containers:
              - name: pi
                image: perl:5.34.0
                command: ["perl",  "-Mbignum=bpi", "-wle", "print bpi(2000)"]
              restartPolicy: Never
          backoffLimit: 4
```

There are 2 options to fix this issue.

1. Specify the fields manually if they are configurable. For example, set `spec.manualSelector=true` and your own labels
   in the `spec.selector` of the Job, and set the same labels for the containers.

```yaml
apiVersion: work.open-cluster-management.io/v1
kind: ManifestWork
metadata:
  namespace: cluster1
  name: exmaple-job-1
spec:
  workload:
    manifests:
      - apiVersion: batch/v1
        kind: Job
        metadata:
          name: pi
          namespace: default
        spec:
          manualSelector: true
          selector:
            matchLabels:
              job: pi
          template:
            metadata:
              labels:
                job: pi
            spec:
              containers:
              - name: pi
                image: perl:5.34.0
                command: ["perl",  "-Mbignum=bpi", "-wle", "print bpi(2000)"]
              restartPolicy: Never
          backoffLimit: 4
```

2. Set the [updateStrategy ServerSideApply](#resource-race-and-adoption) in the `ManifestWork` for the API.

```yaml
apiVersion: work.open-cluster-management.io/v1
kind: ManifestWork
metadata:
  namespace: cluster1
  name: exmaple-job
spec:
  manifestConfigs:
    - resourceIdentifier:
        group: batch
        resource: jobs
        namespace: default
        name: pi
      updateStrategy:
        type: ServerSideApply
  workload:
    manifests:
      - apiVersion: batch/v1
        kind: Job
        metadata:
          name: pi
          namespace: default
        spec:
          template:
            spec:
              containers:
              - name: pi
                image: perl:5.34.0
                command: ["perl",  "-Mbignum=bpi", "-wle", "print bpi(2000)"]
              restartPolicy: Never
          backoffLimit: 4
```

## Dynamic identity authorization

All manifests in `ManifestWork` are applied by the work-agent using the mounted service account to raise requests
against the managed cluster by default. And the work agent has very high permission to access the managed cluster which
means that any hub user with write access to the `ManifestWork` resources will be able to dispatch any resources that
the work-agent can manipulate to the managed cluster.

The executor subject feature(introduced in release `0.9.0`) provides a way to clarify the owner identity(executor) of the `ManifestWork` before it
takes effect so that we can explicitly check whether the executor has sufficient permission in the managed cluster.

The following example clarifies the owner "executor1" of the `ManifestWork`, so before the work-agent applies the
"default/test" `ConfigMap` to the managed cluster, it will first check whether the `ServiceAccount` "default/executor1"
has the permission to apply this `ConfigMap`

```yaml
apiVersion: work.open-cluster-management.io/v1
kind: ManifestWork
metadata:
  namespace: cluster1
  name: example-manifestwork
spec:
  executor:
    subject:
      type: ServiceAccount
      serviceAccount:
        namespace: default
        name: executor1
  workload:
    manifests:
      - apiVersion: v1
        data:
          a: b
        kind: ConfigMap
        metadata:
          namespace: default
          name: test
```

Not any hub user can specify any executor at will. Hub users can only use the executor for which they have an
`execute-as`(virtual verb) permission. For example, hub users bound to the following Role can use the "executor1"
`ServiceAccount` in the "default" namespace on the managed cluster.

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: cluster1-executor1
  namespace: cluster1
rules:
- apiGroups:
  - work.open-cluster-management.io
  resources:
  - manifestworks
  verbs:
  - execute-as
  resourceNames:
  - system:serviceaccount:default:executor1
```

For backward compatibility, if the executor is absent, the work agent will keep using the mounted service account to
apply resources. But using the executor is encouraged, so we have a feature gate `NilExecutorValidating` to control
whether any hub user is allowed to not set the executor. It is disabled by default, we can use the following
configuration to the `ClusterManager` to enable it. When it is enabled, not setting executor will be regarded as using
the "/klusterlet-work-sa" (namespace is empty, name is klusterlet-work-sa) virtual service account on the managed
cluster for permission verification, which means only hub users with "execute-as" permissions on the
"system:serviceaccount::klusterlet-work-sa" `ManifestWork` are allowed not to set the executor.

```yaml
spec:
  workConfiguration:
    featureGates:
    - feature: NilExecutorValidating
      mode: Enable
```

Work-agent uses the SubjectAccessReview API to check whether an executor has permission to the manifest resources, which
will cause a large number of SAR requests to the managed cluster API-server, so we provided a new feature gate
`ExecutorValidatingCaches`(in release `0.10.0`) to cache the result of the executor's permission to the manifest
resource, it only works when the managed cluster uses
[RBAC mode authorization](https://kubernetes.io/docs/reference/access-authn-authz/authorization/#authorization-modules),
and is disabled by default as well, but can be enabled by using the following configuration for `Klusterlet`:

```yaml
spec:
  workConfiguration:
    featureGates:
    - feature: ExecutorValidatingCaches
      mode: Enable
```

Enhancement proposal: [Work Executor Group](https://github.com/open-cluster-management-io/enhancements/tree/main/enhancements/sig-architecture/34-work-executor-group)
