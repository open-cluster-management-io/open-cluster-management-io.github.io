---
title: Multicluster Control Plane
weight: 5
---



## What is `Multicluster Control Plane`
The multicluster control plane is a lightweight Open Cluster Manager (OCM) control plane that is easy to install and has a small footprint. It can be running anywhere with or without a Kubernetes environment to serve the OCM control plane capabilities.

## Why use `Multicluster Control Plane`
1. Some Kubernetes environments do not have CSR (e.g., EKS) so that the standard OCM control plane cannot be installed. The multicluster control plane can be able to install in these environments and expose the OCM control plane API via loadbalancer.

2. Some users may want to run multiple OCM control planes to isolate the data. The typical case is that the user wants to run one OCM control plane for production and another OCM control plane for development. The multicluster control plane is able to be installed in different namespaces in a single cluster. Each multicluster control plane is running independently and serving the OCM control plane capabilities.

3. Some users may want to run the OCM control plane without a Kubernetes environment. The multicluster control plane can run in a standalone mode, for example, running in a VM. Expose the control plane API to the outside so the managed clusters can register to it.

## How to use `Multicluster Control Plane`

### Start the standalone multicluster control plane

You need build `multicluster-controlplane` in your local host. Follow the below steps to build the binary and start the multicluster control plane.

```Shell
git clone https://github.com/open-cluster-management-io/multicluster-controlplane.git
cd multicluster-controlplane
make run
```

Once the control plane is running, you can access the control plane by using `kubectl --kubeconfig=./_output/controlplane/.ocm/cert/kube-aggregator.kubeconfig`.

You can customize the control plane configurations by creating a config file and using the environment variable `CONFIG_DIR` to specify your config file directory. Please check the [repository documentation](https://github.com/open-cluster-management-io/multicluster-controlplane#run-controlplane-as-a-local-binary) for details.

### Install via clusteradm

#### Install clusteradm CLI tool

It's recommended to run the following command to download and install **the
latest release** of the `clusteradm` command-line tool:

```shell
curl -L https://raw.githubusercontent.com/open-cluster-management-io/clusteradm/main/install.sh | bash
```
#### Install multicluster control plane

You can use `clusteradm init` to deploy the multicluster control plane in your Kubernetes environment.

1. Set the environment variable KUBECONFIG to your cluster kubeconfig path. For instance, create a new KinD cluster and deploy multicluster control plane in it.

```Shell
export KUBECONFIG=/tmp/kind-controlplane.kubeconfig
kind create cluster --name multicluster-controlplane
export mc_cp_node_ip=$(kubectl get nodes -o=jsonpath='{.items[0].status.addresses[?(@.type=="InternalIP")].address}')
```

2. Run following command to deploy a control plane

```Shell
clusteradm init --singleton=true --set route.enabled=false --set nodeport.enabled=true --set nodeport.port=30443 --set apiserver.externalHostname=$mc_cp_node_ip --set apiserver.externalPort=30443 --singleton-name multicluster-controlplane
```
Refer to the [repository documentation](https://github.com/open-cluster-management-io/multicluster-controlplane#use-helm-to-deploy-controlplane-in-a-cluster) for how to customize the control plane configurations.

3. Get the control plane kubeconfig by running the following command:

```Shell
kubectl -n multicluster-controlplane get secrets multicluster-controlplane-kubeconfig -ojsonpath='{.data.kubeconfig}' | base64 -d > /tmp/multicluster-controlplane.kubeconfig
```

### Join a cluster to the multicluster control plane

You can use `clusteradm` to join a cluster. For instance, take the KinD cluster as an example, run the following command to join the cluster to the control plane:

```Shell
kind create cluster --name cluster1 --kubeconfig /tmp/kind-cluster1.kubeconfig
clusteradm --kubeconfig=/tmp/multicluster-controlplane.kubeconfig get token --use-bootstrap-token
clusteradm --singleton=true --kubeconfig /tmp/kind-cluster1.kubeconfig join --hub-token <controlplane token> --hub-apiserver https://$mc_cp_node_ip:30443/ --cluster-name cluster1
clusteradm --kubeconfig=/tmp/multicluster-controlplane.kubeconfig accept --clusters cluster1
```

### Verify the cluster join
Run this command to verify the cluster join:
```Shell
kubectl --kubeconfig=/tmp/multicluster-controlplane.kubeconfig get managedcluster
NAME       HUB ACCEPTED   MANAGED CLUSTER URLS                  JOINED   AVAILABLE   AGE
cluster1   true           https://cluster1-control-plane:6443   True     True        5m25s
```
You should see the managedcluster joins to the multicluster control plane. Congratulations!
