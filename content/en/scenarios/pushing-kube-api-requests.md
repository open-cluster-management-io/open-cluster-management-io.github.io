---
title: Pushing Kubernetes API requests to the managed clusters
weight: 1
---

By following the instructions in this document, an OCM hub admin will be able
to "push" Kubernetes API requests to the managed clusters. The benefit of using
this method for "pushing" requests in OCM is that we don't need to explicitly
configure any API endpoint for the managed clusters or provide any client
credentials as preparation. We just need to enable/install the following OCM
addons:

- [Cluster-Proxy](https://github.com/open-cluster-management-io/cluster-proxy):
  Setting up the [konnectivity](https://kubernetes.io/docs/tasks/extend-kubernetes/setup-konnectivity/)
  tunnels between the hub cluster and the managed clusters so the hub cluster
  can connect/access the managed cluster from anywhere.
- [Managed-ServiceAccount](https://github.com/open-cluster-management-io/managed-serviceaccount):
  Automating the lifecycle of the local service account in the managed clusters
  and projecting the tokens back to the hub cluster so that the Kubernetes API
  clients from the hub can make authenticated requests.
- [Cluster-Gateway](https://github.com/oam-dev/cluster-gateway): An aggregated
  apiserver providing a "proxy" subresource which helps the hub admin to
  gracefully access the managed clusters by standard Kubernetes API calls
  (including long-running calls).

## Prerequisite

You must meet the following prerequisites to install the managed service
account:

* Ensure your `open-cluster-management` release is greater than `v0.5.0`.
* Ensure [`kubectl`](https://kubernetes.io/docs/tasks/tools/install-kubectl) is installed.
* Ensure [`helm`](https://helm.sh/docs/intro/install/) is installed.

## Installation

### Adding helm chart repo

Making sure the following OCM addons are discovered by your helm environment:

```shell
$ helm repo add ocm https://openclustermanagement.blob.core.windows.net/releases/
$ helm repo update
$ helm search repo ocm
NAME                             	CHART VERSION	APP VERSION	DESCRIPTION                                   
ocm/cluster-gateway-addon-manager	1.3.2       	1.0.0      	A Helm chart for Cluster-Gateway Addon-Manager
ocm/cluster-proxy                	0.2.0        	1.0.0      	A Helm chart for Cluster-Proxy OCM Addon      
ocm/managed-serviceaccount       	0.2.0        	1.0.0      	A Helm chart for Managed ServiceAccount Addon 
```

### Install the OCM addons

By the following helm commands to install the addons:

```shell
$ helm -n open-cluster-management-addon install cluster-proxy ocm/cluster-proxy
$ helm -n open-cluster-management-addon install managed-serviceaccount ocm/managed-serviceaccount
$ helm -n open-cluster-management-addon install cluster-gateway ocm/cluster-gateway-addon-manager  \
    # Delegating for secret discovery to "managed-serviceaccount" addon.                           \
    # Skip the option for manual secret management.                                                \
    --set manualSecretManagement=false                                                             \
    # Enabling konnectivity tunnels via "cluster-proxy" addon.                                     \
    # Skip the option if the hub cluster and the managed clusters are already mutually accessible. \
    --set konnectivityEgress=true
```

### Confirm addon installation

The commands above installs the addon manager into the hub cluster, and the
manager will creating `ManagedClusterAddOn` automatically into the cluster
namespaces representing the addon is plumbed into the managed cluster. In order
to check their status, run:

```shell
$ kubectl get managedclusteraddon -A
NAMESPACE   NAME                     AVAILABLE   DEGRADED   PROGRESSING
managed1    cluster-gateway          True
managed1    cluster-proxy            True                   
managed1    managed-serviceaccount   True 
```

Furthermore, after the addons are all deployed successfully, the hub admin will
be able to see a new resource named `ClusterGateway` registered into the hub
cluster:

```shell
$ kubectl get clustergateway
NAME       PROVIDER   CREDENTIAL-TYPE       ENDPOINT-TYPE
managed1              ServiceAccountToken   ClusterProxy
```

## Usage

Now the gateway is ready for proxying your requests to the managed clusters
dynamically. The easiest way to verify if the proxying framework is working
is to run the following command:

```shell
$ export CLUSTER_NAME=managed1 # Or any other valid managed cluster name
$ kubectl get --raw="/apis/cluster.core.oam.dev/v1alpha1/clustergateways/${CLUSTER_NAME}/proxy/healthz"
ok
```

Another nice feature is that you can also easily convert the kubeconfig of the
hub cluster into a managed cluster's kubeconfig by adding the api suffix to the
cluster endpoint in your kubeconfig:

```diff
$ # Copy and edit your original hub kubeconfig into e.g. managed1.kubeconfig
apiVersion: v1
clusters:
...
---    server: https://x.x.x.x
+++    server: https://x.x.x.x/apis/cluster.core.oam.dev/v1alpha1/clustergateways/${CLUSTER_NAME}/proxy
```

Then we can access the managed cluster directly via kubectl with the tweaked
kubeconfig:

```shell
$ KUBECONFIG=managed1.kubeconfig kubectl get ns
```

However upon your first-time installation, you may encounter the RBAC
restriction message such as:

```text
Error from server (Forbidden): namespaces is forbidden: User "system:serviceaccount:open-cluster-management-managed-serviceaccount:cluster-gateway" cannot list resource "namespaces" in API group "" at the cluster scope
```

That is because we haven't set up proper RBAC permissions for the `egress`
service account managed by the `ManagedServiceAccount` yet. After granting
sufficient permissions for the service account in the managed clusters, you
will be able to freely operate the managed cluster from the hub without asking
for any credential or kubeconfig from the managed clusters. Note that the
service account is also periodically rotated by the addons so there's no need
to worry in sustainable credential management.

## Insight

Overall, the following picture of architecture reveals the internal technique
of the request "pushing" framework in the OCM:

<div style="text-align: center; padding: 20px;">
   <img src="/proxy-framework.png" alt="Cluster proxy architecture" style="margin: 0 auto; width: 90%">
</div>

With the help of the framework, we can easily develop a web service or an
operator that runs in the hub cluster and is able to access to the managed
clusters through the gateway. Note that it's generally not recommended to
list-watch the managed clusters from the hub because it's in a sense violating
the original philosophy of "pull" or "hub-agent" architecture of OCM. In
order to coordinate the hub cluster and the managed clusters in your custom
system, consider build your own OCM addon based on the [addon-framework](https://github.com/open-cluster-management-io/addon-framework)
which provides you utilities for further customization.
