---
title: "Guided Open Cluster Management Install with KubeStellar Console"
date: 2026-03-18
authors:
  - Andy Anderson
toc_hide: true
---

Installing Open Cluster Management (OCM) involves multiple steps — adding Helm repos, installing the control plane, registering managed clusters, and verifying everything works. [KubeStellar Console](https://console.kubestellar.io) now includes a guided install mission that walks you through the entire process step-by-step, with built-in validation and troubleshooting.

## What is KubeStellar Console?

KubeStellar Console is a standalone, open-source Kubernetes dashboard with 30+ dashboards and 150+ monitoring cards. It connects to your clusters via kubeconfig and includes an AI-powered mission system that provides guided workflows for installing and managing CNCF projects.

> **Note:** KubeStellar Console is unrelated to the KubeStellar multi-cluster orchestration project — they share a name but have zero shared code.

## The OCM Install Mission

The [OCM install mission](https://console.kubestellar.io/missions/install-open-cluster-management) runs against your live cluster. Each step includes:

- **Pre-flight checks** — verifies prerequisites (Kubernetes >=1.24, Helm, kubectl)
- **Exact commands** — shows the `helm install` and `kubectl apply` commands with flags explained. Copy-paste or run directly from the console
- **Validation** — after each step, queries your cluster to verify success (pod phase, CRD registration, service endpoints)
- **Troubleshooting** — on failure, reads pod logs, events, and resource status and suggests fixes
- **Rollback** — each step includes the corresponding `helm uninstall` / `kubectl delete` to undo

It also works as read-only documentation — no cluster connection required to browse the steps.

## Try It

### Option 1: Browse Online

Open the mission directly at:

**[console.kubestellar.io/missions/install-open-cluster-management](https://console.kubestellar.io/missions/install-open-cluster-management)**

### Option 2: Run Locally

Install KubeStellar Console locally (connects to your current kubeconfig context):

```bash
curl -sSL https://raw.githubusercontent.com/kubestellar/console/main/start.sh | bash
```

Then navigate to the OCM install mission from the Missions page.

## Contributing

The mission definition is open source at [console-kb](https://github.com/kubestellar/console-kb/blob/master/solutions/cncf-install/install-open-cluster-management.json). PRs to improve the OCM install steps are welcome.

KubeStellar Console currently has 180+ install missions covering CNCF projects across the landscape. If you'd like to see missions for other OCM-related projects or have suggestions for improving the OCM mission, open an issue on [kubestellar/console-kb](https://github.com/kubestellar/console-kb/issues).
