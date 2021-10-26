---
title: Application lifecycle management
weight: 5
---

After the cluster manager is installed, you could install the application management components to the hub cluster.

<!-- spellchecker-disable -->

{{< toc >}}

<!-- spellchecker-enable -->

## Architecture

<img src="https://github.com/open-cluster-management-io/multicloud-operators-subscription/raw/main/images/architecture.png" 
alt="application lifecycle management architecture" 
class="responsive2">

For more details, visit the [multicloud-operators-subscription GitHub page](https://github.com/open-cluster-management-io/multicloud-operators-subscription).

## Prerequisite

You must meet the following prerequisites to install the application lifecycle management add-on:

- Ensure [kubectl](https://kubernetes.io/docs/tasks/tools/install-kubectl) and [kustomize](https://kubernetes-sigs.github.io/kustomize/installation) are installed.

- Ensure the `open-cluster-management` _cluster manager_ is installed. See [Cluster Manager](/getting-started/core/cluster-manager) for more information.

- Ensure the `open-cluster-management` _klusterlet_ is installed. See [Klusterlet](/getting-started/core/register-cluster) for more information.

## Install from source

Clone the `multicloud-operators-subscription` repository.

```Shell
git clone https://github.com/open-cluster-management-io/multicloud-operators-subscription
cd multicloud-operators-subscription
```

Deploy the subscription operators to the hub cluster.

```Shell
$ kubectl config use-context ${CTX_HUB_CLUSTER}
$ make deploy-hub
$ kubectl -n open-cluster-management get deploy multicloud-operators-subscription --context ${CTX_HUB_CLUSTER}
NAME                                READY   UP-TO-DATE   AVAILABLE   AGE
multicloud-operators-subscription   1/1     1            1           25s
```

Create the `open-cluster-management-agent-addon` namespace on the managed cluster.

```Shell
$ kubectl create ns open-cluster-management-agent-addon --context ${CTX_MANAGED_CLUSTER}
namespace/open-cluster-management-agent-addon created
```

Deploy the subscription add-on in corresponding managed cluster namespace on the hub cluster.

```Shell
$ kubectl config use-context ${CTX_HUB_CLUSTER}
$ make deploy-addon
$ kubectl -n ${MANAGED_CLUSTER_NAME} get managedclusteraddon # kubectl -n cluster1 get managedclusteraddon
NAME                  AVAILABLE   DEGRADED   PROGRESSING
application-manager   True
```

Check the the subscription add-on deployment on the managed cluster.

```Shell
$ kubectl -n open-cluster-management-agent-addon get deploy multicloud-operators-subscription --context ${CTX_MANAGED_CLUSTER}
NAME                                READY   UP-TO-DATE   AVAILABLE   AGE
multicloud-operators-subscription   1/1     1            1           103s
```

## What is next

After a successful deployment, test the subscription operator with a `helm` subscription. Run the following command:

```Shell
kubectl apply -f examples/helmrepo-hub-channel --context ${CTX_HUB_CLUSTER}
```

After a while, you should see the subscription is propagated to the managed cluster and the Helm app is installed. By default, when a subscribed applications is deployed to the target clusters, the applications are installed in the coresponding subscription namespace. To confirm, run the following command:

```Shell
$ kubectl get subscriptions.apps --context ${CTX_MANAGED_CLUSTER}
NAME        STATUS       AGE    LOCAL PLACEMENT   TIME WINDOW
nginx-sub   Subscribed   107m   true
$ kubectl get pod --context ${CTX_MANAGED_CLUSTER}
NAME                                                   READY   STATUS      RESTARTS   AGE
nginx-ingress-47f79-controller-6f495bb5f9-lpv7z        1/1     Running     0          108m
nginx-ingress-47f79-default-backend-7559599b64-rhwgm   1/1     Running     0          108m
```
