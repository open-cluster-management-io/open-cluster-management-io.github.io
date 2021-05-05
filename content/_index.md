---
title: What is Open Cluster Management?
---

The Open Cluster Management project consists of several multicluster components, which are used to access and manage your clusters. It was started to bring together the various aspects of managing Kubernetes clusters into an integrated solution comprised of loosely coupled building blocks. Here are some examples of the Multicluster APIs that are part of the project today:

- Define API for cluster registration independent of cluster CRUD lifecycle.
- Define API for work distribution across multiple clusters.
- Define API for dynamic placement of content and behavior across multiple clusters.
- Define API for policy definition to ensure desired configuration and security settings are auditable or enforceable.
- Define API for distributed application delivery across many clusters and the ability to deliver ongoing updates.

## Quick start with core components

![open-cluster-management](/ocm-small.png)

Install and create a [Cluster manager](https://operatorhub.io/operator/cluster-manager) on your _hub_ cluster.

Install and create a [Klusterlet agent](https://operatorhub.io/operator/klusterlet) on your _manage_ cluster.

For more details see [Core Components](getting-started/core).

## Governance policy framework

Enable the Policy framework add-on to gain visibility and drive remediation for various security and configuration aspects to help meet such enterprise standards. For more details see [Policy framework add-on](getting-started/integration/policy-framework).

## Application lifecycle management

Enable the Application Lifecycle Management add-on for delivery, upgrade, and configuration of applications on Kubernetes clusters. For more details see [Application lifecycle management add-on](getting-started/integration/app-lifecycle).

## Cluster lifecycle management

Using OKD and Hive technologies, enable the Cluster Lifecycle Management add-on to unlock enhanced multicluster management capabilities. For more details see [Cluster lifecycle management add-on](getting-started/integration/cluster-lifecycle).
