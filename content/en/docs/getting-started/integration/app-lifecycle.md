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

With the OCM Argo CD add-ons, users can leverage a pull based resource delivery model,
where managed clusters pull and apply application configurations. OCM provides two pull model options:

| Feature | Basic Pull Model (`argocd`) | Advanced Pull Model (`argocd-agent`) |
|---------|----------------------------|--------------------------------------|
| **How it works** | Wraps Applications in ManifestWork, distributed via OCM agent | Direct gRPC communication between hub principal and managed agents |
| **Argo CD on hub** | Full Argo CD instance required | Argo CD + Agent Principal |
| **Argo CD on managed** | Local Argo CD controller | Argo CD Agent + controller/repo-server |
| **Status feedback** | Basic status via ManifestWork | Full status sync via gRPC |
| **Load Balancer** | Not required | Required on hub cluster |
| **Use Case** | Simpler setup, moderate scale | Large fleets, full Argo CD UI integration |

For more details, visit the [Argo CD Pull Integration GitHub page](https://github.com/open-cluster-management-io/argocd-pull-integration).

## Prerequisites

You must meet the following prerequisites to install the application lifecycle management add-on:

- Ensure [kubectl](https://kubernetes.io/docs/tasks/tools/install-kubectl) is installed.

- Ensure the OCM _cluster manager_ is installed. See [Start the control plane]({{< ref "docs/getting-started/installation/start-the-control-plane" >}}) for more information.

- Ensure the OCM _klusterlet_ is installed. See [Register a cluster]({{< ref "docs/getting-started/installation/register-a-cluster" >}}) for more information.

- Ensure `clusteradm` CLI tool is installed. Download and extract the [clusteradm binary](https://github.com/open-cluster-management-io/clusteradm/releases/latest). For more details see the [clusteradm GitHub page](https://github.com/open-cluster-management-io/clusteradm/blob/main/README.md#quick-start).

## Basic Pull Model Installation

The basic pull model uses the standard Argo CD with a lightweight integration controller.

### Install Argo CD on the Hub cluster

```shell
kubectl create namespace argocd
kubectl apply -n argocd -f https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml
```

See [Argo CD website](https://argo-cd.readthedocs.io/en/stable/getting_started/) for more details.

### Install the OCM Argo CD add-on

```shell
clusteradm install hub-addon --names argocd
```

If your hub controller starts successfully, you should see:

```shell
$ kubectl -n argocd get deploy argocd-pull-integration
NAME                      READY   UP-TO-DATE   AVAILABLE   AGE
argocd-pull-integration   1/1     1            1           55s
```

### Enable the add-on for Managed clusters

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

### Deploy Applications

On the Hub cluster, apply the example `guestbook-app-set` manifest:

```shell
kubectl apply -f https://raw.githubusercontent.com/open-cluster-management-io/ocm/refs/heads/main/solutions/deploy-argocd-apps-pull/example/guestbook-app-set.yaml
```

**Note:** The Application template inside the ApplicationSet must contain the following content:

```yaml
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

## Advanced Pull Model Installation (Argo CD Agent)

The advanced pull model uses [Argo CD Agent](https://github.com/argoproj-labs/argocd-agent/) to offload compute-intensive parts of Argo CD (application controller, repository server) to managed clusters while maintaining centralized control and observability on the hub.

### Prerequisites for Advanced Pull Model

- **The Hub cluster must have a load balancer.** For KinD clusters, you can use MetalLB. See the [OCM solutions guide](https://github.com/open-cluster-management-io/ocm/tree/main/solutions/argocd-agent#additional-resources) for setup instructions.

### Install the OCM Argo CD Agent add-on

```shell
clusteradm install hub-addon --names argocd-agent --create-namespace
```

This will install all necessary components including:
- Argo CD Operator
- Argo CD Agent principal
- OCM integration controller

If your hub controller starts successfully, you should see:

```shell
$ kubectl -n argocd get pods
NAME                                                  READY   STATUS    RESTARTS   AGE
argocd-agent-principal-xxx                            1/1     Running   0          2m
argocd-pull-integration-controller-xxx                1/1     Running   0          2m
argocd-applicationset-controller-xxx                  1/1     Running   0          2m
...
```

### Verify the add-on is enabled on Managed clusters

The Argo CD Agent add-on is automatically enabled for all managed clusters via the GitOpsCluster Placement.

```shell
$ kubectl get managedclusteraddon --all-namespaces
NAMESPACE   NAME                 AVAILABLE   DEGRADED   PROGRESSING
cluster1    argocd-agent-addon   True                   False
```

On the managed cluster, verify the agent is running:

```shell
$ kubectl -n argocd get pods
NAME                                  READY   STATUS    RESTARTS   AGE
argocd-agent-agent-xxx                1/1     Running   0          2m
argocd-application-controller-0       1/1     Running   0          2m
...
```

### Deploy Applications

Create an AppProject on the hub cluster:

```shell
kubectl apply -f - <<EOF
apiVersion: argoproj.io/v1alpha1
kind: AppProject
metadata:
  name: default
  namespace: argocd
spec:
  clusterResourceWhitelist:
    - group: '*'
      kind: '*'
  destinations:
    - namespace: '*'
      server: '*'
  sourceNamespaces:
    - '*'
  sourceRepos:
    - '*'
EOF
```

First, create the target namespace on the managed cluster:

```shell
# kubectl config use-context <managed-cluster>
kubectl create namespace guestbook
```

Then create an Application on the hub cluster:

```shell
kubectl apply -f - <<EOF
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: guestbook
  namespace: cluster1  # replace with managed cluster name
spec:
  project: default
  source:
    repoURL: https://github.com/argoproj/argocd-example-apps
    targetRevision: HEAD
    path: guestbook
  destination:
    server: https://<principal-external-ip>:443?agentName=cluster1  # Replace with actual IP and cluster name
    namespace: guestbook
  syncPolicy:
    automated:
      prune: true
EOF
```

Note: Replace `<principal-external-ip>` with the external IP of the `argocd-agent-principal` LoadBalancer service:

```shell
kubectl -n argocd get svc argocd-agent-principal
```

Verify the application is deployed on the managed cluster:

```shell
$ kubectl -n argocd get app
NAME        SYNC STATUS   HEALTH STATUS
guestbook   Synced        Healthy
```
