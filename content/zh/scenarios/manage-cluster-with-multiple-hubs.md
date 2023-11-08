---
title: Manage a cluster with multiple hubs
weight: 1
---

Normally an Open Cluster Management (OCM) hub manages multiple managed clusters and a cluster only registers to one OCM hub. While there might be some user scenarios, where a single cluster may want to join more than one OCM hub as a managed cluster, including: 
- In an organization, each department may setup an OCM hub to manage clusters owned by this department, and all clusters are managed by a central OCM hub owned by IT department to enforce organization wide security policies.
- A service provider creates clusters for customers. The underlying system of the service provider uses OCM hubs to manage all the clusters. Once customer gets a cluster from the service provider, they may also want to manage this cluster with customer's OCM hub.

This document shows how to achieve it with OCM.

Since the OCM agent is hub specific, that means an agent can connect to only one hub. In order to connect to multiple hubs, each hub should have its own agent running. Depdends on where the agent is running, there are two solutions:

- Run all agents on the managed cluster;
- Run the agents in the hosted mode on the hosting clusters;

### Run all the agents on the managed cluster
Since there are multiple OCM agents are running on the managed cluster, each of them must have an uniqe agent namespace. So only one agent can be deployed in the default agent namespace `open-cluster-management-agent`.

<div style="text-align: center; padding: 20px;">
   <img src="/multi-hubs.png" alt="multiple hubs" style="margin: 0 auto; width: 75%">
</div>

With this architecture, the managed cluster needs more resources, including CPUs and memory, to run agents for multiple hubs. And it's a challenge to handle the version skew of the OCM hubs.

An example built with [kind](https://kind.sigs.k8s.io) and [clusteradm](https://github.com/open-cluster-management-io/clusteradm/releases) can be found in [Manage a cluster with multiple hubs](https://github.com/open-cluster-management-io/OCM/tree/main/solutions/multiple-hubs).

### Run the agents in the hosted mode on the hosting clusters
By leveraging the hosted deployment mode, it's possiable to run OCM agent outside of the managed cluster on a hosing cluster. The hosting cluster could be a managed cluster of the same hub.

<div style="text-align: center; padding: 20px;">
   <img src="/multi-hubs-hosted1.png" alt="multiple hubs in hosted mode" style="margin: 0 auto; width: 60%">
</div>

At most one agent can runs in the default mode on the managed cluster in this solution. 

<div style="text-align: center; padding: 20px;">
   <img src="/multi-hubs-hosted2.png" alt="multiple hubs in hosted mode" style="margin: 0 auto; width: 60%">
</div>

In order to reduce the number of the hosting clusters, agents running in the hosted mode can share the hosting clusters. 

<div style="text-align: center; padding: 20px;">
   <img src="/multi-hubs-hosted3.png" alt="multiple hubs in hosted mode" style="margin: 0 auto; width: 60%">
</div>

With this architecture, the managed cluster itself needs less resources because at most one agent runs on the managed cluster, while it needs at least one extra cluster as hosting cluster. Since each agent could run on different cluster (managed cluster or hosting cluster), it will not result in any problem if OCM hubs have different versions.

An example built with [kind](https://kind.sigs.k8s.io) and [clusteradm](https://github.com/open-cluster-management-io/clusteradm/releases) can be found in [Manage a cluster with multiple hubs in hosted mode](https://github.com/open-cluster-management-io/OCM/tree/main/solutions/multiple-hubs-hosted).
