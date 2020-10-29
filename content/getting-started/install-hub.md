---
title: Install Hub
weight: 1
---

The are two ways to install the core control plane of open cluster management that includes cluster registration and manifests distribution.

<!-- spellchecker-disable -->

{{< toc >}}

<!-- spellchecker-enable -->

## Prerequisite

Ensure `kubectl` and `kustomize` are installed

Prepare one Kubernetes cluster to function as the hub. 

For example, use `kind` to create a hub cluster. Since by default kind does not expose external accessible address, create a `config.yaml` as below and create the cluster

```yaml
kind: Cluster
apiVersion: kind.x-k8s.io/v1alpha4
networking:
  apiServerAddress: <an external accessible address rather than 127.0.0.1>
```

```Shell
kind create cluster --name hub --config config.yaml
```

## Install from source

Clone the `registration-operator`

```Shell
git clone https://github.com/open-cluster-management/registration-operator
```

Deploy hub

```Shell
cd registration-operator
make deploy-hub
```

## Install from OperatorHub
If you are using Openshift or have `OLM` installed in your cluster, you are able to install the hub with a released version from operator hub. Details can be found [here](https://operatorhub.io/operator/cluster-manager)