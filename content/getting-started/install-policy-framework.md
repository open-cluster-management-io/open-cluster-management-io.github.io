---
title: Install Policy Framework
weight: 4
---

After cluster manager and klusterlet are installed, you could install the policy framework components to the hub and the managed clusters.

<!-- spellchecker-disable -->

{{< toc >}}

<!-- spellchecker-enable -->

## Prerequisite

Ensure [kubectl](https://kubernetes.io/docs/tasks/tools/install-kubectl) and [kustomize](https://kubernetes-sigs.github.io/kustomize/installation) are installed.

Ensure [golang](https://golang.org/doc/install) is installed, if you are planning to install from the source.

Prepare one Kubernetes cluster to function as the hub. For example, use [kind](https://kind.sigs.k8s.io/docs/user/quick-start) to create a hub cluster. To use kind, you will need [docker](https://docs.docker.com/get-started) installed and running.

Ensure the open-cluster-management cluster manager is installed. See [Install Cluster Manager](../install-cluster-manager) for more information.

Ensure the open-cluster-management klusterlet is installed. See [Install Klusterlet](../register-cluster) for more information.

Ensure the open-cluster-management application management is installed. See [Install Application management](../install-application) for more information.

## Install from prebuilt images on Quay.io
Clone the `governance-policy-framework`

```Shell
git clone https://github.com/open-cluster-management/governance-policy-framework.git
```

Deploy the policy framework components to the hub cluster. 

```Shell
kubectl config use-context kind-hub
cd governance-policy-framework
make deploy-policy-framework-hub
```

Above command will deploy following components:
-  [policy-propagator](https://github.com/open-cluster-management/governance-policy-propagator)

Ensure the pods are running on hub.

```Shell
kubectl get pods -n open-cluster-management 
NAME                                           READY   STATUS    RESTARTS   AGE
governance-policy-propagator-8c77f7f5f-kthvh   1/1     Running   0          94s
```

Deploy the policy framework components to the managed cluster. 

```Shell
export MANAGED_CLUSTER_NAME=<managed cluster name> # export MANAGED_CLUSTER_NAME=cluster1
kubectl config use-context kind-$MANAGED_CLUSTER_NAME
make deploy-policy-framework-managed
```

Above command will deploy following components:
-  [policy-spec-sync](https://github.com/open-cluster-management/governance-policy-spec-sync)
-  [policy-status-sync](https://github.com/open-cluster-management/governance-policy-status-sync)
-  [policy-template-sync](https://github.com/open-cluster-management/governance-policy-template-sync)

```Shell
kubectl get pods -n open-cluster-management-agent-addon 
NAME                                               READY   STATUS    RESTARTS   AGE
governance-policy-spec-sync-6474b6d898-tmkw6       1/1     Running   0          2m14s
governance-policy-status-sync-84cbb795df-pgbgt     1/1     Running   0          2m14s
governance-policy-template-sync-759b9b556f-mx46t   1/1     Running   0          2m14s
```
