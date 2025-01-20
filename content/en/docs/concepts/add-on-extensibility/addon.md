---
title: Add-ons
weight: 1
aliases:
  - /concepts/addon/
  - /docs/concepts/addon/
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
  manifests to the managed clusters via the [ManifestWork]({{< ref "docs/concepts/work-distribution/manifestwork" >}})
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

## Add-on lifecycle management

Add-on lifecycle management refers to how to enable and disable an add-on on a managed cluster, how to set the add-on installation strategy and rollout strategy. 

Please refer to the [Add-on management]({{< ref "docs/getting-started/installation/addon-management" >}}) for more details.

### Install strategy
InstallStrategy represents that related ManagedClusterAddOns should be installed on certain clusters. 

### Rollout strategy
With the rollout strategy defined in the `ClusterManagementAddOn` API, users can
control the upgrade behavior of the addon when there are changes in the configurations.

## Add-on configurations

Add-on configurations allow users to customize the behavior of add-ons across managed clusters. They include default configurations applicable to all clusters, specific configurations defined per install strategy for groups of clusters, and individual configurations for each managed cluster. This flexibility ensures that each cluster can be tailored to meet its unique requirements while maintaining a consistent management framework. For more details, please refer to the [Add-on management]({{< ref "docs/getting-started/installation/addon-management" >}}) documentation.

## Examples

All available Add-Ons are listed in the [Add-ons and Integrations]({{< ref "docs/getting-started/integration" >}}) section.

The [oddon-contrib](https://github.com/open-cluster-management-io/addon-contrib/tree/main) repository hosts a collection of Open Cluster Management (OCM) addons for staging and testing Proof of Concept (PoC) purposes.

## Add-on Development

[Add-on framework](https://github.com/open-cluster-management-io/addon-framework)
provides a library for developers to develop an add-ons in open-cluster-management
more easily. Please refer to the [add-on development guide]({{< ref "docs/developer-guides/addon/" >}}) for more details.

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
