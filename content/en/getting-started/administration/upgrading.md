---
title: Upgrading your OCM environment
weight: 1
---

<!-- spellchecker-disable -->

{{< toc >}}

<!-- spellchecker-enable -->

This page provides the suggested steps to upgrade your OCM environment
including both the hub cluster and the managed clusters. Overall the major
steps you should follow are:

- Read the release notes to confirm the latest OCM release version. _(Note that
  some add-ons' version might be different from OCM's overall release version.)_
- Upgrade your command line tools `clusteradm`


## Before you begin

You must have an existing OCM environment and there's supposed to be
registration-operator running in your clusters. The registration-operators
is supposed to be installed if you're previously following our recommended
[quick start guide]({{< ref "/getting-started/quick-start" >}})
to set up your OCM. The operator is responsible for helping you upgrade the
other components on ease.

## Upgrade command-line tool

In order to retrieve the latest version of OCM's command-line tool `clusteradm`,
run the following one-liner command:

```shell
$ curl -L https://raw.githubusercontent.com/open-cluster-management-io/clusteradm/main/install.sh | bash
```

Then you're supposed to see the following outputs:

```shell
Getting the latest clusteradm CLI...
Your system is darwin_amd64

clusteradm CLI is detected:
Reinstalling clusteradm CLI - /usr/local/bin/clusteradm...

Installing v0.1.0 OCM clusteradm CLI...
Downloading https://github.com/open-cluster-management-io/clusteradm/releases/download/v0.1.0/clusteradm_darwin_amd64.tar.gz ...
clusteradm installed into /usr/local/bin successfully.

To get started with clusteradm, please visit https://open-cluster-management.io/getting-started/
```

Also, your can confirm the installed cli version by running:

```shell
$ clusteradm version
client		    version	:v0.1.0
server release	version	: ...
```

## Upgrade OCM Components via Command-line tool

### Hub Cluster

For example, to upgrade OCM components in the hub cluster, run the following
command:

```shell
$ clusteradm upgrade clustermanager --bundle-version=0.7.0
```

Then `clusteradm` will make sure everything in the hub cluster is upgraded to
the expected version. To check the latest status after the upgrade, continue to
run the following command:

```shell
$ clusteradm get hub-info
```

### Managed Clusters

To upgrade the OCM components in the managed clusters, switch the client context
e.g. overriding `KUBECONFIG` environment variable, then simply run the following
command:

```shell
$ clusteradm upgrade klusterlet --bundle-version=0.7.0
```

To check the status after the upgrade, continue running this command against the
managed cluster:

```shell
$ clusteradm get klusterlet-info
```

##  Upgrade OCM Components via Manual Edit

### Hub Cluster

#### Upgrading the registration-operator

Navigate into the namespace where you installed registration-operator (named
"open-cluster-management" by default) and edit the image version of its
deployment resource:

```shell
$ kubectl -n open-cluster-management edit deployment cluster-manager
```

Then update the image tag version to your target release version, which is
exactly the OCM's overall release version.

```diff
--- image: quay.io/open-cluster-management/registration-operator:<old release>
+++ image: quay.io/open-cluster-management/registration-operator:<new release>
```

#### Upgrading the core components

After the upgrading of registration-operator is done, it's about time to surge
the working modules of OCM. Go on and edit the `clustermanager` custom resource
to prescribe the registration-operator to perform the automated upgrading:

```shell
$ kubectl edit clustermanager cluster-manager
```

In the content of `clustermanager` resource, you're supposed to see a few
images listed in its spec:

```yaml
apiVersion: operator.open-cluster-management.io/v1
kind: ClusterManager
metadata: ...
spec:
  registrationImagePullSpec: quay.io/open-cluster-management/registration:<target release>
  workImagePullSpec: quay.io/open-cluster-management/work:<target release>
  # NOTE: Placement release versioning differs from the OCM root version, please refer to the release note.
  placementImagePullSpec: quay.io/open-cluster-management/placement:<target release>
```

Replacing the old release version to the latest and commit the changes will
trigger the process of background upgrading. Note that the status of upgrade
can be actively tracked via the status of `clustermanager`, so if anything goes
wrong during the upgrade it should also be reflected in that status.


### Managed Clusters

#### Upgrading the registration-operator

Similar to the process of upgrading hub's registration-operator, the only
difference you're supposed to notice when upgrading the managed cluster is
the name of deployment. Note that before running the following command, you
are expected to switch the context to access the managed clusters not the hub.

```shell
$ kubectl -n open-cluster-management edit deployment klusterlet
```

Then repeatedly, update the image tag version to your target release version
and commit the changes will upgrade the registration-operator.

#### Upgrading the agent components

After the registration-operator is upgraded, move on and edit the corresponding
`klusterlet` custom resource to trigger the upgrading process in your managed
cluster:

```shell
$ kubectl edit klusterlet klusterlet
```

In the spec of `klusterlet`, what is expected to be updated is also its image
list:

```yaml
apiVersion: operator.open-cluster-management.io/v1
kind: Klusterlet
metadata: ...
spec:
  ...
  registrationImagePullSpec: quay.io/open-cluster-management/registration:<target release>
  workImagePullSpec: quay.io/open-cluster-management/work:<target release>
```

After committing the updates, actively checking the status of the `klusterlet`
to confirm whether everything is correctly upgraded. And repeat the above steps
to each of the managed clusters to perform a cluster-wise progressive upgrade.

#### Confirm the upgrade

Getting the overall status of the managed cluster will help you to detect the
availability in case any of the managed clusters are running into failure:

```shell
$ kubectl get managedclusters
```

And the upgrading is all set if all the steps above is succeeded.
