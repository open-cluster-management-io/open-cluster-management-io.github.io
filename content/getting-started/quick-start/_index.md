---
title: Quick Start
weight: 1
---

![open-cluster-management](/ocm-logo.png)

Use any of the following methods to bootstrap your Open Cluster Management environment.

<!-- spellchecker-disable -->

{{< toc >}}

Before installation, prepare a multicluster environment with at least two clusters. One used as hub cluster and another as managed cluster.

You can create these two clusters using [kind](https://kind.sigs.k8s.io). Run the following commands:

```Shell
kind create cluster --name <your hub cluster name>     # kind create cluster --name hub
kind create cluster --name <your managed cluster name> # kind create cluster --name cluster1
```

## Bootstrap via Clusteradm CLI tool

### Install Clusteradm CLI tool

Download and extract the [clusteradm binary](https://github.com/open-cluster-management-io/clusteradm/releases/latest). For more details see the [clusteradm GitHub page](https://github.com/open-cluster-management-io/clusteradm/blob/main/README.md#quick-start).

### Deploy a cluster manager on your hub cluster

1. Ensure the `kubectl` context is set to point to the hub cluster:

   ```Shell
   kubectl config use-context <hub cluster context> # kubectl config use-context kind-hub
   ```

2. Bootstrap the Open Cluster Management control plane:

   ```Shell
   clusteradm init
   ```

   Then you will get a result with a generated `join` command:

   ```Shell
   ...
   clusteradm join --hub-token <token_data> --hub-apiserver https://126.0.0.1:39242 --cluster-name <managed_cluster_name>
   ```

   Copy the generated command and replace the `<managed_cluster_name>` to your managed cluster name. E.g. `cluster1`.

### Deploy a klusterlet agent on your manage cluster

1. Ensure the `kubectl` context is set to point to the managed cluster:

   ```Shell
   kubectl config use-context <managed cluster context> # kubectl config use-context kind-cluster1
   ```

2. Run the previously copied `join` command to join the hub cluster:

   ```Shell
   clusteradm join --hub-token <token_data> --hub-apiserver https://126.0.0.1:39242 --cluster-name <managed_cluster_name>
   ```

### Accept join request and verify

1. Ensure the `kubectl` context is set to point to the hub cluster:

   ```Shell
   kubectl config use-context <hub cluster context> # kubectl config use-context kind-hub
   ```

2. Wait for csr created on the hub:

   ```Shell
   kubectl get csr -w | grep <managed_cluster_name> # kubectl get csr -w | grep cluster1
   ```

   We would get a result looks like the following after csr created:

   ```Shell
   cluster1-tqcjj   33s   kubernetes.io/kube-apiserver-client   system:serviceaccount:open-cluster-management:cluster-bootstrap   Pending
   ```

3. Accept request:

   ```Shell
   clusteradm accept --clusters <managed_cluster_name> # clusteradm accept --clusters cluster1
   ```

4. Verify `managedcluster` have been created successfully:

   ```Shell
   kubectl get managedcluster
   ```

   The return result looks like:

   ```Shell
   NAME       HUB ACCEPTED   MANAGED CLUSTER URLS      JOINED   AVAILABLE   AGE
   cluster1   true           https://127.0.0.1:41478   True     True        5m23s
   ```

## Bootstrap via Operatorhub.io

Install and create a [Cluster manager](https://operatorhub.io/operator/cluster-manager) on your _hub_ cluster.

Install and create a [Klusterlet agent](https://operatorhub.io/operator/klusterlet) on your _manage_ cluster.

## More details

For more details, see [Core components](/getting-started/core).
