---
title: ocm placement调度器大规模性能测试报告
---

2022年5月26日 [刘党朋](https://github.com/ldpliu)

{{< toc >}}

## 概要
在`open-cluster-management`中，集群调度通过placement进行。Placement可以从一个或多个集群集中选取一组目标集群。选出的结果会被存储到另一个叫PlacementDecision的api。placement 从三个维度定义了目标集群的选择：
- Predicates（requiredClusterSelector）：Predicates中可以定义一组labelSelector和claimSelector。即可以通过集群的label 和集群claim 信息选择目标集群。
- Taints/Tolerations：通过Taints/Tolerations，用户可以避免选择到一些不健康或者不可达的集群。用户还可以定义自己的taint从而避免特定属性的集群被选择。这对用户想要设置一个集群为maintenance mode，然后在这个集群上清楚负载是非常有用。
- Prioritizers：在Prioritizers里，用户可以定义优先选择哪些目标集群。比如用户可以优先选择3个cpu和memory使用率低的集群。用户还可以通过AddOnPlacementScore来自定义优先级策略。

Placement的调度原理如下图所示：
![](./assets/placement.png)

在本文中，我们将从多个维度测试在大规模集群下，placement的性能情况。

## 测试环境
### 1. 集群环境
kind: v0.17.0 go1.19.2 linux/amd64
```
# kubectl get nodes
NAME                STATUS   ROLES           AGE    VERSION
tep-control-plane   Ready    control-plane   171m   v1.25.3
```
node 详细信息：
```
capacity:
    cpu: "32"
    ephemeral-storage: 51175Mi
    hugepages-2Mi: "0"
    memory: 64233Mi
    pods: "110"
nodeInfo:
    architecture: amd64
    containerRuntimeVersion: containerd://1.6.9
    kernelVersion: 3.10.0-1160.25.1.el7.x86_64
    kubeProxyVersion: v1.25.3
    kubeletVersion: v1.25.3
    operatingSystem: linux
    osImage: Ubuntu 22.04.1 LTS
```
### 2. ocm 信息

ocm版本：[registration-operator v0.11.0](https://github.com/open-cluster-management-io/registration-operator/tree/v0.11.0)

ocm 部署情况
```
# kubectl get po -A|grep open-
open-cluster-management-hub   cluster-manager-placement-controller-7f76cf844b-kqrzx      1/1     Running   0          176m
open-cluster-management-hub   cluster-manager-registration-controller-5dcdf9f87b-h7d9b   1/1     Running   0          176m
open-cluster-management-hub   cluster-manager-registration-webhook-6446c58cc-nvhkh       1/1     Running   0          176m
open-cluster-management-hub   cluster-manager-work-webhook-54cb996f58-rplw4              1/1     Running   0          176m
open-cluster-management       cluster-manager-55598cd6c-j6d57                            1/1     Running   0          176m
```

### 测试工具
#### metrics
用k8s.io/metrics client 收集pod 的CPU/Memory信息。



## 测试维度
从placement 的概念中可以看到，影响placement性能的主要因素是被管理集群的数量和placement的数量。所以我们测试了不同集群数量和不同placement数量下的以下性能指标。

集群数量和placement数量：
| 集群数量 | placement数量 |
| :----: | :----: |
| 100 | 100/300/500/1000 |
| 300 | 100/300/500 |
| 500 | 100/300 |
| 1000| 100/300 |
| 3000| 100/300 |

### 测量指标：
1. 连续创建 N 个placement（一个调度完成再创建下一个）,每隔十个placement,记录kube-apiserver cpu/memory 使用情况
2. 连续创建 N 个placement（一个调度完成再创建下一个）,每隔十个placement, 记录placement controller pod cpu/memory 使用情况
3. 连续创建 N 个placement（一个调度完成再创建下一个）观察在不同集群和不同placement数量下placement的调度完成时间
4. 连续更新 N 个placement（一个调度完成再更新下一个）观察placement的调度完成时间
   - 4.1 更新placement Spec.Predicates
   - 4.2 更新placement Spec.PrioritizerPolicy
5. 添加一个集群（managedcluster cr），观察所有placement的响应时间


测试中的集群用的是假的集群（只创建了managedcluster cr， 并没有注册真正的集群）。由于placement 在调度过程中只关心managedcluster cr 的label/claim/taint等信息。所以用没有真正注册的集群能够较好的体现placement的调度情况。

ManagedCluster example:
```
apiVersion: cluster.open-cluster-management.io/v1
kind: ManagedCluster
metadata:
  labels:
    cloud: aws
    cluster.open-cluster-management.io/clusterset: default
  name: test-1
spec:
  hubAcceptsClient: true
  leaseDurationSeconds: 60
  taints:
  - effect: NoSelect
    key: cluster.open-cluster-management.io/unreachable
    timeAdded: "2023-05-06T01:46:45Z"
```

[测量指标](#测量指标)[1][2][3]创建的Placement Example：
```
apiVersion: cluster.open-cluster-management.io/v1beta1
kind: Placement
metadata:
  name: test-placement-1
spec:
  predicates:
  - requiredClusterSelector:
      claimSelector: {}
      labelSelector:
        matchLabels:
          cloud: aws
  tolerations:
  - key: cluster.open-cluster-management.io/unreachable
    operator: Equal
```

[测量指标](#测量指标)[4.2]创建的AddOnPlacementScore 和Placement Example：
```
apiVersion: cluster.open-cluster-management.io/v1alpha1
kind: AddOnPlacementScore
metadata:
  name: default
  namespace: test-1
status:
  conditions:
  - lastTransitionTime: "2023-05-06T02:59:26Z"
    message: AddOnPlacementScore updated successfully
    reason: AddOnPlacementScoreUpdated
    status: "True"
    type: AddOnPlacementScoreUpdated
  scores:
  - name: cpuAvailable
    value: 66
  - name: memAvailable
    value: 55
---
apiVersion: cluster.open-cluster-management.io/v1beta1
kind: Placement
metadata:
  name: test-placement-1
spec:
  numberOfClusters: 2
  predicates:
  - requiredClusterSelector:
      claimSelector: {}
      labelSelector:
        matchLabels:
          cloud: aws
  prioritizerPolicy:
    configurations:
    - scoreCoordinate:
        addOn:
          resourceName: default
          scoreName: cpuAvailable
        type: AddOn
      weight: 2
    mode: Exact
  tolerations:
  - key: cluster.open-cluster-management.io/unreachable
    operator: Equal
```



其他测试情况说明：
1. 本测试中用到的managedclusterset 为 `global` clusterset(默认包括所有的managedcluster)
1. 所有placement 均创建在一个namespace `placement-test`下 
1. managedclustersetbinding 创建在`placement-test` namespace 下，并绑定 `global` clusterset
1. placement.Status.NumberOfSelectedClusters 和 PlacementDecisions.Status.Decisions均更新到最新状态，则认为placement调度完成

## 测试结果

下面展示了在不同集群数量下，不同placement个数对性能的影响。每个测试结果有四张图
-  图一：kube-apiserver 和 placement controller 的 cpu 的影响（[测量指标](#测量指标)中[1]和[2]）

- 图二：kube-apiserver 和 placement controller 的 memory 的影响（[测量指标](#测量指标)中[1]和[2]）

- 图三：新添加一个cluster后，placement的调度时间（[测量指标](#测量指标)中[5]）

- 图四：创建、更新placement 后，placement的调度时间 （[测量指标](#测量指标)中[3][4]）

### 集群个数：100，placement个数：100
![cpu](./assets/100-100-cpu.png) | ![memory](./assets/100-100-memory.png) 
---|---
![placement](./assets/100-100-placement.png) | ![placement](./assets/100-100-placement-update.png) 

### 集群个数：100，placement个数：300
![cpu](./assets/100-300-cpu.png) | ![memory](./assets/100-300-memory.png) 
---|---
![placement](./assets/100-300-placement.png) | ![placement](./assets/100-300-placement-update.png) 

### 集群个数：100，placement个数：500
![cpu](./assets/100-500-cpu.png) | ![memory](./assets/100-500-memory.png) 
---|---
![placement](./assets/100-500-placement.png)| ![placement](./assets/100-500-placement-update.png)  

### 集群个数：100，placement个数：1000
![cpu](./assets/100-1000-cpu.png) | ![memory](./assets/100-1000-memory.png) 
---|---
![placement](./assets/100-1000-placement.png) | ![placement](./assets/100-1000-placement-update.png) 

### 集群个数：300，placement个数：100
![cpu](./assets/300-100-cpu.png) | ![memory](./assets/300-100-memory.png) 
---|---
![placement](./assets/300-100-placement.png)| ![placement](./assets/300-100-placement-update.png)  

### 集群个数：300，placement个数：300
![cpu](./assets/300-300-cpu.png) | ![memory](./assets/300-300-memory.png) 
---|---
![placement](./assets/300-300-placement.png) | ![placement](./assets/300-300-placement-update.png)

### 集群个数：300，placement个数：500
![cpu](./assets/300-500-cpu.png) | ![memory](./assets/300-500-memory.png) 
---|---
![placement](./assets/300-500-placement.png) | ![placement](./assets/300-500-placement-update.png)

### 集群个数：500，placement个数：100
![cpu](./assets/500-100-cpu.png) | ![memory](./assets/500-100-memory.png) 
---|---
![placement](./assets/500-100-placement.png) | ![placement](./assets/500-100-placement-update.png)  

### 集群个数：500，placement个数：300
![cpu](./assets/500-300-cpu.png) | ![memory](./assets/500-300-memory.png) 
---|---
![placement](./assets/500-300-placement.png)| ![placement](./assets/500-300-placement-update.png)  

### 集群个数：1000，placement个数：100
![cpu](./assets/1000-100-cpu.png) | ![memory](./assets/1000-100-memory.png) 
---|---
![placement](./assets/1000-100-placement.png)| ![placement](./assets/1000-100-placement-update.png)  

### 集群个数：1000，placement个数：300
![cpu](./assets/1000-300-cpu.png) | ![memory](./assets/1000-300-memory.png) 
---|---
![placement](./assets/1000-300-placement.png)| ![placement](./assets/1000-300-placement-update.png)  

### 集群个数：3000，placement个数：100
![cpu](./assets/3000-100-cpu.png) | ![memory](./assets/3000-100-memory.png) 
---|---
![placement](./assets/3000-100-placement.png)| ![placement](./assets/3000-100-placement-update.png)  

### 集群个数：3000，placement个数：300
![cpu](./assets/3000-300-cpu.png) | ![memory](./assets/3000-300-memory.png) 
---|---
![placement](./assets/3000-300-placement.png)| ![placement](./assets/3000-300-placement-update.png) 


## 总结
从以上结果可以看出，集群数量和placement数量对placement 的调度有较大影响。
1. 随着集群个数和placement个数增多，kube-apiserver 的CPU和内存消耗都有所增长，在最多的3000个集群和300个placement时，cpu 增长了1500m，内存增长了2GB。
2. 在绝大多数场景下（[测量指标](#测量指标)中[3][4]））placement都能够在很短的时间内调度完成（<60s）。
3. 在集群数量变动时([测量指标](#测量指标)中[3][4]）)，由于可能要更新所有的placement和placement decision，所以需要时间最长。在3000个集群和300个placement时，最长的placement调度需要1个小时。
