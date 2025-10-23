---
title: FleetConfig Controller
weight: 6
---

## What is the `FleetConfig Controller`

The (https://github.com/open-cluster-management-io/lab/tree/main/fleetconfig-controller) introduces 2 new custom resources to the OCM ecosystem: `Hub` and `Spoke` . It reconciles `Hub` and `Spoke` resources to declaratively manage the lifecycle of Open Cluster Management (OCM) multi-clusters.

The `fleetconfig-controller` will initialize an OCM hub and one or more spoke clusters; add, remove, and upgrade clustermanagers and klusterlets when their bundle versions change, manage their feature gates, and uninstall all OCM components properly whenever a `Hub` or `Spoke` is deleted.

The controller is a lightweight wrapper around [`clusteradm`](https://github.com/open-cluster-management-io/clusteradm). Anything you can accomplish imperatively via a series of `clusteradm` commands can now be accomplished declaratively using the `fleetconfig-controller`.

`fleetconfig-controller` is built as an OCM AddOn, and will install an agent in each spoke cluster to manage Day 2 operations. AddOn mode can be optionally disabled if required.

## Quick Start

### Prerequisites

- [Helm](https://helm.sh/docs/intro/install/) v3.17+

### Installation

The controller is installed via Helm.

```bash
helm repo add ocm https://open-cluster-management.io/helm-charts
helm repo update ocm
helm install fleetconfig-controller ocm/fleetconfig-controller -n fleetconfig-system --create-namespace
```

By default the Helm chart will also produce a `Hub` and 1 `Spoke` (`hub-as-spoke`) to orchestrate, however that behaviour can be disabled. Refer to the chart [README](https://github.com/open-cluster-management-io/lab/blob/main/fleetconfig-controller/charts/fleetconfig-controller/README.md) for full documentation.

## Support Matrix

Support for orchestration of OCM multi-clusters varies based on the Kubernetes distribution and/or cloud provider.

| Kubernetes Distribution | Support Level      |
|-------------------------|--------------------|
| Vanilla Kubernetes      | ✅ Fully Supported |
| Amazon EKS              | ✅ Fully Supported |
| Google GKE              | ✅ Fully Supported |
| Azure AKS               | 🚧 On Roadmap      |
