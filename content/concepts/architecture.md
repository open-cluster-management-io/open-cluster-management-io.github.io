---
title: Architecture
weight: -20
---

This page tells you the architecture and basic concepts in open-cluster-management.

<!-- spellchecker-disable -->

{{< toc >}}

<!-- spellchecker-enable -->

## Hub cluster

The _hub_ cluster is the common term that is used to define the central controller that runs in a Kubernetes cluster,
The hub cluster aggregates information from multiple clusters by using an asynchronous work request model.


## Klusterlet

The _klusterlet_ is an agent running on the cluster managed by the hub.

## Managed cluster

The managed cluster is the term that is used to define additional clusters with the Klusterlet, which is the agent that initiates a connection to hub cluster.
The managed cluster receives and applies requests, then returns the results.


## Application lifecycle

_application lifecycle_ defines the processes that are used to manage application resources on your managed clusters.
A multi-cluster application uses a Kubernetes specification, but with additional automation of the deployment and lifecycle management of resources to individual clusters.
A multi-cluster application allows you to deploy resources on multiple clusters, while maintaining easy-to-reconcile service routes, as well as full control of Kubernetes resource updates for all aspects of the application.


## Governance and risk

Governance and risk is the term used to define the processes that are used to manage security and compliance from a central interface page.
After you configure a {product-title} hub cluster and a managed cluster, you can view and create policies with the Red Hat Advanced Cluster Management policy framework.