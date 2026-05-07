---
title: Operator Policy
weight: 5
hide_summary: true
---

The `OperatorPolicy` defines a desired state for operators managed by the Operator Lifecycle Manager (OLM) on managed clusters. The Operator policy controller is provided by Open Cluster Management and runs on managed clusters as part of the `config-policy-controller` deployment.

View the [Policy API concepts]({{< ref "docs/getting-started/integration/policy-controllers/policy#managed-cluster-policy-controllers" >}}) page to learn more about the `OperatorPolicy` API.

## Prerequisites

You must meet the following prerequisites to use the Operator policy controller:

- Ensure [`kubectl`](https://kubernetes.io/docs/tasks/tools/install-kubectl) and [`kustomize`](https://kubectl.docs.kubernetes.io/installation/kustomize/) are installed.

- Ensure [Golang](https://golang.org/doc/install) is installed, if you are planning to install from the source.

- Ensure the `open-cluster-management` _policy framework_ is installed. See [Policy Framework]({{< ref "docs/getting-started/integration/policy-controllers/policy-framework" >}}) for more information.

- Ensure Operator Lifecycle Manager (OLM) is installed on the managed clusters where you plan to deploy operators. See the [OLM Quick Start guide](https://olm.operatorframework.io/docs/getting-started/) for installation instructions.

## Installing the operator policy controller

The operator policy controller and the configuration policy controller run in the same `config-policy-controller` pod on managed clusters. The operator policy controller is disabled by default.

Steps 1 and 2 will install the configuration policy controller, matching the steps in [Installing the configuration policy controller]({{< ref "docs/getting-started/integration/policy-controllers/configuration-policy">}}).

If configuration policy controller is already installed, complete Step 3 onwards.

### Deploy via Clusteradm CLI

Ensure `clusteradm` CLI is installed and is newer than v0.3.0. Download and extract the [clusteradm binary](https://github.com/open-cluster-management-io/clusteradm/releases/latest). For more details see the [clusteradm GitHub page](https://github.com/open-cluster-management-io/clusteradm/blob/main/README.md#quick-start).

1. Deploy the configuration policy controller (which includes the operator policy controller) to the managed clusters:

   ```Shell
   $ clusteradm addon enable addon --names config-policy-controller --clusters <cluster_name> --context ${CTX_HUB_CLUSTER}
   Deploying config-policy-controller add-on to namespaces open-cluster-management-agent-addon of managed cluster: <cluster_name>
   ```

2. Ensure the pod is running on the managed cluster with the following command:

   ```Shell
   $ kubectl get pods -n open-cluster-management-agent-addon --context ${CTX_MANAGED_CLUSTER}
   NAME                                               READY   STATUS    RESTARTS   AGE
   config-policy-controller-7f8fb64d8c-pmfx4          1/1     Running   0          44s
   ```

3. To enable operator policy controller on managed cluster `cluster1`, annotate the ManagedClusterAddon in the hub cluster:

   ```Shell
   $ kubectl annotate -n cluster1 managedclusteraddon config-policy-controller operator-policy-disabled=false --context ${CTX_HUB_CLUSTER}
   managedclusteraddon.addon.open-cluster-management.io/config-policy-controller annotated
   ```

4. On the managed cluster, confirm the operator policy controller was enabled by examining the `config-policy-controller` pod container arguments:

   ```Shell
   $ kubectl get pods -n open-cluster-management-agent-addon --context ${CTX_MANAGED_CLUSTER}
   NAME                                               READY   STATUS    RESTARTS   AGE
   config-policy-controller-5888b6cbc5-lvwdj          1/1     Running   0          30s

   $ kubectl describe pod config-policy-controller-5888b6cbc5-lvwdj  -n open-cluster-management-agent-addon --context ${CTX_MANAGED_CLUSTER} | grep enable-operator-policy
   - --enable-operator-policy=true
   ```

## Sample operator policy

After a successful deployment, test the policy framework and operator policy controller with a sample policy.

For more information on how to use an `OperatorPolicy`, read the [Policy API concept section]({{< ref "docs/getting-started/integration/policy-controllers/policy-framework#policy" >}}).

### Example: Deploy an external secrets operator

The following example deploys an external secrets operator to a managed cluster using an `OperatorPolicy`. The ESO operator was chosen arbitrarily for the example.

1. Create a Policy in Inform mode to scan for an external secrets operator in managed cluster `cluster1` in the `default` namespace. The `Policy` remediation action of `inform` will override the remediation action of the `OperatorPolicy`:

   ```Yaml
   apiVersion: policy.open-cluster-management.io/v1
   kind: Policy
   metadata:
     name: policy-eso
   spec:
     remediationAction: inform
     disabled: false
     policy-templates:
       - objectDefinition:
           apiVersion: policy.open-cluster-management.io/v1beta1
           kind: OperatorPolicy
           metadata:
             name: policy-eso
           spec:
             remediationAction: inform
             severity: medium
             complianceType: musthave
             upgradeApproval: None
             operatorGroup:
               namespace: default
               name: external-secrets-operator-group
               targetNamespaces:
                 - default
             subscription:
               namespace: default
               name: external-secrets-operator
               channel: alpha
               source: operatorhubio-catalog
               sourceNamespace: olm
               startingCSV: external-secrets-operator.v0.11.0
             versions:
               - external-secrets-operator.v0.11.0
   ---
   apiVersion: policy.open-cluster-management.io/v1
   kind: PlacementBinding
   metadata:
     name: binding-policy-eso
   placementRef:
     name: placement-policy-eso
     kind: Placement
     apiGroup: cluster.open-cluster-management.io
   subjects:
     - name: policy-eso
       kind: Policy
       apiGroup: policy.open-cluster-management.io
   ---
   apiVersion: cluster.open-cluster-management.io/v1beta1
   kind: Placement
   metadata:
     name: placement-policy-eso
   spec:
     predicates:
       - requiredClusterSelector:
           celSelector:
             celExpressions:
               - managedCluster.metadata.name == "cluster1"
   ```

2. Apply the policy to the hub cluster:

   ```Shell
   $ kubectl apply -n default -f policy-eso.yaml --context ${CTX_HUB_CLUSTER}
   policy.policy.open-cluster-management.io/policy-eso created
   placementbinding.policy.open-cluster-management.io/binding-policy-eso created
   placement.cluster.open-cluster-management.io/placement-policy-eso created
   ```

3. Ensure the `default` namespace has a `ManagedClusterSetBinding` for a `ManagedClusterSet` with at least one managed cluster resource. See [Bind ManagedClusterSet to a namespace]({{< ref "docs/concepts/cluster-inventory/managedclusterset#bind-managedclusterset-to-a-namespace" >}}) for more information.

4. Verify the managed cluster is selected by the `Placement`:

   ```Shell
   $ kubectl get -n default placementdecision placement-policy-eso-decision-1 -o yaml --context ${CTX_HUB_CLUSTER}

   ...
   status:
     decisions:
     - clusterName: cluster1
   ```

   The output shows the managed cluster `cluster1` is selected.

5. Verify the Policy was propagated to the managed cluster:

   ```Shell
   $ kubectl get policy -A --context ${CTX_MANAGED_CLUSTER}
   NAMESPACE   NAME                  REMEDIATION ACTION   COMPLIANCE STATE   AGE
   cluster1    default.policy-eso    inform               NonCompliant       11s
   ```

6. The policy is `NonCompliant`. Inspect the policy status:

   ```Shell
   $ kubectl describe policy default.policy-eso --context ${CTX_MANAGED_CLUSTER} -n cluster1
   ...
   Status:
   Compliant:  NonCompliant
   Details:
      Compliant:  NonCompliant
      History:
         Event Name:      default.policy-eso.18ab8e1a8ff67343
         Last Timestamp:  2026-05-01T21:25:22Z
         Message:         NonCompliant; the policy spec is valid, ... the Subscription required by the policy was not found ...
   ```

   The policy is in `NonCompliant` state because the external secrets operator was not found on the managed cluster in the `default` namespace.

7. To automatically install the operator on the managed cluster, patch the policy remediation action to `enforce`. Note the top-level Policy remediation action `enforce` will override the OperatorPolicy remediation action.

   ```Shell
   $ kubectl patch policy policy-eso -n default --context ${CTX_HUB_CLUSTER} --type=merge -p '{"spec": {"remediationAction": "enforce"}}'
   policy.policy.open-cluster-management.io/policy-eso patched
   ```

8. Verify the external secrets operator subscription was created:

   ```Shell
   $ kubectl get subscription -n default --context ${CTX_MANAGED_CLUSTER}
   NAME                        PACKAGE                        SOURCE                  CHANNEL
   external-secrets-operator   external-secrets-operator      operatorhubio-catalog   alpha
   ```

   The output shows the external secrets operator subscription is active.

9. Verify the external secrets operator deployment is running:

    ```Shell
    $ kubectl get deployment -n default --context ${CTX_MANAGED_CLUSTER}
    NAME                                              READY   UP-TO-DATE   AVAILABLE   AGE
    external-secrets-operator-controller-manager      1/1     1            1           10m
    ```

    The output shows the external secrets operator is deployed and running.

### Cleanup: Remove the example operator

By default, the operator policy controller will delete most of the objects created by the policy when the OperatorPolicy `spec.complianceType` is changed to `mustnothave` AND the policy `remediationAction` is set to `enforce`.

1. Optional: edit the OperatorPolicy `spec.removalBehavior` to customize the objects to keep or delete. The default settings are:

  ```Yaml
  removalBehavior:
    clusterServiceVersions: Delete
    customResourceDefinitions: Keep
    subscriptions: Delete
    operatorGroups: DeleteIfUnused
  ```

2. Edit the `complianceType` to `mustnothave` in the OperatorPolicy spec, then re-apply the policy:

  ```Yaml
   apiVersion: policy.open-cluster-management.io/v1
   kind: Policy
   metadata:
     name: policy-eso
   spec:
     remediationAction: enforce # Ensure remediationAction is set to `enforce`
     disabled: false
     policy-templates:
       - objectDefinition:
           apiVersion: policy.open-cluster-management.io/v1beta1
           kind: OperatorPolicy
           metadata:
             name: policy-eso
           spec:
             complianceType: mustnothave # Edit this line to `mustnothave`
   ```

   ```Shell
   $ kubectl apply -n default -f policy-eso.yaml --context ${CTX_HUB_CLUSTER}
   policy.policy.open-cluster-management.io/policy-eso configured
   placementbinding.policy.open-cluster-management.io/binding-policy-eso unchanged
   placement.cluster.open-cluster-management.io/placement-policy-eso unchanged
   ```

3. Verify the external secrets operator and all other objects created by the Policy were deleted in the managed cluster:

  ```Shell
  $ kubectl get deployment -n default --context ${CTX_MANAGED_CLUSTER}
  No resources found in default namespace.

  $ kubectl get subscription -n default --context ${CTX_MANAGED_CLUSTER}
  No resources found in default namespace.

  # repeat for other objects
  ```

4. Delete the Policy on the hub cluster.

  ```Shell
  $ kubectl delete -n default policy policy-eso --context ${CTX_HUB_CLUSTER}
  policy.policy.open-cluster-management.io "policy-eso" deleted
  ```

## Additional resources

- [Policy API Concepts]({{< ref "docs/getting-started/integration/policy-controllers/policy" >}})
- [Policy Collection - Community examples](https://github.com/open-cluster-management-io/policy-collection)
- [Operator Lifecycle Manager (OLM) documentation](https://olm.operatorframework.io/docs/)
- [OperatorHub.io registry](https://operatorhub.io/)
