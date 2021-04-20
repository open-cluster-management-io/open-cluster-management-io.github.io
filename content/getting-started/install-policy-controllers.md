---
title: Install Policy Controllers
weight: 5
---

After policy framework is installed, you can install the policy controllers to the managed clusters.

<!-- spellchecker-disable -->

{{< toc >}}

<!-- spellchecker-enable -->

## Prerequisite

You must meet the following prerequisites to install the policy controllers:

* Ensure [`kubectl`](https://kubernetes.io/docs/tasks/tools/install-kubectl) and [`kustomize`](https://kubernetes-sigs.github.io/kustomize/installation) are installed.

* Ensure [Golang](https://golang.org/doc/install) is installed, if you are planning to install from the source.

* Prepare one Kubernetes cluster to function as the hub cluster. For example, use [kind](https://kind.sigs.k8s.io/docs/user/quick-start) to create a hub cluster. To use kind, you must install and run [Docker](https://docs.docker.com/get-started).

* Ensure the `open-cluster-management` _policy framework_ is installed. See [Install Policy Framework](install-policy-framework.md) for more information.

## Install the configuration policy controller

Complete the following procedure to install the configuration policy controller:

1. Clone the `config-policy-controller`:

   ```Shell
   git clone https://github.com/open-cluster-management/config-policy-controller.git
   ```

2. Deploy the `config-policy-controller` to the managed cluster with the following commands: 

   ```Shell
   export WATCH_NAMESPACE=<managed cluster name> # export WATCH_NAMESPACE=cluster1
   kubectl config use-context kind-$WATCH_NAMESPACE
   cd config-policy-controller
   make kind-deploy-controller
   ```

3. Ensure the pod is running on the managed cluster. Run the following command:

   ```Shell
   kubectl get pods -n open-cluster-management-agent-addon
   NAME                                               READY   STATUS    RESTARTS   AGE
   ...
   config-policy-controller-7f8fb64d8c-pmfx4          1/1     Running   0          44s
   ...
   ```

The configuration policy controller is installed.

## Install the certificate policy controller

Complete the following steps to install the certificate policy controller:

1. Clone the `cert-policy-controller`:

   ```Shell
   git clone https://github.com/open-cluster-management/cert-policy-controller.git
   ```

2. Deploy the `cert-policy-controller` to the managed cluster with the following commands: 

   ```Shell
   export WATCH_NAMESPACE=<managed cluster name> # export WATCH_NAMESPACE=cluster1
   kubectl config use-context kind-$WATCH_NAMESPACE
   cd cert-policy-controller
   make kind-deploy-controller
   ```

3. Ensure the pod is running on the managed cluster. Run the following command:

   ```Shell
   kubectl get pods -n open-cluster-management-agent-addon
   NAME                                    READY   STATUS    RESTARTS   AGE
   ...
   cert-policy-controller-6678fc7c-lw6m9   1/1     Running   0          4m20s
   ...
   ```

The certificate policy is installed.

## Install the IAM policy controller

Complete the following step to install the IAM policy controller:

1. Clone the `iam-policy-controller`:

   ```Shell
   git clone https://github.com/open-cluster-management/iam-policy-controller.git
   ```

2. Deploy the `iam-policy-controller` to the managed cluster with the following commands: 

   ```Shell
   export WATCH_NAMESPACE=<managed cluster name> # export WATCH_NAMESPACE=cluster1
   kubectl config use-context kind-$WATCH_NAMESPACE
   cd iam-policy-controller
   make kind-deploy-controller
   ```

3. Ensure the pod is running on the managed cluster. Run the following command:

   ```Shell
   kubectl get pods -n open-cluster-management-agent-addon
   NAME                                     READY   STATUS    RESTARTS   AGE
   ...
   iam-policy-controller-7c5f746866-v65jb   1/1     Running   0          2m43s
   ...
   ```

The IAM policy controller is installed.

## What is next

1. After a successful deployment, test the policy framework and configuration policy controller with a sample policy. Run the following command:

   ```Shell
   kubectl config use-context kind-hub
   
   kubectl apply -n default -f https://raw.githubusercontent.com/open-cluster-management/policy-collection/main/stable/CM-Configuration- Management/policy-pod.yaml
   policy.policy.open-cluster-management.io/policy-pod created
   placementbinding.policy.open-cluster-management.io/binding-policy-pod created
   placementrule.apps.open-cluster-management.io/placement-policy-pod created
   ```

2. Update the `PlacementRule` to distribute the policy to the managed cluster with the following command:

   ```Shell
   kubectl patch -n default placementrule.apps.open-cluster-management.io/placement-policy-pod --type=merge -p "{\"spec\":{\"clusterSelector\":{\"matchExpressions\":[]}}}"
   placementrule.apps.open-cluster-management.io/placement-policy-pod patched
   ```

3. To confirm that the managed cluster is selected by `PlacementRule`, run the following command:

   ```Shell
   kubectl get -n default placementrule.apps.open-cluster-management.io/placement-policy-pod -oyaml
   ...
   status:
     decisions:
     - clusterName: cluster1
       clusterNamespace: cluster1
   ...
   ```

4. Enforce the policy to make the configuration policy automatically correct any misconfigurations on the managed cluster:

   ```Shell
   kubectl patch -n default policy.policy.open-cluster-management.io/policy-pod --type=merge -p "{\"spec\":{\"remediationAction\": \"enforce\"}}"
   policy.policy.open-cluster-management.io/policy-pod patched
   ```

5. After a few seconds, your policy is propagated to the managed cluster. To confirm, run the following command:

   ```Shell
   export WATCH_NAMESPACE=<managed cluster name> # export WATCH_NAMESPACE=cluster1
   kubectl config use-context kind-$WATCH_NAMESPACE
   kubectl get policy -A
   NAMESPACE   NAME                 AGE
   cluster1    default.policy-pod   1m39s
   ```

6. The missing pod is created by the policy on the managed cluster. To confirm, run the following command:

   ```Shell
   kubectl get pod -n default
   NAME               READY   STATUS    RESTARTS   AGE
   sample-nginx-pod   1/1     Running   0          23s
   ```

## More policies

You can find more policies or contribute to the open repository, [policy-collection](https://github.com/open-cluster-management/policy-collection).
