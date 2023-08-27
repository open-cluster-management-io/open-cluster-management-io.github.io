---
title: Multicluster control plane
weight: 2
---

<!-- spellchecker-disable -->

{{< toc >}}

<!-- spellchecker-enable -->

## What is `Multicluster control plane`
The multicluster control plane is a lightweight Open Cluster Manager (OCM) control plane that is easy to install and has a small footprint. It can be running anywhere with or without kubernetes environment to sever the OCM control plane capabilities.

## Why use `Multicluster control plane`
1. Some kubernetes environments do not have CSR (e.g., EKS) so that the standard OCM control plane cannot be installed. The multicluster control plane can be able to install in these environments and expose the OCM control plane API via loadbalancer.

2. Some users want to run multiple OCM control plane to isolate the data. The typical case is that the user wants to run one OCM control plane for production and another OCM control plane for development. The multicluster control plane can be able to install in the different namespace in a single cluster. Each multicluster control plane is running independently and serving the OCM control plane capabilities.

3. Some users want to run OCM control plane without kubernetes environment. The multicluster control plane can be running in a standalone mode. for example, it can be running in a VM. Expose the control plane API to the outside so the managed clusters can register to it.

## How to use `Multicluster control plane`

### Start the standalone multicluster control plane

You need build `multicluster-controlplane` in your local host. Following below steps to build the binary and start the multicluster control plane.

```Shell
git clone https://github.com/open-cluster-management-io/multicluster-controlplane.git
cd multicluster-controlplane
make run
```

Once the control plane is running, you can access the control plane by using `kubectl --kubeconfig=./_output/controlplane/.ocm/cert/kube-aggregator.kubeconfig`.

You can customize the control plane configurations by creating a config file and using the environment variable `CONFIG_DIR` to specify your config file directory. Please check [here](https://github.com/open-cluster-management-io/multicluster-controlplane#run-controlplane-as-a-local-binary) for details.

### Install via Helm chart

We provide to use Helm chart to deploy the multicluster control plane in your kubernetes environment. 

1. Set the environment variable KUBECONFIG to your cluster kubeconfig path
```Shell
export KUBECONFIG=<the kubeconfig path of your cluster>
```

2. Run following command to deploy a control plane

```Shell
helm repo add ocm https://openclustermanagement.blob.core.windows.net/releases/
helm repo update
helm search repo ocm
helm install -n multicluster-controlplane multicluster-controlplane ocm/multicluster-controlplane --create-namespace
```
Refer to [here](https://github.com/open-cluster-management-io/multicluster-controlplane#use-helm-to-deploy-controlplane-in-a-cluster) for how to customize the control plane configurations.

3. Get the control plane kubeconfig by rununing the following command:

```Shell
kubectl -n multicluster-controlplane get secrets multicluster-controlplane-kubeconfig -ojsonpath='{.data.kubeconfig}' | base64 -d > multicluster-controlplane.kubeconfig
```

### Join a cluster

You can use `clusteradm` to join a cluster. Ensure `clusteradm` CLI tool is installed. Download and extract the [clusteradm binary](https://github.com/open-cluster-management-io/clusteradm/releases/latest). For more details see the [clusteradm GitHub page](https://github.com/open-cluster-management-io/clusteradm/blob/main/README.md#quick-start).

```Shell
clusteradm --kubeconfig=<controlplane kubeconfig file> get token --use-bootstrap-token
clusteradm join --hub-token <controlplane token> --hub-apiserver <controlplane apiserver> --cluster-name <cluster name>
clusteradm --kubeconfig=<controlplane kubeconfig file> accept --clusters <cluster name>
```
Note: clusteradm version should be v0.4.1 or later