---
title: Quick Start
weight: 1
---

![open-cluster-management](/ocm-logo.png)

Use any of the following methods to bootstrap your Open Cluster Management environment.

<!-- spellchecker-disable -->

{{< toc >}}

Before installation, prepare a multicluster environment with at least two clusters. One used as hub cluster and another as managed cluster.

Set the following environment variables that will be used throughout to simplify the instructions:

```Shell
export HUB_CLUSTER_NAME=<your hub cluster name>             # export HUB_CLUSTER_NAME=hub
export MANAGED_CLUSTER_NAME=<your managed cluster name>     # export MANAGED_CLUSTER_NAME=cluster1
export CTX_HUB_CLUSTER=<your hub cluster context>           # export CTX_HUB_CLUSTER=kind-hub
export CTX_MANAGED_CLUSTER=<your managed cluster context>   # export CTX_MANAGED_CLUSTER=kind-cluster1
```

Then create these two clusters using [kind](https://kind.sigs.k8s.io). Run the following commands:

```Shell
kind create cluster --name ${HUB_CLUSTER_NAME}
kind create cluster --name ${MANAGED_CLUSTER_NAME}
```

## Bootstrap via Clusteradm CLI tool

### Install Clusteradm CLI tool

Download and extract the [clusteradm binary](https://github.com/open-cluster-management-io/clusteradm/releases/latest). For more details see the [clusteradm GitHub page](https://github.com/open-cluster-management-io/clusteradm/blob/main/README.md#quick-start).

### Deploy a cluster manager on your hub cluster

1. Bootstrap the Open Cluster Management control plane:

   ```Shell
   clusteradm init --context ${CTX_HUB_CLUSTER}
   ```

   Then you will get a result with a generated `join` command:

   ```Shell
   ...
   clusteradm join --hub-token <token_data> --hub-apiserver https://126.0.0.1:39242 --cluster-name <managed_cluster_name>
   ```

   Copy the generated command and replace the `<managed_cluster_name>` to your managed cluster name. E.g. `cluster1`.

### Deploy a klusterlet agent on your managed cluster

1. Run the previously copied `join` command by append the context of your managed cluster to join the hub cluster:

   ```Shell
   clusteradm join --hub-token <token_data> --hub-apiserver https://126.0.0.1:39242 --cluster-name ${MANAGED_CLUSTER_NAME} --context ${CTX_MANAGED_CLUSTER}
   ```

### Accept join request and verify

1. Wait for the CSR is created on your hub cluster:

   ```Shell
   kubectl get csr -w --context ${CTX_HUB_CLUSTER} | grep ${MANAGED_CLUSTER_NAME}
   ```

   Then you will get a result resembling the following after the CSR is created:

   ```Shell
   cluster1-tqcjj   33s   kubernetes.io/kube-apiserver-client   system:serviceaccount:open-cluster-management:cluster-bootstrap   Pending
   ```

2. Accept request:

   ```Shell
   clusteradm accept --clusters ${MANAGED_CLUSTER_NAME} --context ${CTX_HUB_CLUSTER}
   ```

3. Verify `managedcluster` has been created successfully:

   ```Shell
   kubectl get managedcluster --context ${CTX_HUB_CLUSTER}
   ```

   Then you will get a result resembling the following:

   ```Shell
   NAME       HUB ACCEPTED   MANAGED CLUSTER URLS      JOINED   AVAILABLE   AGE
   cluster1   true           https://127.0.0.1:41478   True     True        5m23s
   ```

## Bootstrap via Operatorhub.io

Install and create a [Cluster manager](https://operatorhub.io/operator/cluster-manager) on your _hub_ cluster.

Install and create a [Klusterlet agent](https://operatorhub.io/operator/klusterlet) on your _managed_ cluster.

## More details

For more details, see [Core components](/getting-started/core).
