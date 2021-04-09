---
title: What is Open Cluster Management?
---

The Open Cluster Management project consists of several multicluster components, which are used to access and manage your clusters. It was started to bring together the various aspects of managing Kubernetes clusters into an integrated solution comprised of loosely coupled building blocks. Here are some examples of the Multicluster APIs that are part of the project today:

- Define API for cluster registration independent of cluster CRUD lifecycle.
- Define API for work distribution across multiple clusters.
- Define API for dynamic placement of content and behavior across multiple clusters.
- Define API for policy definition to ensure desired configuration and security settings are auditable or enforceable.
- Define API for distributed application delivery across many clusters and the ability to deliver ongoing updates.

## Quick start

Install and create a [Cluster Manager](https://operatorhub.io/operator/cluster-manager) on your _hub_ cluster. For more details see [Install Hub](getting-started/install-hub.md).

Install and create a [Klusterlet agent](https://operatorhub.io/operator/klusterlet) on your _managed_ cluster.
For more details see [Install Klusterlet](getting-started/register-cluster.md).