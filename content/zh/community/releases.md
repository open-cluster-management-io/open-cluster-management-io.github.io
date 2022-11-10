---
title: 发行版本
weight: -20
---

Open Cluster Management has approximately a three to four month release cycle. The current release is `v0.9.0`. Continue reading to view upcoming releases:

## `v0.9.0`, 21st, October 2022

Open Cluster Management team is proud to announce the release of OCM v0.9.0! Here are some main features included in this release:

- De-escalate Work Agent Privilege on Managed Clusters
  In previous iterations of OCM, the Work Agent process is run with admin privileges on managed clusters. This release, to exercise the principle of least privilege, OCM supports defining a non-root identity within each ManifestWork object, allowing end users to give the agent only necessary permissions to interact with the clusters which they manage.
- Support referencing the AddOn configuration with AddOn APIs 
  For some add-ons, they want to run with configuration, we enhance the add-on APIs to support reference add-on configuration, and in add-on framework, we support to trigger re-rendering the add-on deployment if its configuration is changed
- Allow Targeting Specific Services within Managed Clusters
  The cluster-proxy add-on supports the exposure of services from within managed clusters to hub clusters, even across Virtual Private Clouds. Originally all traffic was routed through the Kubernetes API server on each managed cluster, increasing load on the node hosting the API server. Now the proxy agent  add-on supports specifying a particular target service within a cluster, allowing for better load balancing of requests made by hub clusters and more granular control of what resources/APIs are exposed to hub clusters.
- Upgraded ManagedClusterSet API to v1beta2
  Update the ClusterSet API and gradually remove legacy custom resources, as well as allow for transformation of legacy resources into analogous v1beta2 resources. v1alpha1 APIs are removed.
- Consolidate the policy add-on template, status, and spec synchronization controllers into a single repository, [governance-policy-framework-addon](https://github.com/open-cluster-management-io/governance-policy-framework-addon)
- Application add-on is now able to expose custom Prometheus metrics via the Git subscription. See the [metric documentation](https://github.com/open-cluster-management-io/multicloud-operators-subscription/blob/v0.9.0/docs/metrics.md) for more details.

### Core components
- registration v0.9.0 [changelog](https://github.com/open-cluster-management-io/registration/blob/v0.9.0/CHANGELOG/CHANGELOG-v0.9.md)
- work v0.9.0 [changelog](https://github.com/open-cluster-management-io/work/blob/v0.9.0/CHANGELOG/CHANGELOG-v0.9.md)
- placement v0.9.0 [changelog](https://github.com/open-cluster-management-io/placement/blob/v0.9.0/CHANGELOG/CHANGELOG-v0.9.md)
- addon-framework v0.5.0 [changelog](https://github.com/open-cluster-management-io/addon-framework/blob/v0.5.0/CHANGELOG/CHANGELOG-v0.5.md)
- registration-operator v0.9.0 [changelog](https://github.com/open-cluster-management-io/registration-operator/blob/v0.9.0/CHANGELOG/CHANGELOG-v0.9.md)

### Addons
- config-policy-controller v0.9.0 [changelog](https://github.com/open-cluster-management-io/config-policy-controller/blob/main/CHANGELOG/CHANGELOG-v0.9.0.md)
- governance-policy-framework-addon v0.9.0 [changelog](https://github.com/open-cluster-management-io/governance-policy-framework-addon/blob/main/CHANGELOG/CHANGELOG-v0.9.0.md)
- governance-policy-propagator v0.9.0 [changelog](https://github.com/open-cluster-management-io/governance-policy-propagator/blob/main/CHANGELOG/CHANGELOG-v0.9.0.md)
- governance-policy-addon-controller v0.9.0 [changelog](https://github.com/open-cluster-management-io/governance-policy-addon-controller/blob/main/CHANGELOG/CHANGELOG-v0.9.0.md)
- multicloud-operators-subscription v0.9.0 [release note](https://github.com/open-cluster-management-io/multicloud-operators-subscription/releases/tag/v0.9.0)
- multicloud-operators-channel v0.9.0 [release note](https://github.com/open-cluster-management-io/multicloud-operators-channel/releases/tag/v0.9.0)
- multicloud-integrations v0.9.0 [release note](https://github.com/open-cluster-management-io/multicloud-integrations/releases/tag/v0.9.0)

The release annoucement is also publishded in [blog](https://www.cncf.io/blog/2022/10/31/open-cluster-management-november-2022-update/). Thanks for all your contribution!

## `v0.8.0`, 8th, July 2022
Open Cluster Management team is proud to annouce the release of OCM v0.8.0! It includes several enhancement on core components and addons.
Notable changes including:

- `ManifestWork` update strategy: now user can set `ServerSideApply` or `CreateOnly` as the manifest update strategy to resolve potential
  resource conflict in `ManifestWork`.
- Global ClusterSet: when user enable the `DefaultClusterSet` feature gate, a global `ManagedClusterSet` will be auto-created including all
  `ManagedCluster`s
- Configuring feature gates for `klusterlet` and `cluster manager`: user can set feature gates when starting `klusterlet` and `cluster manager`.
- Support host alaises for `klusterlet`: user can now set host aliases for `klusterlet`, it is especially useful in on-prem environment.
- Running policy addon using `clusteradm`: user can now run policy addon directly using `clusteradm`

Also we have added two new sub projects:

- [multicluster-mesh](https://github.com/open-cluster-management-io/multicluster-mesh) is an addon to deploy and configure istio across the clusters.
- [ocm-vscode-extention](https://github.com/open-cluster-management-io/ocm-vscode-extension) is a vscode extension to operator/develop ocm project easily in vscode.

See details in the release changelogs:

### Core components
- registration v0.8.0 [changelog](https://github.com/open-cluster-management-io/registration/blob/v0.8.0/CHANGELOG/CHANGELOG-v0.8.md)
- work v0.8.0 [changelog](https://github.com/open-cluster-management-io/work/blob/v0.8.0/CHANGELOG/CHANGELOG-v0.8.md)
- placement v0.8.0 [changelog](https://github.com/open-cluster-management-io/placement/blob/v0.8.0/CHANGELOG/CHANGELOG-v0.8.md)
- addon-framework v0.4.0 [changelog](https://github.com/open-cluster-management-io/addon-framework/blob/v0.4.0/CHANGELOG/CHANGELOG-v0.4.md)
- registration-operator v0.8.0 [changelog](https://github.com/open-cluster-management-io/registration-operator/blob/v0.8.0/CHANGELOG/CHANGELOG-v0.8.md)

### Addons

- multicloud-operators-subscription v0.8.0 [changelog](https://github.com/open-cluster-management-io/multicloud-operators-subscription/releases/tag/v0.8.0)
- multicloud-operators-channel v0.8.0 [changelog](https://github.com/open-cluster-management-io/multicloud-operators-channel/releases/tag/v0.8.0)
- cluster-proxy v0.2.2 [changelog](https://github.com/open-cluster-management-io/cluster-proxy/releases/tag/v0.2.2)
- multicluster-mesh v0.0.1 [changelog](https://github.com/open-cluster-management-io/multicluster-mesh/releases/tag/v0.0.1)
- config-policy-controller v0.8.0 [changelog](https://github.com/open-cluster-management-io/config-policy-controller/blob/main/CHANGELOG/CHANGELOG-v0.8.0.md)
- governance-policy-spec-sync v0.8.0 [changelog](https://github.com/open-cluster-management-io/governance-policy-spec-sync/blob/main/CHANGELOG/CHANGELOG-v0.8.0.md)
- governance-policy-template-sync v0.8.0 [changelog](https://github.com/open-cluster-management-io/governance-policy-template-sync/blob/main/CHANGELOG/CHANGELOG-v0.8.0.md)
- governance-policy-status-sync v0.8.0 [changelog](https://github.com/open-cluster-management-io/governance-policy-status-sync/blob/main/CHANGELOG/CHANGELOG-v0.8.0.md)
- governance-policy-propagator v0.8.0 [changelog](https://github.com/open-cluster-management-io/governance-policy-propagator/blob/main/CHANGELOG/CHANGELOG-v0.8.0.md)
- governance-policy-addon-controller v0.8.0 [changelog](https://github.com/open-cluster-management-io/governance-policy-addon-controller/blob/main/CHANGELOG/CHANGELOG-v0.8.0.md)

### CLI extentions

- clusteradm v0.3.0 [changelog](https://github.com/open-cluster-management-io/clusteradm/releases/tag/v0.3.0)
- ocm-vscode-extension 0.1.0 [changelog](https://github.com/open-cluster-management-io/ocm-vscode-extension/releases/tag/1.0.0)

There are 30+ contributors making contributions in this release, they are, @ChunxiAlexLuo, @dhaiducek, @elgnay, @haoqing0110, @itdove, @ilan-pinto, @ivan-cai, @jichenjc, @JustinKuli, @ldpliu, @mikeshng, @mgold1234, @morvencao, @mprahl, @nathanweatherly, @philipwu08, @panguicai008, @Promacanthus, @qiujian16, @rokej, @skeeey, @SataQiu, @vbelouso, @xauthulei, @xiangjingli, @xuezhaojun, @ycyaoxdu, @yue9944882, @zhujian7, @zhiweiyin318. Thanks for your contributions!

## `v0.7.0`, on 6th, April 2022

The Open Cluster Management team is excited to announce the release of OCM v0.7.0! We mainly focused on enhancing user experience in this release by introducing a bunch of new commands in `clusteradm`. Notable changes including: 

 - APIs including `placement`, `placementdecision`, `managedclusterset` and `managedclustersetbinding` are upgraded to `v1beta1`, `v1alpha1` version of these APIs are deprecated and will be removed in the future.
 - User can now use `clusteradm` to:
   - create, bind and view `clusterset`
   - create and view `work`
   - check the controlplane status by using `hub-info` and `klusterlet-info` sub commands.
   - upgrade hub and klusterlet
- A default `managedclusterset` is created automatically and all clusters will be added to default `managedclusterset` by default. This feature can be disabled with feature gate `DefaultClusterSet` on registration controller.
- Add the new `policyset` API that provides a way to logically group `policy` objects from a namespace, share placement, and report on overall status for the set in policy addon.

See details in the release changelogs::
- registration v0.7.0 [changelog](https://github.com/open-cluster-management-io/registration/blob/v0.7.0/CHANGELOG/CHANGELOG-v0.7.md)
- work v0.7.0 [changelog](https://github.com/open-cluster-management-io/work/blob/v0.7.0/CHANGELOG/CHANGELOG-v0.7.md)
- placement v0.4.0 [changelog](https://github.com/open-cluster-management-io/placement/blob/v0.4.0/CHANGELOG/CHANGELOG-v0.4.md)
- addon-framework v0.3.0 [changelog](https://github.com/open-cluster-management-io/addon-framework/blob/v0.3.0/CHANGELOG/CHANGELOG-v0.3.md)
- registration-operator v0.7.0 [changelog](https://github.com/open-cluster-management-io/registration-operator/blob/v0.7.0/CHANGELOG/CHANGELOG-v0.7.md)
- cluster-proxy v0.2.0 [repo](https://github.com/open-cluster-management-io/cluster-proxy)
- managed-serviceaccount v0.2.0 [repo](https://github.com/open-cluster-management-io/managed-serviceaccount)
- clusteradm v0.2.0 [changelog](https://github.com/open-cluster-management-io/clusteradm/releases/tag/v0.2.0)
- multicloud-operators-subscription v0.7.0 [changelog](https://github.com/open-cluster-management-io/multicloud-operators-subscription/releases/tag/v0.7.0)
- multicloud-operators-channel v0.7.0 [changelog](https://github.com/open-cluster-management-io/multicloud-operators-channel/releases/tag/v0.7.0)
- governance policy propagator v0.7.0 [changelog](https://github.com/open-cluster-management-io/governance-policy-propagator/blob/main/CHANGELOG/CHANGELOG-v0.7.0.md)
- config policy controller v0.7.0 [changelog](https://github.com/open-cluster-management-io/config-policy-controller/blob/main/CHANGELOG/CHANGELOG-v0.7.0.md)
- policy spec sync controller v0.7.0 [changelog](https://github.com/open-cluster-management-io/governance-policy-spec-sync/blob/main/CHANGELOG/CHANGELOG-v0.7.0.md)
- policy template sync controller v0.7.0 [changelog](https://github.com/open-cluster-management-io/governance-policy-template-sync/blob/main/CHANGELOG/CHANGELOG-v0.7.0.md)
- policy status sync controller v0.7.0 [changelog](https://github.com/open-cluster-management-io/governance-policy-status-sync/blob/main/CHANGELOG/CHANGELOG-v0.7.0.md)


There are 30+ contributors making contributions in this release, they are, @ChunxiAlexLuo, @dhaiducek, @elgnay, @haoqing0110, @hanqiuzh, @ilan-pinto, @ivan-cai, @JiahaoWei-RH, @jichenjc, @JustinKuli, @ldpliu, @mikeshng, @mgold1234, @morvencao, @mprahl, @nathanweatherly, @philipwu08, @qiujian16, @rcarrillocruz, @rokej, @skeeey, @TheRealHaoLiu, @vbelouso, @vMaroon, @TomerFi, @xauthulei, @xiangjingli, @xuezhaojun, @ycyaoxdu, @yue9944882, @zhujian7, @zhiweiyin318. Thanks for your contributions!

## `v0.6.0`, on 21st, January 2022

The Open Cluster Management team is proud to announce the release of OCM v0.6.0! We made many enhancements on core components and introduced some new addons.

- [First release of cluster-proxy addon](https://github.com/open-cluster-management-io/cluster-proxy), Cluster-Proxy addon is to provide a reverse tunnel from the managed cluster to the hub using `apiserver-network-proxy`, so user can easily visit the apiserver of the managedcluster from the hub without complicated infrstructure configuration. See [here](https://open-cluster-management.io/scenarios/pushing-kube-api-requests/) on how to use cluster-proxy in OCM.
- [First release of managed-serviceaccount addon](https://github.com/open-cluster-management-io/managed-serviceaccount), Managed-Servicesaccount addon provides a mechanism to project a service account on a managed cluster to the hub. The user can then use this projected account to visit services on the managed cluster. 
- [Sync status of applied resources in ManifestWork](https://github.com/open-cluster-management-io/enhancements/tree/main/enhancements/sig-architecture/29-manifestwork-status-feedback), The users can specify the status field of the applied resource they want to explore in the ManifestWork spec, and get results from the status of the ManifestWork. See [here](https://open-cluster-management.io/concepts/manifestwork/#fine-grained-field-values-tracking) on how to use this feature in Manifestwork.
- [Placement extensible scheduling](https://github.com/open-cluster-management-io/enhancements/blob/main/enhancements/sig-architecture/32-extensiblescheduling), a new API AddonPlacementScore is added which allows third party controllers to score the clusters based on various metrics. The user can specify what score should be used in the Placement API to select clusters.
- [Helm chart interface for addon framework](https://github.com/open-cluster-management-io/addon-framework/pull/62), a new interface is added in addon framework with which the developer can build an addon agent from a helm chart. See [example](https://github.com/open-cluster-management-io/addon-framework/tree/main/examples/helloworld_helm) on how to build an addon agent from the helm chart.
- [Placement API support for multicloud-operators-subscription](https://github.com/open-cluster-management-io/multicloud-operators-subscription/pull/55), subscription now supports Placement API and can leverage all new features in Placement API to deploy application packages.

We also added many new functions in [clusteradm](https://github.com/open-cluster-management-io/clusteradm) and enhanced the website documentation.

See details in the release changelogs::
- registration v0.6.0 [changelog](https://github.com/open-cluster-management-io/registration/blob/v0.6.0/CHANGELOG/CHANGELOG-v0.6.md)
- work v0.6.0 [changelog](https://github.com/open-cluster-management-io/work/blob/v0.6.0/CHANGELOG/CHANGELOG-v0.6.md)
- placement v0.3.0 [changelog](https://github.com/open-cluster-management-io/placement/blob/v0.3.0/CHANGELOG/CHANGELOG-v0.3.md)
- addon-framework v0.2.0 [changelog](https://github.com/open-cluster-management-io/addon-framework/blob/v0.2.0/CHANGELOG/CHANGELOG-v0.2.md)
- registration-operator v0.6.0 [changelog](https://github.com/open-cluster-management-io/registration-operator/blob/v0.6.0/CHANGELOG/CHANGELOG-v0.6.md)
- multicloud-operators-subscription v0.6.0 [changelog](https://github.com/open-cluster-management-io/multicloud-operators-subscription/blob/v0.6.0/CHANGELOG/CHANGELOG-v0.6.md)
- cluster-proxy v0.1.3 [repo](https://github.com/open-cluster-management-io/cluster-proxy)
- managed-serviceaccount v0.1.0 [repo](https://github.com/open-cluster-management-io/managed-serviceaccount)
- clusteradm v0.1.0 [changelog](https://github.com/open-cluster-management-io/clusteradm/blob/v0.1.0/CHANGELOG)
- config-policy-controller v0.6.0 [changelog](https://github.com/open-cluster-management-io/config-policy-controller/blob/main/CHANGELOG/CHANGELOG-v0.6.0.md)
- governance-policy-propagator v0.6.0 [changelog](https://github.com/open-cluster-management-io/governance-policy-propagator/blob/main/CHANGELOG/CHANGELOG-v0.6.0.md)
- governance-policy-status-sync v0.6.0 [changelog](https://github.com/open-cluster-management-io/governance-policy-status-sync/blob/main/CHANGELOG/CHANGELOG-v0.6.0%20.md)
- governance-policy-spec-sync v0.6.0 [changelog](https://github.com/open-cluster-management-io/governance-policy-spec-sync/blob/main/CHANGELOG/CHANGELOG-v0.6.0.md)
- governance-policy-template-sync v0.6.0 [changelog](https://github.com/open-cluster-management-io/governance-policy-template-sync/blob/main/CHANGELOG/CHANGELOG-v0.6.0.md)
- ocm-kustomize-generator-plugins v1.3.0 [changelog](https://github.com/open-cluster-management-io/ocm-kustomize-generator-plugins/blob/main/CHANGELOG/CHANGELOG-v1.3.0.md)

There are 20+ contributors making contributions in this release, they are @champly, @ChunxiAlexLuo, @dhaiducek, @elgnay, @haoqing0110, @ilan-pinto, @mikeshng, @morvencao, @mprahl, @nathanweatherly, @qiujian16, @rokej, @skeeey, @TheRealHaoLiu, @serngawy, @suigh, @xauthulei, @xiangjingli, @xuezhaojun, @ycyaoxdu, @yue9944882, @zhujian7, @zhiweiyin318. Thanks for your contributions!

## `v0.5.0`, on 8th, November 2021

Open Cluster Management team is proud to announce the release of OCM v0.5.0! We made several enhancements on APIs
and addons which include:

- [Support deleteOption in ManifestWork.](https://github.com/open-cluster-management-io/enhancements/tree/main/enhancements/sig-architecture/10-deletepropagationstrategy)
- [Introduce plugin mechanism in Placement API and add resource based scheduling.](https://github.com/open-cluster-management-io/enhancements/tree/main/enhancements/sig-architecture/15-resourcebasedscheduling)
- ManagedClusterSet API is upgraded from v1alpha1 to v1beta1.
- Scalability improvement on application manager.

In addition, we also release the first version of [clusteradm](https://github.com/open-cluster-management-io/clusteradm)
to ease the installation of OCM, and [addon-framework](https://github.com/open-cluster-management-io/addon-framework) to
ease the development of management addons on OCM.

To see details of the changelogs in this release:
- registration v0.5.0 [changelog](https://github.com/open-cluster-management-io/registration/blob/v0.5.0/CHANGELOG/CHANGELOG-v0.5.md)
- work v0.5.0 [changelog](https://github.com/open-cluster-management-io/work/blob/v0.5.0/CHANGELOG/CHANGELOG-v0.5.md)
- placement v0.2.0 [changelog](https://github.com/open-cluster-management-io/placement/blob/v0.2.0/CHANGELOG/CHANGELOG-v0.2.md)
- addon-framework v0.1.0 [changelog](https://github.com/open-cluster-management-io/addon-framework/blob/v0.1.0/CHANGELOG/CHANGELOG-v0.1.md)
- registration-operator v0.5.0 [changelog](https://github.com/open-cluster-management-io/registration-operator/blob/v0.5.0/CHANGELOG/CHANGELOG-v0.5.md)
- multicloud-operators-subscription v0.5.0 [changelog](https://github.com/open-cluster-management-io/multicloud-operators-subscription/blob/v0.5.0/CHANGELOG/CHANGELOG-v0.5.md)

There are about 20+ contributors making contributions in this release, they are @haoqing0110, @hchenxa, @huiwq1990, @itdove, @kim-fitness, @mikeshng, @elgnay, @panpan0000, @philipwu08, @porridge, @qiujian16, @rokej, @skeeey, @suigh, @vincent-pli, @wzhanw, @xauthulei, @xiangjingli, @xuezhaojun, @yue9944882, @zhujian7, @zhiweiyin318. Thanks for your contributions!


## `v0.4.0` on August 2021
