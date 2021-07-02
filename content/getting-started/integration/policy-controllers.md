---
title: Policy controllers
weight: 2
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
   export MANAGED_CLUSTER_NAME=<managed cluster name> # export MANAGED_CLUSTER_NAME=cluster1
   kubectl config use-context <managed cluster context> # kubectl config use-context kind-$MANAGED_CLUSTER_NAME
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

1. After a successful deployment, test the policy framework and configuration policy controller with a sample policy. Run the following command:

   ```Shell
   $ kubectl config use-context <hub cluster context> # kubectl config use-context kind-hub
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
     - clusterName: <managed cluster name>
       clusterNamespace: <managed cluster name>
   ...
   ```

4. Enforce the policy to make the configuration policy automatically correct any misconfigurations on the managed cluster:

   ```Shell
   $ kubectl patch -n default policy.policy.open-cluster-management.io/policy-pod --type=merge -p "{\"spec\":{\"remediationAction\": \"enforce\"}}"
   policy.policy.open-cluster-management.io/policy-pod patched
   ```

5. After a few seconds, your policy is propagated to the managed cluster. To confirm, run the following command:

   ```Shell
   $ export MANAGED_CLUSTER_NAME=<managed cluster name> # export MANAGED_CLUSTER_NAME=cluster1
   $ kubectl config use-context <managed cluster context> # kubectl config use-context kind-$MANAGED_CLUSTER_NAME
   $ kubectl get policy -A
   NAMESPACE   NAME                 AGE
   cluster1    default.policy-pod   1m39s
   ```

6. The missing pod is created by the policy on the managed cluster. To confirm, run the following command:

   ```Shell
   $ kubectl get pod -n default
   NAME               READY   STATUS    RESTARTS   AGE
   sample-nginx-pod   1/1     Running   0          23s
   ```

## More policies

You can find more policies or contribute to the open policy repository, [policy-collection](https://github.com/open-cluster-management/policy-collection).
