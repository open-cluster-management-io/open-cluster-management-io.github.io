---
title: Spread workload across failure domains using decision groups
weight: 1
---

This guide demonstrates how to distribute workloads across cluster topology domains (such as zones, regions, and cloud providers) for high availability and disaster tolerance using Placement's [decision strategy]({{< ref "docs/concepts/content-placement/placement#decision-strategy" >}}) feature.

## Overview

When deploying critical workloads across multiple clusters, you often need to spread them across different failure domains to ensure high availability and disaster recovery. Open Cluster Management's Placement API provides decision groups to help you organize and distribute clusters based on topology.

## Background

In a multi-cluster environment, clusters are typically distributed across hierarchical failure domains:

- **Cloud Provider**: AWS, Alibaba Cloud, Azure, GCP
- **Region**: Geographic regions (e.g., us-east, us-west, cn-hangzhou)
- **Availability Zone**: Zones within regions (e.g., us-east-1a, us-east-1b)

Spreading workloads across these domains provides high availability, disaster recovery, and better resource utilization across infrastructure.

## Prerequisites

Before starting, we suggest you understand the content below:

- [Placement]({{< ref "docs/concepts/content-placement/placement" >}})
- [ManagedClusterSet]({{< ref "docs/concepts/cluster-inventory/managedclusterset" >}})

## Example Topology

Throughout this guide, we use the following example topology:

| Provider | Region | Zone |
|----------|---------|------|
| aws | us-east | us-east-1a |
| aws | us-east | us-east-1b |
| aws | us-west | us-west-1a |

## Use Case 1: Spread Across Zones (Even Spread and Skew Control)

This use case shows how to spread workloads across availability zones. The same decision group configuration can be used for both even spread and skew control scenarios.

**Scenario 1 - Even Spread**: Deploy 4 clusters evenly across zones in the **us-east** region (2 from us-east-1a, 2 from us-east-1b).

**Scenario 2 - Skew Control**: Deploy up to 4 clusters across zones, but limit the maximum skew to 2. For example, if us-east-1a has 3 clusters and us-east-1b has only 1 cluster, you may select 2 from us-east-1a and 1 from us-east-1b (total 3 clusters) to keep skew ≤ 2 (skew = selected_clusters_in_current_topology - min(selected_clusters_in_a_topology)).

### Solution: Using Decision Groups

```yaml
apiVersion: cluster.open-cluster-management.io/v1beta1
kind: Placement
metadata:
  name: zone-spread-placement
  namespace: default
spec:
  numberOfClusters: 4
  predicates:
  - requiredClusterSelector:
      labelSelector:
        matchLabels:
          region: us-east
  decisionStrategy:
    groupStrategy:
      decisionGroups:
      - groupName: us-east-1a
        groupClusterSelector:
          labelSelector:
            matchLabels:
              zone: us-east-1a
      - groupName: us-east-1b
        groupClusterSelector:
          labelSelector:
            matchLabels:
              zone: us-east-1b
```

### How it works

**For Even Spread:**
- The placement controller creates separate decision groups for each zone
- PlacementDecisions will have labels, for example `cluster.open-cluster-management.io/decision-group-name: us-east-1a` indicating which decision group they belong to
- The consumer (such as a workload deployer or operator) selects equal numbers of clusters from each decision group to achieve even distribution

**For Skew Control:**
- The placement controller organizes clusters into decision groups by zone
- The consumer reviews the available clusters in each decision group
- The consumer calculates the skew: `skew = max_count - min_count`
- The consumer decides whether to proceed based on the maxSkew tolerance and selects clusters to stay within the skew limit

### Limitations

- You must explicitly define all decision groups (enumerate each zone)
- The consumer is responsible for selecting clusters from decision groups
- The placement controller doesn't automatically enforce even distribution or skew constraints
- The consumer must calculate skew for skew control scenarios

## Use Case 2: Hierarchical Spreading (Region → Zone)

**Scenario**: Deploy 4 clusters from **aws** provider, spreading first across regions, then across zones within each region.

**Expected Distribution**:
- us-east region: 2 clusters (1 from us-east-1a, 1 from us-east-1b)
- us-west region: 2 clusters (2 from us-west-1a)

### Solution: Using Decision Groups

```yaml
apiVersion: cluster.open-cluster-management.io/v1beta1
kind: Placement
metadata:
  name: hierarchical-spread-placement
  namespace: default
spec:
  numberOfClusters: 4
  predicates:
  - requiredClusterSelector:
      labelSelector:
        matchLabels:
          provider: aws
  decisionStrategy:
    groupStrategy:
      decisionGroups:
      - groupName: us-east-1a
        groupClusterSelector:
          labelSelector:
            matchLabels:
              region: us-east
              zone: us-east-1a
      - groupName: us-east-1b
        groupClusterSelector:
          labelSelector:
            matchLabels:
              region: us-east
              zone: us-east-1b
      - groupName: us-west-1a
        groupClusterSelector:
          labelSelector:
            matchLabels:
              region: us-west
              zone: us-west-1a
```

### How it works

- The placement defines decision groups that combine both region and zone labels
- The placement controller organizes clusters into decision groups based on the combined region-zone labels
- The consumer selects clusters to achieve hierarchical distribution:
  1. First, distribute across regions (us-east and us-west)
  2. Within each region, distribute across zones

### Limitations

- Must explicitly define all region-zone combinations
- Cannot define nested decision groups
- The consumer is responsible for orchestrating the hierarchical distribution

## Summary

While OCM has a [Spread Policy API designed](https://github.com/open-cluster-management-io/enhancements/tree/main/enhancements/sig-architecture/70-spread-policy) to simplify topology-aware workload distribution, it is not currently implemented. Decision groups provide an easy and flexible way to achieve the same spreading behavior with explicit control over cluster selection and distribution.

If you have any questions or run into issues using decision groups for topology spreading, feel free to raise your question in the [Open-cluster-management-io GitHub community](https://github.com/open-cluster-management-io/OCM/issues) or contact us using [Slack](https://kubernetes.slack.com/channels/open-cluster-mgmt).