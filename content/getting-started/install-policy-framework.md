---
title: Install Policy Framework
weight: 4
---

After the hub and klusterlet are installed, you can install the policy framework components to the hub and the managed clusters.

<!-- spellchecker-disable -->

{{< toc >}}

<!-- spellchecker-enable -->

## Prerequisite

You must meet the following prerequisites to install the policy framework:

* Ensure [`kubectl`](https://kubernetes.io/docs/tasks/tools/install-kubectl) and [`kustomize`](https://kubernetes-sigs.github.io/kustomize/installation) are installed.

* Ensure [Golang](https://golang.org/doc/install) is installed, if you are planning to install from the source.

* Prepare one Kubernetes cluster to function as the hub cluster. For example, use [kind](https://kind.sigs.k8s.io/docs/user/quick-start) to create a hub cluster. To use kind, you must install and run [Docker](https://docs.docker.com/get-started).

* Ensure the `open-cluster-management` _hub_ is installed. See [Install Hub](install-hub.md) for more information.

* Ensure the `open-cluster-management` _klusterlet_ is installed. See [Install Klusterlet](register-cluster.md) for more information.

* Ensure the `open-cluster-management` _Application_ is installed. See [Install Application management](install-application.md) for more information.

## Install from prebuilt images on Quay.io

Complete the following steps to install the policy framework from prebuild images on Quay.io:

1. Clone the `governance-policy-framework` repository:

   ```Shell
   git clone https://github.com/open-cluster-management/governance-policy-framework.git
   ```

2. Deploy the policy framework components to the hub cluster with the following commands: 

   ```Shell
   kubectl config use-context kind-hub
   cd governance-policy-framework
   make deploy-policy-framework-hub
   ```

  * The previous command deploys the [policy-propagator](https://github.com/open-cluster-management/governance-policy-propagator).

3. Ensure the pods are running on hub with the following command:

   ```Shell
   kubectl get pods -n open-cluster-management 
   NAME                                           READY   STATUS    RESTARTS   AGE
   governance-policy-propagator-8c77f7f5f-kthvh   1/1     Running   0          94s
   ```

4. Deploy the policy framework components to the managed cluster. Run the following commands: 

   ```Shell
   export MANAGED_CLUSTER_NAME=<managed cluster name> # export MANAGED_CLUSTER_NAME=cluster1
   kubectl config use-context kind-$MANAGED_CLUSTER_NAME
   make deploy-policy-framework-managed
   ```

   * The previous command deploy following components:
     -  [policy-spec-sync](https://github.com/open-cluster-management/governance-policy-spec-sync)
     -  [policy-status-sync](https://github.com/open-cluster-management/governance-policy-status-sync)
     -  [policy-template-sync](https://github.com/open-cluster-management/governance-policy-template-sync)
   
5. Verify that the pods are running with the following command:
   
   ```Shell
   kubectl get pods -n open-cluster-management-agent-addon 
   NAME                                               READY   STATUS    RESTARTS   AGE
   governance-policy-spec-sync-6474b6d898-tmkw6       1/1     Running   0          2m14s
   governance-policy-status-sync-84cbb795df-pgbgt     1/1     Running   0          2m14s
   governance-policy-template-sync-759b9b556f-mx46t   1/1     Running   0          2m14s
   ```
