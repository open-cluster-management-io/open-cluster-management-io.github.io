---
title: Architecture
weight: 1
---

This page is an overview of open cluster management.

<!-- spellchecker-disable -->

{{< toc >}}

<!-- spellchecker-enable -->

## Overview

__Open Cluster Management__ (OCM) is a powerful, modular, extensible platform 
for Kubernetes multi-cluster orchestration. Learning from the past failing 
lesson of building Kubernetes federation systems in the Kubernetes community, 
in OCM we will be jumping out of the legacy centric, imperative architecture of
[Kubefed v2](https://github.com/kubernetes-sigs/kubefed) and embracing the 
"hub-agent" architecture which is identical to the original pattern of 
"hub-kubelet" from Kubernetes. Hence, intuitively in OCM our multi-cluster 
control plane is modeled as a "Hub" and on the other hand each of the clusters 
being managed by the "Hub" will be a "Klusterlet" which is obviously inspired 
from the original name of "kubelet". Here's a more detailed clarification of 
the two models we will be frequently using throughout the world of OCM:

* __Hub Cluster__: Indicating the cluster that runs the multi-cluster control
  plane of OCM. Generally the hub cluster is supposed to be a light-weight 
  Kubernetes cluster hosting merely a few fundamental controllers and services. 
  
* __Klusterlet__: Indicating the clusters that being managed by the hub 
  cluster. Klusterlet might also be called "managed cluster" or "spoke cluster". The 
  klusterlet is supposed to actively __pulling__ the latest prescriptions from
  the hub cluster and consistently reconciles the physical Kubernetes cluster
  to the expected state.
  
### "Hub-spoke" architecture

Benefiting from the merit of ["hub-spoke"](https://en.wikipedia.org/wiki/Spoke%E2%80%93hub_distribution_paradigm) architecture, in abstraction we 
are de-coupling most of the multi-cluster operations generally into 
(1) computation/decision and (2) execution, and the actual execution against 
the target cluster will be completely off-loaded into the managed cluster. The
hub cluster won't directly request against the real clusters, instead it 
just persists its prescriptions declaratively for each cluster, and the 
klusterlet will be actively pulling the prescriptions from the hub and doing
the execution. Hence, the burden of the hub cluster will be greatly relieved
because the hub cluster doesn't need to either deal with flooding events from 
the managed clusters or be buried in sending requests against the clusters. 
Imagine in a world where there's no kubelet in Kubernetes and its control plane
is directly operating the container daemons, it will be extremely hard for a 
centric controller to manage a cluster of 5k+ nodes. Likewise, that's how OCM
trying to breach the bottleneck of scalability, by dividing and offloading the 
execution into separated agents. So it's always feasible for a hub cluster to
accept and manage thousand-ish clusters.

Each klusterlet will be working independently and autonomously, so they have
a weak dependency to the availability of the hub cluster. If the hub goes down 
(e.g. during maintenance or network partition) the klusterlet or other OCM 
agents working in the managed cluster are supposed to keep actively managing 
the hosting cluster until it re-connects. Additionally if the hub cluster and
the managed clusters are owned by different admins, it will be easier for the 
admin of the managed cluster to police the prescriptions from the hub control 
plane because the klusterlet is running as a "white-box" as a pod instance in
the managed cluster. Upon any accident, the klusterlet admin can quickly cut
off the connection with the hub cluster without shutting the whole multi-cluster
control plane down.

<div style="text-align: center; padding: 20px;">
    <img src="https://github.com/open-cluster-management-io/OCM/raw/main/assets/ocm-arch.png" alt="Architecture diagram" style="margin: 0 auto; width: 50%">
</div>


The "hub-agent" architecture also minimized the requirements in the network
for registering a new cluster to the hub. Any cluster that can reach the 
endpoint of the hub cluster will be able to be managed, even a random KinD 
sandbox cluster on your laptop. That is because the prescriptions are 
effectively __pulled__ from the hub instead of __pushing__. In addition to 
that, OCM also provides a [addon](https://open-cluster-management.io/concepts/addon/)
named ["cluster-proxy"](https://open-cluster-management.io/getting-started/integration/cluster-proxy/)
which automatically manages a reverse proxy tunnel for proactive access to the 
managed clusters by leveraging on the Kubernetes' subproject [konnectivity](https://kubernetes.io/docs/tasks/extend-kubernetes/setup-konnectivity/).


### Modularity and extensibility

Not only OCM will bring you a fluent user-experience of managing a number of
clusters on ease, but also it will be equally friendly to further customization
or second-time development. Every functionality working in OCM is expected to
be freely-pluggable by modularizing the atomic capability into separated 
building blocks, except for the mandatory core module named [registration](https://github.com/open-cluster-management-io/registration)
which is responsible for controlling the lifecycle of a managed controller 
and exporting the elementary `ManagedCluster` model.

Another good example surfacing our modularity will be the [placement](https://open-cluster-management.io/concepts/placement/),
a standalone module focusing at dynamically selecting the proper list of 
the managed clusters from the user's prescription. You can build any advanced 
multi-cluster orchestration on the top of placement, e.g. multi-cluster
workload re-balancing, multi-cluster helm charts replication, etc. On the
other hand if you're not satisfied by the current capacities from our placement
module, you can quickly opt-out and replace it with your customized ones, and
reach out to our community so that we can converge in the future if possible.


---

## Concepts

### Cluster registering: "double opt-in handshaking"

Practically the hub cluster and the managed cluster can be owned/maintained 
by different admins, so in OCM we clearly separated the roles and make the
cluster registration require approval from the both sides defending from unwelcome
requests. In terms of terminating the registration, the hub admin can kick
out a registered cluster by denying the rotation of hub cluster's certificate,
on the other hand from the perspective of a managed cluster's admin, he can
either brutally deleting the agent instances or revoking the granted RBAC 
permissions for the agents. Note that the hub controller will be automatically
preparing environment for the newly registered cluster and cleaning up neatly
upon kicking a managed cluster.

<div style="text-align: center; padding: 20px;">
   <img src="/double-optin-registration.png" alt="Double opt-in handshaking" style="margin: 0 auto; width: 60%">
</div>

### Cluster registration security model

<div style="text-align: center; padding: 20px;">
   <img src="/security-model.png" alt="Security model" style="margin: 0 auto; width: 60%">
</div>

The worker cluster admin can list and read any managed cluster’s CSR, 
but those CSR cannot be used to impersonate due to the fact that CSR only 
contains the certificate. The client authentication requires both the key and certificate. 
The key is stored in each managed cluster, and it will not be transmitted across the network.

The worker cluster admin cannot approve his or her own cluster registration by default. 
Two separate RBAC rules are needed to approve a cluster registration. 
The permission to approve the CSR and the permission to accept the managed cluster. 
Only the cluster admin on hub has both permissions and can accept the cluster registration request.
The second accept permission is gated by a webhook.

### Cluster namespace 

Kubernetes has a native soft multi-tenancy isolation in the granularity of
its namespace resources, so in OCM, for each of the managed cluster we will
be provisioning a dedicated namespace for the managed cluster and grants
sufficient RBAC permissions so that the klusterlet can persist some data
in the hub cluster. This dedicated namespace is the "cluster namespace" which
is majorly for saving the prescriptions from the hub. e.g. we can create 
`ManifestWork` in a cluster namespace in order to deploy some resources towards
the corresponding cluster. Meanwhile, the cluster namespace can also be used
to save the uploaded stats from the klusterlet e.g. the healthiness of an
addon, etc.

### Addons

Addon is a general concept for the optional, pluggable customization built over
the extensibility from OCM. It can be a controller in the hub cluster, or just 
a customized agent in the managed cluster, or even the both collaborating 
in peers. The addons are expected to implement the `ClusterManagementAddon` or
`ManagedClusterAddOn` API of which a detailed elaboration can be found [here](https://open-cluster-management.io/concepts/addon/).

---

## Building blocks

The following is a list of commonly-used modules/subprojects that you might 
be interested in the journey of OCM:

### Registration

The core module of OCM manages the lifecycle of the managed clusters. The
registration controller in the hub cluster can be intuitively compared to a 
broker that represents and manages the hub cluster in terms of cluster 
registration, while the registration agent working in the managed cluster
is another broker that represents the managed cluster. After a successful
registration, the registration controller and agent will also be consistently
probing each other's healthiness. i.e. the cluster heartbeats.


### Work

The module for dispatching resources from the hub cluster to the managed 
clusters, which can be easily done by writing a `ManifestWork` resource into
a cluster namespace. See more details about the API [here](https://open-cluster-management.io/concepts/manifestwork/).

### Placement

Building custom advanced topology across the clusters by either grouping 
clusters via the labels or the cluster-claims. The placement module is 
completely decoupled from the execution, the output from placement will
be merely a list of names of the matched clusters in the `PlacementDecision`
API, so the consumer controller of the decision output can reactively 
discovery the topology or availability change from the managed clusters by
simply list-watching the decision API.


### Application lifecycle

The _application lifecycle_ defines the processes that are used to manage 
application resources on your managed clusters. A multi-cluster application 
uses a Kubernetes specification, but with additional automation of the 
deployment and lifecycle management of resources to individual clusters. A 
multi-cluster application allows you to deploy resources on multiple clusters, 
while maintaining easy-to-reconcile service routes, as well as full control 
of Kubernetes resource updates for all aspects of the application.

### Governance and risk

_Governance and risk_ is the term used to define the processes that are used 
to manage security and compliance from the hub cluster. Ensure the security 
of your cluster with the extensible policy framework. After you configure a hub
cluster and a managed cluster, you can create, modify and delete policies on 
the hub and apply policies to the managed clusters.

### Registration operator

Automating the installation and upgrading of a few built-in modules in OCM. You
can either deploy the operator standalone or delegate the registration operator 
to the operator lifecycle framework.
