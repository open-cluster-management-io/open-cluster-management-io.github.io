---
title: Fleet-Level Intelligent Scheduling for AI Workloads
weight: 1
---

Open Cluster Management (OCM) provides comprehensive solutions for managing AI workloads across multiple
clusters through intelligent scheduling, efficient model loading, and advanced placement capabilities. This page
lists the key AI integrations and features that help orchestrate AI workloads in multi-cluster environments.

## How OCM Helps AI Workloads on Fleet

AI and machine learning workloads have unique requirements when running at scale across multiple clusters. OCM
addresses these challenges through several key capabilities:

### Intelligent Workload Placement

OCM enables dynamic placement of AI workloads based on cluster capabilities and real-time conditions. You can
schedule training or inference jobs to clusters with available GPU resources, specific hardware accelerators, or
optimal network connectivity. The placement engine considers cluster capacity, resource quotas, and custom scoring
criteria to make intelligent scheduling decisions.

### Resource Management and Queueing

AI workloads often require significant computational resources and benefit from queue-based scheduling. OCM
integrates with workload queueing systems to manage resource allocation across your cluster fleet, ensuring fair
sharing of expensive resources like GPUs while preventing resource contention and enabling priority-based execution.

### Data Locality and Fast Model Loading

Model serving and training workloads require efficient access to large datasets and model files. OCM provides data
caching and acceleration capabilities to reduce model loading time, minimize data transfer costs, and improve
inference latency. This is particularly important in edge computing scenarios where models need to be deployed close
to data sources.

### Privacy-Preserving Distributed Training

For organizations with data distributed across multiple locations or regulatory boundaries, OCM enables federated
learning patterns where training occurs locally on each cluster, and only model updates are shared. This preserves
data privacy and compliance while enabling collaborative model training across the fleet.

### Workload Monitoring and Lifecycle Management

OCM provides unified visibility into AI workload execution across all clusters. You can track job completion status,
monitor resource utilization, and manage the lifecycle of batch training jobs or long-running inference services
from a central control plane.

## AI Integrations and Features

OCM achieves these capabilities through a set of integrations and addons specifically designed for AI workloads.
The following sections detail each integration and how it contributes to the overall AI workload management solution.

## MultiKueue Integration

The MultiKueue integration enables intelligent scheduling of AI workloads across multiple clusters. It leverages
[Kueue](https://kueue.sigs.k8s.io/), a Kubernetes-native job queueing system, to manage and schedule batch
workloads efficiently in a multi-cluster setup.

**Key Features:**
- Queue-based workload management across clusters
- Resource quota enforcement
- Priority-based scheduling
- Fair sharing of cluster resources

**Learn More:**
- [MultiKueue Addon Documentation](
  https://github.com/open-cluster-management-io/addon-contrib/blob/main/kueue-addon/README.md)

## Fluid Integration

The Fluid integration provides fast model loading capabilities for AI model serving by leveraging data caching and
acceleration. [Fluid](https://fluid-cloudnative.github.io/) is an open-source Kubernetes-native distributed dataset
orchestrator and accelerator for data-intensive applications.

**Key Features:**
- Accelerated data access for AI models
- Distributed caching of model data
- Support for various storage backends
- Reduced model loading time for inference workloads

**Learn More:**
- [Fluid Addon Documentation](
  https://github.com/open-cluster-management-io/addon-contrib/tree/main/fluid-addon)

## ManifestWork for Multi-Cluster Jobs

OCM's ManifestWork API provides a `workload completion` feature that enables easy execution of jobs across multiple
clusters. This feature allows you to track the completion status of workloads deployed to managed clusters.

**Key Features:**
- Deploy and track jobs across multiple clusters
- Monitor workload completion status
- Automatic status aggregation from managed clusters
- Simplified multi-cluster batch job management

**Learn More:**
- [ManifestWork Workload Completion Documentation](
  https://open-cluster-management.io/docs/concepts/work-distribution/manifestwork/#workload-completion)

## Dynamic Scoring Framework

The dynamic scoring addon enables intelligent workload scheduling based on real-time metrics and custom scoring
algorithms. This framework allows you to implement sophisticated placement decisions based on cluster conditions,
resource availability, and custom business logic.

**Key Features:**
- Metric-based cluster scoring
- Custom scoring algorithms
- Dynamic placement decisions
- Real-time resource awareness

**Learn More:**
- [Dynamic Scoring Framework Documentation](
  https://github.com/open-cluster-management-io/addon-contrib/blob/main/dynamic-scoring-framework/README.md)

## Federated Learning Controller

The federated learning controller enables secure model training across multiple clusters while preserving data
privacy. This addon implements federated learning patterns where data remains in its original location, and only
model updates are shared across clusters.

**Key Features:**
- Privacy-preserving model training
- Distributed learning across clusters
- Data locality and security
- Aggregation of model updates

**Learn More:**
- [Federated Learning Controller Documentation](
  https://github.com/open-cluster-management-io/addon-contrib/blob/main/federated-learning-controller/README.md)

## Getting Started

To begin using these AI workload capabilities:

1. Ensure you have a working OCM environment with at least one managed cluster. See the
   [Getting Started Guide](/docs/getting-started/) for initial setup.

2. Install the specific addons you need from the
   [addon-contrib repository](https://github.com/open-cluster-management-io/addon-contrib).

3. Configure placement policies to target the appropriate clusters for your AI workloads.

4. Deploy your AI workloads using the appropriate integration method.

## Use Cases

These AI integrations enable various multi-cluster AI scenarios:

- **Distributed Training**: Train large models across multiple clusters with data locality
- **Batch Inference**: Run inference jobs at scale across your fleet
- **Model Serving**: Deploy and serve models with optimized data loading
- **Resource Optimization**: Dynamically place workloads based on GPU availability and cluster metrics
- **Privacy-Preserving ML**: Train models on distributed data without centralizing sensitive information
- **Edge AI**: Deploy and manage AI workloads at the edge with efficient model distribution and local inference
