---
title: Install Klusterlet
weight: 2
---

After the hub is installed, you need to install the klusterlet on another cluster so that it can be registered and managed by the hub.

<!-- spellchecker-disable -->

{{< toc >}}

<!-- spellchecker-enable -->

## Prerequisite

Ensure [kubectl](https://kubernetes.io/docs/tasks/tools/install-kubectl) and [kustomize](https://kubernetes-sigs.github.io/kustomize/installation) are installed.

Ensure [golang](https://golang.org/doc/install) is installed, if you are planning to install from the source.

Ensure the open-cluster-management _hub_ is installed. See [Install Hub](install-hub.md) for more information.

Prepare another Kubernetes cluster to function as the managed cluster. For example, use [kind](https://kind.sigs.k8s.io/docs/user/quick-start) to create another cluster as below.

For `kind`, you must use version [v0.7.0](https://github.com/kubernetes-sigs/kind/releases/tag/v0.7.0) and you must have [docker](https://docs.docker.com/get-started) installed and running.

```Shell
# kind delete cluster --name cluster1 # if the kind cluster is previously created and can be safely deleted
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
make deploy-spoke-kind # make deploy-spoke-kind GO_REQUIRED_MIN_VERSION:= # if you see warnings regarding go version
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
kubectl certificate approve {csr name} # kubectl certificate approve `kubectl get csr | grep cluster1 | awk -F' ' {'print $1'}` # if you have trouble determining the csr name
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
      kind: Pod
      metadata:
        name: hello
        namespace: default
      spec:
        containers:
        - name: hello
          image: busybox
          command: ['sh', '-c', 'echo "Hello, Kubernetes!" && sleep 3600']
        restartPolicy: OnFailure
```

Apply the yaml file to the hub

```Shell
kubectl config use-context kind-hub
kubectl apply -f manifest-work.yaml
kubectl -n cluster1 get manifestwork/mw-01 -o yaml
```

Check on the managed _cluster1_ and see the _hello_ Pod has been deployed from the hub

```Shell
$ kubectl config use-context kind-cluster1
$ kubectl -n default get pod
NAME    READY   STATUS    RESTARTS   AGE
hello   1/1     Running   0          108s
```