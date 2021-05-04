---
title: Cluster manager
weight: 1
---

The are two ways to install the core control plane of open cluster management that includes cluster registration and manifests distribution.

<!-- spellchecker-disable -->

{{< toc >}}

<!-- spellchecker-enable -->

## Prerequisite

Ensure [kubectl](https://kubernetes.io/docs/tasks/tools/install-kubectl) and [kustomize](https://kubernetes-sigs.github.io/kustomize/installation) are installed.

Ensure [golang](https://golang.org/doc/install) is installed, if you are planning to install from the source.

Prepare one Kubernetes cluster to function as the hub. For example, use [kind](https://kind.sigs.k8s.io/docs/user/quick-start) to create a hub cluster. To use kind, you will need [docker](https://docs.docker.com/get-started) installed and running.

If running on OS X, you'll need also gnu-sed installed:

```Shell
brew install gnu-sed
```

To create the hub cluster with kind, run:

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

Ensure the `kubectl` context is set to point to the hub cluster:

```Shell
kubectl config use-context <hub cluster context> # kubectl config use-context kind-hub
```

Deploy hub

```Shell
cd registration-operator
make deploy-hub # make deploy-hub GO_REQUIRED_MIN_VERSION:= # if you see warnings regarding go version
```

## Install from OperatorHub
If you are using OpenShift or have `OLM` installed in your cluster, you are able to install the cluster manager with a released version from OperatorHub. Details can be found [here](https://operatorhub.io/operator/cluster-manager).
