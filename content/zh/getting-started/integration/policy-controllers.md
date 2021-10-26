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

* Ensure [`kubectl`](https://kubernetes.io/docs/tasks/tools/install-kubectl) and [`kustomize`](https://kubernetes-sigs.github.io/kustomize/installation) are installed.

* Ensure [Golang](https://golang.org/doc/install) is installed, if you are planning to install from the source.

* Ensure the `open-cluster-management` _policy framework_ is installed. See [Policy Framework](../policy-framework) for more information.

## Install the configuration policy controller

Complete the following procedure to install the configuration policy controller:

1. Deploy the `config-policy-controller` to the managed cluster with the following commands: 

   ```Shell
   # Configure kubectl to point to the managed cluster
   kubectl config use-context ${CTX_MANAGED_CLUSTER}
   
   # Create the namespace
   export MANAGED_NAMESPACE="open-cluster-management-agent-addon"
   kubectl create ns ${MANAGED_NAMESPACE}
   
   # Apply the CRD
   export COMPONENT="config-policy-controller"
   export GIT_PATH="https://raw.githubusercontent.com/open-cluster-management-io/${COMPONENT}/main/deploy"
   kubectl apply -f ${GIT_PATH}/crds/v1/policy.open-cluster-management.io_configurationpolicies.yaml
   
   # Deploy the controller
   kubectl apply -f ${GIT_PATH}/operator.yaml -n ${MANAGED_NAMESPACE}
   kubectl apply -f ${GIT_PATH}/clusterrole.yaml -n ${MANAGED_NAMESPACE}
   kubectl apply -f ${GIT_PATH}/clusterrole_binding.yaml -n ${MANAGED_NAMESPACE}
   kubectl apply -f ${GIT_PATH}/service_account.yaml -n ${MANAGED_NAMESPACE}
   kubectl set env deployment/${COMPONENT} -n ${MANAGED_NAMESPACE} --containers=${COMPONENT} WATCH_NAMESPACE=${MANAGED_CLUSTER_NAME}
   ```
   * See [config-policy-controller](https://github.com/open-cluster-management-io/config-policy-controller) for more information.

2. Ensure the pod is running on the managed cluster with the following command:

   ```Shell
   $ kubectl get pods -n open-cluster-management-agent-addon
   NAME                                               READY   STATUS    RESTARTS   AGE
   ...
   config-policy-controller-7f8fb64d8c-pmfx4          1/1     Running   0          44s
   ...
   ```

## What is next

After a successful deployment, test the policy framework and configuration policy controller with a sample policy.  You can use a policy that includes a `Placement` mapping or if you installed Application management's `PlacementRule` support you can use either placement implementation.  Perform the steps in the **Placement Rule API** or the **Placement API** section based on which placement API you desire to use.

### Placement Rule API

1. Run the following command to create a policy on the hub that uses `PlacementRule`:

   ```Shell
   $ kubectl config use-context ${CTX_HUB_CLUSTER}
   $ kubectl apply -n default -f https://raw.githubusercontent.com/open-cluster-management/policy-collection/main/stable/CM-Configuration-Management/policy-pod.yaml
   policy.policy.open-cluster-management.io/policy-pod created
   placementbinding.policy.open-cluster-management.io/binding-policy-pod created
   placementrule.apps.open-cluster-management.io/placement-policy-pod created
   ```

2. Update the `PlacementRule` to distribute the policy to the managed cluster with the following command (this `clusterSelector` will deploy the policy to all managed clusters):

   ```Shell
   $ kubectl patch -n default placementrule.apps.open-cluster-management.io/placement-policy-pod --type=merge -p "{\"spec\":{\"clusterSelector\":{\"matchExpressions\":[]}}}"
   placementrule.apps.open-cluster-management.io/placement-policy-pod patched
   ```

3. To confirm that the managed cluster is selected by the `PlacementRule`, run the following command:

   ```Shell
   $ kubectl get -n default placementrule.apps.open-cluster-management.io/placement-policy-pod -o yaml
   ...
   status:
     decisions:
     - clusterName: ${MANAGED_CLUSTER_NAME}
       clusterNamespace: ${MANAGED_CLUSTER_NAME}
   ...
   ```

### Placement API

1. Run the following command to create a policy on the hub that uses `Placement` if you did not select the `PlacementRule` option in the previous section:

   ```Shell
   $ kubectl config use-context <hub cluster context> # kubectl config use-context kind-hub
   $ kubectl apply -n default -f https://raw.githubusercontent.com/gparvin/my-policies/main/policies/placement/policy-pod.yaml
   policy.policy.open-cluster-management.io/policy-pod created
   placementbinding.policy.open-cluster-management.io/binding-policy-pod created
   placement.cluster.open-cluster-management.io/placement-policy-pod created
   ```

2. Update the `Placement` to distribute the policy to the managed cluster with the following command (this `clusterSelector` will deploy the policy to all managed clusters):

   ```Shell
   $ kubectl patch -n default placement.cluster.open-cluster-management.io/placement-policy-pod --type=merge -p "{\"spec\":{\"predicates\":[{\"requiredClusterSelector\":{\"labelSelector\":{\"matchExpressions\":[]}}}]}}"
   placement.cluster.open-cluster-management.io/placement-policy-pod patched
   ```

3. Make sure the `default` namespace has a `managedclustersetbinding` for a `managedclusterset` with at least one managed cluster resource in the `managedclusterset`.  See [Bind ManagedClusterSet to a namespace](https://open-cluster-management.io/concepts/placement/#bind-managedclusterset-to-a-namespace) for more information on this.

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

### Final steps to apply the policy

Perform the following steps to continue working with the policy to test the policy framework now that a specific placement API has been selected.

1. Enforce the policy to make the configuration policy automatically correct any misconfigurations on the managed cluster:

   ```Shell
   $ kubectl patch -n default policy.policy.open-cluster-management.io/policy-pod --type=merge -p "{\"spec\":{\"remediationAction\": \"enforce\"}}"
   policy.policy.open-cluster-management.io/policy-pod patched
   ```

2. After a few seconds, your policy is propagated to the managed cluster. To confirm, run the following command:

   ```Shell
   $ kubectl config use-context ${CTX_MANAGED_CLUSTER}
   $ kubectl get policy -A
   NAMESPACE   NAME                 REMEDIATION ACTION   COMPLIANCE STATE   AGE
   cluster1    default.policy-pod   enforce              Compliant          4m32s
   ```

3. The missing pod is created by the policy on the managed cluster. To confirm, run the following command:

   ```Shell
   $ kubectl get pod -n default
   NAME               READY   STATUS    RESTARTS   AGE
   sample-nginx-pod   1/1     Running   0          23s
   ```

## More policies

You can find more policies or contribute to the open policy repository, [policy-collection](https://github.com/open-cluster-management/policy-collection).  Note that these policies all use the Application management `PlacementRule` API.
