---
title: Install Hub
weight: 1
---

The are two ways to install the core control plane of open cluster management that includes cluster registration and manifests distribution.

<!-- spellchecker-disable -->

{{< toc >}}

<!-- spellchecker-enable -->

## Prerequisite

Ensure [kubectl](https://kubernetes.io/docs/tasks/tools/install-kubectl) and [kustomize](https://kubernetes-sigs.github.io/kustomize/installation) are installed.

Prepare one Kubernetes cluster to function as the hub. For example, use [kind](https://kind.sigs.k8s.io/docs/user/quick-start) to create a hub cluster. 

For `kind`, you must use version [v0.7.0](https://github.com/kubernetes-sigs/kind/releases/tag/v0.7.0) and you must have [docker](https://docs.docker.com/get-started) installed and running.

```Shell
# kind delete cluster --name hub # if the kind cluster is previously created and can be safely deleted
kind create cluster --name hub
kind get kubeconfig --name hub --internal > ~/hub-kubeconfig
```

## Install from source

Clone the `registration-operator`

```Shell
git clone https://github.com/open-cluster-management/registration-operator
```

Export kubeconfig as an environment variable

```
export KUBECONFIG=~/hub-kubeconfig
```

Deploy hub

```Shell
cd registration-operator
make deploy-hub # make deploy-hub GO_REQUIRED_MIN_VERSION:= # if you see warnings regarding go version
```

## Install from OperatorHub
If you are using Openshift or have `OLM` installed in your cluster, you are able to install the hub with a released version from operator hub. Details can be found [here](https://operatorhub.io/operator/cluster-manager)