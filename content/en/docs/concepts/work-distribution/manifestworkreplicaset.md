---
title: ManifestWorkReplicaSet
weight: 2
aliases:
  - /concepts/manifestworkreplicaset/
  - /docs/concepts/manifestworkreplicaset/
---



## What is `ManifestWorkReplicaSet`

`ManifestWorkReplicaSet` is an aggregator API that uses [ManifestWork](https://open-cluster-management.io/docs/concepts/work-distribution/manifestwork/) and [Placement](https://open-cluster-management.io/docs/concepts/content-placement/placement/) to automatically create `ManifestWork` resources for clusters selected by `Placement`. It simplifies multi-cluster workload distribution by eliminating the need to manually create individual ManifestWork resources for each target cluster.

## Feature Enablement

`ManifestWorkReplicaSet` is in **alpha release** and is not enabled by default. To enable this feature, you must configure the cluster-manager instance on the hub cluster.

Edit the cluster-manager CR:

```shell
$ oc edit ClusterManager cluster-manager
```

Add the `workConfiguration` field to enable the ManifestWorkReplicaSet feature gate:

```yaml
kind: ClusterManager
metadata:
  name: cluster-manager
spec:
   ...
  workConfiguration:
    featureGates:
    - feature: ManifestWorkReplicaSet
      mode: Enable
```

Verify the feature is enabled successfully:

```shell
$ oc get ClusterManager cluster-manager -o yaml
```

Confirm that the `cluster-manager-work-controller` deployment appears in the status under `status.generations`:

```yaml
kind: ClusterManager
metadata:
  name: cluster-manager
spec:
   ...
status:
   ...
  generations:
    ...
  - group: apps
    lastGeneration: 2
    name: cluster-manager-work-webhook
    namespace: open-cluster-management-hub
    resource: deployments
    version: v1
  - group: apps
    lastGeneration: 1
    name: cluster-manager-work-controller
    namespace: open-cluster-management-hub
    resource: deployments
    version: v1
```

## Overview

Here's a simple example to get started with `ManifestWorkReplicaSet`.

This example deploys a `CronJob` and `Namespace` to a group of clusters selected by `Placement`.

```yaml
apiVersion: work.open-cluster-management.io/v1alpha1
kind: ManifestWorkReplicaSet
metadata:
  name: mwrset-cronjob
  namespace: ocm-ns
spec:
  placementRefs:
    - name: placement-rollout-all # Name of a created Placement
      rolloutStrategy:
        type: All
  manifestWorkTemplate:
    deleteOption:
      propagationPolicy: SelectivelyOrphan
      selectivelyOrphans:
        orphaningRules:
          - group: ''
            name: ocm-ns
            namespace: ''
            resource: Namespace
    manifestConfigs:
      - feedbackRules:
          - jsonPaths:
              - name: lastScheduleTime
                path: .status.lastScheduleTime
              - name: lastSuccessfulTime
                path: .status.lastSuccessfulTime
            type: JSONPaths
        resourceIdentifier:
          group: batch
          name: sync-cronjob
          namespace: ocm-ns
          resource: cronjobs
    workload:
      manifests:
        - kind: Namespace
          apiVersion: v1
          metadata:
            name: ocm-ns
        - kind: CronJob
          apiVersion: batch/v1
          metadata:
            name: sync-cronjob
            namespace: ocm-ns
          spec:
            schedule: '* * * * *'
            concurrencyPolicy: Allow
            suspend: false
            jobTemplate:
              spec:
                backoffLimit: 2
                template:
                  spec:
                    containers:
                      - name: hello
                        image: 'quay.io/prometheus/busybox:latest'
                        args:
                          - /bin/sh
                          - '-c'
                          - date; echo Hello from the Kubernetes cluster
```
The `placementRefs` field uses the Rollout Strategy [API](https://github.com/open-cluster-management-io/api/blob/main/cluster/v1alpha1/types_rolloutstrategy.go) to control how `ManifestWork` resources are applied to the selected clusters.

In the example above, the `placementRefs` references `placement-rollout-all` with a `rolloutStrategy` of `All`, which means the workload will be deployed to all selected clusters simultaneously.

## Rollout Strategy

`ManifestWorkReplicaSet` supports three rollout strategy types to control how workloads are distributed across clusters. For detailed rollout strategy documentation, see the [Placement rollout strategy section](https://open-cluster-management.io/docs/concepts/content-placement/placement/#rollout-strategy).

**Note:** The placement reference must be in the same namespace as the `ManifestWorkReplicaSet`.

1. **All**: Deploy to all selected clusters simultaneously
```yaml
  placementRefs:
    - name: placement-rollout-all # Name of a created Placement
      rolloutStrategy:
        type: All
```

2. **Progressive**: Gradual rollout with configurable parameters
```yaml
  placementRefs:
    - name: placement-rollout-progressive # Name of a created Placement
      rolloutStrategy:
        type: Progressive
        progressive:
          minSuccessTime: 5m
          progressDeadline: 10m
          maxFailures: 5%
          mandatoryDecisionGroups:
          - groupName: "prod-canary-west"
          - groupName: "prod-canary-east"
```

3. **ProgressivePerGroup**: Progressive rollout per decision group
```yaml
  placementRefs:
    - name: placement-rollout-progressive-per-group # Name of a created Placement
      rolloutStrategy:
        type: ProgressivePerGroup
        progressivePerGroup:
          progressDeadline: 10m
          maxFailures: 2
```

## Rollout Mechanism

The `ManifestWorkReplicaSet` rollout process is based on the `Progressing` and `Degraded` conditions of each `ManifestWork`. These conditions are not built-in but must be defined using [Custom CEL Expressions](https://open-cluster-management.io/docs/concepts/work-distribution/manifestwork/#custom-cel-expressions) in the `manifestConfigs` section.

### Condition Requirements

- **Progressing condition (required)**: Tracks whether the ManifestWork is currently being applied to the cluster. The rollout controller uses this condition to determine if a cluster deployment is in progress or completed.
  - For rollout strategies `Progressive` and `ProgressivePerGroup`, this is a **required** condition to determine if the rollout can proceed to the next cluster.
  - When the `Progressing` condition is `False`, the deployment is considered complete and succeeded, and the rollout will continue to the next cluster based on `minSuccessTime`.
  - If this condition is not defined, the rollout will never proceed to the next cluster (it will remain stuck waiting for the condition).

- **Degraded condition (optional)**: Indicates if the ManifestWork has failed or encountered issues. 
  - This is an **optional** condition used only to determine failure states.
  - If the `Degraded` condition status is `True`, the rollout may stop or count towards `maxFailures`.
  - If this condition is not defined, the workload is assumed to never be degraded.

**Rollout Status Determination:**

The rollout controller determines the status of each ManifestWork based on the combination of `Progressing` and `Degraded` condition values:

| Progressing | Degraded | Rollout Status | Description |
|-------------|----------|----------------|-------------|
| `True` | `True` | **Failed** | Work is progressing but degraded |
| `True` | `False` or not set | **Progressing** | Work is being applied and is healthy |
| `False` | `False` or not set | **Succeeded** | Work has been successfully applied |
| Unknown/Not set | Any | **Progressing** | Conservative fallback: treat as still progressing |

### Example: Progressive Rollout with Custom Conditions

This example demonstrates a progressive rollout with custom CEL expressions that define `Progressing` and `Degraded` conditions for a Deployment:

```yaml
apiVersion: work.open-cluster-management.io/v1alpha1
kind: ManifestWorkReplicaSet
metadata:
  name: mwrset
  namespace: default
spec:
  placementRefs:
    - name: placement-test # Name of a created Placement
      rolloutStrategy:
        type: Progressive
        progressive:
          minSuccessTime: 1m
          progressDeadline: 10m
          maxFailures: 5%
          maxConcurrency: 1
  manifestWorkTemplate:
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
                    image: busybox
                    command:
                      ["sh", "-c", 'echo "Hello, Kubernetes!" && sleep 36000']
    manifestConfigs:
      - resourceIdentifier:
          group: apps
          resource: deployments
          namespace: default
          name: hello
        conditionRules:
          - condition: Progressing
            type: CEL
            celExpressions:
              - |
                !(
                  (object.metadata.generation == object.status.observedGeneration) &&
                  has(object.status.conditions) &&
                  object.status.conditions.exists(c, c.type == 'Progressing' && c.status == 'True' && c.reason == 'NewReplicaSetAvailable')
                )
            messageExpression: |
              result ? "Applying" : "Completed"
          - condition: Degraded
            type: CEL
            celExpressions:
              - |
                (object.metadata.generation == object.status.observedGeneration) &&
                (has(object.status.readyReplicas) && has(object.status.replicas) && object.status.readyReplicas < object.status.replicas)
            messageExpression: |
              result ? "Degraded" : "Healthy"
```

## Status tracking

The PlacementSummary shows the number of manifestWorks applied to the placement's clusters based on the placementRef's rolloutStrategy and total number of clusters.
The manifestWorkReplicaSet Summary aggregate the placementSummaries showing the total number of applied manifestWorks to all clusters.

The manifestWorkReplicaSet has three status conditions;
1. **PlacementVerified** verify the placementRefs status; not exist or empty cluster selection.
1. **PlacementRolledOut** verify the rollout strategy status; progressing or complete.
1. **ManifestWorkApplied** verify the created manifestWork status; applied, progressing, degraded or available.

The manifestWorkReplicaSet determines the ManifestWorkApplied condition status based on the resource state (applied or available) of each manifestWork.

Here is an example.

```yaml
apiVersion: work.open-cluster-management.io/v1alpha1
kind: ManifestWorkReplicaSet
metadata:
  name: mwrset-cronjob
  namespace: ocm-ns
spec:
  placementRefs:
    - name: placement-rollout-all
      ...
    - name: placement-rollout-progressive
      ...
    - name: placement-rollout-progressive-per-group
      ...
  manifestWorkTemplate:
     ...
status:
 conditions:
   - lastTransitionTime: '2023-04-27T02:30:54Z'
     message: ''
     reason: AsExpected
     status: 'True'
     type: PlacementVerified
   - lastTransitionTime: '2023-04-27T02:30:54Z'
     message: ''
     reason: Progressing
     status: 'False'
     type: PlacementRolledOut
   - lastTransitionTime: '2023-04-27T02:30:54Z'
     message: ''
     reason: AsExpected
     status: 'True'
     type: ManifestworkApplied
 placementSummary:
 - name: placement-rollout-all
   availableDecisionGroups: 1 (10 / 10 clusters applied)
   summary:
     applied: 10
     available: 10
     progressing: 0
     degraded: 0
     total: 10
 - name: placement-rollout-progressive
   availableDecisionGroups: 3 (20 / 30 clusters applied)
   summary:
     applied: 20
     available: 20
     progressing: 0
     degraded: 0
     total: 20
 - name: placement-rollout-progressive-per-group
   availableDecisionGroups: 4 (15 / 20 clusters applied)
   summary:
     applied: 15
     available: 15
     progressing: 0
     degraded: 0
     total: 15
 summary:
   applied: 45
   available: 45
   progressing: 0
   degraded: 0
   total: 45
```