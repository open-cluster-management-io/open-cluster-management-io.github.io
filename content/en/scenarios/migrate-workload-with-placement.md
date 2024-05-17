---
title: Migrate workload with placement
weight: 1
---

The `Placement` API is used to dynamically select a set of `ManagedCluster` in
one or multiple `ManagedClusterSets` so that the workloads can be deployed to
these clusters.

If you define a valid `Placement`, the placement controller generates a
corresponding `PlacementDecision` with the selected clusters listed in the
status. As an end-user, you can parse the selected clusters and then operate on
the target clusters. You can also integrate a high-level workload orchestrator
with the `PlacementDecision` to leverage its scheduling capabilities.

For example, with OCM addon [policy]({{< ref "/getting-started/integration/policy-controllers" >}})
installed, a `Policy` that includes a `Placement` mapping can distribute the
`Policy` to the managed clusters.
For details see this [example](https://open-cluster-management.io/getting-started/integration/policy-controllers/configuration-policy/#placement-api).

Some popular open source projects also integrate with the `Placement` API. For
example [Argo CD](https://github.com/argoproj/argo-cd), it can leverage the
generated `PlacementDecision` to drive the assignment of Argo CD Applications to a
desired set of clusters, details see this [example](https://github.com/argoproj/argo-cd/tree/master/applicationset/examples/clusterDecisionResource).
And [KubeVela](https://github.com/kubevela/kubevela), as an implementation of
the open application model, also will take advantage of the `Placement` API for
workload scheduling.

In this article, we use [ArgoCD pull model](https://github.com/open-cluster-management-io/ocm/tree/main/solutions/deploy-argocd-apps-pull)
as an example to demonstrate how, with the integration of OCM, you can migrate
ArgoCD Applications among clusters. This is useful for scenarios such as
application disaster recovery or application migration during cluster maintenance.

## Prerequisites

Before starting with the following steps, we recommend that you familiarize yourself with the content below.

- [Taints of ManagedClusters](https://open-cluster-management.io/concepts/managedcluster/#taints-of-managedclusters):
Taints are properties of `ManagedClusters`, they allow a `Placement` to repel 
a set of `ManagedClusters`.

- [Tolerations of Placement](https://open-cluster-management.io/concepts/placement/#taintstolerations):
Tolerations are applied to `Placements`, and allow `Placements` to select 
`ManagedClusters` with matching taints.

- [ArgoCD Pull Model Integration](https://github.com/open-cluster-management-io/ocm/tree/main/solutions/deploy-argocd-apps-pull):
The ArgoCD application controller uses the hub-spoke pattern or pull model mechanism 
for decentralized resource delivery to remote clusters. By using Open Cluster Management (OCM) APIs
and components, the ArgoCD Applications will be pulled from the multi-cluster control plane 
hub cluster down to the registered OCM managed clusters

## Setup the environment

Follow the [deploy ArgoCD pull model steps](https://github.com/open-cluster-management-io/ocm/blob/main/solutions/deploy-argocd-apps-pull/getting-started.md)
to set up an environment with OCM and ArgoCD pull model installed.

If the above steps run successfully, on the hub cluster, you could see the application is deployed to both cluster1 and cluster2.

```shell
$ kubectl -n argocd get app
NAME                     SYNC STATUS   HEALTH STATUS
cluster1-guestbook-app   Synced        Healthy
cluster2-guestbook-app   Synced        Healthy
```

## Migrate application to another cluster automatically when one cluster is down

1) To demonstrate how an application can be migrated to another cluster, let's first deploy the application in a single cluster.

    Path the existing `Placement` to select only one cluster.

    ```shell
    $ kubectl patch placement -n argocd guestbook-app-placement --patch '{"spec": {"numberOfClusters": 1}}' --type=merge
    placement.cluster.open-cluster-management.io/guestbook-app-placement patched
    ```

    Use `clusteradm` to check the placement of selected clusters.

    ```shell
    $ clusteradm get placements -otable
    NAME                      STATUS   REASON              SELETEDCLUSTERS
    guestbook-app-placement   False    Succeedconfigured   [cluster1]
    ```

2) Confirm the application is only deployed to cluster1.

    ```shell
    $ kubectl -n argocd get app
    NAME                     SYNC STATUS   HEALTH STATUS
    cluster1-guestbook-app   Synced        Healthy
    ```

3) Pause the cluster1 to simulate a cluster going down.

    Use `docker ps -a` to get the cluster1 container ID.

    ```shell
    $ docker ps -a
    CONTAINER ID   IMAGE                  COMMAND                  CREATED       STATUS       PORTS                       NAMES
    499812ada5bd   kindest/node:v1.25.3   "/usr/local/bin/entr…"   9 hours ago   Up 9 hours   127.0.0.1:37377->6443/tcp   cluster2-control-plane
    0b9d110e1a1f   kindest/node:v1.25.3   "/usr/local/bin/entr…"   9 hours ago   Up 9 hours   127.0.0.1:34780->6443/tcp   cluster1-control-plane
    0a327d4a5b41   kindest/node:v1.25.3   "/usr/local/bin/entr…"   9 hours ago   Up 9 hours   127.0.0.1:44864->6443/tcp   hub-control-plane
    ```

    Use `docker pause` to pause the cluster1.

    ```shell
    $ docker pause 0b9d110e1a1f
    0b9d110e1a1f
    ```

4) Wait for a few minutes, check the `ManagedCluster` status, cluster1 available status should become "Unknown".

    ```shell
    $ kubectl get managedcluster
    NAME       HUB ACCEPTED   MANAGED CLUSTER URLS                  JOINED   AVAILABLE   AGE
    cluster1   true           https://cluster1-control-plane:6443   True     Unknown     9h
    cluster2   true           https://cluster2-control-plane:6443   True     True        9h
    ```

    Use `clusteradm` to check the placement of selected clusters.

    ```shell
    $ clusteradm get placements -otable
    NAME                      STATUS   REASON              SELETEDCLUSTERS
    guestbook-app-placement   False    Succeedconfigured   [cluster2]
    ```

5) Confirm the application is now deployed to cluster2.

    ```shell
    $ kubectl -n argocd get app
    NAME                     SYNC STATUS   HEALTH STATUS
    cluster2-guestbook-app   Synced        Healthy
    ```

## What happens behind the scene

Refer to [Taints of ManagedClusters](https://open-cluster-management.io/concepts/managedcluster/#taints-of-managedclusters),
when pausing cluster1, the status of condition `ManagedClusterConditionAvailable`
becomes `Unknown`. The taint `cluster.open-cluster-management.io/unreachable` is automatically
added to cluster1, with the effect NoSelect and an empty value.

    ```shell
    $ kubectl get managedcluster cluster1 -oyaml
    apiVersion: cluster.open-cluster-management.io/v1
    kind: ManagedCluster
    metadata:
      name: cluster1
      labels:
        cluster.open-cluster-management.io/clusterset: default
    spec:
    ...
      taints:
      - effect: NoSelect
        key: cluster.open-cluster-management.io/unreachable
        timeAdded: "2023-11-13T16:26:16Z"
    status: 
    ...
    ```

Since the `Placement` guestbook-app-placement doesn't define any toleration to match the taint, 
cluster1 will be filtered from the decision. In the demo environment, once cluster1 is down, 
placement will select one cluster from the rest clusters, which is cluster2.

[Taints of ManagedClusters](https://open-cluster-management.io/concepts/managedcluster/#taints-of-managedclusters) 
also describes other scenarios where taints are automatically added. In some scenarios you may not want to 
migrate the application immediately when a taint is added, with placement `TolerationSeconds` defined, it could tolerates the taint
for a period of time before repelling it. In above example, the `TolerationSeconds` could be defined as below:

```yaml
apiVersion: cluster.open-cluster-management.io/v1beta1
kind: Placement
metadata:
  name: guestbook-app-placement
  namespace: argocd
spec:
  numberOfClusters: 1
  tolerations:
    - key: cluster.open-cluster-management.io/unreachable
      operator: Exists
      tolerationSeconds: 300
```

`tolerationSeconds` is 300 means that the application will be migrated to cluster2 after 5 minutes when cluster1 is down.

## Migrate application to another cluster manually for cluster maintenance

The above example shows how a taint is automatically added to a cluster and how the application is migrated to another cluster.
You can also choose to add a taint manually and repel the application to other clusters.

In the following example, suppose you are going to maintain cluster2, and want to repel the application to cluster1.

1) Before starting, let's first restart the paused cluster1.

    Use `docker restart` to restart the cluster1.

    ```shell
    $ docker restart 0b9d110e1a1f
    0b9d110e1a1f
    ```

    Wait for a few minutes, check the `ManagedCluster` status, cluster1 available status should become "True".

    ```shell
    $ kubectl get managedcluster
    NAME       HUB ACCEPTED   MANAGED CLUSTER URLS                  JOINED   AVAILABLE   AGE
    cluster1   true           https://cluster1-control-plane:6443   True     True        9h
    cluster2   true           https://cluster2-control-plane:6443   True     True        9h
    ```

2) Add the taint `maintenance` to cluster2 manually.

    ```shell
    $ kubectl patch managedcluster cluster2 -p '{"spec":{"taints":[{"effect":"NoSelect","key":"maintenance"}]}}' --type=merge
    managedcluster.cluster.open-cluster-management.io/cluster2 patched
    ```

3) Use `clusteradm` to check the placement selected clusters.

    ```shell
    $ clusteradm get placements -otable
    NAME                      STATUS   REASON              SELETEDCLUSTERS
    guestbook-app-placement   False    Succeedconfigured   [cluster1]
    ```

4) Confirm the application is now deployed to cluster1.

    ```shell
    $ kubectl -n argocd get app
    NAME                     SYNC STATUS   HEALTH STATUS
    cluster1-guestbook-app   Synced        Healthy
    ```

## Summary

In this article, we use the ArgoCD pull model in OCM as an example, showing you how to migrate the ArgoCD applications automatically or manually when the cluster is down or during the cluster maintenance time.

The concept of [Taints](https://open-cluster-management.io/concepts/managedcluster/#taints-of-managedclusters) and [Tolerations](https://open-cluster-management.io/concepts/placement/#taintstolerations) can be used for any components that consume OCM `Placement`, such as [add-ons](https://open-cluster-management.io/concepts/addon/) and [ManifestworkReplicaSet](https://open-cluster-management.io/concepts/manifestworkreplicaset/). If you have any questions, feel free to raise them in our [slack channel](https://kubernetes.slack.com/channels/open-cluster-mgmt).
