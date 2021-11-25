---
title: Deploy Kubernetes resources to the managed clusters
weight: 1
---

After bootstrapping an OCM environment of at least one managed clusters, now
it's time to begin your first journey of deploying Kubernetes resources into
your managed clusters with OCM's `ManifestWork` API.


## Prerequisites

By design, you don't need to do any additional preparation before working on
the `ManifestWork` API. Just in case of runnint into any unexpected failures,
you can make sure your environment by checking the following conditions:

- The CRD `ManifestWork` is installed in the hub cluster:
  
    ```shell
    $ kubectl get crd manifestworks.work.open-cluster-management.io 
    ```

- The CRD `AppliedManifestWork` is installed in the managed cluster:

    ```shell
    $ kubectl get crd manifestworks.work.open-cluster-management.io 
    ```

- The work agent is successfully running in the managed cluster:

    ```shell
    $ kubectl -n open-cluster-management-agent get pod
    NAME                                             READY   STATUS    RESTARTS   AGE
    klusterlet-registration-agent-598fd79988-jxx7n   1/1     Running   0          20d
    klusterlet-work-agent-7d47f4b5c5-dnkqw           1/1     Running   0          20d
    ```

https://open-cluster-management.io/concepts/manifestwork/

## Terms

Before we get start with the following tutorial, let's clarify a few terms
we're going to use in the context.

- __Cluster namespace__: After a managed cluster is successfully registered 
  into the hub. The hub registration controller will be automatically
  provisioning a `cluster namespace` dedicated for the cluster of which the 
  name will be same as the managed cluster. The `cluster namespace` is used 
  for storing any custom resources/configurations that effectively belongs 
  to the managed cluster. 
  
- __ManifestWork__: A custom resource in the hub cluster that groups a list 
  of kubernetes resources together and meant for dispatching them into the 
  managed cluster if the `ManifestWork` is created in a valid 
  `cluster namespace`, see details in this [page](https://open-cluster-management.io/concepts/manifestwork/).
  
- __AppliedManifestWork__: A custom resource in the managed cluster for 
  persisting the prescribed list of resources from `ManifestWork`. It's also
  for cleaning up the local resources upon `ManifestWork`'s deletion.
  
## Use Case

The following are typical use cases for our `ManifestWork` API:

## Creating a ManifestWork

Say we have a managed cluster called "cluster1" registered in our OCM 
environment, then we are supposed to see a cluster namespace dynamically 
created in the hub cluster named "cluster1":

```shell
$ kubectl get ns cluster1
NAME                                    STATUS   AGE
cluster1                                Active   21d
```

Create the following resource into the hub cluster:

  ```yaml
  apiVersion: work.open-cluster-management.io/v1
  kind: ManifestWork
  metadata:
    namespace: cluster1
    name: example-manifestwork
  spec:
    workload:
      manifests:
        - apiVersion: v1
          kind: ServiceAccount
          metadata:
            namespace: default
            name: my-sa
        - apiVersion: apps/v1
          kind: Deployment
          metadata:
            namespace: default
            name: nginx-deployment
            labels:
              app: nginx
          spec:
            replicas: 3
            selector:
              matchLabels:
                app: nginx
            template:
              metadata:
                labels:
                  app: nginx
              spec:
                serviceAccountName: my-sa
                containers:
                  - name: nginx
                    image: nginx:1.14.2
                    ports:
                      - containerPort: 80
  ```

In this example:

- A `ManifestWork` named "example-manifestwork" will be created into a 
  "cluster namespace" named "cluster1".
- The resources in the `ManifestWork` including a service-account, a deployment
  will be created to the cluster "cluster1".
- In the status of `ManifestWork` we can check out the aggregated status 
  indicating whether the prescribed resources are successfully deployed by the
  conditions in the field `.status.conditions[*]`:
  - `Applied`: Whether __all__ the resources from the spec are successfully 
    applied since the last observed generation of `ManifestWork`.
  - `Available`: Whether __all__ the resources from the spec are existing in 
    the target managed cluster.
-  Beside the aggregated status, the `ManifestWork` is also tracking the
   per-resource status under `.status.resourceStatus[*]` where we can 
   discriminate different resource types via the 
   `.status.resourceStatus[*].resourceMeta` field. e.g.:
   
  ```yaml
  resourceStatus:
    manifests:
    - conditions:
      - lastTransitionTime: "2021-11-25T10:17:43Z"
        message: Apply manifest complete
        reason: AppliedManifestComplete
        status: "True"
        type: Applied
      - lastTransitionTime: "2021-11-25T10:17:43Z"
        message: Resource is available
        reason: ResourceAvailable
        status: "True"
        type: Available
      resourceMeta:
        group: apps
        kind: Deployment
        name: nginx-deployment
        namespace: default
        ordinal: 1
        resource: deployments
        version: v1
    ...
  ```

If possible, you can also switch the context of your kubeconfig to "cluster1"
to check out the new resources delivered by `ManifestWork`: 

  ```shell
  $ kubectl --context kind-cluster1 get pod
  NAME                                READY   STATUS    RESTARTS   AGE
  nginx-deployment-556c5468f7-d5h2m   1/1     Running   0          33m
  nginx-deployment-556c5468f7-gf574   1/1     Running   0          33m
  nginx-deployment-556c5468f7-hhmjf   1/1     Running   0          33m
  ```

## Updating the ManifestWork

Any updates applied to the `ManifestWork` are expected to take effect 
immediately as long as the work agent deployed in the managed cluster 
are healthy and actively in touch with the hub cluster.

1. Edit the manifestwork with the following command:

  ```shell
  $ kubectl -n cluster1 edit manifestwork example-manifestwork 
  ```

  E.g. You can update either the image name of the deployment or the replicas.

2. Upon the edition, the work agent will be dynamically computing a hash
   from the prescribed resources, and a corresponding `AppliedManifestWork`
   of which the name contains the hash value will be persisted to the managed
   cluster and replacing the previously persisted `AppliedManifestWork` 
   connected to the same `ManifestWork` after the latest resources are applied.

  ```shell
  $ kubectl --context kind-cluster1 get appliedmanifestwork
  NAME                                                                                                   AGE
  ed59251487ad4e4465fa2990b36a1cc398b83e63b59fa16b83591f5afdc3dd6d-example-manifestwork                  59m
  ```

  Note that if the work agent was disconnected from the hub control plane for
  a period of time and missed the new updates upon `ManifestWork`. The work 
  agent will be catching up the latest state of `ManifestWork` as soon as it
  re-connects.
    
## Deleting the ManifestWork

The local resources deployed in the managed cluster should be cleaned up upon
receiving the deletion event from the corresponding `ManifestWork`. The resource
`ManifestWork` in the hub cluster will be protected by the finalizer named:

  - "cluster.open-cluster-management.io/manifest-work-cleanup"

It will be removed if the corresponding `AppliedManifestWork` is gracefully 
removed from the managed cluster. Meanwhile, the `AppliedManifestWork` resource
is also protected by another finalizer named:

  - "cluster.open-cluster-management.io/applied-manifest-work-cleanup"

This finalizer is supposed to be detached after the deployed local resources 
are *completely* removed from the manged cluster. With that being said, if any 
deployed local resources are holding at the "Terminating" due to graceful 
deletion. Both of its `ManifestWork` and `AppliedManifestWork` should stay
undeleted.