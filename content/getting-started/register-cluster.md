---
title: Install Klusterlet
weight: 2
---

After hub is installed, you could install the klusterlet on another cluster that registers to the hub.

<!-- spellchecker-disable -->

{{< toc >}}

<!-- spellchecker-enable -->

## Prerequisite

Ensure `kubectl` and `kustomize` are installed.

Ensure the open-cluster-management _hub_ is installed. See [Install Hub](install-hub.md) for more information.

Prepare another Kubernetes cluster to function as the managed cluster. For example, use `kind` to create another cluster as below:

```Shell
kind create cluster --name cluster1
kind get kubeconfig --name cluster1 --internal > ~/cluster1-kubeconfig
```

## Install from source

If you have not already done so, clone the `registration-operator`.

```Shell
git clone https://github.com/open-cluster-management/registration-operator
```

Export kubeconfig as an environment variable

```
export KUBECONFIG=~/cluster1-kubeconfig
```

Deploy agent on managed cluster

```Shell
cd registration-operator
export KIND_CLUSTER=cluster1
export HUB_KIND_KUBECONFIG=~/hub-kubeconfig
export KLUSTERLET_KIND_KUBECONFIG=$KUBECONFIG
make deploy-spoke-kind # or make deploy-spoke-kind GO_REQUIRED_MIN_VERSION:=
```

## Install from OperatorHub
If you are using Openshift or have `OLM` installed in your cluster, you are able to install the klusterlet with a released version from operator hub. Details can be found [here](https://operatorhub.io/operator/klusterlet)

## What is next

After a successful deployment, a `certificatesigningrequest` and a `managedcluster` will
be created on the hub.

```Shell
$ export KUBECONFIG=~/.kube/config
$ kubectl config use-context kind-hub
$ kubectl get csr
NAME             AGE   REQUESTOR                       CONDITION
cluster1-zw6cb   41s   kubernetes-admin                Pending
csr-vqhnb        76m   system:node:hub-control-plane   Approved,Issued
$ kubectl get managedcluster
NAME       HUB ACCEPTED   MANAGED CLUSTER URLS   JOINED   AVAILABLE   AGE
cluster1   false          https://localhost                           57s
```

Next approve the csr and set managecluster to be accepted by hub with the following command

```Shell
kubectl certificate approve {csr name} # or kubectl certificate approve `kubectl get csr | grep cluster1 | awk -F' ' {'print $1'}`
kubectl patch managedcluster cluster1 -p='{"spec":{"hubAcceptsClient":true}}' --type=merge
```

By running `kubectl get managedcluster` on hub cluster, you should be able to see that the cluster is registered

```Shell
NAME       HUB ACCEPTED   MANAGED CLUSTER URLS   JOINED   AVAILABLE   AGE
cluster1   true           https://localhost      True     True        7m58s
```

Create a `manifest-work.yaml` as below

```yaml
apiVersion: work.open-cluster-management.io/v1
kind: ManifestWork
metadata:
  name: mw-01
  namespace: cluster1
spec:
  workload:
    manifests:
      - apiVersion: v1
        kind: ConfigMap
        metadata:
          name: sample-cm
          namespace: default
        data:
          database: mongodb
```

Apply the yaml file to the hub

```Shell
kubectl config use-context kind-hub
kubectl apply -f manifest-work.yaml
```

Check on the managed cluster1 and see the _sample-cm_ ConfigMap has been deployed from the hub

```Shell
$ kubectl config use-context kind-cluster1
$ kubectl -n default get cm
NAME        DATA   AGE
sample-cm   1      13m
```