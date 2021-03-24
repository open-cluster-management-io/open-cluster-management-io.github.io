---
title: Install Application management
weight: 3
---

After hub is installed, you could install the application management components to the hub.

<!-- spellchecker-disable -->

{{< toc >}}

<!-- spellchecker-enable -->

## Prerequisite

Ensure [kubectl](https://kubernetes.io/docs/tasks/tools/install-kubectl/) and [kustomize](https://kubernetes-sigs.github.io/kustomize/installation/) are installed.

Ensure [golang](https://golang.org/doc/install) is installed, if you are planning to install from the source.

Ensure the open-cluster-management _hub_ is installed. See [Install Hub](install-hub.md) for more information.


## Install from source
Clone the `multicloud-operators-subscription`

```Shell
git clone https://github.com/open-cluster-management/multicloud-operators-subscription
```

Deploy subscription operators to the hub cluster.

```Shell
export TRAVIS_BUILD=0
kubectl config use-context kind-hub
cd multicloud-operators-subscription
make deploy-community-hub # make deploy-community-hub GO_REQUIRED_MIN_VERSION:= # if you see warnings regarding go version
```

Deploy subscription operators to managed cluster(s).

```Shell
export HUB_KUBECONFIG=</path/to/hub_cluster/.kube/config> # export HUB_KUBECONFIG=~/hub-kubeconfig
kubectl config use-context kind-cluster1
export MANAGED_CLUSTER_NAME=<managed cluster name> # export MANAGED_CLUSTER_NAME=cluster1
make deploy-community-managed # make deploy-community-managed GO_REQUIRED_MIN_VERSION:= # if you see warnings regarding go version
```

## Install from OperatorHub
If you are using OpenShift or have `OLM` installed in your cluster, you are able to install the multicluster subscription operator with a released version from the OperatorHub. Details can be found [here](https://operatorhub.io/operator/multicluster-operators-subscription).

## What is next

After a successful deployment, test the subscription operator with a `helm` subscription. Run the following command:

```Shell
kubectl config use-context kind-hub
cd multicloud-operators-subscription
kubectl apply -f examples/helmrepo-hub-channel
```

After a while, you should see the subscription propagated to the managed cluster and the Helm app installed. To confirm, run the following command:

```Shell
$ kubectl config use-context kind-cluster1
$ kubectl get subscriptions.apps 
NAME        STATUS       AGE    LOCAL PLACEMENT   TIME WINDOW
nginx-sub   Subscribed   107m   true  
$ kubectl get pod
NAME                                                   READY   STATUS      RESTARTS   AGE
nginx-ingress-47f79-controller-6f495bb5f9-lpv7z        1/1     Running     0          108m
nginx-ingress-47f79-default-backend-7559599b64-rhwgm   1/1     Running     0          108m
```
