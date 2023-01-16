---
title: Placement
weight: 3
---

<!-- spellchecker-disable -->

{{< toc >}}

<!-- spellchecker-enable -->

**API-CHANGE NOTE**:

The `Placement` and `PlacementDecision` API v1alpha1 version will no longer be served in OCM v0.9.0.

- Migrate manifests and API clients to use the `Placement` and `PlacementDecision` API v1beta1 version, available since OCM v0.7.0.
- All existing persisted objects are accessible via the new API.
- Notable changes:
  - The field `spec.prioritizerPolicy.configurations.name` in `Placement` API v1alpha1 is removed and replaced by
`spec.prioritizerPolicy.configurations.scoreCoordinate.builtIn` in v1beta1.


## Overall

`Placement` concept is used to dynamically select a set of [managedClusters](../managedcluster) 
in one or multiple [ManagedClusterSet](../managedclusterset) so that higher level
users can either replicate Kubernetes resources to the member clusters or run
their advanced workload i.e. __multi-cluster scheduling__.

The "input" and "output" of the scheduling process are decoupled into two
separated Kubernetes API `Placement` and `PlacementDecision`. As is shown in
the following picture, we prescribe the scheduling policy in the spec of
`Placement` API and the placement controller in the hub will help us to
dynamically select a slice of managed clusters from the given cluster sets.
The selected clusters will be listed in `PlacementDecision`.

<div style="text-align: center; padding: 20px;">
   <img src="/placement-explain.png" alt="Placement" style="margin: 0 auto; width: 60%">
</div>


Following the architecture of Kubernetes' original scheduling framework, the
multi-cluster scheduling is logically divided into two phases internally:

- __Predicate__: Hard requirements for the selected clusters.
- __Prioritize__: Rank the clusters by the soft requirements and select a subset
  among them.

## Select clusters in ManagedClusterSet

By following [the previous section](../managedclusterset) about
`ManagedClusterSet`, now we're supposed to have one or multiple valid cluster
sets in the hub clusters. Then we can move on and create a placement in the
"workspace namespace" by specifying `predicates` and `prioritizers` in the
`Placement` API to define our own multi-cluster scheduling policy.

### Predicates

#### Label/Claim selection

In the `predicates` section, you can select clusters by labels or [clusterClaims](../clusterclaim).
For instance, you can select 3 clusters with label `purpose=test` and
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

#### Taints/Tolerations

To support filtering unhealthy/not-reporting clusters and keep workloads from
being placed in unhealthy or unreachable clusters, we introduce the similar
concept of taint/toleration in Kubernetes. It also allows user to add a
customized taint to deselect a cluster from placement. This is useful when the
user wants to set a cluster to maintenance mode and evict workload from this
cluster.

In OCM, Taints and Tolerations work together to allow users to control the
selection of managed clusters more flexibly.

[Taints](../managedcluster/#cluster-taints-and-tolerations) are properties of
ManagedClusters, they allow a Placement to repel a set of ManagedClusters in
predicates stage.

Tolerations are applied to Placements, and allow Placements to select
ManagedClusters with matching taints. 

The following example shows how to tolerate clusters with taints.

- Tolerate clusters with taint

    Suppose your managed cluster has taint added as below.

    ```yaml
    apiVersion: cluster.open-cluster-management.io/v1
    kind: ManagedCluster
    metadata:
      name: cluster1
    spec:
      hubAcceptsClient: true
      taints:
        - effect: NoSelect
          key: gpu
          value: "true"
          timeAdded: '2022-02-21T08:11:06Z'
    ```

    By default, the placement won’t select this cluster unless you define tolerations.
    
    ```yaml
    apiVersion: cluster.open-cluster-management.io/v1beta1
    kind: Placement
    metadata:
      name: placement
      namespace: ns1
    spec:
      tolerations:
        - key: gpu
          value: "true"
          operator: Equal
    ```
    With the above tolerations defined, cluster1 could be selected by placement
    because of the `key: gpu` and `value: "true"` match.

- Tolerate clusters with taint for a period of time

    `TolerationSeconds` represents the period of time the toleration tolerates the
    taint. It could be used for the case like, when a managed cluster gets offline,
    users can make applications deployed on this cluster to be transferred to
    another available managed cluster after a tolerated time. 

    ```yaml
    apiVersion: cluster.open-cluster-management.io/v1
    kind: ManagedCluster
    metadata:
      name: cluster1
    spec:
      hubAcceptsClient: true
      taints:
        - effect: NoSelect
          key: cluster.open-cluster-management.io/unreachable
          timeAdded: '2022-02-21T08:11:06Z'
    ```

    If define a placement with `TolerationSeconds` as below, then the workload will
    be transferred to another available managed cluster after 5 minutes.

    ```yaml
    apiVersion: cluster.open-cluster-management.io/v1alpha1
    kind: Placement
    metadata:
      name: placement
      namespace: ns1
    spec:
      tolerations:
        - key: cluster.open-cluster-management.io/unreachable
          operator: Exists
          tolerationSeconds: 300
    ```

In `tolerations` section, it includes the
following fields:
- __Key__ (optional). Key is the taint key that the toleration applies to.
- __Value__ (optional). Value is the taint value the toleration matches to.
- __Operator__ (optional). Operator represents a key's relationship to the
value. Valid operators are `Exists` and `Equal`. Defaults to `Equal`. A
toleration "matches" a taint if the keys are the same and the effects are the
same, and the operator is:
  - `Equal`. The operator is Equal and the values are equal.
  - `Exists`. Exists is equivalent to wildcard for value, so that a placement
  can tolerate all taints of a particular category.
- __Effect__ (optional). Effect indicates the taint effect to match. Empty means
match all taint effects. When specified, allowed values are `NoSelect`,
`PreferNoSelect` and `NoSelectIfNew`. (`PreferNoSelect` is not implemented yet,
currently clusters with effect `PreferNoSelect` will always be selected.)
- __TolerationSeconds__ (optional). TolerationSeconds represents the period of
time the toleration (which must be of effect `NoSelect`/`PreferNoSelect`,
otherwise this field is ignored) tolerates the taint. The default value is nil,
which indicates it tolerates the taint forever. The start time of counting the
TolerationSeconds should be the `TimeAdded` in Taint, not the cluster scheduled
time or `TolerationSeconds` added time.

### Prioritizers

#### Score-based prioritizer

In `prioritizerPolicy` section, you can define the policy of prioritizers.

The following example shows how to select clusters with prioritizers.

- Select a cluster with the largest allocatable memory.

    ```yaml
    apiVersion: cluster.open-cluster-management.io/v1beta1
    kind: Placement
    metadata:
      name: placement
      namespace: ns1
    spec:
      numberOfClusters: 1
      prioritizerPolicy:
        configurations:
          - scoreCoordinate:
              builtIn: ResourceAllocatableMemory
    ```

    The prioritizer policy has default mode additive and default prioritizers `Steady` and `Balance`. 
    
    In the above example, the prioritizers actually come into effect are `Steady`, `Balance` and `ResourceAllocatableMemory`.

    And the end of this section has more description about the prioritizer policy mode and default prioritizers.

- Select a cluster with the largest allocatable CPU and memory, and make placement sensitive to resource changes.

    ```yaml
    apiVersion: cluster.open-cluster-management.io/v1beta1
    kind: Placement
    metadata:
      name: placement
      namespace: ns1
    spec:
      numberOfClusters: 1
      prioritizerPolicy:
        configurations:
          - scoreCoordinate:
              builtIn: ResourceAllocatableCPU
            weight: 2
          - scoreCoordinate:
              builtIn: ResourceAllocatableMemory
            weight: 2
    ```

    The prioritizer policy has default mode additive and default prioritizers `Steady` and `Balance`, and their default 
    weight is 1.

    In the above example, the prioritizers actually come into effect are `Steady` with weight 1, `Balance` with weight 1, 
    `ResourceAllocatableCPU` with weight 2 and `ResourceAllocatableMemory` with weight 2. The cluster score will be a 
    combination of the 4 prioritizers score. Since `ResourceAllocatableCPU` and `ResourceAllocatableMemory` have higher 
    weight, they will be weighted more in the results, and make placement sensitive to resource changes.

    And the end of this section has more description about the prioritizer weight and how the final score is calculated.

- Select two clusters with the largest addon score CPU ratio, and pin the placement decisions.

  ```yaml
  apiVersion: cluster.open-cluster-management.io/v1beta1
  kind: Placement
  metadata:
    name: placement
    namespace: ns1
  spec:
    numberOfClusters: 2
    prioritizerPolicy:
      mode: Exact
      configurations:
        - scoreCoordinate:
            builtIn: Steady
          weight: 3
        - scoreCoordinate:
            type: AddOn
            addOn:
              resourceName: default
              scoreName: cpuratio
  ```

  In the above example, explicitly define the mode as exact. The prioritizers actually come into effect are `Steady` with 
  weight 3 and addon score cpuratio with weight 1. Go into the [Extensible scheduling](#extensible-scheduling) section 
  to learn more about addon score.

In `prioritizerPolicy` section, it includes the following fields:
- `mode` is either `Exact`, `Additive` or `""`, where `""` is `Additive` by default.
    - In `Additive` mode, any prioritizer not explicitly enumerated is enabled
    in its default `Configurations`, in which `Steady` and `Balance` prioritizers have
    the weight of 1 while other prioritizers have the weight of 0. `Additive`
    doesn't require configuring all prioritizers. The default `Configurations` may
    change in the future, and additional prioritization will happen.
    - In `Exact` mode, any prioritizer not explicitly enumerated is weighted as
    zero. `Exact` requires knowing the full set of prioritizers you want, but
    avoids behavior changes between releases.
- `configurations` represents the configuration of prioritizers.
    - `scoreCoordinate` represents the configuration of the prioritizer and
    score source.
        - `type` defines the type of the prioritizer score.
          Type is either `BuiltIn`, `AddOn` or "", where "" is `BuiltIn` by default.
          When the type is `BuiltIn`, a `BuiltIn` prioritizer name must be specified.
          When the type is `AddOn`, need to configure the score source in `AddOn`.
            - `builtIn` defines the name of a `BuiltIn` prioritizer. Below are the
            valid `BuiltIn` prioritizer names.
                - `Balance`: balance the decisions among the clusters.
                - `Steady`: ensure the existing decision is stabilized.
                - `ResourceAllocatableCPU`: sort clusters based on the allocatable CPU.
                - `ResourceAllocatableMemory`: sort clusters based on the allocatable memory.
            - `addOn` defines the resource name and score name.
            `AddOnPlacementScore` is introduced to describe addon scores, go into
            the [Extensible scheduling](#extensible-scheduling) section to learn
            more about it.
                - `resourceName` defines the resource name of the
                `AddOnPlacementScore`. The placement prioritizer selects
                `AddOnPlacementScore` CR by this name.
                - `scoreName` defines the score name inside `AddOnPlacementScore`.
                `AddOnPlacementScore` contains a list of score name and score value,
                `scoreName` specifies the score to be used by the prioritizer.
    - `weight` defines the weight of the prioritizer. The value must be ranged in
    [-10,10].
      Each prioritizer will calculate an integer score of a cluster in the range
      of [-100, 100]. The final score of a cluster will be sum(weight *
      prioritizer_score).
      A higher weight indicates that the prioritizer weights more in the cluster
      selection, while 0 weight indicates that the prioritizer is disabled. A
      negative weight indicates wanting to select the last ones.

#### Extensible scheduling
In placement resource based scheduling, in some cases the prioritizer needs
extra data (more than the default value provided by ManagedCluster) to calculate
the score of the managed cluster. For example, schedule the clusters based on
cpu or memory usage data of the clusters fetched from a monitoring system.

So we provide a new API `AddOnPlacementScore` to support a more extensible way
to schedule based on customized scores.
- As a user, as mentioned in the above section, can specify the score in
placement yaml to select clusters.
- As a score provider, a 3rd party controller could run on either hub or managed
cluster, to maintain the lifecycle of `AddOnPlacementScore` and update score
into it.

[Extend the multi-cluster scheduling capabilities with placement](https://open-cluster-management.io/scenarios/extend-multicluster-scheduling-capabilities/)
introduces how to implement a customized score provider.

Refer to the
[enhancements](https://github.com/open-cluster-management-io/enhancements/blob/main/enhancements/sig-architecture/32-extensiblescheduling/32-extensiblescheduling.md)
to learn more.
      
## PlacementDecisions

A slice of `PlacementDecision` will be created by placement controller in the
same namespace, each with a label of
`cluster.open-cluster-management.io/placement={placement name}`.
`PlacementDecision` contains the results of the cluster selection as seen in the
following examples.

```yaml
apiVersion: cluster.open-cluster-management.io/v1beta1
kind: PlacementDecision
metadata:
  labels:
    cluster.open-cluster-management.io/placement: placement1
  name: placement1-decision-1
  namespace: default
status:
  decisions:
    - clusterName: cluster1
    - clusterName: cluster2
    - clusterName: cluster3
```

The `status.decisions` lists the top N clusters with the highest score and ordered
by names. The `status.decisions` changes over time, the scheduling result update
based on what endpoints exist.

The scheduling result in the `PlacementDecision` API is designed to
be paginated with its page index as the name's suffix to avoid "too large
object" issue from the underlying Kubernetes API framework.

`PlacementDecision` can be consumed by another operand to decide how the
workload should be placed in multiple clusters.

## Troubleshooting
If no `PlacementDecision` generated after you creating `Placement`, you can run below commands to troubleshoot.

### Check the `Placement` conditions

For example:
```bash
$ kubectl describe placement <placement-name> 
Name:         demo-placement
Namespace:    default
Labels:       <none>
Annotations:  <none>
API Version:  cluster.open-cluster-management.io/v1beta1
Kind:         Placement
...
Status:
  Conditions:
    Last Transition Time:       2022-09-30T07:39:45Z
    Message:                    Placement configurations check pass
    Reason:                     Succeedconfigured
    Status:                     False
    Type:                       PlacementMisconfigured
    Last Transition Time:       2022-09-30T07:39:45Z
    Message:                    No valid ManagedClusterSetBindings found in placement namespace
    Reason:                     NoManagedClusterSetBindings
    Status:                     False
    Type:                       PlacementSatisfied
  Number Of Selected Clusters:  0
...
```
The Placement has 2 types of condition, `PlacementMisconfigured` and `PlacementSatisfied`.
- If the condition `PlacementMisconfigured` is true, means your placement has configuration errors, the message tells you more details about the failure.
- If the condition `PlacementSatisfied` is false, means no `ManagedCluster` satisfy this placement, the message tells you more details about the failure. 
In this example, it is because no `ManagedClusterSetBindings` found in placement namespace.

### Check the `Placement` events

For example:
```bash
$ kubectl describe placement <placement-name> 
Name:         demo-placement
Namespace:    default
Labels:       <none>
Annotations:  <none>
API Version:  cluster.open-cluster-management.io/v1beta1
Kind:         Placement
...
Events:
  Type    Reason          Age   From                 Message
  ----    ------          ----  ----                 -------
  Normal  DecisionCreate  2m10s   placementController  Decision demo-placement-decision-1 is created with placement demo-placement in namespace default
  Normal  DecisionUpdate  2m10s   placementController  Decision demo-placement-decision-1 is updated with placement demo-placement in namespace default
  Normal  ScoreUpdate     2m10s   placementController  cluster1:0 cluster2:100 cluster3:200
  Normal  DecisionUpdate  3s      placementController  Decision demo-placement-decision-1 is updated with placement demo-placement in namespace default
  Normal  ScoreUpdate     3s      placementController  cluster1:200 cluster2:145 cluster3:189 cluster4:200
```
The placement controller will give a score to each filtered `ManagedCluster` and generate an event for it. When the cluster score
changes, a new event will generate. You can check the score of each cluster in the `Placment` events, to know why some clusters with lower score are not selected.

## Future work

In addition to selecting cluster by predicates, we are still working on other
advanced features including

- [Various workload spread
policies](https://github.com/open-cluster-management-io/community/issues/49).
