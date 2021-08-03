---
title: Placement
weight: 3
---

`Placement` API is used to select a set of managed clusters in one or multiple `ManagedClusterSets` so that the user's workloads can be deployed to these clusters.

## Bind ManagedClusterSet to a namespace

Before creating a `Placement`, you need to create a `ManagedClusterSetBinding` in a namespace to bind to a `ManagedClusterSet`. Then you can create a `Placement` in the same namespace to select the clusters in this `ManagedClusterSet`. Assume a `ManagedClusterSet` is created on the hub cluster as seen in the following examples.

```yaml
apiVersion: cluster.open-cluster-management.io/v1alpha1
kind: ManagedClusterSet
metadata:
  name: prod
```

You can create a `ManagedClusterSetBinding` as follows to bind the `ManagedClusterSet` to the default namespace.

```yaml
apiVersion: cluster.open-cluster-management.io/v1alpha1
kind: ManagedClusterSetBinding
metadata:
  name: prod
  namespace: default
spec:
  clusterSet: prod
```

You must have the `create` permission on resource `managedclusterset/bind` to bind the `ManagedClusterSet` to a namespace.

## Select clusters in ManagedClusterSet

After `ManagedClusterSetBinding` is created in a namespace, you can create a placement in the namespace to define what clusters should be selected in the bound `ManagedClusterSet`. You can select clusters by labels or `clusterClaims`. For instance, you can select 3 clusters with labels `purpose=test` and clusterClaim `platform.open-cluster-management.io=aws` as seen in the following examples.

```yaml
apiVersion: cluster.open-cluster-management.io/v1alpha1
kind: Placement
metadata:
  name: placement1
  namespace: default
spec:
  numberOfClusters: 3
  clusterSets:
    - prod
  predicates:
    - requiredClusterSelector:
        labelSelector:
          matchLabels:
            purpose: test
        claimSelector:
          matchExpressions:
            - key: platform.open-cluster-management.io
              operator: In
              values:
                - aws
```

`PlacementDecision` will be created by the placement controller in the same namespace, each with a label of `open-cluster-management.io/placement=placement1`. `PlacementDecision` contains the results of the cluster selection as seen in the following examples.

```yaml
apiVersion: cluster.open-cluster-management.io/v1alpha1
kind: PlacementDecision
metadata:
  labels:
    placement.open-cluster-management.io: placement1
  name: placement1-decision-1
  namespace: default
spec:
  decisions:
    - clusterName: cluster1
    - clusterName: cluster2
    - clusterName: cluster3
```

`PlacementDecision` can be consumed by another operand to decide how the workload should be placed in multiple clusters.

## Future work

In addition to selecting cluster by predicates, we are still working on other advanced features including

- [Taint/Toleration of ManagedCluster](https://github.com/open-cluster-management-io/community/issues/48).
- [Various workload spread policies](https://github.com/open-cluster-management-io/community/issues/49).
- [Usage based scheduling](https://github.com/open-cluster-management-io/community/issues/52).
