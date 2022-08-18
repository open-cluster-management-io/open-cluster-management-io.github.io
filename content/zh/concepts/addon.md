---
title: 自定义插件
weight: 4
---

## What is an add-on?

Open-cluster-management has a mechanism to help developers to develop an extension based on the foundation components for the purpose of working with multiple clusters in various aspects. Examples of add-ons includes:

1. A tool to collect alert events in the managed cluster, and send to the hub cluster.
2. A network solution that uses the hub to share the network info and establish connection among managed clusters.
3. A tool to spread security policies to multiple clusters.

In general, if a management tool needs a different configuration for each managed cluster or a secured communication between the managed cluster and the hub cluster, it can utilize the add-on mechanism in open-cluster-management to ease the installation and day 2 operation.

## Add-on enablement

Each add-on should register itself on the hub by creating a `ClusterManagementAddon` resource on the hub cluster. For instance, the `helloworld` add-on can be registered to the hub cluster by creating:

```yaml
kind: ClusterManagementAddOn
metadata:
  name: helloworld
spec:
  addOnMeta:
    displayName: helloworld
```

An add-on should also have a controller running on the hub taking responsibility of add-on configuration for each managed cluster. When a user wants to enable the add-on for a certain managed cluster, the user should create a `ManagedClusterAddOn` resource on the cluster namespace. The name of the `ManagedClusterAddOn` should be the same name of the corresponding `ClusterManagementAddon`. For instance, the following example enables `helloworld` add-on in cluster1

```yaml
kind: ManagedClusterAddOn
metadata:
  name: helloworld
  namespace: cluster1
spec:
  installNamespace: helloworld
```

## Add-on framework

[Add-on framework](https://github.com/open-cluster-management-io/addon-framework) provides a library for developers to develop an add-ons in open-cluster-management more easily. Take a look at the [helloworld example](https://github.com/open-cluster-management-io/addon-framework/tree/main/examples/helloworld) to understand how the add-on framework can be used.
