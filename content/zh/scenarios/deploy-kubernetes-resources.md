---
title: Deploy Kubernetes resources to the managed clusters
weight: 1
---

After bootstrapping an OCM environment of at least one managed clusters, now
it's time to begin your first journey of deploying Kubernetes resources into
your managed clusters with OCM's `ManifestWork` API.


## Prerequisites

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

## Deploy the resource to a targetd cluster

Now you can deploy a set of kubernetes resources defined in files to any clusters managed by the hub cluster.

Connect to your hub cluster and run:

```shell
clusteradm create work my-first-work -f <kubernetes yaml file or directory> --clusters <cluster name>
```

This should create a `ManifestWork` in cluster namespace of your hub cluster. To see the detailed status of this `ManifestWork`, you can run:

```shell
clusteradm get works my-first-work --cluster <cluster name>
```

If you have some change on the manifest files, you can apply the change to the targeted cluster by running:

```shell
clusteradm create work my-first-work -f <kubernetes yaml file or directory> --clusters <cluster name> --overwrite
```

To remove the resources deployed on the targeted cluster, run:

```
kubectl delete manifestwork my-first-work -n <cluster name>
```
## What happens behind the scene

Say we would like to deploy a nginx together with a service account into "cluster1". 
A `ManifestWork` can be defined as follows:

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

  ```shell
  # kubectl get manifestwork -A --context kind-hub
  NAMESPACE   NAME            AGE
  cluster1    my-first-work   2m59s
  ```

- The resources in the `ManifestWork` including a service-account, a deployment
  will be created to the cluster "cluster1".

  ```shell
  # kubectl get deployment --context kind-cluster1
  NAME               READY   UP-TO-DATE   AVAILABLE   AGE
  nginx-deployment   3/3     3            3           4m10s

  # kubectl get sa my-sa --context kind-cluster1
  NAME    SECRETS   AGE
  my-sa   1         4m23s
  ```

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

### Updating the ManifestWork

Any updates applied to the `ManifestWork` are expected to take effect 
immediately as long as the work agent deployed in the managed cluster 
are healthy and actively in touch with the hub cluster.

The work agent will be dynamically computing a hash
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
    
### Deleting the ManifestWork

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

## Troubleshoot
In case of run into any unexpected failures,
you can make sure your environment by checking the following conditions:

- The CRD `ManifestWork` is installed in the hub cluster:
  
    ```shell
    $ kubectl get crd manifestworks.work.open-cluster-management.io 
    ```

- The CRD `AppliedManifestWork` is installed in the managed cluster:

    ```shell
    $ kubectl get crd appliedmanifestworks.work.open-cluster-management.io 
    ```

- The work agent is successfully running in the managed cluster:

    ```shell
    $ kubectl -n open-cluster-management-agent get pod
    NAME                                             READY   STATUS    RESTARTS   AGE
    klusterlet-registration-agent-598fd79988-jxx7n   1/1     Running   0          20d
    klusterlet-work-agent-7d47f4b5c5-dnkqw           1/1     Running   0          20d
    ```
