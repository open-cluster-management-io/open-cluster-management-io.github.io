---
title: Quick Start
weight: 1
---
![open-cluster-management](/ocm-logo.png)

Use any of the following methods to bootstrap your Open Cluster Management environment.

<!-- spellchecker-disable -->
{{< toc >}}
<!-- spellchecker-enable -->

## Clusteradm CLI tool
1. Download and extract the [clusteradm binary](https://github.com/open-cluster-management-io/clusteradm/releases/latest). For more details see the [clusteradm GitHub page](https://github.com/open-cluster-management-io/clusteradm/blob/main/README.md#quick-start).

2. Ensure the `kubectl` context is set to point to the hub cluster:

```Shell
kubectl config use-context <hub cluster context> # kubectl config use-context kind-hub
```

3. Bootstrap the Open Cluster Management control plane.

```Shell
clusteradm init
```

## Operator hub
Install and create a [Cluster manager](https://operatorhub.io/operator/cluster-manager) on your _hub_ cluster.

Install and create a [Klusterlet agent](https://operatorhub.io/operator/klusterlet) on your _manage_ cluster.

## More details
For more details see [Core components](/getting-started/core).
