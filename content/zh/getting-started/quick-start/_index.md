---
title: 快速开始
weight: 1
---

使用以下任意方法准备 Open Cluster Management 环境。

<!-- spellchecker-disable -->

{{< toc >}}

在开始安装组件到集群里之前, 首先需要准备一个至少有两个集群的多集群环境。 其中一个用来作为中枢（Hub）集群，另一个作为被托管（Managed）。

同时为你的控制台命令行工具配置以下的环境变量，这会伴随你接下来的体验过程：

```Shell
# 中枢集群的名称
export HUB_CLUSTER_NAME=<your hub cluster name>             # export HUB_CLUSTER_NAME=hub
# 托管集群的名称
export MANAGED_CLUSTER_NAME=<your managed cluster name>     # export MANAGED_CLUSTER_NAME=cluster1
# 中枢集群在你的KubeConfig中的Context名称
export CTX_HUB_CLUSTER=<your hub cluster context>           # export CTX_HUB_CLUSTER=kind-hub
# 托管集群在你的KubeConfig中的Context名称
export CTX_MANAGED_CLUSTER=<your managed cluster context>   # export CTX_MANAGED_CLUSTER=kind-cluster1
```

如果没有现成的多集群环境，我们可以通过[Kind](https://kind.sigs.k8s.io)以下为创建两个新集群。执行以下命令：

```Shell
# 创建中枢集群
kind create cluster --name ${HUB_CLUSTER_NAME}
# 创建托管集群
kind create cluster --name ${MANAGED_CLUSTER_NAME}
```

## 通过Clusteradm命令行工具进行部署

### 安装Clusteradm命令行工具

下载并且解压 [Clusteradm命令行工具](https://github.com/open-cluster-management-io/clusteradm/releases/latest). 更多使用细节可以参考[Clusteradm GitHub页面](https://github.com/open-cluster-management-io/clusteradm/blob/main/README.md#quick-start).

### 在Hub集群部署组件Cluster Manager

1. 启动Open Cluster Management的中枢控制面：

   ```Shell
   # 默认安装上一个发布版本的OCM核心组件.
   # 可以通过例如 "--bundle-version=latest" 安装开发中的最新版本.
   clusteradm init --context ${CTX_HUB_CLUSTER}
   ```

   然后你可以使用`join`命令完成注册流程：

   ```Shell
   ...
   clusteradm join --hub-token <token_data> --hub-apiserver https://126.0.0.1:39242 --cluster-name <managed_cluster_name>
   ```

   接下来就只需要复制以上命令并且替换掉其中的`<managed_cluster_name>`为你的实际托管集群名称，例如`cluster1`。

### 在托管集群上部署Klusterlet代理控制器

1. 执行前面复制粘贴的`join`命令并指定上下文名称(Context)以使托管集群注册到中枢集群中:

   ```Shell
   clusteradm join --context ${CTX_MANAGED_CLUSTER} --hub-token <token_data> --hub-apiserver https://126.0.0.1:39242 --cluster-name ${MANAGED_CLUSTER_NAME}
   ```

### 接受注册请求并且校验 

1. 等待中枢集群上CSR请求对象被成功创建出来:

   ```Shell
   kubectl get csr -w --context ${CTX_HUB_CLUSTER} | grep ${MANAGED_CLUSTER_NAME}
   ```

   然后当CSR被创建时，你会看到类似以下的终端输出：

   ```Shell
   cluster1-tqcjj   33s   kubernetes.io/kube-apiserver-client   system:serviceaccount:open-cluster-management:cluster-bootstrap   Pending
   ```

2. 接受集群注册请求:

   ```Shell
   clusteradm accept --clusters ${MANAGED_CLUSTER_NAME} --context ${CTX_HUB_CLUSTER}
   ```

3. 检查托管集群`managedcluster`是否被成功创建:

   ```Shell
   kubectl get managedcluster --context ${CTX_HUB_CLUSTER}
   ```

   然后你会看到类似以下的终端输出：

   ```Shell
   NAME       HUB ACCEPTED   MANAGED CLUSTER URLS      JOINED   AVAILABLE   AGE
   cluster1   true           https://127.0.0.1:41478   True     True        5m23s
   ```

## 通过Operatorhub.io进行自动化部署

在中枢集群中创建一个[Cluster manager](https://operatorhub.io/operator/cluster-manager)对象.

在托管集群中场景一个[Klusterlet agent](https://operatorhub.io/operator/klusterlet)对象。


## 下一步

你已经成功创建了OCM管理组件并接入了至少一个被管理集群！让我们开始接下来的OCM旅程。

- [将kubernetes资源部署到一个被管理集群中](/scenarios/deploy-kubernetes-resources)
- [通过cluster-proxy直接访问被管理集群的kube-apiserver](/scenarios/pushing-kube-api-requests)
- 访问[integration](/getting-started/integration)查看各种OCM插件是否能够帮助你解决多集群管理问题。

想要了解更多OCM API细节, 请查看[Core components](/getting-started/core).
