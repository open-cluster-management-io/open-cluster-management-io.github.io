---
title: 详解ocm klusterlet秘钥管理机制
---

2022年4月25日 [邱见](https://github.com/qiujian16)

{{< toc >}}

## 概述
在`open-cluster-management`中，为了使控制面有更好的可扩展性，我们使用了`hub-spoke`的架构：即集中的控制面（hub）只
负责处理控制面的资源和数据而无需访问被管理的集群；每个被管理集群（spoke）运行一个称为`klusterlet`的agent访问控制面获取
需要执行的任务。在这个过程中，`klusterlet`需要拥有访问`hub`集群的秘钥才能和`hub`安全通信。确保秘钥的安全性是非常重要的，
因为如果这个秘钥被泄露的话有可能导致对hub集群的恶意访问或者窃取敏感信息，特别是当`ocm`的被管理集群分布在不同的公有云中的时候。
为了保证秘钥的安全性，我们需要满足一些特定的需求：
1. 尽量避免秘钥在公有网络中的传输
2. 秘钥的刷新和废除
3. 细粒度的权限控制

本文将详细介绍`ocm`是如何实现秘钥的管理来保证控制面板和被管理集群之间的安全访问的。

## 架构和机制

在ocm中我们采用了以下几个机制来确保控制面和被管理集群之间访问的安全性：

1. 基于`CertificateSigniningRequest`的mutual tls
2. 双向握手协议和动态`klusterlet`ID
3. 认证和授权的分离

### 基于`CertificateSigniningRequest`的mutual tls

使用`kubernetes`的`CertificateSigniningRequest`（CSR）API可以方便的生成客户认证证书。这个机制可以让`klusterlet`在第一次
启动访问`hub`集群时使用一个权限很小的秘钥来创建CSR。当CSR返回了生成的证书后，`klusterlet`就可以用后续生成的带有更大访问权限的
证书来访问`hub`集群。在使用csr的过程中，`klusterlet`的私钥不会在网络中传输而是一直保存在被管理集群中；只有CSR的公钥和初始阶段需要的
小权限秘钥（bootstrap secret）会在不同集群间传输。这就最大程度的保证秘钥不会在传输过程中被泄露出去。

### 双向握手协议和动态`klusterlet`ID

那么如果初始阶段的bootstrap secret被泄露了会怎么样呢？这就牵涉到OCM中的双向握手协议。当被管理集群中的`klusterlet`使用bootstrap secret
发起了第一次请求的时候, hub集群不会立刻为这个请求创建客户证书和对应的访问权限。这个请求将处在`Pending`状态，直到hub集群拥有特定管理权限的管理员
同意了`klusterlet`的接入请求后，客户证书和特定权限才会被创建出来。这个请求中包含了`klusterlet`启动阶段生成的动态ID，管理员需要确保这个ID和被
管理集群上`klusterlet`的ID一致才能同意`klusterlet`的接入。这也就确保了如果bootstrap secret被不慎泄露后，CSR也不会被管理员轻易的接受。

### 认证和授权的分离

## 实现细节
