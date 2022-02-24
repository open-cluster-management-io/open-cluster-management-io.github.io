---
title: 匹配路由
weight: 3
---

<!-- spellchecker-disable -->

{{< toc >}}

<!-- spellchecker-enable -->

**API-CHANGE NOTE**:
`Placement` and `PlacementDecision` API is upgraded from v1alpha1 to v1beta1,
v1alpha1 will be deprecated in OCM v0.7.0 and planned to be removed in OCM
v0.8.0. The field `spec.prioritizerPolicy.configurations.name` in `Placement`
API v1alpha1 is removed and replaced by
`spec.prioritizerPolicy.configurations.scoreCoordinate.builtIn` in v1beta1.


## Overall

`Placement` concept is used to dynamically select a set of managed clusters in
one or multiple [ManagedClusterSet](../managedclusterset) so that higher level
users can either replicate Kubernetes resources to the member clusters or run
their advanced workload i.e. __multi-cluster scheduling__.

The "input" and "output" of the scheduling process are decoupled into two
separated Kubernetes API `Placement` and `PlacementDecision`. As is shown in
the following picture, we prescribe the scheduling policy in the spec of
`Placement` API and the placement controller in the hub will help us to
dynamically select a slice of managed clusters from the given cluster sets.

Note that the scheduling result in the `PlacementDecision` API is designed to
be paginated with its page index as the name's suffix to avoid "too large
object" issue from the underlying Kubernetes API framework.

<div style="text-align: center; padding: 20px;">
   <img src="/placement-explain.png" alt="Placement" style="margin: 0 auto; width: 60%">
</div>


Following the architecture of Kubernetes' original scheduling framework, the
multi-cluster scheduling is logically divided into two phases internally:

- __Predicate__: Hard requirements for the selected clusters.
- __Prioritize__: Rank the clusters by the soft requirements and select a subset
  among them.

## Select clusters in ManagedClusterSet

By following [the pervious section](../managedclusterset) about
`ManagedClusterSet`, now we're supposed to have one or multiple valid cluster
sets in the hub clusters. Then we can move on and create a placement in the
"workspace namespace" by specifying `predicates` and `prioritizers` in the
`Placement` API to define our own multi-cluster scheduling policy.

### Predicates

#### Label/Claim selection

In `predicates` section, you can select clusters by labels or `clusterClaims`.
For instance, you can select 3 clusters with labels `purpose=test` and
clusterClaim `platform.open-cluster-management.io=aws` as seen in the following
examples:

```yaml
apiVersion: cluster.open-cluster-management.io/v1beta1
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

Note that the distinction between label-selecting and claim-selecting is
elaborated in [this page](https://open-cluster-management.io/scenarios/extending-managed-clusters/)
about how to extend attributes for the managed clusters.

### Prioritizers


#### Score-based prioritizer

In `prioritizerPolicy` section, you can define the policy of prioritizers.
For instance, you can select 2 clusters with the largest memory available and
the largest addon score cpuratio, and pin the placementdecisions as seen in the
following examples.

```yaml
apiVersion: cluster.open-cluster-management.io/v1beta1
kind: Placement
metadata:
  name: placement1
  namespace: default
spec:
  numberOfClusters: 2
  prioritizerPolicy:
    mode: Exact
    configurations:
      - scoreCoordinate:
          builtIn: ResourceAllocatableMemory
      - scoreCoordinate:
          builtIn: Steady
        weight: 3
      - scoreCoordinate:
          type: AddOn
          addOn:
            resourceName: default
            scoreName: cpuratio
```

- `mode` is either `Exact`, `Additive`, `""` where `""` is Additive by default.
    - In `Additive` mode, any prioritizer not explicitly enumerated is enabled in its default Configurations, in which Steady and Balance prioritizers have the weight of 1 while other prioritizers have the weight of 0. Additive doesn't require configuring all prioritizers. The default Configurations may change in the future, and additional prioritization will happen.
    - In `Exact` mode, any prioritizer not explicitly enumerated is weighted as zero. Exact requires knowing the full set of prioritizers you want, but avoids behavior changes between releases.
- `configurations` represents the configuration of prioritizers.
    - `scoreCoordinate` represents the configuration of the prioritizer and score source.
        - `type` defines the type of the prioritizer score.
          Type is either "BuiltIn", "AddOn" or "", where "" is "BuiltIn" by default.
          When the type is "BuiltIn", a BuiltIn prioritizer name must be specified.
          When the type is "AddOn", need to configure the score source in AddOn.
        - `builtIn` defines the name of a BuiltIn prioritizer. Below are the valid BuiltIn prioritizer names.
            - Balance: balance the decisions among the clusters.
            - Steady: ensure the existing decision is stabilized.
            - ResourceAllocatableCPU & ResourceAllocatableMemory: sort clusters based on the allocatable.
        - `addOn` defines the resource name and score name. `AddOnPlacementScore` is introduced to describe addon scores, go into the "Extensible scheduling" section to learn more about it.
            - `resourceName` defines the resource name of the `AddOnPlacementScore`. The placement prioritizer selects `AddOnPlacementScore` CR by this name.
            - `scoreName` defines the score name inside `AddOnPlacementScore`. `AddOnPlacementScore` contains a list of score name and score value, ScoreName specify the score to be used by the prioritizer.
    - `weight` defines the weight of prioritizer. The value must be ranged in [-10,10].
      Each prioritizer will calculate an integer score of a cluster in the range of [-100, 100]. The final score of a cluster will be sum(weight * prioritizer_score).
      A higher weight indicates that the prioritizer weights more in the cluster selection, while 0 weight indicates that the prioritizer is disabled. A negative weight indicates wants to select the last ones.

A slice of `PlacementDecision` will be created by placement controller in the same namespace, each with a label of `cluster.open-cluster-management.io/placement={placement name}`. `PlacementDecision` contains the results of the cluster selection as seen in the following examples.

```yaml
apiVersion: cluster.open-cluster-management.io/v1beta1
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

## Extensible scheduling
In placement resource based scheduling, in some cases the prioritizer needs extra data (more than the default value provided by ManagedCluster) to calculate the score of the managed cluster. For example, schedule the clusters based on cpu or memory usage data of the clusters fetched from a monitoring system.

So we provide a new API `AddOnPlacementScore` to support a more extensible way to schedule based on customized scores.
- As a user, as mentioned in the above section, can specify the score in placement yaml to select clusters.
- As a score provider, a 3rd party controller could run on either hub or managed cluster, to maintain the lifecycle of `AddOnPlacementScore` and update score into it.

Refer to the [enhancements](https://github.com/open-cluster-management-io/enhancements/blob/main/enhancements/sig-architecture/32-extensiblescheduling/32-extensiblescheduling.md) to learn more.

## Future work

In addition to selecting cluster by predicates, we are still working on other advanced features including

- [Taint/Toleration of ManagedCluster](https://github.com/open-cluster-management-io/community/issues/48).
- [Various workload spread policies](https://github.com/open-cluster-management-io/community/issues/49).
- [Usage based scheduling](https://github.com/open-cluster-management-io/community/issues/52).
