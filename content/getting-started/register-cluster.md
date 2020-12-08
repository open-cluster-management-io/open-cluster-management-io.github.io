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

Export the soon-to-be managed cluster kube config as an environment variable

```Shell
export KUBECONFIG=</path/to/managed_cluster/.kube/config> # export KUBECONFIG=~/cluster1-kubeconfig
```

Deploy agent on a managed `kind` cluster.

```Shell
cd registration-operator
export KLUSTERLET_KIND_KUBECONFIG=$KUBECONFIG
export KIND_CLUSTER=<managed cluster name> # export KIND_CLUSTER=cluster1
export HUB_KIND_KUBECONFIG=</path/to/hub_kind_cluster/.kube/config> # export HUB_KIND_KUBECONFIG=~/hub-kubeconfig
make deploy-spoke-kind # make deploy-spoke-kind GO_REQUIRED_MIN_VERSION:= # if you see warnings regarding go version
```

## Install from OperatorHub
If you are using OpenShift or have `OLM` installed in your cluster, you are able to install the klusterlet with a released version from OperatorHub. Details can be found [here](https://operatorhub.io/operator/klusterlet).

## What is next

After a successful deployment, a `certificatesigningrequest` and a `managedcluster` will
be created on the hub.

```Shell
$ export KUBECONFIG=</path/to/hub_cluster/.kube/config> # export KUBECONFIG=~/hub-kubeconfig
$ kubectl get csr
NAME                              AGE   REQUESTOR                       CONDITION
<managed cluster name>-<suffix>   41s   kubernetes-admin                Pending
csr-<suffix>                      76m   system:node:hub-control-plane   Approved,Issued
$ kubectl get managedcluster
NAME                    HUB ACCEPTED   MANAGED CLUSTER URLS   JOINED   AVAILABLE   AGE
<managed cluster name>  false          https://localhost                           57s
```

Next approve the certificate and set managecluster to be accepted by hub with following commands:

```Shell
kubectl certificate approve {csr name}
kubectl patch managedcluster {managed cluster name} -p='{"spec":{"hubAcceptsClient":true}}' --type=merge
```

Run `kubectl get managedcluster` again on hub cluster, you should be able to see that the cluster is registered.

```Shell
NAME                     HUB ACCEPTED   MANAGED CLUSTER URLS   JOINED   AVAILABLE   AGE
<managed cluster name>   true           https://localhost      True     True        7m58s
```

Create a `manifest-work.yaml` as shown in this example:

```yaml
apiVersion: work.open-cluster-management.io/v1
kind: ManifestWork
metadata:
  name: mw-01
  namespace: <managed cluster name> # cluster1
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

Apply the yaml file to the hub.

```Shell
kubectl apply -f manifest-work.yaml
kubectl -n <managed cluster name> get manifestwork/mw-01 -o yaml # kubectl -n cluster1 get manifestwork/mw-01 -o yaml
```

Check on the managed cluster and see the _hello_ Pod has been deployed from the hub.

```Shell
$ export KUBECONFIG=</path/to/managed_cluster/.kube/config> # export KUBECONFIG=~/cluster1-kubeconfig
$ kubectl -n default get pod
NAME    READY   STATUS    RESTARTS   AGE
hello   1/1     Running   0          108s
```
