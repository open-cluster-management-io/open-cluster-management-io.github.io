---
title: Cluster manager
weight: 1
---

The are two ways to install the core control plane of open cluster management that includes cluster registration and manifests distribution.

<!-- spellchecker-disable -->

{{< toc >}}

<!-- spellchecker-enable -->

## Prerequisite

Ensure [kubectl](https://kubernetes.io/docs/tasks/tools/install-kubectl) and [kustomize](https://kubectl.docs.kubernetes.io/installation/kustomize/) are installed.

Ensure [golang](https://golang.org/doc/install) is installed, if you are planning to install from the source.

Prepare one Kubernetes cluster to function as the hub. For example, use [kind](https://kind.sigs.k8s.io/docs/user/quick-start) to create a hub cluster. To use `kind`, you will need [docker](https://docs.docker.com/get-started) installed and running.

If you are running OS X, you'll also need to install `gnu-sed`:

```Shell
brew install gnu-sed
```

Set the following environment variable that will be used throughout to simplify the instructions:

```Shell
export HUB_CLUSTER_NAME=<your hub cluster name>             # export HUB_CLUSTER_NAME=hub
export CTX_HUB_CLUSTER=<your hub cluster context>           # export CTX_HUB_CLUSTER=kind-hub
export HUB_KUBECONFIG=<your hub cluster kubeconfig file>    # export HUB_KUBECONFIG=~/hub-kubeconfig
```

Then create the hub cluster with `kind`, run:

```Shell
# kind delete cluster --name ${HUB_CLUSTER_NAME} # if the kind cluster is previously created and can be safely deleted
kind create cluster --name ${HUB_CLUSTER_NAME}
kind get kubeconfig --name ${HUB_CLUSTER_NAME} --internal > ${HUB_KUBECONFIG}
```

## Install from source

Clone the `registration-operator`

```Shell
git clone https://github.com/open-cluster-management-io/registration-operator
```

Ensure the `kubectl` context is set to point to the hub cluster:

```Shell
kubectl config use-context ${CTX_HUB_CLUSTER}
```

Deploy hub

```Shell
cd registration-operator
export KUBECONFIG=$HOME/.kube/config # set a env variable KUBECONFIG to kubeconfig file path
make deploy-hub # make deploy-hub GO_REQUIRED_MIN_VERSION:= # if you see warnings regarding go version
```

## Install community operator from OperatorHub.io
If you are using OKD, OpenShift, or have `OLM` installed in your cluster, you can install the cluster manager community operator with a released version from [OperatorHub.io](https://operatorhub.io/operator/cluster-manager).
