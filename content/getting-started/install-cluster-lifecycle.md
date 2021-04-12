---
title: Install Cluster-Lifecycle
weight: 1
---

Cluster-Lifecycle has 3 components:
- managedcluster-import-controller
  - a controller help you generate import command. It can also manage klusterlet on managed cluster.
- klusterlet-addon-controller
  - a controller help you install addon agents on the managed cluster. (Note: the hub side of the addon need to be installed to enable the managed cluster addon features).
- console (WIP)
  - a web UI to help user manage clusters.

<!-- spellchecker-disable -->

{{< toc >}}

<!-- spellchecker-enable -->

## Prerequisite

Ensure [kubectl](https://kubernetes.io/docs/tasks/tools/install-kubectl) and [kustomize](https://kubernetes-sigs.github.io/kustomize/installation) are installed.

Prepare one [OKD 4](https://www.okd.io/) cluster to function as the hub.

Install [cluster-manager](install-hub.md) on the hub.

Install [Hive](https://github.com/openshift/hive/blob/master/docs/install.md#installing-community-release-via-operatorhub) on the hub.

To enable addons on managed cluster, you will need to install the following components on the hub: (WIP)
- [application-management](install-application.md)

Create namespace `open-cluster-management` on the hub for cluster-lifecycle components.

## Install managedcluster-import-controller from source

Clone the `managedcluster-import-controller` repo:

```Shell
git clone https://github.com/open-cluster-management/managedcluster-import-controller.git
```

Ensure the `kubectl` context is set to point to the hub cluster:

```Shell
kubectl cluster-info
```

Create `open-cluster-management` on the hub if haven't created

Deploy managedcluster-import-controller in the open-cluster-management namespace

```Shell
kubectl apply -k overlays/community
```

Verify managedcluster-import-controller is running:
```Shell
kubectl get po -n open-cluster-management | grep managedcluster-import-controller   
managedcluster-import-controller-686b9dff46-flk9d   1/1     Running   0          6m47ss
```

## Install klusterlet-addon-controller from source

Clone the `klusterlet-addon-controller` repo:

```Shell
git clone https://github.com/open-cluster-management/klusterlet-addon-controller.git
```

Ensure the `kubectl` context is set to point to the hub cluster:

```Shell
kubectl cluster-info
```

Create `open-cluster-management` on the hub if haven't created

Deploy klusterlet-addon-controller in the open-cluster-management namespace

```Shell
kubectl apply -k overlays/community
```

## What is next

### Auto register a Hive created cluster
If you have created a OKD/Openshift cluster through [Hive](https://github.com/openshift/hive/blob/master/docs/using-hive.md#using-hive), you can auto import the cluster by simply create a managedcluster resource:

```
apiVersion: cluster.open-cluster-management.io/v1
kind: ManagedCluster
metadata:
  name: CLUSTER_NAME
spec:
  hubAcceptsClient: true
```
Replace the `CLUSTER_NAME` with the cluster's name you are using.

Note: `CLUSTER_NAME` should be same as the clusterdeployment's resource name, and `CLUSTER_NAME` should also be same as the clusterdeployment's namespace name.

Verify cluster is available on the hub:
```Shell
kubectl get managedcluster                                                                                                    
NAME        HUB ACCEPTED   MANAGED CLUSTER URLS   JOINED   AVAILABLE   AGE
hive-test   true                                  True     True        10m

```


### Manually register a cluster

Create a managedcluster resource:

```
apiVersion: cluster.open-cluster-management.io/v1
kind: ManagedCluster
metadata:
  name: CLUSTER_NAME
spec:
  hubAcceptsClient: true
```

Replace the `CLUSTER_NAME` with the name you want. 

Once the managedcluster resource is created, a namespace with `CLUSTER_NAME` will be created, and managedcluster-import-controller will generate the yaml files you can apply on your managed cluster. 

On the **hub**, run the following command to two yaml files:
```Shell
kubectl get secret -n ${CLUSTER_NAME} ${CLUSTER_NAME}-import -ojsonpath='{.data.crds\.yaml}' | base64 --decode > crds.yaml
kubectl get secret -n ${CLUSTER_NAME} ${CLUSTER_NAME}-import -ojsonpath='{.data.import\.yaml}' | base64 --decode > import.yaml
```

On the **managed cluster**, apply the yaml files:
```Shell
kubectl apply -f crds.yaml
kubectl apply -f import.yaml
```

Verify cluster is available on the **hub**:
```Shell
kubectl get managedcluster                                                                                                    
NAME        HUB ACCEPTED   MANAGED CLUSTER URLS   JOINED   AVAILABLE   AGE
test-name   true                                  True     True        21m
```


### Install addons on registered clusters
klusterlet-addon-controller can help users to create the following addons: (WIP)
- [application-management](install-application.md)

To install addons into a managed cluster, create a klusterletaddonconfig resource in the cluster namespace:

```
apiVersion: agent.open-cluster-management.io/v1
kind: KlusterletAddonConfig
metadata:
  name: CLUSTER_NAME
  namespace: CLUSTER_NAME
spec:
  clusterName: CLUSTER_NAME
  clusterNamespace: CLUSTER_NAME
  applicationManager:
    enabled: true
  certPolicyController:
    enabled: false
  clusterLabels:
    cloud: auto-detect
    vendor: auto-detect
  iamPolicyController:
    enabled: false
  policyController:
    enabled: false
  searchCollector:
    enabled: false
```

Once created the `klusterletaddonconfig` on the hub, you will see addons installed in the managed cluster's `open-cluster-management-agent-addon` namespace.

```Shell
% oc get po -n open-cluster-management-agent-addon 
NAME                                         READY   STATUS    RESTARTS   AGE
klusterlet-addon-appmgr-948f88fd6-qmwzx      1/1     Running   0          4m8s
klusterlet-addon-operator-7794fc7476-fgsfh   1/1     Running   0          20m
klusterlet-addon-workmgr-746bbf5848-7z9m4    1/1     Running   0          11s
```

