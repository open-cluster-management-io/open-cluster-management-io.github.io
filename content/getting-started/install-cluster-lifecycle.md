---
title: Install Cluster Lifecycle
weight: 1
---

Cluster Lifecycle has the following component:
- managedcluster-import-controller: A controller that generates an import command. It also manages the Klusterlet on a managed cluster.

<!-- spellchecker-disable -->

{{< toc >}}

<!-- spellchecker-enable -->

## Prerequisite

You must meet the following prerequisites to use the cluster lifecycle:

- Ensure [kubectl](https://kubernetes.io/docs/tasks/tools/install-kubectl) and [kustomize](https://kubernetes-sigs.github.io/kustomize/installation) are installed.

- Prepare one [OKD 4](https://www.okd.io/) cluster to function as the _cluster manager_.

- Install a cluster manager. See [Install Cluster Manager](../install-cluster-manager) for more information.

- Install [Hive](https://github.com/openshift/hive/blob/master/docs/install.md#installing-community-release-via-operatorhub) on the _cluster manager_.

## Install managedcluster-import-controller from the source files

1. Clone the `managedcluster-import-controller` repo:

   ```Shell
   git clone https://github.com/open-cluster-management/managedcluster-import-controller.git
   cd managedcluster-import-controller
   ```

2. Ensure the `kubectl` context is set to point to the _cluster manager_ cluster:

   ```Shell
   kubectl cluster-info
   ```

3. Create the `open-cluster-management` namespace on the _cluster manager_ if you haven't already created it.
   ```Shell
   kubectl create ns open-cluster-management
   ```

4. Deploy `managedcluster-import-controller` in the `open-cluster-management` namespace:

   ```Shell
   kubectl apply -k overlays/community
   ```

5. Verify `managedcluster-import-controller` is running:
   ```Shell
   kubectl get po -n open-cluster-management | grep managedcluster-import-controller   
   managedcluster-import-controller-686b9dff46-flk9d   1/1     Running   0          6m47s
   ```


## Next steps

### Auto register a Hive-created cluster
1. If you created a OKD/Openshift cluster using [Hive](https://github.com/openshift/hive/blob/master/docs/using-hive.md#using-hive), you can auto-import the cluster by simply creating a managedcluster resource:

   ```
   apiVersion: cluster.open-cluster-management.io/v1
   kind: ManagedCluster
   metadata:
     name: CLUSTER_NAME
   spec:
     hubAcceptsClient: true
   ```
   Replace the `CLUSTER_NAME` with the cluster name that you are using.

   **Note**: `CLUSTER_NAME` should be same as both the `ClusterDeployment` resource name and the `ClusterDeployment` namespace name.


2. Verify that the cluster is available on the _cluster manager_:
   ```Shell
   kubectl get managedcluster                                                                                                    
   NAME        HUB ACCEPTED   MANAGED CLUSTER URLS   JOINED   AVAILABLE   AGE
   hive-test   true                                  True     True        10m

   ```


### Manually register a cluster

1. Create a managedcluster resource:

   ```
   apiVersion: cluster.open-cluster-management.io/v1
   kind: ManagedCluster
   metadata:
     name: CLUSTER_NAME
   spec:
     hubAcceptsClient: true
   ```

   Replace the `CLUSTER_NAME` with the name you want. 

2. Once the managedcluster resource is created, a namespace with `CLUSTER_NAME` will be created, and managedcluster-import-controller will generate the `yaml` files that you can apply on your managed cluster.

3. On the _cluster manager_, run the following commands to get two `yaml` files:
   ```Shell
   kubectl get secret -n ${CLUSTER_NAME} ${CLUSTER_NAME}-import -ojsonpath='{.data.crds\.yaml}' | base64 --decode > crds.yaml
   kubectl get secret -n ${CLUSTER_NAME} ${CLUSTER_NAME}-import -ojsonpath='{.data.import\.yaml}' | base64 --decode > import.yaml
   ```

4. On the _managed cluster_, apply the `yaml` files:
   ```Shell
   kubectl apply -f crds.yaml
   kubectl apply -f import.yaml
   ```

5. Verify that the cluster is available on the _cluster manager_:
   ```Shell
   kubectl get managedcluster                                                                                                    
   NAME        HUB ACCEPTED   MANAGED CLUSTER URLS   JOINED   AVAILABLE   AGE
   test-name   true                                  True     True        21m
   ```

