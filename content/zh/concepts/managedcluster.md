---
title: ManagedCluster
weight: 2
---

## ManagedCluster Registration

`ManagedCluster` is a cluster scoped API on the hub cluster to define a Kubernetes cluster registered with the hub cluster. In open-cluster-management, the cluster registration follows a `double opt-in` mechanism which is:

1. An agent opts in to register a cluster with the hub by creating a `ManagedCluster` resource on the hub. The agent needs a kubeconfig with appropriate permission (bootstrap kubeconfig) to initiate the registration request
2. An admin user on the hub opts in to explicitly accept the registration of the `ManagedCluster`.

This process ensures that any agent with a credential to the hub can request to join as a `ManagedCluster`, while the request must be approved by an admin on the hub.

An example of `ManagedCluster` resource is shown in the following example.

```yaml
apiVersion: cluster.open-cluster-management.io/v1
kind: ManagedCluster
metadata:
  name: cluster1
spec:
  hubAcceptsClient: true
  managedClusterClientConfigs:
    - url: https://managedcluster-apiserver:6443
```

The admin user on the hub needs to approve the authn/authz of an agent separately by:

1. Approving the `certificatesigningrequest` initiated by the agent so agent is authenticated to the hub.
2. Set `hubAccpetClient` to true in `ManagedCluster` API, so the agent is authorized to call the hub.

The admin user must have a `create` permission to `managedcluster/accept` resource to set `hubAccpetClient` to true in `ManagedCluster`.

After the admin user on the hub approve the registration of the cluster, a namespace with the same name of the cluster will be created. This namespace can be regarded as a `container` of the resources that agents in a managed cluster can access. By default, the agent on a cluster is only authorized to access certain resource kinds in this namespace on the hub to ensure security isolation. In addition, the agent will set a status condition in `ManagedCluster` as `Joined` and starts to update the liveness of managed cluster.

In open-cluster-management, [registration](https://github.com/open-cluster-management-io/registration) project implements the registration process. It includes an agent in the managed cluster to register to the hub, a controller on the hub cluster to handle authz/authn setup for the agent.

## ManagedClusterSet

`ManagedClusterSet` is a cluster scoped API on the hub cluster to define a group of `ManagedCluster`. How `ManagedCluster` is grouped depends on different use cases. For instance, you can create `dev`, `staging`, `prod` `ManagedClusterSet` for different purposes. Or you can create `north-america`, `europe`, `apac` `ManagedClusterSet` based on the region of the `ManagedCluster`.

`ManagedCluster` is to implement the notion in [KEP-1645](https://github.com/kubernetes/enhancements/tree/master/keps/sig-multicluster/1645-multi-cluster-services-api), but we also expand its definition as a scope for workload placement.

To add a `ManagedCluster` to a `ManagedClusterSet`, user needs to set a label `cluster.open-cluster-management.io/clusterset={clusterset name}` on the `ManagedCluster`. The user must have the `create` permission to `managedclusterset/join` resource to add a `ManagedCluster` to a `ManagedClusterSet`.

An example of a `ManagedClusterSet` resource is shown in the following example.

```yaml
apiVersion: cluster.open-cluster-management.io/v1alpha1
kind: ManagedClusterSet
metadata:
  name: prod
```

## ClusterClaim

`ClusterClaim` is a cluster scoped API on the managed cluster as an implementation of [KEP-2149](https://github.com/kubernetes/enhancements/tree/master/keps/sig-multicluster/2149-clusterid). It provides an extension point for other actors in the managed cluster to report certain properties of a managed cluster to the hub. The `registration-agent` collects all the `ClusterClaim` in the managed cluster and syncs them in `clusterClaims` field in the related `ManagedCluster`.

A third party actor can create a cluster claim on the managed cluster as shown below:

```yaml
apiVersion: cluster.open-cluster-management.io/v1alpha1
kind: ClusterClaim
metadata:
  name: platform.open-cluster-management.io
spec:
  value: aws
```

And the `ClusterClaim` will be synced to the hub cluster:

```yaml
apiVersion: cluster.open-cluster-management.io/v1
kind: ManagedCluster
metadata:
  name: aws
spec:
  hubAcceptsClient: true
status:
  clusterClaims:
    - name: platform.open-cluster-management.io
      value: aws
  conditions: ...
```
