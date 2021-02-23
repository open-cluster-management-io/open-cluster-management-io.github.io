---
title: Architecture
weight: -20
---

This page tells you the architecture and basic concepts in open-cluster-management.

<!-- spellchecker-disable -->

{{< toc >}}

<!-- spellchecker-enable -->

## Hub cluster

The _hub_ cluster is the common term that is used to define the central controller that runs in a Kubernetes cluster.
The hub cluster aggregates information from multiple clusters by using an asynchronous work request model.


## Klusterlet

The _klusterlet_ is an agent running on the cluster managed by the hub.


## Managed cluster

The _managed cluster_ provides a representation of the managed cluster on the hub. ManagedCluster controls the lifecycle of whether the remote cluster has been "accepted" by the Hub for management and can retrieve information from the Hub to direct a set of manifests or actions to apply.


## Application lifecycle (work in progress)

The _application lifecycle_ defines the processes that are used to manage application resources on your managed clusters.
A multi-cluster application uses a Kubernetes specification, but with additional automation of the deployment and lifecycle management of resources to individual clusters.
A multi-cluster application allows you to deploy resources on multiple clusters, while maintaining easy-to-reconcile service routes, as well as full control of Kubernetes resource updates for all aspects of the application.


## Application console (work in progress)

The _application console_ runs only on the hub cluster. It defines the user interface used to create and manage application resources deployed on your managed clusters through the use of _application lifecycle_ subscription operators. The UI component, `application-ui`, does not have any direct dependencies on backend components provided by the Application Lifecycle squad. Instead, it depends on the `console-api` and `search-api` components to work with the custom Kubernetes resources of the _application lifecycle_ model. The `application-ui` component is packaged as a Helm chart using the `application-chart` module.

The _application console_ covers the following three components:
- [application-chart](https://github.com/open-cluster-management/application-chart)
- [application-ui](https://github.com/open-cluster-management/application-ui)
- [console-api](https://github.com/open-cluster-management/console-api)

![Application console architecture](../../app-lifecycle-ui-arch.png)


## Governance and risk (work in progress)

_Governance and risk_ is the term used to define the processes that are used to manage security and compliance from the hub cluster. Ensure the security of your cluster with the extensible policy framework. After you configure a hub cluster and a managed cluster, you can create, modify and delete policies on the hub and apply policies to managed clusters.
