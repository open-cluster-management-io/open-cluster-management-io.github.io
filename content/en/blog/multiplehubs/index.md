---
title: The HA Hub clusters solution -- MultipleHubs
date: 2024-08-11
author: Zhao Xue [@xuezhaojun](https://github.com/xuezhaojun)
toc_hide: true
---


The `MultipleHubs` is a new feature in Open Cluster Management (OCM) that allows you to configure a list of bootstrap kubeconfigs of multiple hubs. This feature is designed to provide a high availability (HA) solution of hub clusters. In this blog, we will introduce the MultipleHubs feature and how to use it.

The high availability of hub clusters means that if one hub cluster is down, the managed clusters can still communicate with other hub clusters. Users can also specify the hub cluster that the managed cluster should connect to by configuring the `ManagedCluster` resource.

The `MultipleHubs` feature is currently in the experimental stage and is disabled by default. To enable the `MultipleHubs` feature, you need to set the `featureGate` in `Klusterlet`'s registration configuration. The following is an example of the `Klusterlet`'s registration configuration:

```yaml
apiVersion: operator.open-cluster-management.io/v1
kind: Klusterlet
...
spec:
  ...
  registrationConfiguration:
    ...
    featureGates:
      - feature: MultipleHubs
        mode: Enable
```

If `MultipleHubs` is enabled, you don't need to prepare the default `bootstrapKubeConfig` for the managed cluster. The managed cluster will use the `bootstrapKubeConfigs` in the `Klusterlet`'s registration configuration to connect to the hub clusters. An example of `bootstrapKubeConfigs` is like following:

```yaml
apiVersion: operator.open-cluster-management.io/v1
kind: Klusterlet
...
spec:
  ...
  registrationConfiguration:
    ...
    featureGates:
      - feature: MultipleHubs
        mode: Enable
    bootstrapKubeConfigs:
      type: "LocalSecrets"
      localSecretsConfig:
        kubeConfigSecrets:
            - name: "hub1-bootstrap"
            - name: "hub2-bootstrap"
        hubConnectionTimeoutSeconds: 600
```

In the above configuration, the `hub1-bootstrap` and `hub2-bootstrap` are the secrets that contain the kubeconfig of the hub clusters. You should create the secrets before you set the `bootstrapKubeConfigs` in the `Klusterlet`'s registration configuration.

The order of the secrets in the `kubeConfigSecrets` is the order of the hub clusters that the managed cluster will try to connect to. The managed cluster will try to connect to the first hub cluster in the list first. If the managed cluster cannot connect to the first hub cluster, it will try to connect to the second hub cluster, and so on.

Note that the expiration time of the credentials in kubeconfigs should be long enough to ensure the managed cluster can connect to another hub cluster when one hub cluster is down.

The `hubConnectionTimeoutSeconds` is the timeout for the managed cluster to connect to the hub clusters. If the managed cluster cannot connect to the hub cluster within the timeout, it will try to connect to another hub cluster. It is also used to avoid the effect of network disturbance. The default value is 600 seconds and the minimum value is 180 seconds.

Currently, the `MultipleHubs` feature only supports the `LocalSecrets` type of `bootstrapKubeConfigs`.

As we mentioned before, you can also specify the hub's connectivity in the `ManagedCluster` resource from the hub side. We use the `hubAcceptsClient` field in the `ManagedCluster` resource to specify whether the hub cluster accepts the managed cluster. The following is an example of the `ManagedCluster` resource:

```yaml
apiVersion: cluster.open-cluster-management.io/v1
kind: ManagedCluster
...
spec:
  ...
  hubAcceptsClient: false
```

If the `hubAcceptsClient` is set to `false`, the managed cluster currently connected to the hub will immediately disconnect from the hub and try to connect to another hub cluster.

And the managed clusters that are trying to connect to another hub cluster will ignore the hub cluster that the managed cluster's `hubAcceptsClient` is set to `false`.

That's the brief introduction of the `MultipleHubs` feature in Open Cluster Management. We hope this feature can help you to start building a high availability solution of hub clusters and we are looking forward to your feedback. If you have any questions or suggestions, please feel free to contact us.