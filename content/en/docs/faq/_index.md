---
title: FAQ
weight: 8
---

Welcome to our Frequently Asked Questions (FAQ) page! Here, you'll find answers to some of the most common questions we receive. If you have a question that isn't covered here, feel free to reach out to us directly.

## Questions

### What is the difference between Karmada and OCM? ###

We have a post about this at CNCF blog: [Karmada and Open Cluster Management: two new approaches to the multicluster fleet management challenge](https://www.cncf.io/blog/2022/09/26/karmada-and-open-cluster-management-two-new-approaches-to-the-multicluster-fleet-management-challenge/).

### What is the difference between ManifestWork, ManifestWorkReplicaset and AddOn? When to use them? ###

**1. [Manifestwork](../concepts/work-distribution/manifestwork)**

**_Definition:_** Manifestwork is a resource used to define a group of Kubernetes resources that should be applied to a managed cluster from a hub cluster. It allows for the deployment of various resources (like Deployments, Services, etc.) to a specific managed cluster. 

**_Use Case:_** Use ManifestWork when you want to apply a specific set of resources to a single managed cluster. It is ideal for scenarios where you need to manage resources directly and track their status on that cluster.

**_Example:_** Deploying a Deployment and a Service to a managed cluster. You can use [clusteradm](https://github.com/open-cluster-management-io/clusteradm) command `clusteradm create work work-example -f xxx.yaml --clusters cluster1` to wrap the kubernetes native resource with a ManifestWork and submit it to a sepecific managed cluster. 

**2. [ManifestWorkReplicaSet](../concepts/work-distribution/manifestworkreplicaset)**

**_Definition:_** ManifestWorkReplicaSet is an aggregator API that utilizes [Manifestwork](../concepts/work-distribution/manifestwork) and [Placement](../concepts/content-placement/placement) to create multiple ManifestWork resources for clusters selected by placements. It allows for the deployment of resources across multiple clusters based on defined rollout strategies.

**_Use Case:_** Use ManifestWorkReplicaSet when you need to deploy the same resources to multiple clusters simultaneously, with the ability to control the rollout strategy (e.g., all at once, progressively, etc.). It is useful for managing deployments across a fleet of clusters.

**_Example:_** Deploying a CronJob and Namespace to multiple clusters selected by a placement strategy.

**3. [Add-On](../concepts/add-on-extensibility/addon)**

**_Definition:_** An Add-On in Open Cluster Management is a mechanism that consists of an Addon Agent (running in managed clusters) and an Addon Manager (running in the hub cluster). It allows for the management of extensions that work with multiple clusters, providing a way to apply configurations and manage the lifecycle of resources across clusters by using the rollout strategy.

**_Use Case:_** Use Add-Ons when you need to implement a more complex solution that requires ongoing management and configuration of resources across multiple clusters. 

**_Example:_** A tool that collects alert events from managed clusters and sends them to the hub cluster.

**Summary**
- ManifestWork is for single cluster resource management.
- ManifestWorkReplicaSet is for managing resources across multiple clusters with defined rollout strategies.
- Add-On is for implementing extensions that require ongoing management and configuration across multiple clusters, leveraging both an agent and a manager. Also provide the ability to control the addon's lifecycle with rollout strategy.
