---
title: Policy controllers
weight: 11
---

After policy framework is installed, you can install the policy controllers to the managed clusters.

<!-- spellchecker-disable -->

{{< toc >}}

<!-- spellchecker-enable -->

## Prerequisite

You must meet the following prerequisites to install the policy controllers:

- Ensure [`kubectl`](https://kubernetes.io/docs/tasks/tools/install-kubectl) and
  [`kustomize`](https://kubectl.docs.kubernetes.io/installation/kustomize/) are installed.

- Ensure [Golang](https://golang.org/doc/install) is installed, if you are planning to install from
  the source.

- Ensure the `open-cluster-management` _policy framework_ is installed. See
  [Policy Framework](/getting-started/integration/policy-framework) for more information.

## Install the configuration policy controller to the managed cluster(s)

### Deploy via Clusteradm CLI

Ensure `clusteradm` CLI is installed and is newer than v0.3.0. Download and extract the
[clusteradm binary](https://github.com/open-cluster-management-io/clusteradm/releases/latest). For
more details see the
[clusteradm GitHub page](https://github.com/open-cluster-management-io/clusteradm/blob/main/README.md#quick-start).

1. Deploy the configuration policy controller to the managed cluster(s) (this command is the same
   for a self-managed hub):

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

### Deploy from source

1. Deploy the `config-policy-controller` to the managed cluster with the following commands:

   ```Shell
   # The context name of the clusters in your kubeconfig
   # If the clusters are created by KinD, then the context name will the follow the pattern "kind-<cluster name>".
   export CTX_HUB_CLUSTER=<your hub cluster context>           # export CTX_HUB_CLUSTER=kind-hub
   export CTX_MANAGED_CLUSTER=<your managed cluster context>   # export CTX_MANAGED_CLUSTER=kind-cluster1

   # Configure kubectl to point to the managed cluster
   kubectl config use-context ${CTX_MANAGED_CLUSTER}

   # Create the namespace for the controller
   export MANAGED_NAMESPACE="open-cluster-management-agent-addon"
   kubectl create ns ${MANAGED_NAMESPACE}

   # Apply the CRD
   export COMPONENT="config-policy-controller"
   export GIT_PATH="https://raw.githubusercontent.com/open-cluster-management-io/${COMPONENT}/v0.9.0/deploy"
   kubectl apply -f ${GIT_PATH}/crds/policy.open-cluster-management.io_configurationpolicies.yaml

   # Set the managed cluster name
   export MANAGED_CLUSTER_NAME=<your managed cluster name>  # export MANAGED_CLUSTER_NAME=cluster1

   # Deploy the controller
   kubectl apply -f ${GIT_PATH}/operator.yaml -n ${MANAGED_NAMESPACE}
   kubectl set env deployment/${COMPONENT} -n ${MANAGED_NAMESPACE} --containers=${COMPONENT} WATCH_NAMESPACE=${MANAGED_CLUSTER_NAME}
   ```

   - See
     [config-policy-controller](https://github.com/open-cluster-management-io/config-policy-controller)
     for more information.

2. Ensure the pod is running on the managed cluster with the following command:

   ```Shell
   $ kubectl get pods -n ${MANAGED_NAMESPACE}
   NAME                                               READY   STATUS    RESTARTS   AGE
   config-policy-controller-7f8fb64d8c-pmfx4          1/1     Running   0          44s
   ```

## What is next

After a successful deployment, test the policy framework and configuration policy controller with a
sample policy. You can use a policy that includes a `Placement` mapping or if you installed
Application management's `PlacementRule` support you can use either placement implementation.
Perform the steps in the **Placement API** or the **Placement Rule API** section based on which
placement API you desire to use.

For more information on how to use a `ConfigurationPolicy`, read the
[`Policy` API concept section](/getting-started/integration/policy-framework#policy).

### Placement API

1. Run the following command to create a policy on the hub that uses `Placement`:

   ```Shell
   # Configure kubectl to point to the hub cluster
   kubectl config use-context ${CTX_HUB_CLUSTER}

   # Apply the example policy and placement
   kubectl apply -n default -f https://raw.githubusercontent.com/stolostron/policy-collection/main/community/CM-Configuration-Management/policy-pod-placement.yaml
   ```

2. Update the `Placement` to distribute the policy to the managed cluster with the following command
   (this `clusterSelector` will deploy the policy to all managed clusters):

   ```Shell
   kubectl patch -n default placement.cluster.open-cluster-management.io/placement-policy-pod --type=merge -p "{\"spec\":{\"predicates\":[{\"requiredClusterSelector\":{\"labelSelector\":{\"matchExpressions\":[]}}}]}}"
   ```

3. Make sure the `default` namespace has a `ManagedClusterSetBinding` for a `ManagedClusterSet` with
   at least one managed cluster resource in the `ManagedClusterSet`. See
   [Bind ManagedClusterSet to a namespace](/concepts/managedclusterset#bind-managedclusterset-to-a-namespace)
   for more information on this.

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

### Placement Rule API

**NOTE:** Skip this section if you applied the Placement API policy manifests.

1. Run the following command to create a policy on the hub that uses `PlacementRule`:

   ```Shell
   # Configure kubectl to point to the hub cluster
   kubectl config use-context ${CTX_HUB_CLUSTER}

   # Apply the example policy and placement rule
   kubectl apply -n default -f https://raw.githubusercontent.com/open-cluster-management/policy-collection/main/stable/CM-Configuration-Management/policy-pod.yaml
   ```

2. Update the `PlacementRule` to distribute the policy to the managed cluster with the following
   command (this `clusterSelector` will deploy the policy to all managed clusters):

   ```Shell
   $ kubectl patch -n default placementrule.apps.open-cluster-management.io/placement-policy-pod --type=merge -p "{\"spec\":{\"clusterSelector\":{\"matchExpressions\":[]}}}"
   placementrule.apps.open-cluster-management.io/placement-policy-pod patched
   ```

3. To confirm that the managed cluster is selected by the `PlacementRule`, run the following
   command:

   ```Shell
   $ kubectl get -n default placementrule.apps.open-cluster-management.io/placement-policy-pod -o yaml
   ...
   status:
     decisions:
     - clusterName: ${MANAGED_CLUSTER_NAME}
       clusterNamespace: ${MANAGED_CLUSTER_NAME}
   ...
   ```

### Final steps to apply the policy

Perform the following steps to continue working with the policy to test the policy framework now
that a placement method has been selected between `Placement` or `PlacementRule`.

1. Enforce the policy to make the configuration policy automatically correct any misconfigurations
   on the managed cluster:

   ```Shell
   $ kubectl patch -n default policy.policy.open-cluster-management.io/policy-pod --type=merge -p "{\"spec\":{\"remediationAction\": \"enforce\"}}"
   policy.policy.open-cluster-management.io/policy-pod patched
   ```

2. After a few seconds, your policy is propagated to the managed cluster. To confirm, run the
   following command:

   ```Shell
   $ kubectl config use-context ${CTX_MANAGED_CLUSTER}
   $ kubectl get policy -A
   NAMESPACE   NAME                 REMEDIATION ACTION   COMPLIANCE STATE   AGE
   cluster1    default.policy-pod   enforce              Compliant          4m32s
   ```

3. The missing pod is created by the policy on the managed cluster. To confirm, run the following
   command on the managed cluster:

   ```Shell
   $ kubectl get pod -n default
   NAME               READY   STATUS    RESTARTS   AGE
   sample-nginx-pod   1/1     Running   0          23s
   ```
