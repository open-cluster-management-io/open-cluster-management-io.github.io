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

After `ManagedClusterSetBinding` is created in a namespace, you can create a placement in the namespace to define what clusters should be selected in the bound `ManagedClusterSet`.
You can specify `predicates` and `prioritizers` to filter and score clusters.

### Predicates
In `predicates` section, you can select clusters by labels or `clusterClaims`. For instance, you can select 3 clusters with labels `purpose=test` and clusterClaim `platform.open-cluster-management.io=aws` as seen in the following examples.

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

### Prioritizers
In `prioritizerPolicy` section, you can define the policy of prioritizers. For instance, you can select 2 clusters with the largest memory available and pin the placementdecisions as seen in the following examples.
```yaml
apiVersion: cluster.open-cluster-management.io/v1alpha1
kind: Placement
metadata:
  name: placement1
  namespace: default
spec:
  numberOfClusters: 2
  prioritizerPolicy:
    mode: Exact
    configurations:
      - name: ResourceAllocatableMemory
      - name: Steady
        weight: 3
```
- `mode` is either `Exact`, `Additive`, `""` where `""` is Additive by default.
  - In `Additive` mode, any prioritizer not explicitly enumerated is enabled in its default Configurations, in which Steady and Balance prioritizers have the weight of 1 while other prioritizers have the weight of 0. Additive doesn't require configuring all prioritizers. The default Configurations may change in the future, and additional prioritization will happen.
  - In `Exact` mode, any prioritizer not explicitly enumerated is weighted as zero. Exact requires knowing the full set of prioritizers you want, but avoids behavior changes between releases.
- `configurations` represents the configuration of prioritizers.
  - `name` is the name of a prioritizer. Below are the valid names:
    - Balance: balance the decisions among the clusters.
    - Steady: ensure the existing decision is stabilized.
    - ResourceRatioCPU & ResourceRatioMemory: sort clusters based on the allocatable to capacity ratio.
    - ResourceAllocatableCPU & ResourceAllocatableMemory: sort clusters based on the allocatable.
  - `weight` defines the weight of prioritizer. The value must be ranged in [0,10].
    Each prioritizer will calculate an integer score of a cluster in the range of [-100, 100]. The final score of a cluster will be sum(weight * prioritizer_score).
    A higher weight indicates that the prioritizer weights more in the cluster selection, while 0 weight indicate thats the prioritizer is disabled.

A slice of `PlacementDecision` will be created by placement controller in the same namespace, each with a label of `cluster.open-cluster-management.io/placement={placement name}`. `PlacementDecision` contains the results of the cluster selection as seen in the following examples.

```yaml
apiVersion: cluster.open-cluster-management.io/v1alpha1
kind: PlacementDecision
metadata:
  labels:
    cluster.open-cluster-management.io/placement: placement1
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
