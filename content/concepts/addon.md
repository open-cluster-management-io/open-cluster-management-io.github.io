---
title: Addons
weight: 4
---

## What is an addon?

Open-cluster-management has a mechanism to help developers to develop an extension based on the foundation components for the purpose of working with multiple clusters in various asepcts. The examples of addons includes:

1. A tool to collect alert events in the managed cluster, and send to the hub cluster.
2. A network solution that uses hub to share the network infos and establish connection among managed clusters.
3. A tool to spread security policies to multiple clusters.

In general, if a management tool needs different configuration for each managed clusters or a secured communitation between managed cluster and hub cluster, it can utilize the addon mechanism in open-cluster-management to ease the installation and day 2 operation.

## Addon enablement

Each addon should register itself on hub by creating a `ClusterManagementAddon` resource on the hub cluster. For instance, the `helloworld` addon can be registered to the hub cluster by creating:

```yaml
kind: ClusterManagementAddOn
metadata:
  name: helloworld
spec:
  addOnMeta:
    displayName: helloworld
```

An addon should also have a controller running on hub taking responsible of addon configuration for each managed cluster. When a user wants to enable the addon on a certain managed cluster, the user should create a `ManagedClusterAddon` resource on the cluster namespace. The name of the `ManagedClusterAddon` should be the same name of the corresponding `ClusterManagementAddon`. For instance, the below resource indicate to enable `helloworld` addon in cluster1 

```yaml
kind: ManagedClusterAddon
metadata:
  name: helloworld
  namespace: cluster1
spec:
  installNamespace: helloworld
```

## [Addon framework](https://github.com/open-cluster-management-io/addon-framework)

addon-framework is to provide a library for developer to develop an adddon in open-cluster-management more easily. Take a look at the `helloworld` example [here](https://github.com/open-cluster-management-io/addon-framework/tree/main/examples/helloworld) to understand how addon-framework can be used.