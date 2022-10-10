---
title: 架构
weight: 1
---

本页是open cluster management的概览。

<!-- spellchecker-disable -->

{{< toc >}}

<!-- spellchecker-enable -->

## 概览

__Open Cluster Management__ (OCM) 是用于Kubernetes多集群编排的一个功能强大，模块化，可扩展的平台。
通过吸取过去在Kubernetes社区构建联邦系统的失败教训，在OCM中，我们将跳出过去[Kubefed v2](https://github.com/kubernetes-sigs/kubefed)那种中心化，命令式的架构，并拥抱与Kubernetes中“hub-kubelet”原始模式一致的“hub-agent”架构。
因此在OCM中，我们的多集群控制平面，被直观的建模为“Hub”, 而相对的，每一个被“Hub”管理的集群则为“Klusterlet”，这个名字也明显是受到了“kubelet”的启发。
以下是对于两个模型更加详细的解释，我们将在OCM的世界中频繁的使用这两个模型：

* __Hub Cluster__: 表示运行着OCM多集群控制平面的集群。通常hub cluster应该是一个轻量级的Kubernetes集群，仅仅托管着一些基础的控制器和服务。
  
* __Klusterlet__: 表示由hub cluster管理着的集群，也被称为“managed cluster”或“spoke cluster”。klusterlet应该主动的从hub cluster __拉取__ 最新的处方，并持续将物理的Kubernetes集群调和到预期状态。

### hub-agent” 架构

受益于“hub-agent”架构的优点，在抽象层面，我们将大部分的多集群操作解耦为（1）计算/决策和（2）执行, 且对目标集群的实际执行，将会完全的卸入managed cluster中。
hub不会直接的请求实际集群，而是声明式的维护每一个集群的处方，klusterlet则会主动从hub出拉取处方并执行。
hub cluster的负担将会大大减轻，因为hub cluster既不需要处理来自managed cluster的事件洪流，也不需要被发送大量的请求到各个cluster。
试想，如果Kubernetes中没有kubelet，而是由控制平面直接操作容器守护进程，那么对于一个中心化的控制器，管理一个超过5000节点的集群，将会极其困难。
同理，这也是OCM试图突破可扩展性瓶颈的方式，即将“执行”拆分卸入各个单独的代理中，从而让hub cluster可以接受和管理数千个集群。

每一个klusterlet都将独立自主的工作，所以它们对hub cluster的可用性具有弱依赖。
如果一个hub下线（例如：正在维持中或者网络分区中），klusterlet或其他的OCM在managed cluster中的代理，都应该继续积极管理托管集群，直到与恢复后的hub成功重新连接。
另外，如果hub cluster和managed cluster由不同的管理员所有，那么managed cluster的管理员将更容易从hub的控制平面来管理处方，因为klusterlet在managed cluster上以pod实例的方式，作为“白盒”运行。
如果发生任何意外，klusterlet的管理员只需快速的切断与hub cluster的连接，而无需关闭整个多集群控制平面。

<div style="text-align: center; padding: 20px;">
    <img src="https://github.com/open-cluster-management-io/OCM/raw/main/assets/ocm-arch.png" alt="Architecture diagram" style="margin: 0 auto; width: 50%">
</div>

这种“hub-agent”的架构，还最小化了注册新集群到hub时，对于网络的要求。
任何集群，只要可以连接到hub cluster的端点，都可以被管理，甚至是一个在你笔记本上的随机KinD沙盒集群。
这是因为处方是从hub上 __拉下来__ 而非 __推上去__ 的。
除此之外，OCM还提供了一个名为["cluster-proxy"](https://open-cluster-management.io/getting-started/integration/cluster-proxy/)的[addon](https://open-cluster-management.io/concepts/addon/)，它可以自动管理一个反向代理隧道，以利用Kubernetes的子项目[konnectivity](https://kubernetes.io/docs/tasks/extend-kubernetes/setup-konnectivity/)来主动访问managed cluster。

### 模块化和可扩展性

OCM不仅会给您带来流畅的用户体验，让您轻松管理多个集群，而且对进一步定制或二次开发同样友好。
OCM中每一个功能，都可以通过将原子能力模块化到单独的构建块中，来实现自由拔插，除了了一个名为[registration](https://github.com/open-cluster-management-io/registration)的强制性核心模块，此模块负责控制managed控制器的生命周期，并导出基本的`ManagedCluster`模型。

另一个展示我们模块化能力的好例子是[placement](https://open-cluster-management.io/concepts/placement/)，该独立模块专注于从动态的从用户的处方中，选择合适的managed cluster列表。
你可以在placement的基础上，构建任何高级的多集群编排方案，比如：多集群工作负载再平衡，多集群helm图表副本等。
另外，如果您对我们placement模块当前的能力不满意，您同样可以快速切出并使用您自己的定制来替换它，同时联系我们的社区，以便我们在未来可能的情况下进行融合。

---

## 概念

### 集群注册: “双重确认握手”

事实上，hub cluster和managed cluster可以为不同的管理员所有并维护，所以在OCM中，我们清楚的分离了这两种角色，并使集群注册需要双方的批准，以防一些不受欢迎的请求。
在中止注册方面，hub管理员可以通过拒绝集群证书的轮换来踢出已注册的集群，而从managed cluster管理员的角度来看，他可以通过暴力删除代理实例或撤销代理的RBAC授权的方式，来中止注册。请注意，hub控制器将自动为新注册的集群准备环境，并在踢出managed cluster时自动清理环境。

<div style="text-align: center; padding: 20px;">
   <img src="/double-optin-registration.png" alt="Double opt-in handshaking" style="margin: 0 auto; width: 60%">
</div>

### 安全模型

<div style="text-align: center; padding: 20px;">
   <img src="/security-model.png" alt="Security model" style="margin: 0 auto; width: 60%">
</div>

### 集群命名空间

Kubernetes具有原生的，命名空间粒度的多租户软隔离，所以在OCM中，对于每一个managed cluster，我们将提供一个专用的命令空间，并授予足够的RBAC权限，以便klusterlet可以在hub cluster上保存一些数据。
这个专门的命名空间即“集群命名空间”，其主要用于保存来自hub的处方。比如，我们可以在“集群命名空间”内创建`ManifestWork`，从而向对应集群部署资源。
同时，集群命名空间也可以用于保存从klusterlet上传的统计信息，例如插件的健康信息等。

### 插件

插件是一个通用概念，用于在OCM的可扩展性基础上，构建可选的，可插入的定制化。
它可以是一个hub cluster上的控制器，或者只是managed cluster上的一个定制的代理，甚至或者是两者的结合。
插件应该实现`ClusterManagementAddon`和`ManagedClusterAddOn`的API，详细说明见[此处](https://open-cluster-management.io/concepts/addon/).

---

## 构建块

以下是你在OCM之旅中，可能会感兴趣的常用模块和子项目列表：

### Registration

这是OCM管理managed cluster生命周期的核心模块。hub cluster中的注册控制器（registration controller）可以直观的看作为一个代表和管理hub cluster上集群注册的broker，而在managed cluster上运行的注册代理则是另一个代表managed cluster的broker。
在一次成功的注册后，注册控制器和代理将会持续的探查对方的健康状态，即集群心跳。

### Work

此模块可以通过将一个`ManifestWork`的资源写入集群命名空间，非常方便的把资源从hub cluster调度到managed cluster上。更多API细节见[此处](https://open-cluster-management.io/concepts/manifestwork/)。

### Placement

此模块通过用标签（labels）进行集群分组，或通过集群声明（cluster-claims）的方式，进行跨集群构建自定义高级拓扑。
placement模块和执行是完全解耦的，placement的输出结果仅为`PlacementDecision`API中匹配的集群名字列表，因此该决策输出的消费者控制器（consumer controller），可以通过简单的查看决策API，来发现拓扑或发现manaegd cluster上的可用变化。

### Application lifecycle

__应用生命周期（application lifecycle）__ 定义了用于管理你的managed cluster上应用资源的过程。
一个多集群应用依然使用Kubernetes规范，但同时具有应用额外的自动化及对各个集群上资源生命周期的管理。 
多集群应用允许你在多个集群部署资源，同时维护着易于协调的服务路由，以及对应用各个方面Kubernetes资源更新的完全控制。

### Governance and risk

__治理和风险（governance and risk）__ 是一个术语，用于定义从hub cluster上管理安全性和合规性的过程。其使用可扩展的策略（policy）框架来确保集群的安全性。在你配置hub cluster和managed cluster之后，你可以创建，修改，和删除hub上的策略，也可以将策略应用到managed cluster上。

### Registration operator

此模块可以自动安装和升级OCM中的一些内置模块。你可以单独部署operator，也可以将registration operator委托给opertor生命周期的框架。
