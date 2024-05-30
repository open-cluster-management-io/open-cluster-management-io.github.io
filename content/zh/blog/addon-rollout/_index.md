---
title: 以GitOps方式应对多集群工具链的升级挑战
---

2023 年 10 月 27 日 [郝青](https://github.com/haoqing0110)

{{< toc >}}

## 多集群环境下工具链的升级挑战

OCM（open-cluster-management）是一个专注于 Kubernetes 应用跨多集群和多云的管理平台，提供了集群的注册，应用和负载的分发，调度等基础功能。Add-on 插件是 OCM 提供的一种基于基础组件的扩展机制，可以让 Kubernetes 生态的应用很容易迁移到 OCM 平台上，拥有跨多集群多云的编排和调度的能力。如 Istio，Prometheus，Submarine 可以通过 Add-on 的方式扩展至多集群。在多集群环境中，如何优雅、平滑地升级整个工具链（比如 Istio、Prometheus 和其他工具）是我们在多集群管理中遇到的挑战，工具链的升级失败可能会导致数千个用户工作负载无法访问。因此，找到一种简单、安全的跨集群升级解决方案变得非常重要。

本文我们将介绍 Open Cluster Management(OCM)如何将工具链升级视为配置文件的变更，使用户能够利用 Kustomize 或 GitOps 实现跨集群的无缝滚动/金丝雀升级。

在正式开始前，首先介绍几个 OCM 中的概念。

## add-on 插件

在 OCM 平台上，add-on 插件可以实现在不同托管集群（Spoke）上应用不同的配置，也可以实现从控制面（Hub）获取数据到 Spoke 集群上等功能。比如：你可以使用[managed-serviceaccount](https://github.com/open-cluster-management-io/managed-serviceaccount)
插件在 Spoke 集群上将指定的 ServiceaCount 信息返回给 Hub 集群，可以使用[cluster-proxy](https://github.com/open-cluster-management-io/cluster-proxy)插件建立一个从 spoke 到 hub 的反向代理通道。

现阶段 OCM 社区已经有的一些 add-on：

- [Multicluster Mesh Addon](https://github.com/open-cluster-management-io/multicluster-mesh) 可用于管理（发现、部署和联合）OCM 中跨多个集群的服务网格。
- [Submarine Addon](https://github.com/stolostron/submariner-addon) 让[Submarine](https://github.com/submariner-io/submariner)
  和 OCM 方便集成，在 hub cluster 上部署 Submariner Broker，在 managed cluster 上部署所需的 Submariner 组件, 为托管集群提供跨集群的 Pod 和 Service 网络互相访问的能力。
- [Open-telemetry add-on](https://github.com/open-cluster-management-io/addon-contrib/tree/main/open-telemetry-addon) 自动在 hub cluster 和 managed cluster 上
  安装 otelCollector，并在 hub cluster 上自动安装 jaeger-all-in-one 以处理和存储 traces。
- [Application lifecycle management](https://open-cluster-management.io/zh/getting-started/integration/app-lifecycle/)
  实现多集群或多云环境中的应用程序生命周期管理。add-on 插件提供了一套通过 Subscriptions 订阅 channel，将 github 仓库，Helm release 或者对象存储仓库的应用分发到指定 Spoke 集群上的机制。
- [Policy framework](https://open-cluster-management.io/getting-started/integration/policy-framework/)和[Policy controllers](https://open-cluster-management.io/getting-started/integration/policy-controllers/) add-on 插件可以让 Hub 集群管理员很轻松为 Spoke 集群部署安全相关的 policy 策略。
- [Managed service account](https://open-cluster-management.io/getting-started/integration/managed-serviceaccount/) add-on 插件可以让 Hub 集群管理员很容易管理 Spoke 集群上 serviceaccount。
- [Cluster proxy](https://open-cluster-management.io/getting-started/integration/cluster-proxy/) add-on 插件通过反向代理通道提供了 Hub 和 Spoke 集群之间 L4 网络连接。

**更多关于 add-on 插件的介绍可以参考[详解 OCM add-on 插件](https://open-cluster-management.io/zh/blog/addon-introduction/)。**

OCM 提供了两种方式帮助开发者开发自己的 add-on：

- Hard 模式：使用[addon-framework](https://github.com/open-cluster-management-io/addon-framework)的内置机制，可根据[Add-on 开发指南](https://open-cluster-management.io/developer-guides/addon/)来开发 add-on 插件的 addon manager 和 addon agent。
- Easy 模式：OCM 提供了一个新的插件开发模型，可使用[AddOnTemplate](https://open-cluster-management.io/developer-guides/addon/#build-an-addon-with-addon-template)来构建 add-on。在此模型中开发者无需开发 addon manager，只需准备 addon agent 的 image 和 AddOnTemplate，AddOnTemplate 描述了如何部署 addon agent 以及如何注册 addon。

如下是一个样例 add-on 的 ClusterManagementAddOn 和 AddOnTemplate。AddOnTemplate 被视为 add-on 一个配置文件，定义在 supportedConfigs 中。AddOnTemplate 资源中则包含了部署 add-on 所需的 manifest 以及 add-on 的注册方式。

```yaml
apiVersion: addon.open-cluster-management.io/v1alpha1
kind: ClusterManagementAddOn
metadata:
  name: hello-template
  annotations:
    addon.open-cluster-management.io/lifecycle: "addon-manager"
spec:
  addOnMeta:
    description: hello-template is a addon built with addon template
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
  agentSpec: # required
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
  registration: # optional
    ...
```

## Placement Decision Strategy

Placement API 用于在一个或多个托管集群组(ManagedClusterSet)中选择一组托管群集(ManagedCluster)，以便将工作负载部署到这些群集上。

**更多关于 Placement API 的介绍可以参考[Placement 文档](https://open-cluster-management.io/concepts/placement/)。**

Placement 调度过程的“输入”和“输出”被解耦为两个独立的 Kubernetes API: Placement 和 PlacementDecision。

- Placement 提供了通过标签选择器`labelSelector`或声明选择器`claimSelector`过滤集群，同时也提供了一些内置的优选器`prioritizer`，可对过滤后的集群进行打分排序和优先选择。
- Placement 的调度结果会放在`PlacementDecision`中, `status.decisions`列出得分最高的前 N 个集群并按名称排序，且调度结果会随着集群的变化而动态变化。Placement 中的`decisionStrategy`部分可以用来将创建的`PlacementDecision`划分为多个组，并定义每个决策组中的集群数量。`PlacementDecision`支持分页显示，每个 resource 做多支持放置 100 个集群的名称。

如下是一个 Placement 和`decisionStrategy`的例子。假设 global 集群组中有 300 个托管集群(ManagedCluster)，其中 10 个集群有标签 canary。下面的例子描述了将拥有 canary 标签的集群分为一组，并将剩下的集群以每组最多 150 个集群来进行分组。

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

分组的结果将显示在 Placement 的 status 中。其中 canary 组有 10 个集群，结果放在 aws-placement-decision-1 中。其他的默认分组只有 group index，每组分别有 150 个和 140 个集群。由于一个 PlacementDecsion 只支持 100 个集群，因此每组的结果放入两个 PlacementDecision 中。

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

以 canary 组为例，它的 PlacementDecision 如下所示，其中的标签 cluster.open-cluster-management.io/decision-group-index 代表了所属组的 index，cluster.open-cluster-management.io/decision-group-name 代表了所属组的名称，cluster.open-cluster-management.io/placement 代表了所属于的 Placement。使用者可以通过标签选择器来灵活获取调度结果。

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

## 以 GitOps 方式简化升级

以上简单介绍了 add-on template 和 placement decision strategy 的概念。

在 OCM 中，我们将 add-on 的升级视为其配置文件的升级，这里的配置可以是 AddOnTemplate，也可以是其他自定义的配置文件 AddOnDeploymentConfig。一次 add-on 的升级等同于一次配置文件的更新，这使得用户能够利用 Kustomize 或 GitOps 来进行无缝的跨集群滚动/金丝雀升级。RolloutStrategy 定义了升级策略，支持全部升级(All)，按集群渐进升级(Progressive Per Cluster)和按集群组渐进升级(Progressive Per Group)，并可定义一组 MandatoryDecisionGroups 来优先尝试新配置。

依照 GitOps 的四个原则，我们来看看 OCM 如何支持以 GitOps 的方式应对多集群环境下的升级挑战。

- 声明式

在`ClusterManagementAddOn`中可以声明 add-on 所使用的配置文件。配置文件可在全局的`supportedConfigs`中声明，该配置文件会应用到所有的`ManagedClusterAddOn`实例上。也可在`installStrategy`下不同的 placements 中声明，每个 Placement 所选择集群的`ManagedClusterAddOn`将拥有相同的配置文件，placements 中声明的配置会覆盖全局配置。

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

- 版本控制

add-on 配置文件名称或 spec 内容的变化会被认为是一个配置更改，会触发 add-on 的一次升级。用户可以利用 Kustomize 或 GitOps 来控制配置文件升级。

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

- 自动化

OCM 在 open-cluster-management-hub 命名空间下的组件 addon-manager-controller 是一个更通用的 addon manager，它会 watch 以下两种类型的 add-on 并负责维护此类 add-on 的生命周期，包括安装与升级。当配置文件的名称或者 spec 内容变化时，此组件会按照 rolloutStrategy 所定义的升级策略来升级 add-on。

- Hard 模式：使用最新[addon-framework](https://github.com/open-cluster-management-io/addon-framework)开发的 add-on，需要删除代码中的`WithInstallStrategy()`方法并在`ClusterManagementAddOn`添加 annotation `addon.open-cluster-management.io/lifecycle: "addon-manager"`。详细内容参考[Add-on 开发指南](https://open-cluster-management.io/developer-guides/addon/#managing-the-add-on-agent-lifecycle-by-addon-manager)。
- Easy 模式：使用 AddOnTemplate 模式开发的 add-on。

```bash
✗ kubectl get deploy -n open-cluster-management-hub
NAME                                       READY   UP-TO-DATE   AVAILABLE   AGE
cluster-manager-addon-manager-controller   1/1     1            1           10h
cluster-manager-placement-controller       1/1     1            1           10h
cluster-manager-registration-controller    1/1     1            1           10h
cluster-manager-registration-webhook       1/1     1            1           10h
cluster-manager-work-webhook               1/1     1            1           10h
```

- 持续协调

Add-on 配置文件的 spec hash 会被记录在`ClusterManagementAddOn`以及`ManagedClusterAddOn`的 status 中，当 spec hash 变化时，addon-manager-controller 会根据 rolloutStrategy 定义的升级策略持续更新 add-on，直至 lastAppliedConfig，lastKnownGoodConfig 和 desiredConfig 相一致。如下例子中，由于 lastAppliedConfig 与 desiredConfig 不匹配，add-on 状态显示为升级中。

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

## 三种升级策略

ClusterManagementAddOn 的`rolloutStrategy`字段定义了升级的策略，目前 OCM 支持三种类型的升级策略。

- 全部升级(All)

默认的升级类型是 All，意味着新的配置文件会立刻应用于所有的集群。

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
        type: All
    type: Placement
```

- 按集群渐进升级(Progressive Per Cluster)

Progressive 意味着将新的配置文件依次部署在所选择的每个集群，只有当前集群升级成功后新的配置文件才会应用到下个集群。前面我们介绍了 Placement Decision Group 的概念，MandatoryDecisionGroups 中可以指定一个或多个 Decision Group。如果定义了 MandatoryDecisionGroups，则优先将新的配置文件部署到这些集群组。 MaxConcurrency 定义了同时部署的最大集群数量。

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
    type: Placements
```

- 按集群组渐进升级(Progressive Per Group)

ProgressivePerGroup 意味着将新的配置文件依次部署在所选择的每个集群组，只有当前集群组升级成功后新的配置文件才会应用到下个集群组。如果定义了 MandatoryDecisionGroups，则优先将新的配置文件部署到这些集群组。如果没有 mandatoryDecisionGroups，则按照集群组的 index 顺序依次升级。

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
        type: ProgressivePerGroup
        progressivePerGroup:
          mandatoryDecisionGroups:
          - groupName: "canary"
    type: Placements
```

依照 GitOps 的四个原则，和 OCM 的三种升级策略，使用者可以利用 Kustomize 或 GitOps 实现跨集群的无缝滚动/金丝雀升级。值得注意的是，installStrategy 下支持多个 Placement 的定义，使用者可以基于此实现更多高级的升级策略。如下面的例子，可以同时定义两个 Placement 分别选择 aws 与 gcp 上的集群，使得同一个 add-on 在不同的集群中使用不同的配置文件和升级策略。

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

## 三种升级配置

`rolloutStrategy`升级策略中还可以定义`MinSuccessTime`, `ProgressDeadline`和`MaxFailures`来实现更细粒度的升级配置。

- MinSuccessTime 

`MinSuccessTime`定义了当addon升级成功且未达到`MaxFailures`时，controller需要等待多长时间才能继续升级下一个集群。默认值是0代码升级成功后立刻升级下一个集群。如下例子中，将按照每5分钟一个集群的速度升级addon。

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

`ProgressDeadline`定义了controller等待addon升级成功的最大时间，在此时间之后将addon视为超时“timeout”并计入`MaxFailures`。超过`MaxFailures`时将停止升级。默认值为“None”代表controller会一直等待addon升级成功。
如下例子中，controller会在每个集群上等待10分钟直到addon升级成功，若超过10分钟未成功，将标记该集群升级状态为timeout。

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
          progressDeadline: "10m"
    type: Placements
```

- MaxFailures 

`MaxFailures`定义了可以容忍的升级失败的集群数量，可以是一个数值或者百分比。集群状态为failed或者timeout均视为升级失败，失败的集群超过`MaxFailures`后将停止升级。
如下例子中，当有3个addon升级失败或者超过10分钟未升级成功，将停止升级。

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

## 小结

本文详细介绍了如何使用 Open Cluster Management 以 GitOps 方式应对多集群环境下工具链的升级挑战。OCM 提供了基于 Kubernetes 的跨多集群和多云的管理平台，通过 Add-on 插件和 Placement API，使得用户能够优雅、平滑地升级整个工具链。同时，OCM 将 add-on 升级视为配置文件的变更，使得用户能够利用 Kustomize 或 GitOps 实现跨集群的无缝滚动/金丝雀升级。此外，OCM 还提供了多种升级策略，包括全部升级(All)，按集群渐进升级(Progressive Per Cluster)和按集群组渐进升级(Progressive Per Group)，以满足不同的升级需求。

## 未来计划

在社区中，我们正在计划实现[RolloutConfig](https://github.com/open-cluster-management-io/api/pull/281)以提供更细粒度的 rollout 配置，比如 MinSuccessTime, ProgressDeadline, MaxFailures，使得用户可以定义在失败情况下的升级行为，这将为多集群下的升级提供更多的可操作空间。
