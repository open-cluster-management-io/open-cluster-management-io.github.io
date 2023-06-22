---
title: Extending managed clusters with custom attributes
weight: 1
---

Under some cases we need a convenient way to extend OCM's [Managed Cluster]({{< ref "/concepts/managedcluster" >}})
data model so that our own custom multi-cluster system can easily work over the
OCM's native cluster api otherwise we will have to maintain an additional
Kubernetes' [CustomResourceDefinition](https://kubernetes.io/docs/tasks/extend-kubernetes/custom-resources/custom-resource-definitions/)
in the project. OCM definitely supports developers to decorate the cluster api
with minimal effort, and in the following content we will walk through that
briefly.

The original cluster model in OCM "Managed Cluster" is designed to be a
__neat__ and  __light-weight__ placeholder resource of which the spec doesn't
require any additional information other than "whether the cluster is
accepted or not" i.e. `.spec.hubAcceptsClient`, and all the other fields
in the spec are totally optional, e.g. `.spec.managedClusterClientConfigs`
is only required until we install some addons that replying on that
information.

Overall in OCM we can decorate the original cluster model with custom
attributes in the following approaches:

- `Label`: The common label primitive in terms of a Kubernetes resource.
- `Cluster Claim`: A custom resource available inside the managed cluster
  which will be consistently reported to the hub cluster.


## Labeling managed cluster

Any kubernetes resource can be attached with labels in the metadata in the
form of:

```yaml
metadata:
  labels:
    <domain name>/<label name>: <label string value>
...
```

However, there're some restrictions to the label value such as the content
length, and legal charset etc, so it's not convenient to put some structurelized
or comprehensive data in the label value.

Additionally, due to the fact that the finest granularity of authorization
mechanism in Kubernetes is "resource", so it's also not convenient for us
to protect these extended labels from unexpected modification unless
intercepting the writes the "Managed Cluster" with an admission webhook which
brings additional costs in cluster administration and operation. So generally
it's recommended to put those immutable or static attributes (that doesn't
frequently change over time) such as:

- data-center information
- network infrastructure information
- geography attributes like cluster's region
- ...

Last but not least, it's generally not recommended to grant permission to the
managed cluster to update non-status fields on the "Managed Cluster" so these
custom attributes in labels should only be manipulated by hub cluster
admins/operators. If you are looking for a way to make the local agents in the
managed clusters to be capable of reporting attributes in a "bottom-up"
pattern, go ahead read the "Cluster Claim" section below.

## Decorating managed cluster with cluster claim

The cluster claim is a cluster-scoped custom resource working from the managed
clusters and proactively projecting custom attributes towards the hub cluster's
"Managed Cluster" model. Note that the hub cluster is not supposed to make
any direct modification upon the projected claims on the "ManagedCluster", i.e.
__read-only__ to the hub cluster.

A sample of cluster claim will be like:

```yaml
apiVersion: cluster.open-cluster-management.io/v1alpha1
kind: ClusterClaim
metadata:
  name: id.open-cluster-management.io
spec:
  value: 95f91f25-d7a2-4fc3-9237-2ef633d8451c
```

After applying the cluster claim above to any managed cluster, the value of
the claims will be instantly reflected in the cluster model. e.g.:

```yaml
apiVersion: cluster.open-cluster-management.io/v1
kind: ManagedCluster
metadata: ...
spec: ...
status:
  clusterClaims:
    - name: id.open-cluster-management.io
      value: 95f91f25-d7a2-4fc3-9237-2ef633d8451c
```

And any future updates upon the claim will also be reported from the
registration agent to the hub cluster.

The claims are useful if we want the hub cluster to perform different actions
or behaviors reactively based on the feedback of reported values. They're
typically applicable to describe the information that changes in the managed
cluster frequently. e.g.:

- aggregated resource information (node counts, pod counts)
- cluster resource watermark/budget
- any cluster-scoped knowledge of the managed cluster...


## Next

After extending your "Managed Cluster" with customized attributes, now we can
try the advanced cluster selection using the [placement]({{< ref "/concepts/placement" >}})
policies, which is provided ny another module of OCM helpful for building your
own advanced multi-cluster systems.