---
title: Cluster lifecycle management
weight: 10
---

Cluster lifecycle management has the following components:
- managedcluster-import-controller: A controller that generates an import command. It also manages the klusterlet on a managed cluster.
- klusterlet-addon-controller: A controller that helps you install addon agents on the managed cluster. **Note**: The hub side of the addon must be installed first to enable the managed cluster addon features.

<!-- spellchecker-disable -->

{{< toc >}}

<!-- spellchecker-enable -->

## Prerequisite

You must meet the following prerequisites to use the cluster lifecycle:

- Ensure [kubectl](https://kubernetes.io/docs/tasks/tools/install-kubectl) and [kustomize](https://kubernetes-sigs.github.io/kustomize/installation) are installed.

- Prepare one [OKD](https://www.okd.io) cluster to function as the _hub_ cluster.

- Install the cluster manager on the _hub_ cluster. See [Cluster Manager](/getting-started/core/cluster-manager) for more information.

- Install [Hive](https://github.com/openshift/hive/blob/master/docs/install.md#installing-community-release-via-operatorhub) on the _hub_.

## Install managedcluster-import-controller from the source files

1. Clone the `managedcluster-import-controller` repo:

   ```Shell
   git clone https://github.com/open-cluster-management/managedcluster-import-controller.git
   cd managedcluster-import-controller
   ```

2. Ensure the `kubectl` context is set to point to the hub cluster:

   ```Shell
   kubectl cluster-info
   ```

3. Create the `open-cluster-management` namespace on the hub cluster if you haven't already created it:
   ```Shell
   kubectl create ns open-cluster-management
   ```

4. Deploy `managedcluster-import-controller` in the `open-cluster-management` namespace:

   ```Shell
   kubectl apply -k overlays/community
   ```

5. Verify `managedcluster-import-controller` is running:
   ```Shell
   $ kubectl get po -n open-cluster-management | grep managedcluster-import-controller   
   managedcluster-import-controller-686b9dff46-flk9d   1/1     Running   0          6m47s
   ```


## Next steps

### Auto register a Hive-created cluster
1. If you created an OKD or Red Hat OpenShift cluster using [Hive](https://github.com/openshift/hive/blob/master/docs/using-hive.md#using-hive), you can auto-import the cluster by simply creating a `managedcluster` resource:

   ```Shell
   apiVersion: cluster.open-cluster-management.io/v1
   kind: ManagedCluster
   metadata:
     name: CLUSTER_NAME
   spec:
     hubAcceptsClient: true
   ```
   Replace `CLUSTER_NAME` with the cluster name that you are using, which should be the same as both the `ClusterDeployment` resource name and the `ClusterDeployment` namespace name.


2. Verify that the cluster is available on the hub cluster:
   ```Shell
   $ kubectl get managedcluster                                                                                                    
   NAME        HUB ACCEPTED   MANAGED CLUSTER URLS   JOINED   AVAILABLE   AGE
   hive-test   true                                  True     True        10m

   ```


### Manually register a cluster

1. Create a `managedcluster` resource:

   ```Shell
   apiVersion: cluster.open-cluster-management.io/v1
   kind: ManagedCluster
   metadata:
     name: CLUSTER_NAME
   spec:
     hubAcceptsClient: true
   ```

   Replace `CLUSTER_NAME` with the name of the cluster.

2. After the `managedcluster` resource is created, a namespace with `CLUSTER_NAME` is created, and `managedcluster-import-controller` generates the yaml files that you can apply on your managed cluster.

3. On the hub cluster, run the following commands to generate two `yaml` files:
   ```Shell
   kubectl get secret -n ${CLUSTER_NAME} ${CLUSTER_NAME}-import -ojsonpath='{.data.crds\.yaml}' | base64 --decode > crds.yaml
   kubectl get secret -n ${CLUSTER_NAME} ${CLUSTER_NAME}-import -ojsonpath='{.data.import\.yaml}' | base64 --decode > import.yaml
   ```

4. On the managed cluster, apply the `yaml` files:
   ```Shell
   kubectl apply -f crds.yaml
   kubectl apply -f import.yaml
   ```

5. Verify that the cluster is available on the hub cluster:
   ```Shell
   $ kubectl get managedcluster                                                                                                    
   NAME        HUB ACCEPTED   MANAGED CLUSTER URLS   JOINED   AVAILABLE   AGE
   test-name   true                                  True     True        21m
   ```

## Install klusterlet-addon-controller from source

1. Ensure the `kubectl` context is set to point to the hub cluster:

```Shell
kubectl cluster-info
```

2. Clone the `multicloud-operators-foundation` repo:

```Shell
git clone https://github.com/open-cluster-management/multicloud-operators-foundation.git
cd multicloud-operators-foundation
```

3. Deploy the `multicloud-operators-foundation` pieces:
```Shell
make deploy-foundation-hub
export MANAGED_CLUSTER_NAME=<your managed cluster name, default is cluster1>
make deploy-foundation-agent
```

4. Clone the `klusterlet-addon-controller` repo:

```Shell
git clone https://github.com/open-cluster-management/klusterlet-addon-controller.git
cd klusterlet-addon-controller
```

5. Deploy `klusterlet-addon-controller` in the `open-cluster-management` namespace

```Shell
kubectl apply -k overlays/community
```

6. Verify that `klusterlet-addon-controller` is running:
```Shell
$ kubectl get po -n open-cluster-management | grep klusterlet-addon-controller   
klusterlet-addon-controller-6dbc964f45-s45w8   1/1     Running   0          1m23s
```


## Next steps

### Install addons on managed clusters
`klusterlet-addon-controller` can help you create the following addons:
- [Application lifecycle management](../app-lifecycle)
- [Policy controllers](../policy-controllers)

To install addons on a managed cluster:

1. Create a `klusterletaddonconfig` resource in the cluster namespace:

```
apiVersion: agent.open-cluster-management.io/v1
kind: KlusterletAddonConfig
metadata:
  name: c
  namespace: CLUSTER_NAME
spec:
  clusterName: CLUSTER_NAME
  clusterNamespace: CLUSTER_NAME
  applicationManager:
    enabled: true
  certPolicyController:
    enabled: true
  clusterLabels:
    cloud: auto-detect
    vendor: auto-detect
  iamPolicyController:
    enabled: true
  policyController:
    enabled: true
  searchCollector:
    enabled: false
```

Replace the `CLUSTER_NAME` with the managed cluster name.

2. After the `klusterletaddonconfig` is created on the hub cluster, run the following command to see addons installed in the managed cluster's `open-cluster-management-agent-addon` namespace.

```Shell
$ kubectl -n open-cluster-management-agent-addon get pod
NAME                                                         READY   STATUS    RESTARTS   AGE
klusterlet-addon-appmgr-6c5bf85b97-mlwkj                     1/1     Running   0          25s
klusterlet-addon-certpolicyctrl-84f5fcfd6b-7rjhs             2/2     Running   0          25s
klusterlet-addon-iampolicyctrl-6c59d7c7b4-ddqrb              2/2     Running   0          24s
klusterlet-addon-operator-f79c6b9f9-lw7r9                    1/1     Running   0          54s
klusterlet-addon-policyctrl-config-policy-5d5bc5cb68-5lddj   1/1     Running   0          22s
klusterlet-addon-policyctrl-framework-6f5c47b59d-876q8       4/4     Running   0          22s
klusterlet-addon-workmgr-5787f8bdd4-lxckc                    1/1     Running   0          21s
```
