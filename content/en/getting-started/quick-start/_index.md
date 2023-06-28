---
title: Quick Start
weight: 1
---

<!-- spellchecker-disable -->

{{< toc >}}

## Prerequisites

- Ensure [kubectl](https://kubernetes.io/docs/tasks/tools/install-kubectl) and [kustomize](https://kubectl.docs.kubernetes.io/installation/kustomize/) are installed.
- Ensure [kind](https://kind.sigs.k8s.io/)(greater than `v0.9.0+`, or the latest version is preferred) is installed.

## Setup hub and managed cluster

Run the following command to quickly setup a hub cluster and 2 managed clusters by kind.

```shell
curl -L https://raw.githubusercontent.com/open-cluster-management-io/OCM/main/solutions/setup-dev-environment/local-up.sh | bash
```

If you want to setup OCM in a production environment or on a different kubernetes distribution, please refer to the [Start the control plane]({{< ref "/getting-started/installation/start-the-control-plane" >}}) and [Register a cluster]({{< ref "/getting-started/installation/register-a-cluster" >}}) guides.

## What is next

Now you have the OCM control plane with 2 managed clusters connected! Let's start your OCM journey.

- [Deploy kubernetes resources onto a managed cluster]({{< ref "/scenarios/deploy-kubernetes-resources" >}})
- [Visit kubernetes apiserver of managedcluster from cluster-proxy]({{< ref "/scenarios/pushing-kube-api-requests" >}})
- Visit [integration]({{< ref "/getting-started/integration" >}}) to check if any certain OCM addon will meet your use cases.
  - [Deploy Policies onto a managed cluster]({{< ref "/getting-started/integration/policy-framework" >}})
- [Use the OCM VScode Extension to easily generate OCM related Kubernetes resources and track your cluster]({{< ref "/developer-guides/vscode-extension" >}})
