---
title: Deploy components in hosted mode
weight: 2
---

In the default deployment mode, the cluster manager and klusterlet will be deployed on the hub/managed cluster, it is
mandatory to expose the hub cluster to the managed cluster even if the managed cluster resides in an insecure
environment. We provide an option for running cluster-manager/klusterlet outside the hub/managed cluster(hosted mode).
which means the cluster manager can be deployed outside the hub cluster and klusterlet can be deployed outside the
managed cluster.

In hosted mode:
- We can leverage compute resources better by running several cluster-managers/klusterlets deployments on the same
powerful cluster; it also enhances our management of all deployments.
- The footprints of the hub/managed cluster can be reduced.
- We can use this ability to run the klusterlet on the hub cluster, so we do not need to expose the hub cluster to the
managed cluster, and accordingly, we expose the managed cluster to the hub.

Enhancement proposal: [Running deployments of cluster-manager and klusterlet outside of Hub and ManagedCluster](https://github.com/open-cluster-management-io/enhancements/tree/main/enhancements/sig-architecture/33-hosted-deploy-mode)

This article will use 3 kind clusters to show you how to deploy cluster manager(outside the hub cluster) and klusterlet(
outside the managed) in hosted mode.

## Prerequisites

1. Three kind clusters: management cluster, hub cluster and managed cluster. The cluster manager and klusterlet will be
   deployed on the management cluster, and the managed cluster will be imported to the hub cluster as name `cluster1`.

   ```shell
   export KUBECONFIG=$HOME/.kube/config

   kind create cluster --name hub

   kind create cluster --name managed

   # the following config is useful for deploying the cluster manager in hosted mode
   cat <<EOF | kind create cluster --name management --config=-
   kind: Cluster
   apiVersion: kind.x-k8s.io/v1alpha4
   nodes:
   - role: control-plane
     extraPortMappings:
     - containerPort: 30443
       hostPort: 30443
       protocol: TCP
     - containerPort: 31443
       hostPort: 31443
       protocol: TCP
   EOF
   ```

2. The [ocm repo](https://github.com/open-cluster-management-io/ocm) code will be used to deploy cluster manager and
   klusterlet in hosted mode.

   ```shell
   git clone --depth 1 https://github.com/open-cluster-management-io/ocm.git
   ```

3. The `clusteradm` binary, only required if you want to use `clusteradm` to deploy klusterlet in hosted mode.(The
   cluster manager is not supported to deploy by `clusteradm` in hosted mode at present), to install `clusteradm`, you
    can refer to [this]({{< ref "/getting-started/installation/start-the-control-plane#install-clusteradm-cli-tool" >}}).

## Deploy cluster manager in hosted mode

At present, the cluster manager can not be deployed by `clusteradm` in hosted mode, but we can leverage some `make`
commands to deploy it.

1. Get the EXTERNAL_HUB_KUBECONFIG kubeconfig, cluster manager will be deployed on the management cluster, so we need
   the kubeconfig of the hub cluster to connect to the hub cluster.

    ```shell
    cd ocm
    kind get kubeconfig --name hub --internal > ./.external-hub-kubeconfig
    ```

2. Switch to management cluster and deploy hub components.

    ```shell
    kubectl config use-context kind-management
    make deploy-hub-hosted
    ```

   these commands will create a cluster manager CR in Hosted mode, and create an `external-hub-kubeconfig` on the
   management cluster to connect to the hub cluster.

    ```yaml
    apiVersion: operator.open-cluster-management.io/v1
    kind: ClusterManager
    metadata:
       name: cluster-manager
    spec:
       registrationImagePullSpec: quay.io/open-cluster-management/registration
       workImagePullSpec: quay.io/open-cluster-management/work
       placementImagePullSpec: quay.io/open-cluster-management/placement
       deployOption:
          mode: Hosted   # mode
          hosted:        # webhook settings
             registrationWebhookConfiguration:
                address: management-control-plane
                port: 30443
             workWebhookConfiguration:
                address: management-control-plane
                port: 31443
    ```

3. After deploy hub successfully, the user needs to expose webhook-servers in the management cluster manually.

    ```shell
    cat <<EOF | kubectl apply -f -
    apiVersion: v1
    kind: Service
    metadata:
      name: cluster-manager-registration-webhook-external
      namespace: cluster-manager
    spec:
      type: NodePort
      selector:
        app: cluster-manager-registration-webhook
      ports:
        - port: 9443
          nodePort: 30443
    ---
    apiVersion: v1
    kind: Service
    metadata:
      name: cluster-manager-work-webhook-external
      namespace: cluster-manager
    spec:
      type: NodePort
      selector:
        app: cluster-manager-work-webhook
      ports:
        - port: 9443
          nodePort: 31443
    EOF
    ```

4. Now we can check components are deployed on the management cluster

    ```shell
    ╰─# kubectl config use-context kind-management
    Switched to context "kind-management".
    ╰─# kubectl get pod -n open-cluster-management
    NAME                              READY   STATUS    RESTARTS   AGE
    cluster-manager-55598cd6c-96t9h   1/1     Running   0          87s
    ╰─# kubectl get clustermanager cluster-manager
    NAME              AGE
    cluster-manager   89s
    ╰─# kubectl get pod -n cluster-manager
    NAME                                                       READY   STATUS    RESTARTS   AGE
    cluster-manager-placement-controller-7fdbfdb84c-mnd4l      1/1     Running   0          92s
    cluster-manager-registration-controller-84854b8795-7k9j7   1/1     Running   0          92s
    cluster-manager-registration-webhook-7c99fd7d75-7xqp4      2/2     Running   0          92s
    cluster-manager-work-webhook-d9c49d4cc-gf7c9               2/2     Running   0          92s
    ```

## Deploy klusterlet in hosted mode

After the cluster manager is deployed successfully, we can deploy the klusterlet in hosted mode.

### Using make commands

We can use `make` commands to deploy klusterlet in hosted mode no matter the cluster manager is deployed in hosted mode
or default mode

1. Set the env variable HUB_KUBECONFIG and EXTERNAL_MANAGED_KUBECONFIG.

    ```shell
    cd ocm
    kind get kubeconfig --name hub --internal > ./.hub-kubeconfig
    export HUB_KUBECONFIG=./.hub-kubeconfig
    kind get kubeconfig --name managed --internal > ./.external-managed-kubeconfig
    export EXTERNAL_MANAGED_KUBECONFIG=./.external-managed-kubeconfig
    ```

2. Switch to management context and deploy agent components on management cluster.
    ```shell
    kubectl config use-context kind-management
    MANAGED_CLUSTER_NAME=cluster1 KLUSTERLET_NAME=klusterlet make deploy-spoke-hosted
    ```

   the command `make deploy-spoke-hosted` will create a klusterlet CR in Hosted mode, and create an
   `external-managed-kubeconfig` on the management cluster to connect to the managed cluster.
   
    ```yaml
    apiVersion: operator.open-cluster-management.io/v1
    kind: Klusterlet
    metadata:
      name: klusterlet
    spec:
      deployOption:
        mode: Hosted   # mode
      registrationImagePullSpec: quay.io/open-cluster-management/registration
      workImagePullSpec: quay.io/open-cluster-management/work
      clusterName: cluster1
      namespace: open-cluster-management-agent
      externalServerURLs:
      - url: https://localhost
      registrationConfiguration:
        featureGates:
        - feature: AddonManagement
          mode: Enable
    ```

### Using clusteradm

We can use `clusteradm` to deploy klusterlet in hosted mode if the cluster manager is deployed in default mode. Since
the clusteraadm doesn't support to deploy cluster manager in hosted mode yet.

1. Get the hub token, the output of the following command will include the hub token:

    ```shell
    kubectl config use-context kind-hub
    clusteradm init # if the cluster has not been initialized
    # OR
    clusteradm get token # if the cluster has already been initialized
    ```

2. Join the managed cluster in hosted mode

    ```yaml
    kind get kubeconfig --name managed --internal > ./.external-managed-kubeconfig
    kubectl config use-context kind-management
    clusteradm join --hub-token <tokenID.tokenSecret> \
      --hub-apiserver <hub_apiserver_url> \
      --cluster-name cluster1 \
      --mode hosted \
      --managed-cluster-kubeconfig ./.external-managed-kubeconfig \
      --force-internal-endpoint-lookup=true
    ```

### Accept the managed cluster

1. After a successful deployment, a `certificatesigningrequest` and a `managedcluster` will be created on the hub.
Switch to hub context, then accept the managed cluster and approve the CSR.

   ```shell
   kubectl config use-context kind-hub
   kubectl get csr --no-headers | awk '{ print $1 }' | xargs -n 1 kubectl certificate approve
   kubectl get managedcluster --no-headers | awk '{ print $1 }' | xargs -n 1 -I {} kubectl patch managedcluster {} -p='{"spec":{"hubAcceptsClient":true}}' --type=merge
   kubectl get managedcluster # the managed cluster should be AVAILABLE=true
   ```

2. Now we can check components are deployed on the management cluster

    ```shell
    ╰─# kubectl config use-context kind-management
    Switched to context "kind-management".
    ╰─# kubectl get pod -n open-cluster-management
    NAME                              READY   STATUS    RESTARTS   AGE
    klusterlet-b669cfcc7-j69fb        1/1     Running   0          27m
    ╰─# kubectl get klusterlet
    NAME         AGE
    klusterlet   27m
    ╰─# kubectl get pod -n <klusterlet-name>
    NAME                                            READY   STATUS    RESTARTS   AGE
    klusterlet-registration-agent-5d5bcbc8c-7m2t5   1/1     Running   0          11m
    klusterlet-work-agent-97778d688-vdwmp           1/1     Running   0          6m47s
    ```

NOTE: 
- There is no dependency on whether cluster manager and klusterlet are deployed in hosted mode, which means they can be
  combined in any deployment mode. For example cluster manager default mode and klusterlet hosted mode.
- The management/hosting cluster of cluster manager and klusterlet can be the same cluster or different clusters.

## Deploy addon agent in hosted mode

In addition to cluster manager and klusterlet, if you want to deploy the addon agent in hosted mode, please refer to
[Developer Guides -> Add-on Developer Guide -> Hosted mode](/developer-guides/addon/#hosted-mode)
