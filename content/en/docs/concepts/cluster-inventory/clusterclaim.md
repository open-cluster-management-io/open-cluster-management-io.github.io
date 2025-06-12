---
title: ClusterClaim
weight: 1
aliases:
  - /concepts/clusterclaim/
  - /docs/concepts/clusterclaim/
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

## About-API Support in Open Cluster Management

Open Cluster Management (OCM) supports the use of `ClusterProperty` via the
[about-api](https://github.com/kubernetes-sigs/about-api),
which allows administrators to define and expose cluster-scoped properties. These properties are
synced to the managed cluster's `ManagedCluster` status and can coexist with
`ClusterClaim` but take precedence if a same-named property exists.

### Enabling the Feature

To enable the `ClusterProperty` feature on the spoke cluster, the `ClusterProperty` feature gate must be
set on the Klusterlet component. This can be done by setting the feature gate in the Klusterlet configuration:

```yaml
featureGates:
  ClusterProperty: "true"
 ```

Ensure that the feature gate is enabled appropriately based on your cluster management strategy.

### Using ClusterProperty

#### Creating a ClusterProperty

Cluster administrators can create a `ClusterProperty` custom resource in the spoke cluster. The following
is an example YAML for creating a `ClusterProperty`:

```yaml
apiVersion: about.k8s.io/v1alpha1
kind: ClusterProperty
metadata:
  name: example-property
spec:
  value: "example-value"
```

Once created, the `ClusterProperty` will be automatically synced to the hub cluster and reflected within
the `ManagedCluster` resource's status.

#### Syncing Existing Properties

After enabling the feature, any existing `ClusterProperty` resources will be synced to the `ManagedCluster`
status on the hub cluster.

Example: If `example-property` with value `example-value` already exists on the spoke cluster, its value
will populate into the `ManagedCluster` as:

```yaml
status:
  clusterClaims:
    - name: "example-property"
      value: "example-value"
```

#### Handling Conflicts with ClusterClaim

In case a `ClusterClaim` resource with the same name as a `ClusterProperty` exists, the `ClusterProperty`
will take precedence and the corresponding `ClusterClaim` will be ignored.

#### Updating ClusterProperties

Updating the value of an existing `ClusterProperty` will automatically reflect the change in the managed
cluster's status:

```yaml
spec:
  value: "updated-value"
```

#### Deleting ClusterProperties

When a `ClusterProperty` is deleted from the spoke cluster, its corresponding entry in the `ManagedCluster`
status is removed:

```shell
kubectl delete clusterproperty example-property
```

This will result in the removal of the `example-property` from the `ManagedCluster` status on the hub cluster.

### Additional Notes 
- Both `ClusterProperty` and `ClusterClaim` can co-exist, with `ClusterProperty` taking precedence in
naming conflicts.
- The feature uses the existing OCM infrastructure for status synchronization, ensuring minimal disruption to
ongoing operations.
- Ensure compatibility and testing in your environment before enabling the `ClusterProperty` feature gate in
production settings.
