---
title: ManagedClusterSet
weight: 2
---

<!-- spellchecker-disable -->

{{< toc >}}

<!-- spellchecker-enable -->

## What is ManagedClusterSet?

`ManagedClusterSet` is a cluster scoped API in the hub cluster for grouping a
few managed clusters into a "set" so that hub admin can operate these clusters
altogether in a higher level. The concept is inspired by the an [enhancement](https://github.com/kubernetes/enhancements/tree/master/keps/sig-multicluster/1645-multi-cluster-services-api#terminology)
from the Kubernetes SIG-Multicluster. Member clusters in the set are supposed
to have common/similar attributes e.g. purpose of use, deployed regions, etc.
Each `ManagedClusterSet` can be managed/administrated by different hub admins,
and their RBAC permissions can also be isolated by binding the cluster set to a
"workspace namespace" in the hub cluster. The cluster set admin can flexibly
operate the member clusters in the workspace namespace using [Placement](./placement.md)
API, etc.

The following picture shows the hierarchies of how the cluster set works:

<div style="text-align: center; padding: 20px;">
   <img src="/clusterset-explain.png" alt="Clusterset" style="margin: 0 auto; width: 90%">
</div>

Note that `ManagedClusterSet` and "workspace namespace" has an __M*N__
relationship:

- Bind multiple cluster sets to one workspace namespace indicates that the admin
  of that namespace can operate the member clusters from both sets.
- Bind one cluster set to multiple workspace namespace indicates that the
  cluster set can be operated from all the bound namespaces at the same time.

## Operates ManagedClusterSet using clusteradm

### Creating a ManagedClusterSet

Running the following command to create an example cluster set:

```shell
$ clusteradm create clusterset example-clusterset
$ clusteradm get clustersets
NAME                BOUND NAMESPACES    STATUS
example-clusterset                      No ManagedCluster selected
```

The newly created cluster set will be empty by default, so we can move on adding
member clusters to the set. 

### Adding a ManagedCluster to a ManagedClusterSet

Running the following command to add a cluster to the set:

```shell
$ clusteradm clusterset set example-clusterset --clusters managed1
$ clusteradm get clustersets
NAME                BOUND NAMESPACES    STATUS
example-clusterset                      1 ManagedCluster selected
```

Note that adding a cluster to a clusterset will require the admin to have
"managedclustersets/join" access in the hub cluster.

Now the cluster set contains 1 valid cluster, and in order to operate that
cluster set we are supposed to bind it to an existing namespace to make it a
"workspace namespace".

### Bind the clusterset to a workspace namespace

Running the following command to bind the cluster set to a namespace. Note that
the namespace __SHALL NOT__ be an existing "cluster namespace" (i.e. the
namespace has the same name of a registered managed cluster).

Note that binding a cluster set to a namespace means that granting access from
that namespace to its member clusters. And the bind process requires
"managedclustersets/bind" access in the hub cluster which is clarified below.

```shell
$ clusteradm clusterset bind example-clusterset --namespace default
$ clusteradm get clustersets
NAME                BOUND NAMESPACES    STATUS
example-clusterset  default             1 ManagedCluster selected
```

So far we successfully created a new cluster set containing 1 cluster and bind
it a "workspace namespace".

## A glance at the "ManagedClusterSet" API

The `ManagedClusterSet` is a vanilla Kubernetes custom resource which can be
checked by the command `kubectl get managedclusterset`:

```shell
apiVersion: cluster.open-cluster-management.io/v1beta1
kind: ManagedClusterSet
metadata:
  name: example-clusterset
spec: {}
status:
  conditions:
  - lastTransitionTime: "2022-02-21T09:24:38Z"
    message: 1 ManagedClusters selected
    reason: ClustersSelected
    status: "False"
    type: ClusterSetEmpty
```

### Clusterset RBAC permission control

#### Adding member cluster to a clusterset

Adding a new member cluster to a clusterset requires RBAC permission of 
updating the managed cluster and `managedclustersets/join` subresource. We can
manually apply the following clusterrole to allow a hub user to manipulate
that clusterset:

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata: ...
rules:
  - apiGroups:
      - cluster.open-cluster-management.io
    resources:
      - managedclusters
    verbs:
      - update
  - apiGroups:
      - cluster.open-cluster-management.io
    resources:
      - managedclustersets/join
    verbs:
      - create
```

#### Binding a clusterset to a namespace

The "binding" process of a cluster set is policed by a validating webhook that
checks whether the requester has sufficient RBAC access to the
`managedclustersets/bind` subresource. We can also manually apply the following
clusterrole to grant a hub user the permission to bind cluster sets:

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata: ...
rules:
  - apiGroups:
      - cluster.open-cluster-management.io
    resources:
      - managedclustersets/bind
    verbs:
      - create
```