---
title: ClusterClaim
weight: 1
---



## What is ClusterClaim?

`ClusterClaim` is a cluster-scoped API available to users on a managed cluster.
The `ClusterClaim` objects are collected from the managed cluster and saved into
the status of the corresponding `ManagedCluster` object on the hub.

## Usage

`ClusterCaim` is used to specify additional properties of the managed cluster like
the clusterID, version, vendor and cloud provider. We defined some reserved `ClusterClaims`
like `id.k8s.io` which is a unique identifier for the managed cluster.

In addition to the reserved `ClusterClaims`, users can also customize 20 `ClusterClaims` by default.
The maximum count of customized `ClusterClaims` can be configured via the flag
`max-custom-cluster-claims` of registration agent on the managed cluster.

The `ClusterClaim` with the label `open-cluster-management.io/spoke-only` will not be synced
to the status of `ManagedCluster`.

## Example

Here is a `ClusterClaim` example specifying a `id.k8s.io`:

```yaml
apiVersion: cluster.open-cluster-management.io/v1alpha1
kind: ClusterClaim
metadata:
  name: id.k8s.io
spec:
  value: myCluster
```

After applying the `ClusterClaim` above to any managed cluster, the value of the `ClusterClaim`
is reflected in the `ManagedCluster` on the hub cluster:

```yaml
apiVersion: cluster.open-cluster-management.io/v1
kind: ManagedCluster
metadata: ...
spec: ...
status:
  clusterClaims:
    - name: id.k8s.io
      value: myCluster
```
