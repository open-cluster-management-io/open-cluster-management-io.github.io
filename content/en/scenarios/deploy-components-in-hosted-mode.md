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

## Prerequisites

At present, there are examples of hosted mode deploying in the registration-operator repository. This article will
demonstrate in this way. In the future, we will make `clusteradm` to support deploy cluster manager and klusterlet in
hosted mode

```shell
git clone https://github.com/open-cluster-management-io/registration-operator.git
cd registration-operator
```

## Deploy cluster manager in hosted mode

1. Set the env variable KUBECONFIG to kubeconfig file path.

    ```shell
    export KUBECONFIG=$HOME/.kube/config
    ```

2. Create 3 Kind clusters: management/hosting cluster(cluster manager will deploy on this cluster), hub cluster and a
managed cluster.

    ``` shell
    kind create cluster --name hub
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
    kind create cluster --name managed
    ```

3. Get the EXTERNAL_HUB_KUBECONFIG kubeconfig.

    ```shell
    kind get kubeconfig --name hub --internal > ./.external-hub-kubeconfig
    ```

4. Switch to management cluster and deploy hub components.

    ```shell
    kubectl config use-context {management-context}
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

5. After deploy hub successfully, the user needs to expose webhook-servers in the management cluster manually.

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

6. Now we can check components are deployed on the management cluster

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

1. Make sure there are 3 clusters, management, hub and managed cluster, and the cluster manager is deployed in Default
   or Hosted mode successfully.
2. Set the env variable HUB_KUBECONFIG and EXTERNAL_MANAGED_KUBECONFIG.

    ```shell
    export HUB_KUBECONFIG={HUB_KUBECONFIG_PATH}
    expoet EXTERNAL_MANAGED_KUBECONFIG={MANAGED_KUBECONFIG_PATH}
    # if they are kind clusters, please also set:
    kind get kubeconfig --name {kind-hub-cluster-name} --internal > {HUB_KUBECONFIG_PATH}
    kind get kubeconfig --name {kind-managed-cluster-name} --internal > {MANAGED_KUBECONFIG_PATH}
    ```

3. Switch to management context and deploy agent components on management cluster.
    ```shell
    kubectl config use-context {management-context}
    make deploy-spoke-hosted
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

4. After a successful deployment, a `certificatesigningrequest` and a `managedcluster` will be created on the hub.
Switch to hub context, then accept the managed cluster and approve the CSR.

   ```shell
   kubectl config use-context {hub-context}
   kubectl get csr
   kubectl certificate approve {csr name}
   kubectl patch managedcluster {cluster name} -p='{"spec":{"hubAcceptsClient":true}}' --type=merge
   kubectl get managedcluster # the managed cluster should be AVAILABLE=true
   ```

5. Now we can check components are deployed on the management cluster

    ```shell
    ╰─# kubectl get pod -n open-cluster-management
    NAME                              READY   STATUS    RESTARTS   AGE
    klusterlet-b669cfcc7-j69fb        1/1     Running   0          27m
    ╰─# kubectl get klusterlet klusterlet
    NAME         AGE
    klusterlet   27m
    ╰─# kubectl get pod -n klusterlet
    NAME                                            READY   STATUS    RESTARTS   AGE
    klusterlet-registration-agent-5d5bcbc8c-7m2t5   1/1     Running   0          11m
    klusterlet-work-agent-97778d688-vdwmp           1/1     Running   0          6m47s
    ```

NOTE: 
- Whether cluster manager and klusterlet are deployed in hosted mode has no dependency, which means that they can
be combined in any deployment mode. For example: cluster manager default mode and klusterlet hosted mode.
- The management/hosting cluster of cluster manager and klusterlet can be the same cluster or different clusters.

## Deploy addon agent in hosted mode

In addition to cluster manager and klusterlet, if you want to deploy the addon agent in hosted mode, please refer to
[Developer Guides -> Add-on Developer Guide -> Hosted mode](/developer-guides/addon/#hosted-mode)
