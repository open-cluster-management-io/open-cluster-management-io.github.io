---
title: Policy framework
weight: 1
hide_summary: true
aliases:
  - /getting-started/integration/policy-framework/
---

The policy framework provides governance capabilities to OCM managed Kubernetes clusters. Policies provide visibility
and drive remediation for various security and configuration aspects to help IT administrators meet their requirements.

## API Concepts

View the [Policy API]({{< ref "docs/getting-started/integration/policy-controllers/policy" >}}) page for additional details about the Policy API managed by the Policy Framework
components, including:

- [`Policy`]({{< ref "docs/getting-started/integration/policy-controllers/policy#policy" >}})
- [`PolicySet`]({{< ref "docs/getting-started/integration/policy-controllers/policy#policyset" >}})
- [`PlacementBinding`]({{< ref "docs/getting-started/integration/policy-controllers/policy#placementbinding" >}})

## Architecture

<div style="text-align: center; padding: 20px;">
   <img src="/policy-framework-architecture-diagram.png" alt="Policy framework architecture" style="margin: 0 auto; width: 80%">
</div>

The governance policy framework distributes policies to managed clusters and collects results to send back to the hub
cluster.

- [Policy propagator](https://github.com/open-cluster-management-io/governance-policy-propagator)
- [Policy framework addon](https://github.com/open-cluster-management-io/governance-policy-framework-addon)

## Prerequisite

You must meet the following prerequisites to install the policy framework:

- Ensure [`kubectl`](https://kubernetes.io/docs/tasks/tools/install-kubectl) and
  [`kustomize`](https://kubectl.docs.kubernetes.io/installation/kustomize/) are installed.

- Ensure the `open-cluster-management` _cluster manager_ is installed. See
  [Start the control plane]({{< ref "docs/getting-started/installation/start-the-control-plane" >}}) for more information.

- Ensure the `open-cluster-management` _klusterlet_ is installed. See
  [Register a cluster]({{< ref "docs/getting-started/installation/register-a-cluster" >}}) for more information.

- If you are using `PlacementRules` with your policies, ensure the `open-cluster-management` _application_ is installed
  . See [Application management]({{< ref "docs/getting-started/integration/app-lifecycle" >}}) for more information. If you are using the
  default `Placement` API, you can skip the Application management installation, but you do need to install the
  `PlacementRule` CRD with this command:

  ```Shell
  kubectl apply -f https://raw.githubusercontent.com/open-cluster-management-io/multicloud-operators-subscription/main/deploy/hub-common/apps.open-cluster-management.io_placementrules_crd.yaml
  ```

## Install the governance-policy-framework hub components

### Install via Clusteradm CLI

Ensure `clusteradm` CLI is installed and is at least v0.3.0. Download and extract the
[clusteradm binary](https://github.com/open-cluster-management-io/clusteradm/releases/latest). For more details see the
[clusteradm GitHub page](https://github.com/open-cluster-management-io/clusteradm/blob/main/README.md#quick-start).

1. Deploy the policy framework controllers to the hub cluster:

   ```Shell
   # The context name of the clusters in your kubeconfig
   # If the clusters are created by KinD, then the context name will the follow the pattern "kind-<cluster name>".
   export CTX_HUB_CLUSTER=<your hub cluster context>           # export CTX_HUB_CLUSTER=kind-hub
   export CTX_MANAGED_CLUSTER=<your managed cluster context>   # export CTX_MANAGED_CLUSTER=kind-cluster1

   # Set the deployment namespace
   export HUB_NAMESPACE="open-cluster-management"

   # Deploy the policy framework hub controllers
   clusteradm install hub-addon --names governance-policy-framework --context ${CTX_HUB_CLUSTER}
   ```

2. Ensure the pods are running on the hub with the following command:

   ```Shell
   $ kubectl get pods -n ${HUB_NAMESPACE}
   NAME                                                       READY   STATUS    RESTARTS   AGE
   governance-policy-addon-controller-bc78cbcb4-529c2         1/1     Running   0          94s
   governance-policy-propagator-8c77f7f5f-kthvh               1/1     Running   0          94s
   ```

   - See more about the governance-policy-framework components:
     - [policy-propagator](https://github.com/open-cluster-management-io/governance-policy-propagator)
     - [policy-addon-controller](https://github.com/open-cluster-management-io/governance-policy-addon-controller)

## Deploy the synchronization components to the managed cluster(s)

### Deploy via Clusteradm CLI

1. To deploy the synchronization components to a self-managed hub cluster:

   ```Shell
   clusteradm addon enable --names governance-policy-framework --clusters <managed_hub_cluster_name> --annotate addon.open-cluster-management.io/on-multicluster-hub=true --context ${CTX_HUB_CLUSTER}
   ```

   To deploy the synchronization components to a managed cluster:

   ```Shell
   clusteradm addon enable --names governance-policy-framework --clusters <cluster_name> --context ${CTX_HUB_CLUSTER}
   ```

2. Verify that the
   [governance-policy-framework-addon controller](https://github.com/open-cluster-management-io/governance-policy-framework-addon)
   pod is running on the managed cluster with the following command:

   ```Shell
   $ kubectl get pods -n open-cluster-management-agent-addon
   NAME                                                     READY   STATUS    RESTARTS   AGE
   governance-policy-framework-addon-57579b7c-652zj         1/1     Running   0          87s
   ```

## What is next

Install the [policy controllers](../policy-controllers) to the managed clusters.
