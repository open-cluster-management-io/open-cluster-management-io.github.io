---
title: "Open Cluster Management is now a CNCF Incubating Project"
date: 2026-11-04
author: Sushilkumar Deshmukh
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

This milestone belongs to everyone who contributed code, filed an issue, reviewed a pull request, wrote documentation, answered a question on Slack, or showed up to a community meeting. A special thank you to everyone who made this milestone possible:

[Mike Ng](https://github.com/mikeshng),
[August Simonelli](https://github.com/augustrh),
[Jian Qiu](https://github.com/qiujian16),
[David Eads](https://github.com/deads2k),
[Dale Haiducek](https://github.com/dhaiducek),
[Wei Liu](https://github.com/skeeey),
[Zhiwei Yin](https://github.com/zhiweiyin318),
[Yang Le](https://github.com/elgnay),
[Jian Zhu](https://github.com/zhujian7),
[Zhao Xue](https://github.com/xuezhaojun),
[Tesshu Flower](https://github.com/tesshuflower),
[Joshua Packer](https://github.com/jnpacker),
[Meng Yan](https://github.com/yanmxa),
[Morven Cao](https://github.com/morvencao),
[Chunlin Yang](https://github.com/clyang82),
[Feng Xiang](https://github.com/fxiang1),
[Philip Wu](https://github.com/philipwu08),
[Yi Rae Kim](https://github.com/yiraeChristineKim),
[Janelle Law](https://github.com/jan-law),
[Roke Jung](https://github.com/rokej),
[Xiangjing Li](https://github.com/xiangjingli),
[Ben Perry](https://github.com/bhperry),
[Qing Hao](https://github.com/haoqing0110),
[Kahiro Okina](https://github.com/kahirokunn),
[Tyler Gillson](https://github.com/TylerGillson),
[Tamal Saha](https://github.com/tamalsaha),
[Amrutha Harikumar](https://github.com/amrcoder),
[Gaurav Jaswal](https://github.com/jaswalkiranavtar),
[Jeffrey Wong](https://github.com/jeffw17),
[Suvaansh Kumar](https://github.com/suvaanshkumar),
[Ramesh Krishna](https://github.com/ramekris3163),
[Dominique Vernier](https://github.com/itdove),
[Paul Morie](https://github.com/pmorie),
[DangPeng Liu](https://github.com/ldpliu),
[Payal Jain](https://github.com/payjain),
and everyone else in the community — this milestone is yours too.

## What comes next

The CNCF Incubating status unlocks greater visibility for the project and is a significant recognition of its maturity and growing adoption. The OCM community is excited to continue growing and to complete requirements to move toward the Graduated CNCF project status.

To find out more, deploy Open Cluster Management, and get involved, join our community:

- **Slack**: [#open-cluster-mgmt](https://kubernetes.slack.com/channels/open-cluster-mgmt)
  on the Kubernetes workspace
  ([invite link](https://slack.k8s.io))
- **Community meetings**: details in the
  [community repository](https://github.com/open-cluster-management-io/community)
- **Getting started**: [open-cluster-management.io/docs](https://open-cluster-management.io/docs/)
