---
title: ManagedClusterSet
weight: 3
---



**API-CHANGE NOTE**:

The `ManagedClusterSet` and `ManagedClusterSetBinding` API v1beta1 version will no longer be served in OCM v0.12.0.

- Migrate manifests and API clients to use the `ManagedClusterSet` and `ManagedClusterSetBinding` API v1beta2 version, available since OCM v0.9.0.
- All existing persisted objects are accessible via the new API.
- Notable changes:
  - The default cluster selector type will be `ExclusiveClusterSetLabel` in v1beta2, and type `LegacyClusterSetLabel` in v1beta1 is removed.

## What is ManagedClusterSet?

`ManagedClusterSet` is a cluster-scoped API in the hub cluster for grouping a
few managed clusters into a "set" so that hub admin can operate these clusters
altogether in a higher level. The concept is inspired by the [enhancement](https://github.com/kubernetes/enhancements/tree/master/keps/sig-multicluster/1645-multi-cluster-services-api#terminology)
from the Kubernetes SIG-Multicluster. Member clusters in the set are supposed
to have common/similar attributes e.g. purpose of use, deployed regions, etc.

`ManagedClusterSetBinding` is a namespace-scoped API in the hub cluster to project
a `ManagedClusterSet` into a certain namespace. Each `ManagedClusterSet` can be
managed/administrated by different hub admins, and their RBAC permissions can
also be isolated by binding the `ManagedClusterSet` to a "workspace namespace" in
the hub cluster via `ManagedClusterSetBinding`.

Note that `ManagedClusterSet` and "workspace namespace" has an __M*N__
relationship:

- Bind multiple cluster sets to one workspace namespace indicates that the admin
  of that namespace can operate the member clusters from both sets.
- Bind one cluster set to multiple workspace namespace indicates that the
  cluster set can be operated from all the bound namespaces at the same time.

The cluster set admin can flexibly operate the member clusters in the workspace
namespace using [Placement](../placement) API, etc.

The following picture shows the hierarchies of how the cluster set works:

<div style="text-align: center; padding: 20px;">
   <img src="/clusterset-explain.png" alt="Clusterset" style="margin: 0 auto; width: 90%">
</div>

## Operates ManagedClusterSet using clusteradm

### Creating a ManagedClusterSet

Running the following command to create an example cluster set:

```shell
$ clusteradm create clusterset example-clusterset
$ clusteradm get clustersets
<ManagedClusterSet>
└── <default>
│   ├── <BoundNamespace>
│   ├── <Status> No ManagedCluster selected
└── <example-clusterset>
│   ├── <BoundNamespace>
│   ├── <Status> No ManagedCluster selected
└── <global>
    └── <BoundNamespace>
    └── <Status> 1 ManagedClusters selected
```

The newly created cluster set will be empty by default, so we can move on adding
member clusters to the set.

### Adding a ManagedCluster to a ManagedClusterSet

Running the following command to add a cluster to the set:

```shell
$ clusteradm clusterset set example-clusterset --clusters managed1
$ clusteradm get clustersets
<ManagedClusterSet>
└── <default>
│   ├── <BoundNamespace>
│   ├── <Status> No ManagedCluster selected
└── <example-clusterset>
│   ├── <BoundNamespace>
│   ├── <Status> 1 ManagedClusters selected
└── <global>
    └── <BoundNamespace>
    └── <Status> 1 ManagedClusters selected
```

Note that adding a cluster to a cluster set will require the admin to have
"managedclustersets/join" access in the hub cluster.

Now the cluster set contains 1 valid cluster, and in order to operate that
cluster set we are supposed to bind it to an existing namespace to make it a
"workspace namespace".

### Binding the ManagedClusterSet to a workspace namespace

Running the following command to bind the cluster set to a namespace. Note that
the namespace __SHALL NOT__ be an existing "cluster namespace" (i.e. the
namespace has the same name of a registered managed cluster).

Note that binding a cluster set to a namespace means that granting access from
that namespace to its member clusters. And the bind process requires
"managedclustersets/bind" access in the hub cluster which is clarified below.

```shell
$ clusteradm clusterset bind example-clusterset --namespace default
$ clusteradm get clustersets
<ManagedClusterSet>
└── <default>
│   ├── <BoundNamespace>
│   ├── <Status> No ManagedCluster selected
└── <example-clusterset>
│   ├── <Status> 1 ManagedClusters selected
│   ├── <BoundNamespace> default
└── <global>
    └── <BoundNamespace>
    └── <Status> 1 ManagedClusters selected
```

So far we successfully created a new cluster set containing 1 cluster and bind
it a "workspace namespace".

## A glance at the "ManagedClusterSet" API

The `ManagedClusterSet` is a vanilla Kubernetes custom resource which can be
checked by the command `kubectl get managedclusterset <cluster set name> -o yaml`:

```yaml
apiVersion: cluster.open-cluster-management.io/v1beta2
kind: ManagedClusterSet
metadata:
  name: example-clusterset
spec:
  clusterSelector:
    selectorType: ExclusiveClusterSetLabel
status:
  conditions:
  - lastTransitionTime: "2022-02-21T09:24:38Z"
    message: 1 ManagedClusters selected
    reason: ClustersSelected
    status: "False"
    type: ClusterSetEmpty
```

```yaml
apiVersion: cluster.open-cluster-management.io/v1beta2
kind: ManagedClusterSet
metadata:
  name: example-openshift-clusterset
spec:
  clusterSelector:
    labelSelector:
      matchLabels:
        vendor: OpenShift
    selectorType: LabelSelector
status:
  conditions:
  - lastTransitionTime: "2022-06-20T08:23:28Z"
    message: 1 ManagedClusters selected
    reason: ClustersSelected
    status: "False"
    type: ClusterSetEmpty
```

The `ManagedClusterSetBinding` can also be checked by the command
`kubectl get managedclustersetbinding <cluster set name> -n <workspace-namespace> -oyaml`:

```yaml
apiVersion: cluster.open-cluster-management.io/v1beta2
kind: ManagedClusterSetBinding
metadata:
  name: example-clusterset
  namespace: default
spec:
  clusterSet: example-clusterset
status:
  conditions:
  - lastTransitionTime: "2022-12-19T09:55:10Z"
    message: ""
    reason: ClusterSetBound
    status: "True"
    type: Bound
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

## Default ManagedClusterSet

For easier management, we introduce a ManagedClusterSet called `default`.
A `default` ManagedClusterSet will be automatically created initially. Any clusters not specifying a ManagedClusterSet will be added into the `default`.
The user can move the cluster from the default clusterset to another clusterset using the command:
```
clusteradm clusterset set target-clusterset --clusters cluster-name
```

`default` clusterset is an alpha feature that can be disabled by disabling the feature gate in registration controller as:
[`- "--feature-gates=DefaultClusterSet=false"`](https://github.com/open-cluster-management-io/ocm/commit/55bc274d795ad0befc71f05aecd08810a4abfba1#diff-1026afceb1a224783dbf517bc281e71c1640636f5f001338f8185a0b4398b3d9R51)

## Global ManagedClusterSet

For easier management, we also introduce a ManagedClusterSet called `global`.
A `global` ManagedClusterSet will be automatically created initially. The `global` ManagedClusterSet include all ManagedClusters.

`global` clusterset is an alpha feature that can be disabled by disabling the feature gate in registration controller as:
[`- "--feature-gates=DefaultClusterSet=false"`](https://github.com/open-cluster-management-io/ocm/commit/55bc274d795ad0befc71f05aecd08810a4abfba1#diff-1026afceb1a224783dbf517bc281e71c1640636f5f001338f8185a0b4398b3d9R51)

`global` ManagedClusterSet detail:

```yaml
apiVersion: cluster.open-cluster-management.io/v1beta2
kind: ManagedClusterSet
metadata:
  name: global
spec:
  clusterSelector:
    labelSelector: {}
    selectorType: LabelSelector
status:
  conditions:
  - lastTransitionTime: "2022-06-20T08:23:28Z"
    message: 1 ManagedClusters selected
    reason: ClustersSelected
    status: "False"
    type: ClusterSetEmpty
```
