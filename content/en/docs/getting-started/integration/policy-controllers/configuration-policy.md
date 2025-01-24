---
title: Configuration Policy
weight: 3
hide_summary: true
---

The `ConfigurationPolicy` defines Kubernetes manifests to compare with objects that currently exist on the cluster. The
Configuration policy controller is provided by Open Cluster Management and runs on managed clusters.

View the [Policy API concepts]({{< ref
"docs/getting-started/integration/policy-controllers/policy#managed-cluster-policy-controllers" >}}) page to learn more
about the `ConfigurationPolicy` API.

## Prerequisites

You must meet the following prerequisites to install the configuration policy controller:

- Ensure [`kubectl`](https://kubernetes.io/docs/tasks/tools/install-kubectl) and
  [`kustomize`](https://kubectl.docs.kubernetes.io/installation/kustomize/) are installed.

- Ensure [Golang](https://golang.org/doc/install) is installed, if you are planning to install from the source.

- Ensure the `open-cluster-management` _policy framework_ is installed. See
  [Policy Framework]({{< ref "docs/getting-started/integration/policy-controllers/policy-framework" >}}) for more information.

## Installing the configuration policy controller

### Deploy via Clusteradm CLI

Ensure `clusteradm` CLI is installed and is newer than v0.3.0. Download and extract the
[clusteradm binary](https://github.com/open-cluster-management-io/clusteradm/releases/latest). For more details see the
[clusteradm GitHub page](https://github.com/open-cluster-management-io/clusteradm/blob/main/README.md#quick-start).

1. Deploy the configuration policy controller to the managed clusters (this command is the same for a self-managed hub):

   ```Shell
   # Deploy the configuration policy controller
   clusteradm addon enable addon --names config-policy-controller --clusters <cluster_name> --context ${CTX_HUB_CLUSTER}
   ```

2. Ensure the pod is running on the managed cluster with the following command:

   ```Shell
   $ kubectl get pods -n open-cluster-management-agent-addon
   NAME                                               READY   STATUS    RESTARTS   AGE
   config-policy-controller-7f8fb64d8c-pmfx4          1/1     Running   0          44s
   ```

## Sample configuration policy

After a successful deployment, test the policy framework and configuration policy controller with a sample policy.

For more information on how to use a `ConfigurationPolicy`, read the
[`Policy` API concept section]({{< ref "docs/getting-started/integration/policy-controllers/policy-framework#policy" >}}).

1. Run the following command to create a policy on the hub that uses `Placement`:

   ```Shell
   # Configure kubectl to point to the hub cluster
   kubectl config use-context ${CTX_HUB_CLUSTER}

   # Apply the example policy and placement
   kubectl apply -n default -f https://raw.githubusercontent.com/open-cluster-management-io/policy-collection/main/community/CM-Configuration-Management/policy-pod-placement.yaml
   ```

2. Update the `Placement` to distribute the policy to the managed cluster with the following command (this
   `clusterSelector` will deploy the policy to all managed clusters):

   ```Shell
   kubectl patch -n default placement.cluster.open-cluster-management.io/placement-policy-pod --type=merge -p "{\"spec\":{\"predicates\":[{\"requiredClusterSelector\":{\"labelSelector\":{\"matchExpressions\":[]}}}]}}"
   ```

3. Make sure the `default` namespace has a `ManagedClusterSetBinding` for a `ManagedClusterSet` with at least one
   managed cluster resource in the `ManagedClusterSet`. See
   [Bind ManagedClusterSet to a namespace]({{< ref "docs/concepts/cluster-inventory/managedclusterset#bind-managedclusterset-to-a-namespace" >}}) for more
   information on this.

4. To confirm that the managed cluster is selected by the `Placement`, run the following command:

   ```Shell
   $ kubectl get -n default placementdecision.cluster.open-cluster-management.io/placement-policy-pod-decision-1 -o yaml
   ...
   status:
     decisions:
     - clusterName: <managed cluster name>
       reason: ""
   ...
   ```

5. Enforce the policy to make the configuration policy automatically correct any misconfigurations on the managed
   cluster:

   ```Shell
   $ kubectl patch -n default policy.policy.open-cluster-management.io/policy-pod --type=merge -p "{\"spec\":{\"remediationAction\": \"enforce\"}}"
   policy.policy.open-cluster-management.io/policy-pod patched
   ```

6. After a few seconds, your policy is propagated to the managed cluster. To confirm, run the following command:

   ```Shell
   $ kubectl config use-context ${CTX_MANAGED_CLUSTER}
   $ kubectl get policy -A
   NAMESPACE   NAME                 REMEDIATION ACTION   COMPLIANCE STATE   AGE
   cluster1    default.policy-pod   enforce              Compliant          4m32s
   ```

7. The missing pod is created by the policy on the managed cluster. To confirm, run the following command on the managed
   cluster:

   ```Shell
   $ kubectl get pod -n default
   NAME               READY   STATUS    RESTARTS   AGE
   sample-nginx-pod   1/1     Running   0          23s
   ```
