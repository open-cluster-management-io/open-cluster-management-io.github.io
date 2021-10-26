---
title: ManifestWork
weight: 2
---

## What is `ManifestWork`

`ManifestWork` is to define a group of Kubernetes resource on the hub to be applied to the managed cluster. In the open-cluster-management project, a `ManifestWork` resource must be created in the cluster namespace. A work agent implemented in [work](https://github.com/open-cluster-management-io/work) project is run on the managed cluster and monitors the `ManifestWork` resource in the cluster namespace on the hub cluster.

An example of `ManifestWork` to deploy a deployment to the managed cluster is shown in the following example.

```yaml
apiVersion: work.open-cluster-management.io/v1
kind: ManifestWork
metadata:
  name: hello-work
  namespace: cluster1
  labels:
    app: hello
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
metadata:
  labels:
    app: hello
  name: hello-work
  namespace: cluster1
spec: ... ...
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

## Garbage collection

To ensure the resources applied by `ManifestWork` are reliably recorded, the work agent creates an `AppliedManifestWork` on the managed cluster for each `ManifestWork` as an anchor for resources relating to `ManifestWork`. When `ManifestWork` is deleted, work agent runs a `Foreground deletion`, that `ManifestWork` will stay in deleting state until all its related resources has been fully cleaned in the managed cluster.

### Delete options

User can explicitly choose not to garbage collect the applied resources when a `ManifestWork` is deleted. the user should specify the `deleteOption` in the `ManifestWork`. By default, `deleteOption` is set as `Foreground` 
which means the applied resources on the spoke will be deleted with the removal of `ManifestWork`. User can set it to
`Orphan` so the applied resources will not be deleted. Here is an example:

```yaml
apiVersion: work.open-cluster-management.io/v1
kind: ManifestWork
metadata:
  name: deleteoption-demo
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
              command: ['sh', '-c', 'echo "Hello, World!" && sleep 3600']
  deleteOption:
    propagationPolicy: Orphan
```

Alternatively, user can also specify a certain resource defined in the `ManifestWork` to be orphaned by setting the
`deleteOption` to be `SelectivelyOrphan`. Here is an example with `SelectivelyOrphan` specified. It ensures the removal of deployment resource specified in the `ManifestWork` while the service resource is kept.

```yaml
kind: ManifestWork
metadata:
  name: selective-delete-work
spec:
  workload:
    manifests:
    - kind: Service
      apiVersion: v1
      metadata:
        name: helloworld
        namespace: default
        labels:
          app: hello
      spec:
        type: ClusterIP
        ports:
        - name: app
          port: 443
          protocol: TCP
          targetPort: 4443
        selector:
          app: hello
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
              command: ['sh', '-c', 'echo "Hello, World!" && sleep 3600']
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
two `ManifestWorks` will fight and it is desired since each `ManifestWork` is treated as equal and
each `ManifestWork` is declaring the ownership of the resource. 

When one of the `ManifestWork` is deleted, the applied resource will not be removed no matter
`DeleteOption` is set or not. The remaining `ManifestWork` will still keep the ownership of the resource.