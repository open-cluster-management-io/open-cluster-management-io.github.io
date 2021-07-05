---
title: Add-ons
weight: 4
---

## What is an add-on?

Open-cluster-management has a mechanism to help developers to develop an extension based on the foundation components for the purpose of working with multiple clusters in various asepcts. The examples of add-ons includes:

1. A tool to collect alert events in the managed cluster, and send to the hub cluster.
2. A network solution that uses hub to share the network infos and establish connection among managed clusters.
3. A tool to spread security policies to multiple clusters.

In general, if a management tool needs different configuration for each managed clusters or a secured communitation between managed cluster and hub cluster, it can utilize the add-on mechanism in open-cluster-management to ease the installation and day 2 operation.

## Add-on enablement

Each add-on should register itself on hub by creating a `ClusterManagementAddon` resource on the hub cluster. For instance, the `helloworld` add-on can be registered to the hub cluster by creating:

```yaml
kind: ClusterManagementAddOn
metadata:
  name: helloworld
spec:
  addOnMeta:
    displayName: helloworld
```

An add-on should also have a controller running on hub taking responsible of add-on configuration for each managed cluster. When a user wants to enable the add-on on a certain managed cluster, the user should create a `ManagedClusterAddon` resource on the cluster namespace. The name of the `ManagedClusterAddon` should be the same name of the corresponding `ClusterManagementAddon`. For instance, the following example indicate to enable `helloworld` add-on in cluster1 

```yaml
kind: ManagedClusterAddon
metadata:
  name: helloworld
  namespace: cluster1
spec:
  installNamespace: helloworld
```

## Add-on framework

The [add-on framework](https://github.com/open-cluster-management-io/addon-framework) provides a library for developers to easily develop add-ons in open-cluster-management. Take a look at the [helloworld example](https://github.com/open-cluster-management-io/addon-framework/tree/main/examples/helloworld) to understand how the add-on framework can be used.
