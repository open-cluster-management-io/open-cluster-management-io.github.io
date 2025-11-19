---
title: Application lifecycle management
weight: 5
---

After the setup of Open Cluster Management (OCM) hub and managed clusters,
you could install the OCM built-in application management add-on.
The OCM application management add-on leverages the
[Argo CD](https://argo-cd.readthedocs.io/)
to provide declarative GitOps based application lifecycle management across multiple Kubernetes clusters.

## Architecture

Traditional Argo CD resource delivery primarily uses a push model,
where resources are deployed from a centralized Argo CD instance to remote or managed clusters.

<div style="text-align: center; padding: 20px;">
    <img src="https://github.com/open-cluster-management-io/ocm/raw/main/solutions/deploy-argocd-apps-pull/assets/push.png" alt="Argo CD Push Model" style="margin: 0 auto; width: 80%">
</div>

With the OCM Argo CD add-on, users can leverage a pull based resource delivery model,
where managed clusters pull and apply application configurations.

<div style="text-align: center; padding: 20px;">
    <img src="https://github.com/open-cluster-management-io/ocm/raw/main/solutions/deploy-argocd-apps-pull/assets/pull.png" alt="Argo CD Pull Model" style="margin: 0 auto; width: 80%">
</div>

For more details, visit the
[Argo CD Pull Integration GitHub page](https://github.com/open-cluster-management-io/argocd-pull-integration).

## Prerequisites

You must meet the following prerequisites to install the application lifecycle management add-on:

- Ensure [kubectl](https://kubernetes.io/docs/tasks/tools/install-kubectl) is installed.

- Ensure the OCM _cluster manager_ is installed. See [Start the control plane]({{< ref "docs/getting-started/installation/start-the-control-plane" >}}) for more information.

- Ensure the OCM _klusterlet_ is installed. See [Register a cluster]({{< ref "docs/getting-started/installation/register-a-cluster" >}}) for more information.

- Ensure `clusteradm` CLI tool is installed. Download and extract the [clusteradm binary](https://github.com/open-cluster-management-io/clusteradm/releases/latest). For more details see the [clusteradm GitHub page](https://github.com/open-cluster-management-io/clusteradm/blob/main/README.md#quick-start).

## Installation

Install Argo CD on the Hub cluster:

```shell
kubectl create namespace argocd
kubectl apply -n argocd -f https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml
```

See [Argo CD website](https://argo-cd.readthedocs.io/en/stable/getting_started/) for more details.

Install the OCM Argo CD add-on on the Hub cluster:

```shell
clusteradm install hub-addon --names argocd
```

If your hub controller starts successfully, you should see:

```shell
$ kubectl -n argocd get deploy argocd-pull-integration
NAME                      READY   UP-TO-DATE   AVAILABLE   AGE
argocd-pull-integration   1/1     1            1           55s
```

Enable the add-on for your choice of Managed clusters:

```shell
clusteradm addon enable --names argocd --clusters cluster1,cluster2
```

Replace `cluster1` and `cluster2` with your Managed cluster names.

If your add-on starts successfully, you should see:

```shell
$ kubectl -n cluster1 get managedclusteraddon argocd
NAME     AVAILABLE   DEGRADED   PROGRESSING
argocd   True                   False
```

On the Hub cluster, apply the example `guestbook-app-set` manifest:

```shell
kubectl apply -f https://raw.githubusercontent.com/open-cluster-management-io/ocm/refs/heads/main/solutions/deploy-argocd-apps-pull/example/guestbook-app-set.yaml
```

**Note:** The Application template inside the ApplicationSet must contain the following content:

```shell
labels:
  apps.open-cluster-management.io/pull-to-ocm-managed-cluster: 'true'
annotations:
  argocd.argoproj.io/skip-reconcile: 'true'
  apps.open-cluster-management.io/ocm-managed-cluster: '{{name}}'
```

The label allows the pull model controller to select the Application for processing.

The `skip-reconcile` annotation is to prevent the Application from reconciling on the Hub cluster.

The `ocm-managed-cluster` annotation is for the ApplicationSet to generate multiple Application based on each cluster generator targets.

When this guestbook ApplicationSet reconciles, it will generate an Application for the registered Managed clusters. For example:

```shell
$ kubectl -n argocd get appset
NAME            AGE
guestbook-app   84s
$ kubectl -n argocd get app
NAME                     SYNC STATUS   HEALTH STATUS
cluster1-guestbook-app
cluster2-guestbook-app
```

On the Hub cluster, the pull controller will wrap the Application with a ManifestWork. For example:

```shell
$ kubectl -n cluster1 get manifestwork
NAME                          AGE
cluster1-guestbook-app-d0e5   2m41s
```

On a Managed cluster, you should see that the Application is pulled down successfully. For example:

```shell
$ kubectl -n argocd get app
NAME                     SYNC STATUS   HEALTH STATUS
cluster1-guestbook-app   Synced        Healthy
$ kubectl -n guestbook get deploy
NAME           READY   UP-TO-DATE   AVAILABLE   AGE
guestbook-ui   1/1     1            1           7m36s
```

On the Hub cluster, the status controller will sync the dormant Application with the ManifestWork status feedback. For example:

```shell
$ kubectl -n argocd get app
NAME                     SYNC STATUS   HEALTH STATUS
cluster1-guestbook-app   Synced        Healthy
cluster2-guestbook-app   Synced        Healthy
```
