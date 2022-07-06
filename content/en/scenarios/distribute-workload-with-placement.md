---
title: Distribute workload with placement selected managed clusters
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

For example, with OCM addon [policy](https://open-cluster-management.io/getting-started/integration/policy-controllers/)
installed, a `Policy` that includes a `Placement` mapping can distribute the
`Policy` to the managed clusters, details see this [example](https://open-cluster-management.io/getting-started/integration/policy-controllers/#placement-api).
OCM addon [application lifecycle management](https://open-cluster-management.io/getting-started/integration/app-lifecycle/)
will also use placement to deploy applications in the future.

Some popular open source projects also integrate with the `Placement` API. For
example [Argo](https://github.com/argoproj/argo-cd), it can leverage the
generated `PlacementDecision` to drive the assignment of Argo Applications to a
desired set of clusters, details see this [example](https://github.com/argoproj/applicationset/tree/master/examples/clusterDecisionResource).
And [KubeVela](https://github.com/kubevela/kubevela), as an implementation of
the open application model, also will take advantage of the `Placement` API for
workload scheduling.

And in this article, we want to show you how to use `clusteradm` to deploy
`ManifestWork` to `Placement` selected clusters.

## Prerequisites

Before starting with the following steps, suggest you understand the content below.

- [__Placement__](https://open-cluster-management.io/concepts/placement/):
The `Placement` API is used to dynamically select a set of [`ManagedCluster`](https://open-cluster-management.io/concepts/managedcluster/)
in one or multiple [`ManagedClusterSets`](https://open-cluster-management.io/concepts/managedclusterset)
so that higher-level users can either replicate Kubernetes resources to the
member clusters or run their advanced workload i.e. multi-cluster scheduling.

- [__ManifestWork__](https://open-cluster-management.io/concepts/manifestwork/):
A custom resource in the hub cluster that groups a list of Kubernetes resources
together and is meant for dispatching them into the managed cluster if the
`ManifestWork` is created in a valid `cluster namespace`.

## Deploy manifestwork to placement selected managed clusters

In [deploy Kubernetes resources to the managed clusters](https://open-cluster-management.io/scenarios/deploy-kubernetes-resources/),
it shows you how to use `clusteradm` to create a `ManifestWork` and deploy it
onto a specific managed clusters. As `Placement` can dynamically select a set of
`ManagedCluster`, the next steps will show you how `clusteradm` leverages
placement scheduling ability and dynamically deploy `ManifestWork` to a set of
managed clusters.

1) Following [setup dev environment by kind](https://github.com/open-cluster-management-io/OCM/tree/main/solutions/setup-dev-environment)
to prepare an environment.

```shell
curl -sSL https://raw.githubusercontent.com/open-cluster-management-io/OCM/main/solutions/setup-dev-environment/local-up.sh | bash
```

2) Confirm there are 2 `ManagedCluster` and a default `ManagedClusterSet` created.

```shell
$ clusteradm get clusters
NAME       ACCEPTED   AVAILABLE   CLUSTERSET   CPU   MEMORY       KUBERENETES VERSION
cluster1   true       True        default      24    49265496Ki   v1.23.4
cluster2   true       True        default      24    49265496Ki   v1.23.4

$ clusteradm get clustersets
NAME      BOUND NAMESPACES   STATUS
default                      2 ManagedClusters selected
```

3) Bind the default `ManagedClusterSet` to default `Namespace`.

```shell
clusteradm clusterset bind default --namespace default
```

```shell
$ clusteradm get clustersets
NAME      BOUND NAMESPACES   STATUS
default   default            2 ManagedClusters selected
```

Note: click [here](https://open-cluster-management.io/concepts/managedclusterset/#operates-managedclusterset-using-clusteradm)
to see more details about how to operate `ManagedClusterSet` using `clusteradm`.

4) Create a `Placement` placement1 to select the 2 clusters in default `ManagedClusterSet`.

```shell
cat << EOF | kubectl apply -f -
apiVersion: cluster.open-cluster-management.io/v1beta1
kind: Placement
metadata:
  name: placement1
  namespace: default
spec:
  numberOfClusters: 2
  clusterSets:
    - default
EOF
```

5) Use `clusteradm` command to create `ManifestWork` my-first-work with
`Placement` placement1.

```shell
clusteradm create work my-first-work -f work.yaml --placement default/placement1
```

The `work.yaml` contains kubernetes resource definitions, for sample:

```shell
$ cat work.yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  namespace: default
  name: my-sa
---
apiVersion: apps/v1
kind: Deployment
metadata:
  namespace: default
  name: nginx-deployment
  labels:
    app: nginx
spec:
  replicas: 3
  selector:
    matchLabels:
      app: nginx
  template:
    metadata:
      labels:
        app: nginx
    spec:
      serviceAccountName: my-sa
      containers:
        - name: nginx
          image: nginx:1.14.2
          ports:
            - containerPort: 80
```

6) Check the `ManifestWork`, it should be distributed to both cluster1 and cluster2.

```shell
$ kubectl get manifestwork -A
NAMESPACE   NAME            AGE
cluster1    my-first-work   28s
cluster2    my-first-work   28s
```

7) Update the `Placement` placement1 to select only 1 managed cluster.

```shell
kubectl patch placement placement1 --patch '{"spec": {"clusterSets": ["default"],"numberOfClusters": 1}}' --type=merge
```

8) As the placement decision changes, running below command to reschedule
`ManifestWork` my-first-work to the newly selected cluster.

```shell
clusteradm create work my-first-work -f work.yaml --placement default/placement1 --overwrite
```

9) Check the `ManifestWork` again, now it's only deployed to cluster1.

```shell
$ kubectl get manifestwork -A
NAMESPACE   NAME            AGE
cluster1    my-first-work   18m
```

## What happens behind the scene

The main idea is that `clusteradm` parse the selected clusters generated by
`Placement`, and fill in that as `ManifestWork` namespace. Then create the
`ManifestWork` and it would be distributed to a set of clusters. Let's see more
details.

1) `Placement` placement1 generates a `PlacementDecision` placement1-decision-1.

```shell
✗ kubectl get placementdecision -n default -l cluster.open-cluster-management.io/placement=placement1 -oyaml
apiVersion: v1
items:
- apiVersion: cluster.open-cluster-management.io/v1beta1
  kind: PlacementDecision
  metadata:
    creationTimestamp: "2022-07-06T15:03:12Z"
    generation: 1
    labels:
      cluster.open-cluster-management.io/placement: placement1
    name: placement1-decision-1
    namespace: default
    ownerReferences:
    - apiVersion: cluster.open-cluster-management.io/v1beta1
      blockOwnerDeletion: true
      controller: true
      kind: Placement
      name: placement1
      uid: aa339f57-0eb7-4260-8d4d-f30c1379fd35
    resourceVersion: "47679"
    uid: 9f948619-1647-429d-894d-81e11dd8bcf1
  status:
    decisions:
    - clusterName: cluster1
      reason: ""
    - clusterName: cluster2
      reason: ""
kind: List
metadata:
  resourceVersion: ""
  selfLink: ""
```

2) `clusteradm` get the `PlacementDecision` generated by `PlacmentDecision`
placement1 with label `cluster.open-cluster-management.io/placement: placement1`,
reference [code](https://github.com/open-cluster-management-io/clusteradm/pull/247/files#diff-0f96f91e259a6a6ce0f2231444a4991174b43bc206d34897be3be897279124eaR157).
Then parse the clusterName cluster1 and cluster2, fill in that as `ManifestWork`
namespace, reference [code](https://github.com/open-cluster-management-io/clusteradm/pull/247/files#diff-0f96f91e259a6a6ce0f2231444a4991174b43bc206d34897be3be897279124eaR183).
Then installs `ManifestWork` to namespace cluster1 and cluster2,
which will finally be distributed to the two clusters.

```shell
$ kubectl get manifestwork -A
NAMESPACE   NAME            AGE
cluster1    my-first-work   28s
cluster2    my-first-work   28s
```
