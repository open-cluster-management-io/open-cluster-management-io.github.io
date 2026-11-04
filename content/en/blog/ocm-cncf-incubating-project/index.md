---
title: "Open Cluster Management is now a CNCF Incubating Project"
date: 2026-11-04
author: Open Cluster Management Community
toc_hide: true
---

We are excited to share that Open Cluster Management (OCM) has been accepted as a
[Cloud Native Computing Foundation (CNCF) Incubating project](https://www.cncf.io/projects/).
The CNCF Technical Oversight Committee (TOC) vote passed on November 4, 2026, marking a
significant milestone in the project's journey.

## From Sandbox to Incubating

OCM joined the CNCF Sandbox on November 9, 2021. Since then, the project has grown
considerably — in contributors, in adopters, and in the breadth of problems it helps solve.
The move to Incubating status reflects that growth and the community's commitment to building
a stable, vendor-neutral foundation for multi-cluster Kubernetes management.

The full incubation application and TOC discussion are available at
[cncf/toc#1884](https://github.com/cncf/toc/issues/1884).

## What OCM does

OCM provides a set of building blocks for managing fleets of Kubernetes clusters. At its core
is a hub-and-spoke model: a hub cluster holds the control plane, and managed clusters pull
their configuration from it. This pull-based design means any cluster that can reach the hub
can be registered — even a local KinD cluster on a laptop.

On top of that foundation, OCM ships a placement API for scheduling workloads across clusters,
a policy add-on for distributing and enforcing configuration, and an extensible add-on
framework that projects can build on without forking the core.

## Who is using OCM

The incubation application lists the following organizations running OCM in production or
integration environments:

- **Appscode**
- **eBay**
- **SpectroCloud**
- **Alibaba**
- **Red Hat**

Additional adopters not listed publicly are available on request. The full list and use case
details are in the project's
[ADOPTERS file](https://github.com/open-cluster-management-io/ocm/blob/main/ADOPTERS.md).

## Thank you

This milestone belongs to everyone who filed an issue, reviewed a pull request, wrote
documentation, answered a question on Slack, or showed up to a community meeting. A special thank you to everyone who made this milestone possible:

[Mike Ng](https://github.com/mikeshng),
[August](https://github.com/augustrh),
[Qiu Jian](https://github.com/qiujian16),
[Wei Liu](https://github.com/skeeey),
[Zhiwei Yin](https://github.com/zhiweiyin318),
[Yang Le](https://github.com/elgnay),
[Zhujian](https://github.com/zhujian7),
[Qing Hao](https://github.com/haoqing0110),
[Xue Zhao](https://github.com/xuezhaojun),
[Dominique Vernier](https://github.com/itdove),
[Paul Morie](https://github.com/pmorie),
[DangPeng Liu](https://github.com/ldpliu),
[Payal Jain](https://github.com/payjain),
and everyone else in the community who filed issues, reviewed pull requests, wrote
documentation, and showed up — this milestone is yours too.

## What comes next

Incubating status unlocks additional CNCF resources and brings greater visibility to the
project. The maintainers will be following up with CNCF staff on next steps.

In the meantime, the best way to get involved is to join the community:

- **Slack**: [#open-cluster-mgmt](https://kubernetes.slack.com/channels/open-cluster-mgmt)
  on the Kubernetes workspace
  ([invite link](https://communityinviter.com/apps/kubernetes/community))
- **Community meetings**: details in the
  [community repository](https://github.com/open-cluster-management-io/community)
- **Getting started**: [open-cluster-management.io/docs](https://open-cluster-management.io/docs/)
