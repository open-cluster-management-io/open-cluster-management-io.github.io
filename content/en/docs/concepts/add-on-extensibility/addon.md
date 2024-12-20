---
title: Add-ons
weight: 1
---



## What is an add-on?

Open-cluster-management has a built-in mechanism named [addon-framework](https://github.com/open-cluster-management-io/addon-framework)
to help developers to develop an extension based on the foundation components
for the purpose of working with multiple clusters in custom cases. A typical
addon should consist of two kinds of components:

- __Addon Agent__: A kubernetes controller *in the managed cluster* that manages
  the managed cluster for the hub admins. A typical addon agent is expected to
  be working by subscribing the prescriptions (e.g. in forms of CustomResources)
  from the hub cluster and then consistently reconcile the state of the managed
  cluster like an ordinary kubernetes operator does.

- __Addon Manager__: A kubernetes controller *in the hub cluster* that applies
  manifests to the managed clusters via the [ManifestWork](../manifestwork)
  api. In addition to resource dispatching, the manager can optionally manage
  the lifecycle of CSRs for the addon agents or even the RBAC permission bond
  to the CSRs' requesting identity.

In general, if a management tool working inside the managed cluster needs to
discriminate configuration for each managed cluster, it will be helpful to model
its implementation as a working addon agent. The configurations for each agent
are supposed to be persisted in the hub cluster, so the hub admin will be able
to prescribe the agent to do its job in a declarative way. In abstraction, via
the addon we will be decoupling a multi-cluster control plane into (1) strategy
dispatching and (2) execution. The addon manager doesn't actually apply any
changes directly to the managed cluster, instead it just places its prescription
to a dedicated namespace allocated for the accepted managed cluster. Then the
addon agent pulls the prescriptions consistently and does the execution.

In addition to dispatching configurations before the agents, the addon manager
will be automatically doing some fiddly preparation before the agent bootstraps,
such as:

- CSR applying, approving and signing.
- Injecting and managing client credentials used by agents to access the hub
  cluster.
- The RBAC permission for the agents both in the hub cluster or the managed
  cluster.
- Installing strategy.

## Architecture

The following architecture graph shows how the coordination between addon manager
and addon agent works.

<div style="text-align: center; padding: 20px;">
   <img src="/addon-architecture.png" alt="Addon Architecture" style="margin: 0 auto; width: 80%">
</div>

## Add-on enablement

From a user's perspective, to install the addon to the hub cluster the hub admin
should register a globally-unique `ClusterManagementAddon` resource as a singleton
placeholder in the hub cluster. For instance, the [helloworld](https://github.com/open-cluster-management-io/addon-framework/tree/main/examples/helloworld)
add-on can be registered to the hub cluster by creating:

```yaml
apiVersion: addon.open-cluster-management.io/v1alpha1
kind: ClusterManagementAddOn
metadata:
  name: helloworld
spec:
  addOnMeta:
    displayName: helloworld
```

### Enable the add-on manually
The addon manager running on the hub is taking responsibility of configuring the
installation of addon agents for each managed cluster. When a user wants to enable
the add-on for a certain managed cluster, the user should create a
`ManagedClusterAddOn` resource on the cluster namespace. The name of the
`ManagedClusterAddOn` should be the same name of the corresponding
`ClusterManagementAddon`. For instance, the following example enables `helloworld`
add-on in "cluster1":

```yaml
apiVersion: addon.open-cluster-management.io/v1alpha1
kind: ManagedClusterAddOn
metadata:
  name: helloworld
  namespace: cluster1
spec:
  installNamespace: helloworld
```

### Enable the add-on automatically
If the addon is developed with [automatic installation](https://open-cluster-management.io/developer-guides/addon/#automatic-installation),
which support [auto-install by cluster discovery](#auto-install-by-cluster-discovery),
then the `ManagedClusterAddOn` will be created for all managed cluster namespaces
automatically, or be created for the selected managed cluster namespaces automatically.

### Enable the add-on by install strategy
If the addon is developed following the guidelines mentioned in [managing the add-on agent lifecycle by addon-manager](https://open-cluster-management.io/developer-guides/addon/#managing-the-add-on-agent-lifecycle-by-addon-manager),
the user can define an `installStrategy` in the `ClusterManagementAddOn`
to specify on which clusters the `ManagedClusterAddOn` should be enabled. Details see [install strategy](#install-strategy).

### Add-on healthiness

The healthiness of the addon instances are visible when we list the addons via
kubectl:

```shell
$ kubectl get managedclusteraddon -A
NAMESPACE   NAME                     AVAILABLE   DEGRADED   PROGRESSING
<cluster>   <addon>                  True
```

The addon agent are expected to report its healthiness periodically as long as it's
running. Also the versioning of the addon agent can be reflected in the resources
optionally so that we can control the upgrading the agents progressively.

### Clean the add-ons
Last but not least, a neat uninstallation of the addon is also supported by simply
deleting the corresponding `ClusterManagementAddon` resource from the hub cluster
which is the "root" of the whole addon. The OCM platform will automatically sanitize
the hub cluster for you after the uninstalling by removing all the components either
in the hub cluster or in the manage clusters.

## Add-on lifecycle management

### Install strategy
`InstallStrategy` represents that related `ManagedClusterAddOns` should be installed
on certain clusters. For example, the following example enables the `helloworld`
add-on on clusters with the aws label.

```yaml
apiVersion: addon.open-cluster-management.io/v1alpha1
kind: ClusterManagementAddOn
metadata:
  name: helloworld
  annotations:
    addon.open-cluster-management.io/lifecycle: "addon-manager"
spec:
  addOnMeta:
    displayName: helloworld
  installStrategy:
    type: Placements
    placements:
    - name: placement-aws
      namespace: default
```

```yaml
apiVersion: cluster.open-cluster-management.io/v1beta1
kind: Placement
metadata:
  name: placement-aws
  namespace: default
spec:
  predicates:
    - requiredClusterSelector:
        claimSelector:
          matchExpressions:
            - key: platform.open-cluster-management.io
              operator: In
              values:
                - aws
```

### Rollout strategy

With the rollout strategy defined in the `ClusterManagementAddOn` API, users can
control the upgrade behavior of the addon when there are changes in the
[configurations](#add-on-configurations).

For example, if the add-on user updates the "deploy-config" and wants to apply
the change to the add-ons to a "canary" [decision group](https://open-cluster-management.io/concepts/placement/#decision-strategy) first. If all the add-on
upgrade successfully, then upgrade the rest of clusters progressively per cluster
at a rate of 25%. The rollout strategy can be defined as follows:

```yaml
apiVersion: addon.open-cluster-management.io/v1alpha1
kind: ClusterManagementAddOn
metadata:
  name: helloworld
  annotations:
    addon.open-cluster-management.io/lifecycle: "addon-manager"
spec:
  addOnMeta:
    displayName: helloworld
  installStrategy:
    type: Placements
    placements:
    - name: placement-aws
      namespace: default
      configs:
      - group: addon.open-cluster-management.io
        resource: addondeploymentconfigs
        name: deploy-config
        namespace: open-cluster-management
      rolloutStrategy:
        type: Progressive
        progressive:
          mandatoryDecisionGroups:
          - groupName: "prod-canary-west"
          - groupName: "prod-canary-east"
          maxConcurrency: 25%
          minSuccessTime: 5m
          progressDeadline: 10m
          maxFailures: 2
```

In the above example with type `Progressive`, once user updates the "deploy-config", controller
will rollout on the clusters in `mandatoryDecisionGroups` first, then rollout on the other
clusters with the rate defined in `maxConcurrency`.

- `minSuccessTime` is a "soak" time, means the controller will wait for 5 minutes when a cluster
reach a successful state and `maxFailures` isn't breached. If, after this 5 minutes interval, the
workload status remains successful, the rollout progresses to the next.
- `progressDeadline` means the controller will wait for a maximum of 10 minutes for the workload to
reach a successful state. If, the workload fails to achieve success within 10 minutes, the controller
stops waiting, marking the workload as "timeout," and includes it in the count of `maxFailures`.
- `maxFailures` means the controller can tolerate update to 2 clusters with failed status,
once `maxFailures` is breached, the rollout will stop.

Currently add-on supports 3 types of [rolloutStrategy](https://github.com/open-cluster-management-io/api/blob/main/cluster/v1alpha1/types_rolloutstrategy.go),
they are `All`, `Progressive` and `ProgressivePerGroup`, for more info regards the rollout strategies
check the [Rollout Strategy](https://open-cluster-management.io/concepts/placement/#rollout-strategy) document.

## Add-on configurations

### Default configurations

In `ClusterManagementAddOn`, `spec.supportedConfigs` is a list of configuration 
types supported by the add-on. `defaultConfig` represents the namespace and name of
the default add-on configuration. In scenarios where all add-ons have the same
configuration. Only one configuration of the same group and resource can be specified 
in the `defaultConfig`.

In the example below, add-ons on all the clusters will use "default-deploy-config" and "default-example-config".

```yaml
apiVersion: addon.open-cluster-management.io/v1alpha1
kind: ClusterManagementAddOn
metadata:
  name: helloworld
  annotations:
    addon.open-cluster-management.io/lifecycle: "addon-manager"
spec:
  addOnMeta:
    displayName: helloworld
  supportedConfigs:
  - defaultConfig:
      name: default-deploy-config
      namespace: open-cluster-management
    group: addon.open-cluster-management.io
    resource: addondeploymentconfigs
  - defaultConfig:
      name: default-example-config
      namespace: open-cluster-management
    group: example.open-cluster-management.io
    resource: exampleconfigs
```

### Configurations per install strategy

In `ClusterManagementAddOn`, `spec.installStrategy.placements[].configs` lists the
configuration of `ManagedClusterAddon` during installation for a group of clusters.
For the need to use multiple configurations with the same group and resource can be defined
in this field since OCM v0.15.0. It will override the [Default configurations](#default-configurations) 
on certain clusters by group and resource.

In the example below, add-ons on clusters selected by `Placement` placement-aws will
use "deploy-config", "example-config-1" and "example-config-2", while all the other add-ons
will still use "default-deploy-config" and "default-example-config".

```yaml
apiVersion: addon.open-cluster-management.io/v1alpha1
kind: ClusterManagementAddOn
metadata:
  name: helloworld
  annotations:
    addon.open-cluster-management.io/lifecycle: "addon-manager"
spec:
  addOnMeta:
    displayName: helloworld
  supportedConfigs:
  - defaultConfig:
      name: default-deploy-config
      namespace: open-cluster-management
    group: addon.open-cluster-management.io
    resource: addondeploymentconfigs
  installStrategy:
    type: Placements
    placements:
    - name: placement-aws
      namespace: default
      configs:
      - group: addon.open-cluster-management.io
        resource: addondeploymentconfigs
        name: deploy-config
        namespace: open-cluster-management
      - group: example.open-cluster-management.io
        resource: exampleconfigs
        name: example-config-1
        namespace: open-cluster-management
      - group: example.open-cluster-management.io
        resource: exampleconfigs
        name: example-config-2
        namespace: open-cluster-management
```

### Configurations per cluster

In `ManagedClusterAddOn`, `spec.configs` is a list of add-on configurations.
In scenarios where the current add-on has its own configurations. It also supports
defining multiple configurations with the same group and resource since OCM v0.15.0. 
It will override the [Default configurations](#default-configurations) and 
[Configurations per install strategy](#configurations-per-install-strategy) defined
in `ClusterManagementAddOn` by group and resource.

In the below example, add-on on cluster1 will use "cluster1-deploy-config" and "cluster1-example-config".

```yaml
apiVersion: addon.open-cluster-management.io/v1alpha1
kind: ManagedClusterAddOn
metadata:
  name: helloworld
  namespace: cluster1
spec:
  configs:
  - group: addon.open-cluster-management.io
    resource: addondeploymentconfigs
    name: cluster1-deploy-config
    namespace: open-cluster-management
  - group: example.open-cluster-management.io
    resource: exampleconfigs
    name: cluster1-example-config
    namespace: open-cluster-management
```

### Supported configurations
Supported configurations is a list of configuration types that are allowed to override
the add-on configurations defined in ClusterManagementAddOn spec. They are listed in the
`ManagedClusterAddon` `status.supportedConfigs`, for example:

```yaml
apiVersion: addon.open-cluster-management.io/v1alpha1
kind: ManagedClusterAddOn
metadata:
  name: helloworld
  namespace: cluster1
spec:
...
status:
...
  supportedConfigs:
  - group: addon.open-cluster-management.io
    resource: addondeploymentconfigs
  - group: example.open-cluster-management.io
    resource: exampleconfigs
```

### Effective configurations

As the above described, there are 3 places to define the add-on configurations,
they have an override order and eventually only one takes effect. The final effective
configurations are listed in the `ManagedClusterAddOn` `status.configReferences`.

- `desiredConfig` record the desired config and it's spec hash.
- `lastAppliedConfig` record the config when the corresponding ManifestWork is
applied successfully.

For example:

```yaml
apiVersion: addon.open-cluster-management.io/v1alpha1
kind: ManagedClusterAddOn
metadata:
  name: helloworld
  namespace: cluster1
...
status:
...
  configReferences:
  - desiredConfig:
      name: cluster1-deploy-config
      namespace: open-cluster-management
      specHash: dcf88f5b11bd191ed2f886675f967684da8b5bcbe6902458f672277d469e2044
    group: addon.open-cluster-management.io
    lastAppliedConfig:
      name: cluster1-deploy-config
      namespace: open-cluster-management
      specHash: dcf88f5b11bd191ed2f886675f967684da8b5bcbe6902458f672277d469e2044
    lastObservedGeneration: 1
    name: cluster1-deploy-config
    resource: addondeploymentconfigs
```

## Examples

Here's a few examples of cases where we will need add-ons:

1. A tool to collect alert events in the managed cluster, and send to the hub
   cluster.
2. A network solution that uses the hub to share the network info and establish
   connection among managed clusters. See [cluster-proxy](https://github.com/open-cluster-management-io/cluster-proxy)
3. A tool to spread security policies to multiple clusters.

## Add-on framework

[Add-on framework](https://github.com/open-cluster-management-io/addon-framework)
provides a library for developers to develop an add-ons in open-cluster-management
more easily. Take a look at the [helloworld example](https://github.com/open-cluster-management-io/addon-framework/tree/main/examples/helloworld)
to understand how the add-on framework can be used.

### Custom signers

The original Kubernetes CSR api only supports three built-in signers:

- "kubernetes.io/kube-apiserver-client"
- "kubernetes.io/kube-apiserver-client-kubelet"
- "kubernetes.io/kubelet-serving"

However in some cases, we need to sign additional custom certificates for the
addon agents which is not used for connecting any kube-apiserver. The addon
manager can be serving as a custom CSR signer controller based on the
addon-framework's extensibility by implementing the signing logic. Note that
after successfully signing the certificates, the framework will also keep
rotating the certificates automatically for the addon.


### Hub credential injection

The addon manager developed base on [addon-framework](https://github.com/open-cluster-management-io/addon-framework)
will automatically persist the signed certificates as secret resource to the
managed clusters after signed by either original Kubernetes CSR controller or
custom signers. The injected secrets will be:

- For "kubernetes.io/kube-apiserver-client" signer, the name will be "<addon name>
  -hub-kubeconfig" with properties:
  - "kubeconfig": a kubeconfig file for accessing hub cluster with the addon's
    identity.
  - "tls.crt": the signed certificate.
  - "tls.key": the private key.
- For custom signer, the name will be "<addon name>-<signer name>-client-cert"
  with properties:
  - "tls.crt": the signed certificate.
  - "tls.key": the private key.

### Auto-install by cluster discovery

The addon manager can automatically install an addon to the managed clusters
upon discovering new clusters by setting the `InstallStrategy` from the
[addon-framework](https://github.com/open-cluster-management-io/addon-framework).
On the other hand, the admin can also manually install the addon for the
clusters by applying `ManagedClusterAddOn` into their cluster namespace.
