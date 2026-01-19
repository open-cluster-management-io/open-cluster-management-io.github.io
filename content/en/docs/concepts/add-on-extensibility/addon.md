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
for the purpose of working with multiple clusters in custom cases.

**API Version Note**: OCM addon APIs support both `v1alpha1` (stored version) and `v1beta1`. Both versions are automatically converted by Kubernetes. This documentation uses `v1alpha1`. For API version details, see [Enhancement: Addon API v1beta1](https://github.com/open-cluster-management-io/enhancements/tree/main/enhancements/sig-architecture/158-addon-v1beta1).

A typical addon should consist of two kinds of components:

- __Addon Agent__: A Kubernetes controller *in the managed cluster* that manages
  the managed cluster for the hub admins. A typical addon agent is expected to
  be working by subscribing the prescriptions (e.g. in forms of CustomResources)
  from the hub cluster and then consistently reconcile the state of the managed
  cluster like an ordinary Kubernetes operator does.

- __Addon Manager__: A Kubernetes controller *in the hub cluster* that applies
  manifests to the managed clusters via the [ManifestWork]({{< ref "docs/concepts/work-distribution/manifestwork" >}})
  API. In addition to resource dispatching, the manager can optionally manage
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

Add-on configurations allow users to customize the behavior of add-ons across managed clusters. They include default configurations applicable to all clusters, specific configurations defined per install strategy for groups of clusters, and individual configurations for each managed cluster. This flexibility ensures that each cluster can be tailored to meet its unique requirements while maintaining a consistent management framework.

Please refer to the [Add-on management]({{< ref "docs/getting-started/installation/addon-management" >}}) for more details.

## Examples

All available Add-Ons are listed in the [Add-ons and Integrations]({{< ref "docs/getting-started/integration" >}}) section.

The [addon-contrib](https://github.com/open-cluster-management-io/addon-contrib/tree/main) repository hosts a collection of Open Cluster Management (OCM) addons for staging and testing Proof of Concept (PoC) purposes.

## Add-on Development

[Add-on framework](https://github.com/open-cluster-management-io/addon-framework)
provides a library for developers to develop an add-ons in open-cluster-management
more easily.

Please refer to the [add-on development guide]({{< ref "docs/developer-guides/addon/" >}}) for more details.