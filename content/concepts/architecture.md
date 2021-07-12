---
title: Architecture
weight: 1
---

This page tells you the architecture and basic concepts in open-cluster-management.
<img src="https://github.com/open-cluster-management-io/community/raw/main/assets/ocm-arch.png" 
alt="Architecture diagram" 
class="responsive">
<!-- ![Architecture diagram](https://github.com/open-cluster-management-io/community/raw/main/assets/ocm-arch.png) -->

<!-- spellchecker-disable -->

{{< toc >}}

<!-- spellchecker-enable -->

## Overview

open-cluster-management enables any capability within the Kubernetes ecosystem to orchestrate itself across multiple clusters and cloud providers. Consider the requirements that a capability within the Kubernetes ecosystem would need to become multicluster-aware.

- The service must have an API to determine the inventory of available clusters.
- The service must have a way to determine where to schedule and assign Kubernetes API manifests to a selected set of clusters.
- The service must have a way to deliver desired Kubernetes API manifests to a selected set of clusters.
- The service must have a way to govern how users access available clusters or groups of clusters in the fleet.
- Optionally, the service may need to extend the management agent with additional built-in controllers that should be run on managed clusters.

open-cluster-management provides core primitives to satisfy the above requirements to ease the multicluster enablement:

- For awareness of cluster inventory, the [ManagedCluster](/concepts/managedcluster) API represents the cluster under management while a Klusterlet operator running on the remote cluster provides metadata and health information about the availability of the agent and the managed cluster Kubernetes API endpoint.
- For awareness of workload and configuration scheduled, a [Placement](/concepts/placement) API provides the ability to describe the expected characteristics of ideal clusters and the controller will examine the available clusters (based on permissions for the user/namespace) and dynamically match a list of clusters captured in a cluster.open-cluster-management.io/PlacementDecision. Related controllers can then use the result of these decisions to drive further placement of configuration and workload on the selected clusters.
- For the delivery of configuration, the [ManifestWork](/concepts/manifestwork) API provides a simple way to specify one or more Kubernetes manifests that should be delivered and reconciled against the managed cluster.
- To define a consistent access control boundary, users or groups may be assigned to specific ManagedClusters or collections of ManagedClusters known as [ManagedClusterSets](/concepts/managedcluster/#managedclusterset).
- If the service has a need to install built-in controllers or operators on managed clusters, the addon.[ManagedClusterAddon](/concepts/addon) API allows additional behaviors to be injected remotely into the management agent to support abstractions built around the ManifestWork or other core primitives.

## Hub cluster

The _hub_ cluster is the common term that is used to define the central controller that runs on a Kubernetes cluster.
The hub cluster aggregates information from multiple clusters by using an asynchronous work request model.

## Klusterlet

The _klusterlet_ is an agent running on the cluster managed by the hub.

## Managed cluster

The _managed cluster_ provides a representation of the managed cluster on the hub. ManagedCluster controls the lifecycle of whether the remote cluster has been "accepted" by the Hub for management and can retrieve information from the Hub to direct a set of manifests or actions to apply.

## Application lifecycle

The _application lifecycle_ defines the processes that are used to manage application resources on your managed clusters.
A multi-cluster application uses a Kubernetes specification, but with additional automation of the deployment and lifecycle management of resources to individual clusters.
A multi-cluster application allows you to deploy resources on multiple clusters, while maintaining easy-to-reconcile service routes, as well as full control of Kubernetes resource updates for all aspects of the application.

## Governance and risk

_Governance and risk_ is the term used to define the processes that are used to manage security and compliance from the hub cluster. Ensure the security of your cluster with the extensible policy framework. After you configure a hub cluster and a managed cluster, you can create, modify and delete policies on the hub and apply policies to the managed clusters.