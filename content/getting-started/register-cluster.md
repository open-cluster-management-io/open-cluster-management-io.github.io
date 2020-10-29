---
title: Install Klusterlet
weight: 2
---

After hub is installed, you could install the klusterlet on another cluster that registers to the hub.

<!-- spellchecker-disable -->

{{< toc >}}

<!-- spellchecker-enable -->

## Prerequisite

Ensure `kubectl` and `kustomize` are installed

Prepare another Kubernetes cluster to function as the managed cluster. For example, use `kind` to create another cluster as below:

```Shell
kind create cluster --name cluster1
```

## Install from source

Clone the `registration-operator`

```Shell
git clone https://github.com/open-cluster-management/registration-operator
```

Export kubeconfig as an environment variable

```
export KUBECONFIG=<home>/.kube/config
```

Deploy agent on managed cluster

```Shell
cd registration-operator
export KIND_CLUSTER=cluster1
export KLUSTERLET_KUBECONFIG_CONTEXT=kind-cluster1
kubectl config use-context kind-hub
make deploy-spoke
```

## Install from OperatorHub
If you are using Openshift or have `OLM` installed in your cluster, you are able to install the klusterlet with a released version from operator hub. Details can be found [here](https://operatorhub.io/operator/klusterlet)

## What is next

After a successful deployment, a `certificatesigningrequest` and a `managedcluster` will
be created on the hub.

```
kubectl config use-context kind-hub
kubectl get csr
kubectl get managedcluster
```

Next approve the csr and set managecluster to be accepted by hub with the following command

```
kubectl certificate approve {csr name}
kubectl patch managedcluster {cluster name} -p='{"spec":{"hubAcceptsClient":true}}' --type=merge
```

By running `kubectl get managedcluster` on hub cluster, you should be able to see that the cluster is registered

```
NAME       HUB ACCEPTED   MANAGED CLUSTER URLS   JOINED   AVAILABLE   AGE
cluster1   true           https://localhost      True     True        7m58s
```