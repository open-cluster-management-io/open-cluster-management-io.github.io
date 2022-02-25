---
title: Quick Start
weight: 1
---

After walking through our *Quick Start* guide you will:

* Install and run OCM's command-line tool `clusteradm`.
* Bootstrap an OCM's hub cluster as the multi-cluster control plan.
* Register another cluster as OCM's managed cluster.
* Approving the managed cluster to be controlled by hub cluster.

__Contents__

<!-- spellchecker-disable -->

{{< toc >}}

## Prerequisites

- The hub cluster should be `v1.19+`.
- The managed clusters should be `v1.11+`.

You can always set up a local [KinD](https://kind.sigs.k8s.io/)
environment on your workstation easily by following these [instructions](#setup-a-local-kind-environment)
after meeting the following additional prerequisites:

- KinD greater than `v0.9.0+`.
  
## Environment

In this section, we will be warming up by preparing your terminal environment 
before actually installing OCM to your clusters. You can skip the KinD setup
below if you'd like to install OCM into your existing clusters.

### Setup a local KinD environment

To create two local running clusters on your workstation, run:

```shell
kind create cluster --name hub
kind create cluster --name cluster1
```

Remember that the cluster named "hub" will be the multi-cluster control plane
of your OCM environment, and "cluster1" is supposed to be the managed cluster
controlled by "hub".

### Prepare terminal environment

Before actually installing the OCM components into your clusters, export
the following environment variables in your terminal before running our
command-line tool `clusteradm` so that it can correctly discriminate the
hub cluster and managed cluster:

```Shell
# The context name of the clusters in your kubeconfig
# If the clusters are created by KinD, then the context name will the follow the pattern "kind-<cluster name>".
export CTX_HUB_CLUSTER=<your hub cluster context>           # export CTX_HUB_CLUSTER=kind-hub
export CTX_MANAGED_CLUSTER=<your managed cluster context>   # export CTX_MANAGED_CLUSTER=kind-cluster1
```

## Bootstrap via clusteradm CLI tool

By this section, we will be bootstrapping your first running OCM environment
with the help of OCM's native command-line tool `clusteradm`.


### Install clusteradm CLI tool

It's recommended to run the following one-liner to download and install **the 
latest release** of `clusteradm`:

```shell
curl -L https://raw.githubusercontent.com/open-cluster-management-io/clusteradm/main/install.sh | bash
```

You can also install **the latest development version** (main branch) by:

```shell
# Installing clusteradm to $GOPATH/bin/
GO111MODULE=off go get -u open-cluster-management.io/clusteradm/...
```

### Overview of the registration process

The following movie shows how to bootstrap a hub cluster control plane and 
then register another cluster into the hub.

<div style="text-align: center; padding: 20px;">
   <img src="/recording.mov.gif" alt="Cluster proxy architecture" style="margin: 0 auto; width: 60%">
</div>

To try out the cluster registration, let's go on walk through the following
steps:

### Deploy a cluster manager on your hub cluster

1. Bootstrap the Open Cluster Management control plane (.i.e the hub cluster):

   ```shell
   # By default it installs latest release of OCM components.
   # Use e.g. "--bundle-version=latest" to install latest development builds.
   clusteradm init --wait --context ${CTX_HUB_CLUSTER}
   ```
   
   By this command, `clusteradm` is helping you to install a [registration-operator](https://github.com/open-cluster-management-io/registration-operator)
   into your hub cluster which is responsible for consistently installing 
   and upgrading a few core components for your OCM environment.
   
   After the `init` command finishes, there's supposed to be a command generated 
   on your console for you to move ahead registering your managed clusters. A 
   sample of the generated command will be:
   
   ```shell
   # NOTE: For KinD clusters use the parameter: --force-internal-endpoint-lookup
   clusteradm join \
        --hub-token <your token data> \
        --hub-apiserver <your hub kube-apiserver endpoint> \
        --wait \
        --cluster-name <cluster_name>
   ```
   
   It's recommended to save the command somewhere in your workstation for 
   future use.
   
2. Then you can check out the running instances of registration operator by:

   ```shell
   kubectl -n open-cluster-management get pod --context ${CTX_HUB_CLUSTER}
   NAME                               READY   STATUS    RESTARTS   AGE
   cluster-manager-695d945d4d-5dn8k   1/1     Running   0          19d
   ```
   
   Additionally, to check out the instances of OCM's hub control plane, run
   the following command:

   ```shell
   kubectl -n open-cluster-management-hub get pod --context ${CTX_HUB_CLUSTER}
   NAME                               READY   STATUS    RESTARTS   AGE
   cluster-manager-placement-controller-857f8f7654-x7sfz      1/1     Running   0          19d
   cluster-manager-registration-controller-85b6bd784f-jbg8s   1/1     Running   0          19d
   cluster-manager-registration-webhook-59c9b89499-n7m2x      1/1     Running   0          19d
   cluster-manager-work-webhook-59cf7dc855-shq5p              1/1     Running   0          19d
   ...
   ```
   
   The overall installation information is visible in the custom resource 
   named `clustermanager`:

   ```shell
   kubectl get clustermanager cluster-manager -o yaml --context ${CTX_HUB_CLUSTER}
   ```

### Deploy a klusterlet agent on your managed cluster

After all the pods of hub components get running, now your hub cluster is
all set. Let's move on to register your managed cluster into OCM.
   
1. Run the previously generated command from `init`. Note that you're supposed
   to explicitly pass `--context` option if your managed cluster is created by
   KinD because its kubeconfig are persisted in the same kubeconfig file of 
   the hub cluster.
   
   ```shell
   # NOTE: Switch kubeconfig to the managed cluster.
   # NOTE: For KinD clusters use the parameter: --force-internal-endpoint-lookup
   clusteradm join \
        --context ${CTX_MANAGED_CLUSTER} \
        --hub-token <your token data> \
        --hub-apiserver <your hub cluster endpoint> \
        --wait \
        --cluster-name "cluster1"    # Or other arbitrary unique name
   ```
   
2. Verify the installation of OCM agents in your managed clusters by:

   ```shell
   kubectl -n open-cluster-management-agent get pod --context ${CTX_MANAGED_CLUSTER}
   NAME                                             READY   STATUS    RESTARTS   AGE
   klusterlet-registration-agent-598fd79988-jxx7n   1/1     Running   0          19d
   klusterlet-work-agent-7d47f4b5c5-dnkqw           1/1     Running   0          19d
   ```
   
   Similar to `clustermanager`, the overall installation information is prescribed
   by another custom resource called "klusterlet" which is only installed in your 
   managed cluster:
   
   ```shell
   kubectl get klusterlet klusterlet -o yaml --context ${CTX_MANAGED_CLUSTER}
   ```

### Accept join request and verify

After the OCM agent get deployed in your managed cluster gets running, it will 
be sending a "handshake" to your hub cluster waiting for approvals from hub 
cluster admin to manage the cluster for you. So in the next we will walk through 
the steps of permitting the registration requests from the prespective of a 
OCM's hub admin:

1. Wait for the creation of CSR resources which will be created by your managed 
   clusters' OCM agents into your hub cluster:

   ```Shell
   kubectl get csr -w --context ${CTX_HUB_CLUSTER} | grep cluster1
   ```

   A sample of pending CSR request will be:

   ```Shell
   cluster1-tqcjj   33s   kubernetes.io/kube-apiserver-client   system:serviceaccount:open-cluster-management:cluster-bootstrap   Pending
   ```

2. Accept the join request using your `clusteradm` tool:

   ```Shell
   clusteradm accept --clusters cluster1 --context ${CTX_HUB_CLUSTER}
   ```
   
   After running the `accept` command, the CSR from your managed cluster
   named "cluster1" will be approved, and additionally it will prescribe
   the OCM hub control plane to setup related resources (such as a namespace
   named "cluster1" in the hub cluster) and RBAC permissions automatically
   for you.

3. Verify `managedcluster` has been created successfully:

   ```Shell
   kubectl get managedcluster --context ${CTX_HUB_CLUSTER}
   ```

   Then you will get a result resembling the following:

   ```Shell
   NAME       HUB ACCEPTED   MANAGED CLUSTER URLS      JOINED   AVAILABLE   AGE
   cluster1   true           <your endpoint>           True     True        5m23s
   ```

## Bootstrap via Operatorhub.io

Install and create a [Cluster manager](https://operatorhub.io/operator/cluster-manager) on your _hub_ cluster.

Install and create a [Klusterlet agent](https://operatorhub.io/operator/klusterlet) on your _managed_ cluster.

## More details

For more details, see [Core components](/getting-started/core).
