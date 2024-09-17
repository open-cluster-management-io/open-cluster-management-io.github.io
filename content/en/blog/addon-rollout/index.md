---
title: Using the GitOps way to deal with the upgrade challenges of multi-cluster tool chains
date: 2024-01-19
author: Hao Qing [@haoqing0110](https://github.com/haoqing0110)
toc_hide: true
---

## Upgrading challenges of tool chains in multi-cluster environments

Open Cluster Management (OCM) is a community-driven project focused on multicluster and multicloud scenarios for Kubernetes applications. It provides functions such as cluster registration, application and workload distribution, and scheduling. Add-on is an extension mechanism based on the foundation components provided by OCM, which allows applications in the Kubernetes ecosystem to be easily migrated to the OCM platform and has the ability to orchestrate and schedule across multiple clusters and multiple clouds. For example, Istio, Prometheus, and Submarine can be expanded to multiple clusters through Add-on. In a multi-cluster environment, how to upgrade the entire tool chain (such as Istio, Prometheus and other tools) gracefully and smoothly is a challenge we encounter in multi-cluster management. A failed upgrade of the tool chain can potentially render thousands of user workloads inaccessible. Therefore, finding an easy and safe upgrade solution across clusters becomes important.

In this article, we will introduce how Open Cluster Management (OCM) treats tool chain upgrades as configuration file changes, allowing users to leverage Kustomize or GitOps to achieve seamless rolling/canary upgrades across clusters.

Before we begin, let us first introduce several concepts in OCM.

## Add-on

On the OCM platform, add-on can apply different configurations on different managed clusters, and can also implement functions such as obtaining data from the control plane (Hub) to the managed cluster. For example, you can use [managed-serviceaccount](https://github.com/open-cluster-management-io/managed-serviceaccount), this add-on returns the specified `ServiceAccount` information on the managed cluster to the hub cluster. You can use the [cluster-proxy](https://github.com/open-cluster-management-io/cluster-proxy) add-on to establish a reverse proxy channel from spoke to hub.

At this stage, there are some add-ons in the OCM community:

- [Multicluster Mesh Addon](https://github.com/open-cluster-management-io/multicluster-mesh) can be used to manage (discovery, deploy and federate) service meshes across multiple clusters in OCM.
- [Submarine Addon](https://github.com/stolostron/submariner-addon) deploys the Submariner Broker on the Hub cluster and the required Submariner components on the managed clusters.
- [Open-telemetry add-on](https://github.com/open-cluster-management-io/addon-contrib/tree/main/open-telemetry-addon) automates the installation of otelCollector on both hub cluster and managed clusters and jaeget-all-in-one on hub cluster for processing and storing the traces.
- [Application lifecycle management](https://open-cluster-management.io/zh/getting-started/integration/app-lifecycle/) enables application lifecycle management in multi-cluster or multi-cloud environments.
- [Policy framework](https://open-cluster-management.io/getting-started/integration/policy-framework/) and [Policy controllers](https://open-cluster-management.io/getting-started/integration/policy-controllers/) allows Hub cluster administrators to easily deploy security-related policies for managed clusters.
- [Managed service account](https://open-cluster-management.io/getting-started/integration/managed-serviceaccount/) enables a hub cluster admin to manage service account across multiple clusters on ease.
- [Cluster proxy](https://open-cluster-management.io/getting-started/integration/cluster-proxy/) provides L4 network connectivity from hub cluster to the managed clusters.

**For more information about add-on, please refer to [Add-on concept](https://open-cluster-management.io/concepts/addon/) and [Add-on Developer Guide](https://open-cluster-management.io/developer-guides/addon/).**

OCM provides two ways to help developers develop their own add-ons:

- Hard mode: Using the built-in mechanism of [addon-framework](https://github.com/open-cluster-management-io/addon-framework), you can follow the [Add-on Development Guide](https://open-cluster-management.io/developer-guides/addon/) to develop the addon manager and addon agent.
- Easy mode: OCM provides a new development model, which can use [AddOnTemplate](https://open-cluster-management.io/developer-guides/addon/#build-an-addon-with-addon-template) to build add-on. In this model, developers do not need to develop the addon manager, but only need to prepare the addon agent's image and `AddOnTemplate`. `AddOnTemplate` describes how to deploy the addon agent and how to register the add-on.

Below is the `ClusterManagementAddOn` and `AddOnTemplate` of a sample add-on. `AddOnTemplate` is treated as an add-on configuration file, defined in `supportedConfigs`. The `AddOnTemplate` resource contains the manifest required to deploy the add-on and the add-on registration method.

```yaml
apiVersion: addon.open-cluster-management.io/v1alpha1
kind: ClusterManagementAddOn
metadata:
   name: hello-template
   annotations:
     addon.open-cluster-management.io/lifecycle: "addon-manager"
spec:
   addOnMeta:
     description: hello-template is an addon built with addon template
     displayName: hello-template
   supportedConfigs: # declare it is a template type addon
   - group: addon.open-cluster-management.io
     resource: addontemplates
     defaultConfig:
       name: hello-template
```

```yaml
apiVersion: addon.open-cluster-management.io/v1alpha1
kind: AddOnTemplate
metadata:
   name: hello-template
spec:
   addonName: hello-template
   agentSpec: #required
       workload:
         manifests:
           - kind: Deployment
             metadata:
               name: hello-template-agent
               namespace: open-cluster-management-agent-addon
...
           - kind: ServiceAccount
             metadata:
               name: hello-template-agent-sa
               namespace: open-cluster-management-agent-addon
           - kind: ClusterRoleBinding
              metadata:
                name: hello-template-agent
...
   registration: #optional
     ...
```

## Placement Decision Strategy

The Placement API is used to select a set of `ManagedClusters` in one or more `ManagedClusterSets` to deploy workloads to these clusters.

**For more introduction to the Placement API, please refer to [Placement concept](https://open-cluster-management.io/concepts/placement/).**

The "input" and "output" of the Placement scheduling process are decoupled into two independent Kubernetes APIs: `Placement` and `PlacementDecision`.

- Placement provides filtering of clusters through the `labelSelector` or the `claimSelector`, and also provides some built-in `prioritizers`, which can score, sort and prioritize the filtered clusters.
- The scheduling results of `Placement` will be placed in `PlacementDecision`, `status.decisions` lists the top N clusters with the highest scores and sorts them by name, and the scheduling results will dynamically change as the cluster changes. The `decisionStrategy` section in Placement can be used to divide the created `PlacementDecision` into multiple groups and define the number of clusters in each decision group. `PlacementDecision` supports paging display, and each resource supports containing 100 cluster names.

Below is an example of `Placement` and `decisionStrategy`. Assume that there are 300 `ManagedClusters` in the global `ManagedClusterSets`, and 10 of them have the label canary. The following example describes grouping the canary-labeled clusters into a group and grouping the remaining clusters into groups of up to 150 clusters each.

```yaml
apiVersion: cluster.open-cluster-management.io/v1beta1
kind: Placement
metadata:
   name: aws-placement
   namespace: default
spec:
   clusterSets:
     - global
   decisionStrategy:
     groupStrategy:
       clustersPerDecisionGroup: 150
       decisionGroups:
       - groupName: canary
         groupClusterSelector:
           labelSelector:
             matchExpressions:
               - key: canary
                 operator: Exists

```

The grouped results will be displayed in the `status` of `Placement`. The canary group has 10 clusters, and the results are placed in `aws-placement-decision-1`. The other default groupings are only group index, each group has 150 and 140 clusters respectively. Since a `PlacementDecsion` only supports 100 clusters, the results for each group are put into two `PlacementDecisions`.

```yaml
status:
...
   decisionGroups:
   - clusterCount: 10
     decisionGroupIndex: 0
     decisionGroupName: canary
     decisions:
     - aws-placement-decision-1
   - clusterCount: 150
     decisionGroupIndex: 1
     decisionGroupName: ""
     decisions:
     - aws-placement-decision-2
     - aws-placement-decision-3
   - clusterCount: 140
     decisionGroupIndex: 2
     decisionGroupName: ""
     decisions:
     - placement1-decision-3
     - placement1-decision-4
   numberOfSelectedClusters: 300
```

Taking the canary group as an example, its `PlacementDecision` is as follows, where the label `cluster.open-cluster-management.io/decision-group-index` represents the index of the group to which it belongs, `cluster.open-cluster-management.io/decision-group-name` represents the name of the group it belongs to, and `cluster.open-cluster-management.io/placement` represents the `Placement` it belongs to. Users can flexibly obtain scheduling results through tag selectors.

```yaml
apiVersion: cluster.open-cluster-management.io/v1beta1
kind: PlacementDecision
metadata:
   labels:
     cluster.open-cluster-management.io/decision-group-index: "0"
     cluster.open-cluster-management.io/decision-group-name: canary
     cluster.open-cluster-management.io/placement: aws-placement
   name: aws-placement-decision-1
   namespace: default
status:
   decisions:
   - clusterName: cluster1
     reason: ""
...
   - clusterName: cluster10
     reason: ""
```

## Simplify upgrades the GitOps way

The above briefly introduces the concepts of add-on template and placement decision strategy.

In OCM, we regard the upgrade of add-on as the upgrade of its configuration file. The configuration here can be `AddOnTemplate` or other customized configuration file such as `AddOnDeploymentConfig`. An add-on upgrade is treated as a configuration file update, which enables users to leverage Kustomize or GitOps for seamless cross-cluster rolling/canary upgrades. `RolloutStrategy` defines the upgrade strategy, supports upgrade all, progressive upgrades by cluster and progressive upgrades by cluster group, and can define a set of `MandatoryDecisionGroups` to try new configurations first.

According to the four principles of GitOps, let's take a look at how OCM supports the GitOps approach to address upgrade challenges in multi-cluster environments.

- Declarative

The configuration file used by add-on can be declared in `ClusterManagementAddOn`. The configuration file can be declared in the global `supportedConfigs`, and the configuration file will be applied to all `ManagedClusterAddOn` instances. It can also be declared in different placements under `installStrategy`. The `ManagedClusterAddOn` of the cluster selected by each Placement will have the same configuration file. The configuration declared in placements will override the global configuration.

```yaml
apiVersion: addon.open-cluster-management.io/v1alpha1
kind: ClusterManagementAddOn
metadata:
  name: managed-serviceaccount
spec:
  supportedConfigs:
  - defaultConfig:
      name: managed-serviceaccount-0.4.0
    group: addon.open-cluster-management.io
    resource: addontemplates
  installStrategy:
    placements:
    - name: aws-placement
      namespace: default
      configs:
      - group: addon.open-cluster-management.io
        resource: addondeploymentconfigs
        name: managed-serviceaccount-addon-deploy-config
      rolloutStrategy:
        type: Progressive
        progressive:
          mandatoryDecisionGroups:
          - groupName: "canary"
          maxConcurrency: 1
    type: Placements
```

- Version control

Changes in the add-on configuration file name or spec content will be considered a configuration change and will trigger an upgrade of the add-on. Users can leverage Kustomize or GitOps to control configuration file upgrades.

```yaml
apiVersion: addon.open-cluster-management.io/v1alpha1
kind: AddOnTemplate
metadata:
  name: managed-serviceaccount-0.4.0
spec:
  agentSpec: # required
      workload:
        manifests:
          - kind: Deployment
            metadata:
              name: managed-serviceaccount-addon-agent
              namespace: open-cluster-management-agent-addon
...
          - kind: ServiceAccount
            metadata:
              name: managed-serviceaccount
              namespace: open-cluster-management-agent-addon
…
  registration: # optional
```

- Automation

The OCM component addon-manager-controller under the open-cluster-management-hub namespace is a more general addon manager. It will watch the following two types of add-on and be responsible for maintaining the lifecycle of such add-on. Includes installation and upgrades. When the name or spec content of the configuration file changes, this component will upgrade the add-on according to the upgrade strategy defined by rolloutStrategy.

- Hard mode: Using the add-on developed by the latest [addon-framework](https://github.com/open-cluster-management-io/addon-framework), you need to delete the `WithInstallStrategy()` method in the code and add annotation `addon.open-cluster-management.io/lifecycle: "addon-manager"` in `ClusterManagementAddOn`. For details, refer to [Add-on Development Guide](https://open-cluster-management.io/developer-guides/addon/#managing-the-add-on-agent-lifecycle-by-addon-manager).
- Easy mode: add-on developed using `AddOnTemplate` mode.

```bash
✗ kubectl get deploy -n open-cluster-management-hub
NAME                                       READY   UP-TO-DATE   AVAILABLE   AGE
cluster-manager-addon-manager-controller   1/1     1            1           10h
cluster-manager-placement-controller       1/1     1            1           10h
cluster-manager-registration-controller    1/1     1            1           10h
cluster-manager-registration-webhook       1/1     1            1           10h
cluster-manager-work-webhook               1/1     1            1           10h
```

- Coordination

The spec hash of the add-on configuration file will be recorded in the status of `ClusterManagementAddOn` and `ManagedClusterAddOn`. When the spec hash changes, add-on-manager-controller will continue to update the add-on according to the upgrade strategy defined by rolloutStrategy until `lastAppliedConfig`, `lastKnownGoodConfig` is consistent with `desiredConfig`. In the following example, because `lastAppliedConfig` does not match `desiredConfig`, the add-on status is displayed as "Upgrading".

```yaml
apiVersion: addon.open-cluster-management.io/v1alpha1
kind: ClusterManagementAddOn
metadata:
  name: managed-serviceaccount
…
  status:
    installProgressions:
    - conditions:
      - lastTransitionTime: "2023-09-21T06:53:59Z"
        message: 1/3 upgrading, 0 timeout.
        reason: Upgrading
        status: "False"
        type: Progressing
      configReferences:
       - desiredConfig:
          name: managed-serviceaccount-0.4.1
          specHash: dcf88f5b11bd191ed2f886675f967684da8b5bcbe6902458f672277d469e2044
        group: addon.open-cluster-management.io
        lastAppliedConfig:
          name: managed-serviceaccount-0.4.0
          specHash: 1f7874ac272f3e4266f89a250d8a76f0ac1c6a4d63d18e7dcbad9068523cf187
        lastKnownGoodConfig:
          name: managed-serviceaccount-0.4.0
          specHash: 1f7874ac272f3e4266f89a250d8a76f0ac1c6a4d63d18e7dcbad9068523cf187
        resource: addontemplates
      name: aws-placementl
      namespace: default
```

```yaml
apiVersion: addon.open-cluster-management.io/v1alpha1
kind: ManagedClusterAddOn
metadata:
  name: managed-serviceaccount
  namespace: cluster1
…
status:
  conditions:
  - lastTransitionTime: "2023-09-21T06:53:42Z"
    message: upgrading.
    reason: Upgrading
    status: "False"
    type: Progressing
  configReferences:
  - desiredConfig:
      name: managed-serviceaccount-0.4.1
      specHash: dcf88f5b11bd191ed2f886675f967684da8b5bcbe6902458f672277d469e2044
    group: addon.open-cluster-management.io
    lastAppliedConfig:
      name: managed-serviceaccount-0.4.0
      specHash: dcf88f5b11bd191ed2f886675f967684da8b5bcbe6902458f672277d469e2044
    lastObservedGeneration: 1
    name: managed-serviceaccount-0.4.1
    resource: addontemplates
```

## Three upgrade strategies

The `rolloutStrategy` field of `ClusterManagementAddOn` defines the upgrade strategy. Currently, OCM supports three types of upgrade strategies.

- All

The default upgrade type is All, which means the new configuration file will be applied to all the clusters immediately.

```yaml
apiVersion: addon.open-cluster-management.io/v1alpha1
kind: ClusterManagementAddOn
metadata:
   name: managed-serviceaccount
   annotations:
     addon.open-cluster-management.io/lifecycle: "addon-manager"
spec:
   supportedConfigs:
...
   installStrategy:
     placements:
     - name: aws-placement
       namespace:default
       rolloutStrategy:
         type: All
     type: Placement
```

- Progressive

Progressive means that the new configuration file will be deployed to the selected clusters progressively per cluster. The new configuration file will not be applied to the next cluster unless one of the current applied clusters reach the successful state and haven't breached the `MaxFailures`. We introduced the concept of "Placement Decision Group" earlier. One or more decision groups can be specified in `MandatoryDecisionGroups`. If `MandatoryDecisionGroups` are defined, new configuration files are deployed to these cluster groups first. `MaxConcurrency` defines the maximum number of clusters deployed simultaneously.

```yaml
apiVersion: addon.open-cluster-management.io/v1alpha1
kind: ClusterManagementAddOn
metadata:
   name: managed-serviceaccount
   annotations:
     addon.open-cluster-management.io/lifecycle: "addon-manager"
spec:
   supportedConfigs:
...
   installStrategy:
     placements:
     - name: aws-placement
       namespace:default
       rolloutStrategy:
         type: Progressive
         progressive:
           mandatoryDecisionGroups:
           - groupName: "canary"
           maxConcurrency: 1
     type: Placements
```

- ProgressivePerGroup

ProgressivePerGroup means that the new configuration file will be deployed to decisionGroup clusters progressively per group. The new configuration file will not be applied to the next cluster group unless all the clusters in the current group reach the successful state and haven't breached the `MaxFailures`. If `MandatoryDecisionGroups` are defined, new configuration files are deployed to these cluster groups first. If there are no `MandatoryDecisionGroups`, the cluster group will be upgraded in order of index.

```yaml
apiVersion: addon.open-cluster-management.io/v1alpha1
kind: ClusterManagementAddOn
metadata:
   name: managed-serviceaccount
   annotations:
     addon.open-cluster-management.io/lifecycle: "addon-manager"
spec:
   supportedConfigs:
...
   installStrategy:
     placements:
     - name: aws-placement
       namespace:default
       rolloutStrategy:
         type: ProgressivePerGroup
         progressivePerGroup:
           mandatoryDecisionGroups:
           - groupName: "canary"
     type: Placements
```

According to the four principles of GitOps and the three upgrade strategies of OCM, users can use Kustomize or GitOps to achieve seamless rolling/canary upgrades across clusters. It is worth noting that installStrategy supports multiple placement definitions, and users can implement more advanced upgrade strategies based on this.

As in the example below, you can define two placements at the same time to select clusters on aws and gcp respectively, so that the same add-on can use different configuration files and upgrade strategies in different clusters.

```yaml
apiVersion: addon.open-cluster-management.io/v1alpha1
kind: ClusterManagementAddOn
metadata:
   name: managed-serviceaccount
   annotations:
     addon.open-cluster-management.io/lifecycle: "addon-manager"
spec:
   supportedConfigs:
...
   installStrategy:
     placements:
     - name: aws-placement
       namespace: default
       configs:
       - group: addon.open-cluster-management.io
         resource: addondeploymentconfigs
         name: managed-serviceaccount-addon-deploy-config-aws
       rolloutStrategy:
         type: ProgressivePerGroup
         progressivePerGroup:
           mandatoryDecisionGroups:
           - groupName: "canary"
     type: Placements
     - name: gcp-placement
       namespace: default
       configs:
       - group: addon.open-cluster-management.io
         resource: addondeploymentconfigs
         name: managed-serviceaccount-addon-deploy-config-gcp
       rolloutStrategy:
         type: ProgressivePerGroup
         progressivePerGroup:
           mandatoryDecisionGroups:
           - groupName: "canary"
     type: Placements
```

## Three upgrade configurations

The `rolloutStrategy` upgrade strategy can also define `MinSuccessTime`, `ProgressDeadline` and `MaxFailures` to achieve more fine-grained upgrade configuration.

- MinSuccessTime

`MinSuccessTime` defines how long the controller needs to wait before continuing to upgrade the next cluster when the addon upgrade is successful and `MaxFailures` is not reached. The default value is 0 meaning the controller proceeds immediately after a successful state is reached.

In the following example, add-on will be upgraded at a rate of one cluster every 5 minutes.

```yaml
apiVersion: addon.open-cluster-management.io/v1alpha1
kind: ClusterManagementAddOn
metadata:
   name: managed-serviceaccount
   annotations:
     addon.open-cluster-management.io/lifecycle: "addon-manager"
spec:
   supportedConfigs:
...
   installStrategy:
     placements:
     - name: aws-placement
       namespace: default
       rolloutStrategy:
         type: Progressive
         progressive:
           mandatoryDecisionGroups:
           - groupName: "canary"
           maxConcurrency: 1
           minSuccessTime: "5m"
     type: Placements
```

- ProgressDeadline

`ProgressDeadline` defines the maximum time for the controller to wait for the add-on upgrade to be successful. If the add-on does not reach a successful state after `ProgressDeadline`, controller will stop waiting and this cluster will be treated as "timeout" and be counted into `MaxFailures`. Once the `MaxFailures` is breached, the rollout will stop. The default value is "None", which means the controller will wait for a successful state indefinitely.

In the following example, the controller will wait for 10 minutes on each cluster until the addon upgrade is successful. If it fails after 10 minutes, the upgrade status of the cluster will be marked as "timeout".

```yaml
apiVersion: addon.open-cluster-management.io/v1alpha1
kind: ClusterManagementAddOn
metadata:
   name: managed-serviceaccount
   annotations:
     addon.open-cluster-management.io/lifecycle: "addon-manager"
spec:
   supportedConfigs:
...
   installStrategy:
     placements:
     - name: aws-placement
       namespace:default
       rolloutStrategy:
         type: Progressive
         progressive:
           mandatoryDecisionGroups:
           - groupName: "canary"
           maxConcurrency: 1
           progressDeadline: "10m"
     type: Placements
```

- MaxFailures

`MaxFailures` defines the number of clusters that can tolerate upgrade failures, which can be a numerical value or a percentage. If the cluster status is failed or timeout, it will be regarded as an upgrade failure. If the failed cluster exceeds `MaxFailures`, the upgrade will stop.

In the following example, when 3 addons fail to upgrade or does not reach successful status for more than 10 minutes, the upgrade will stop.

```yaml
apiVersion: addon.open-cluster-management.io/v1alpha1
kind: ClusterManagementAddOn
metadata:
   name: managed-serviceaccount
   annotations:
     addon.open-cluster-management.io/lifecycle: "addon-manager"
spec:
   supportedConfigs:
...
   installStrategy:
     placements:
     - name: aws-placement
       namespace: default
       rolloutStrategy:
         type: Progressive
         progressive:
           mandatoryDecisionGroups:
           - groupName: "canary"
           maxConcurrency: 1
           maxFailures: 2
           progressDeadline: "10m"
     type: Placements
```

## Summary

This article details how to use Open Cluster Management to address tool chain upgrade challenges in a multi-cluster environment using the GitOps way. OCM provides a Kubernetes-based management platform across multiple clusters and multiple clouds. Through Add-on and Placement API, users can upgrade the entire tool chain gracefully and smoothly. At the same time, OCM treats add-on upgrades as configuration file changes, enabling users to leverage Kustomize or GitOps for seamless rolling/canary upgrades across clusters. In addition, OCM also provides a variety of upgrade strategies, including all upgrade (All), progressive upgrade by cluster (Progressive) and progressive upgrade by cluster group (ProgressivePerGroup) to meet different upgrade needs.