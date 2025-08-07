---
title: Feature Gates
weight: 3
---

Feature gates are a way to enable or disable experimental or optional features in Open Cluster Management (OCM). They provide a safe mechanism to gradually roll out new functionality and maintain backward compatibility.

## Overview

OCM uses Kubernetes' feature gate mechanism to control the availability of features across different components:

- **Hub Components**: Features running on the hub cluster 
- **Spoke Components**: Features running on managed clusters

Feature gates follow a standard lifecycle:
- **Alpha** (disabled by default): Experimental features that may change or be removed
- **Beta** (enabled by default): Well-tested features that are expected to be promoted to GA
- **GA** (always enabled): Stable features that are part of the core functionality

## Available Feature Gates

### Registration Features

#### Hub Registration Features

| Feature Gate | Default | Stage | Description |
|--------------|---------|-------|-------------|
| `DefaultClusterSet` | `true` | Alpha | When it is enabled, it will make registration hub controller to maintain a default clusterset and a global clusterset. Adds clusters without cluster set labels to the default cluster set. All clusters will be included to the global clusterset.|
| `V1beta1CSRAPICompatibility` | `false` | Alpha | When it is enabled, it will make the spoke registration agent to issue CSR requests via V1beta1 api.|
| `ManagedClusterAutoApproval` | `false` | Alpha | When it is enabled, it will approve a managed cluster registration request automatically. |
| `ResourceCleanup` | `true` | Beta | When it is enabled, it will start gc controller to clean up resources in cluster ns after cluster is deleted. |
| `ClusterProfile` | `false` | Alpha | When it is enabled, it will start new controller in the Hub that can be used to sync ManagedCluster to ClusterProfile.|
| `ClusterImporter` | `false` | Alpha | When it is enabled, it will enable the auto import of managed cluster for certain cluster providers, e.g. cluster-api.|

#### Spoke Registration Features

| Feature Gate | Default | Stage | Description |
|--------------|---------|-------|-------------|
| `ClusterClaim` | `true` | Beta | When it is enabled, will start a new controller in the spoke-agent to manage the cluster-claim resources in the managed cluster. |
| `ClusterProperty` | `false` | Alpha | When it is enabled on the spoke agent, it will use the claim controller to manage the managed cluster property. |
| `AddonManagement` | `true` | Beta | When it is enabled on the spoke agent, it will start a new controllers to manage the managed cluster addons registration and maintains the status of managed cluster addons through watching their leases.|
| `V1beta1CSRAPICompatibility` | `false` | Alpha | Will make the spoke registration agent to issue CSR requests via V1beta1 api.|
| `MultipleHubs` | `false` | Alpha | Enables configuration of multiple hub clusters for high availability. Allows user to configure multiple bootstrapkubeconfig connecting to different hubs via Klusterlet and let agent decide which one to use.|

### Work Management Features

#### Hub Work Features

| Feature Gate | Default | Stage | Description |
|--------------|---------|-------|-------------|
| `NilExecutorValidating` | `false` | Alpha | When it is enabled, it will make the work-webhook to validate ManifestWork even when executor is nil, checking execute-as permissions with default executor. |
| `ManifestWorkReplicaSet` | `false` | Alpha | When it is enabled, it will start new controller in the Hub that can be used to deploy manifestWorks to group of clusters selected by a placement. |
| `CloudEventsDrivers` | `false` | Alpha | When it is enabled, it will enable the cloud events drivers (mqtt or grpc) for the hub controller, so that the controller can deliver manifestworks to the managed clusters via cloud events. |

#### Spoke Work Features

| Feature Gate | Default | Stage | Description |
|--------------|---------|-------|-------------|
| `ExecutorValidatingCaches` | `false` | Alpha | When it is enabled, it will start a new controller in the work agent to cache subject access review validating results for executors.|
| `RawFeedbackJsonString` | `false` | Alpha | When it is enabled, it will make the work agent to return the feedback result as a json string if the result is not a scalar value.|

### Addon Management Features

| Feature Gate | Default | Stage | Description |
|--------------|---------|-------|-------------|
| `AddonManagement` | `true` | Beta | When it is enabled on hub controller, it will start a new controller to process addon automatic installation and rolling out.|

## Configuration Methods

### 1. Command Line Flags

Feature gates can be configured using command line flags when starting OCM components:

```bash
# Enable a single feature gate
clusteradm init --feature-gates=DefaultClusterSet=true

# Disable a feature gate
clusteradm init --feature-gates=ClusterClaim=false

# Configure multiple feature gates
clusteradm init --feature-gates=ClusterClaim=false,AddonManagement=true,DefaultClusterSet=false
```

### 2. Operator Configuration

Feature gates can be configured through the `ClusterManager` and `Klusterlet` custom resources:

#### ClusterManager Configuration (Hub)

```yaml
apiVersion: operator.open-cluster-management.io/v1
kind: ClusterManager
metadata:
  name: cluster-manager
spec:
  registrationConfiguration:
    featureGates:
    - feature: DefaultClusterSet
      mode: Enable
    - feature: ManagedClusterAutoApproval
      mode: Enable
  workConfiguration:
    featureGates:
    - feature: ManifestWorkReplicaSet
      mode: Enable
  addOnManagerConfiguration:
    featureGates:
    - feature: AddonManagement
      mode: Enable
```

#### Klusterlet Configuration (Spoke)

```yaml
apiVersion: operator.open-cluster-management.io/v1
kind: Klusterlet
metadata:
  name: klusterlet
spec:
  registrationConfiguration:
    featureGates:
    - feature: ClusterClaim
      mode: Disable
    - feature: AddonManagement
      mode: Enable
  workConfiguration:
    featureGates:
    - feature: ExecutorValidatingCaches
      mode: Enable
```