---
title: Install Cluster-Lifecycle
weight: 1
---

Cluster-Lifecycle has the following components:
- managedcluster-import-controller
  - a controller help you generate import command. It can also manage klusterlet on managed cluster.

<!-- spellchecker-disable -->

{{< toc >}}

<!-- spellchecker-enable -->

## Prerequisite

Ensure [kubectl](https://kubernetes.io/docs/tasks/tools/install-kubectl) and [kustomize](https://kubernetes-sigs.github.io/kustomize/installation) are installed.

Prepare one [OKD 4](https://www.okd.io/) cluster to function as the hub.

[Install Cluster Manager](../install-cluster-manager) for more information.

Install [Hive](https://github.com/openshift/hive/blob/master/docs/install.md#installing-community-release-via-operatorhub) on the hub.

Create namespace `open-cluster-management` on the hub for cluster-lifecycle components.

## Install managedcluster-import-controller from source

Clone the `managedcluster-import-controller` repo:

```Shell
git clone https://github.com/open-cluster-management/managedcluster-import-controller.git
cd managedcluster-import-controller
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
managedcluster-import-controller-686b9dff46-flk9d   1/1     Running   0          6m47s
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

