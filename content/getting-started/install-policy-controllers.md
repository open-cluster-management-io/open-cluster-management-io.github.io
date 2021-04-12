---
title: Install Policy Controllers
weight: 5
---

After policy framework is installed, you could install the policy controllers to the managed clusters.

<!-- spellchecker-disable -->

{{< toc >}}

<!-- spellchecker-enable -->

## Prerequisite

Ensure [kubectl](https://kubernetes.io/docs/tasks/tools/install-kubectl) and [kustomize](https://kubernetes-sigs.github.io/kustomize/installation) are installed.

Ensure [golang](https://golang.org/doc/install) is installed, if you are planning to install from the source.

Prepare one Kubernetes cluster to function as the hub. For example, use [kind](https://kind.sigs.k8s.io/docs/user/quick-start) to create a hub cluster. To use kind, you will need [docker](https://docs.docker.com/get-started) installed and running.

Ensure the open-cluster-management _policy framework_ is installed. See [Install Install Policy Framework](install-policy-framework.md) for more information.

## Install configuration policy controller
Clone the `config-policy-controller`

```Shell
git clone https://github.com/open-cluster-management/config-policy-controller.git
```

Deploy the `config-policy-controller` to the managed cluster. 

```Shell
export WATCH_NAMESPACE=<managed cluster name> # export WATCH_NAMESPACE=cluster1
kubectl config use-context kind-$WATCH_NAMESPACE
cd config-policy-controller
make kind-deploy-controller
```

Ensure the pod is running on the managed cluster.

```Shell
kubectl get pods -n open-cluster-management-agent-addon
NAME                                               READY   STATUS    RESTARTS   AGE
...
config-policy-controller-7f8fb64d8c-pmfx4          1/1     Running   0          44s
...
```

## Install certificate policy controller
Clone the `cert-policy-controller`

```Shell
git clone https://github.com/open-cluster-management/cert-policy-controller.git
```

Deploy the `cert-policy-controller` to the managed cluster. 

```Shell
export WATCH_NAMESPACE=<managed cluster name> # export WATCH_NAMESPACE=cluster1
kubectl config use-context kind-$WATCH_NAMESPACE
cd cert-policy-controller
make kind-deploy-controller
```

Ensure the pod is running on the managed cluster.

```Shell
kubectl get pods -n open-cluster-management-agent-addon
NAME                                    READY   STATUS    RESTARTS   AGE
...
cert-policy-controller-6678fc7c-lw6m9   1/1     Running   0          4m20s
...
```

## Install IAM policy controller
Clone the `iam-policy-controller`

```Shell
git clone https://github.com/open-cluster-management/iam-policy-controller.git
```

Deploy the `iam-policy-controller` to the managed cluster. 

```Shell
export WATCH_NAMESPACE=<managed cluster name> # export WATCH_NAMESPACE=cluster1
kubectl config use-context kind-$WATCH_NAMESPACE
cd iam-policy-controller
make kind-deploy-controller
```

Ensure the pod is running on the managed cluster.

```Shell
kubectl get pods -n open-cluster-management-agent-addon
NAME                                     READY   STATUS    RESTARTS   AGE
...
iam-policy-controller-7c5f746866-v65jb   1/1     Running   0          2m43s
...
```