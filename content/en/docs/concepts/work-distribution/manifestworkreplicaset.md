---
title: ManifestWorkReplicaSet
weight: 2
---



## What is `ManifestWorkReplicaSet`

`ManifestWorkReplicaSet` is an aggregator API that uses [Manifestwork](https://github.com/open-cluster-management-io/open-cluster-management-io.github.io/blob/main/content/en/concepts/manifestwork.md) and [Placement](https://github.com/open-cluster-management-io/open-cluster-management-io.github.io/blob/main/content/en/concepts/placement.md) to create manifestwork for the placement-selected clusters.

View an example of `ManifestWorkReplicaSet` to deploy a CronJob and Namespace for a group of clusters selected by placements.

```yaml
apiVersion: work.open-cluster-management.io/v1alpha1
kind: ManifestWorkReplicaSet
metadata:
  name: mwrset-cronjob
  namespace: ocm-ns
spec:
  placementRefs:
    - name: placement-rollout-all # Name of a created Placement
      rolloutStrategy:
        rolloutType: All
    - name: placement-rollout-progressive # Name of a created Placement
      rolloutStrategy:
        rolloutType: Progressive
        progressive:
          minSuccessTime: 5m
          progressDeadline: 10m
          maxFailures: 5%
          mandatoryDecisionGroups:
          - groupName: "prod-canary-west"
          - groupName: "prod-canary-east"
    - name: placement-rollout-progressive-per-group # Name of a created Placement
      rolloutStrategy:
        rolloutType: ProgressivePerGroup
        progressivePerGroup:
          progressDeadline: 10m
          maxFailures: 2
  manifestWorkTemplate:
    deleteOption:
      propagationPolicy: SelectivelyOrphan
      selectivelyOrphans:
        orphaningRules:
          - group: ''
            name: ocm-ns
            namespace: ''
            resource: Namespace
    manifestConfigs:
      - feedbackRules:
          - jsonPaths:
              - name: lastScheduleTime
                path: .status.lastScheduleTime
              - name: lastSuccessfulTime
                path: .status.lastSuccessfulTime
            type: JSONPaths
        resourceIdentifier:
          group: batch
          name: sync-cronjob
          namespace: ocm-ns
          resource: cronjobs
    workload:
      manifests:
        - kind: Namespace
          apiVersion: v1
          metadata:
            name: ocm-ns
        - kind: CronJob
          apiVersion: batch/v1
          metadata:
            name: sync-cronjob
            namespace: ocm-ns
          spec:
            schedule: '* * * * *'
            concurrencyPolicy: Allow
            suspend: false
            jobTemplate:
              spec:
                backoffLimit: 2
                template:
                  spec:
                    containers:
                      - name: hello
                        image: 'quay.io/prometheus/busybox:latest'
                        args:
                          - /bin/sh
                          - '-c'
                          - date; echo Hello from the Kubernetes cluster
```
The **PlacementRefs** uses the Rollout Strategy [API](https://github.com/open-cluster-management-io/api/blob/main/cluster/v1alpha1/types_rolloutstrategy.go) to apply the manifestWork to the selected clusters.
In the example above; the placementRefs refers to three placements; placement-rollout-all, placement-rollout-progressive and placement-rollout-progressive-per-group. For more info regards the rollout strategies check the Rollout Strategy section at the [placement](https://github.com/open-cluster-management-io/open-cluster-management-io.github.io/blob/main/content/en/concepts/placement.md) document.
**Note:** The placement reference must be in the same namespace as the manifestWorkReplicaSet.

## Status tracking

The ManifestWorkReplicaSet example above refers to three placements each one will have its placementSummary in ManifestWorkReplicaSet status. The PlacementSummary shows the number of manifestWorks applied to the placement's clusters based on the placementRef's rolloutStrategy and total number of clusters.
The manifestWorkReplicaSet Summary aggregate the placementSummaries showing the total number of applied manifestWorks to all clusters.

The manifestWorkReplicaSet has three status conditions;
1. **PlacementVerified** verify the placementRefs status; not exist or empty cluster selection.
1. **PlacementRolledOut** verify the rollout strategy status; progressing or complete.
1. **ManifestWorkApplied** verify the created manifestWork status; applied, progressing, degraded or available.

The manifestWorkReplicaSet determine the ManifestWorkApplied condition status based on the resource state (applied or available) of each manifestWork.

Here is an example.

```yaml
apiVersion: work.open-cluster-management.io/v1alpha1
kind: ManifestWorkReplicaSet
metadata:
  name: mwrset-cronjob
  namespace: ocm-ns
spec:
  placementRefs:
    - name: placement-rollout-all
      ...
    - name: placement-rollout-progressive
      ...
    - name: placement-rollout-progressive-per-group
      ...
  manifestWorkTemplate:
     ...
status:
 conditions:
   - lastTransitionTime: '2023-04-27T02:30:54Z'
     message: ''
     reason: AsExpected
     status: 'True'
     type: PlacementVerified
   - lastTransitionTime: '2023-04-27T02:30:54Z'
     message: ''
     reason: Progressing
     status: 'False'
     type: PlacementRolledOut
   - lastTransitionTime: '2023-04-27T02:30:54Z'
     message: ''
     reason: AsExpected
     status: 'True'
     type: ManifestworkApplied
 placementSummary:
 - name: placement-rollout-all
   availableDecisionGroups: 1 (10 / 10 clusters applied)
   summary:
     applied: 10
     available: 10
     progressing: 0
     degraded: 0
     total: 10
 - name: placement-rollout-progressive
   availableDecisionGroups: 3 (20 / 30 clusters applied)
   summary:
     applied: 20
     available: 20
     progressing: 0
     degraded: 0
     total: 20
 - name: placement-rollout-progressive-per-group
   availableDecisionGroups: 4 (15 / 20 clusters applied)
   summary:
     applied: 15
     available: 15
     progressing: 0
     degraded: 0
     total: 15
 summary:
   applied: 45
   available: 45
   progressing: 0
   degraded: 0
   total: 45
```
## Release and Enable Feature

ManifestWorkReplicaSet is in alpha release and it is not enabled by default. In order to enable the ManifestWorkReplicaSet feature, it has to be enabled in the cluster-manager instance in the hub. Use the following command to edit the cluster-manager CR (custom resource) in the hub cluster.

```shell
$ oc edit ClusterManager cluster-manager
```
Add the workConfiguration field to the cluster-manager CR as below and save.

```yaml
kind: ClusterManager
metadata:
  name: cluster-manager
spec:
   ...
  workConfiguration:
    featureGates:
    - feature: ManifestWorkReplicaSet
      mode: Enable
```
In order to assure the ManifestWorkReplicaSet has been enabled successfully check the cluster-manager using the command below

```shell
$ oc get ClusterManager cluster-manager -o yml
```
You should find under the status->generation the cluster-manager-work-controller deployment has been added as below

```yaml
kind: ClusterManager
metadata:
  name: cluster-manager
spec:
   ...
status:
   ...
  generations:
    ...
  - group: apps
    lastGeneration: 2
    name: cluster-manager-work-webhook
    namespace: open-cluster-management-hub
    resource: deployments
    version: v1
  - group: apps
    lastGeneration: 1
    name: cluster-manager-work-controller
    namespace: open-cluster-management-hub
    resource: deployments
    version: v1
```
