---
title: Install Cluster Lifecycle
weight: 3
---

After the cluster manager and [Hive](https://github.com/openshift/hive/blob/master/docs/install.md#installing-community-release-via-operatorhub) are installed on [OKD 4](https://www.okd.io/), you could install the Cluster Lifecycle components to the hub cluster.

Cluster Lifecycle has the following component:
- managedcluster-import-controller: A controller that generates an import command. It also manages the Klusterlet on a managed cluster.
- console: A graphical user interface for managing clusters. Requires [OKD 4](https://www.okd.io/)

<!-- spellchecker-disable -->

{{< toc >}}

<!-- spellchecker-enable -->

## Prerequisite

You must meet the following prerequisites to use the cluster lifecycle:

- Ensure [kubectl](https://kubernetes.io/docs/tasks/tools/install-kubectl) and [kustomize](https://kubernetes-sigs.github.io/kustomize/installation) are installed.

- Ensure [npm](https://nodejs.org/en/download/) is installed.

- Prepare one [OKD 4](https://www.okd.io/) cluster to function as the _cluster manager_.  NOTE: This is required for console oauth authentication. (The use of _kind_ is not supported)

- Install a cluster manager. See [Install Cluster Manager](../install-cluster-manager) for more information.

- Install [Hive](https://github.com/openshift/hive/blob/master/docs/install.md#installing-community-release-via-operatorhub) on the _cluster manager_.

## Install managedcluster-import-controller from the source files

1. Clone the `managedcluster-import-controller` repo:

   ```Shell
   git clone https://github.com/open-cluster-management/managedcluster-import-controller.git
   cd managedcluster-import-controller
   ```
2. Clone the `console` repo:

  ```Shell
  git clone https://github.com/open-cluster-management/console.git
  cd console
  ```

3. Ensure the `kubectl` context is set to point to the _cluster manager_ cluster:

   ```Shell
   kubectl cluster-info
   ```

4. Create the `open-cluster-management` namespace on the _cluster manager_ if you haven't already created it:
   ```Shell
   kubectl create ns open-cluster-management
   ```

5. Deploy `managedcluster-import-controller` in the `open-cluster-management` namespace:

   ```Shell
   kubectl apply -k overlays/community
   ```

6. Verify `managedcluster-import-controller` is running:
   ```Shell
   $ kubectl get po -n open-cluster-management | grep managedcluster-import-controller   
   managedcluster-import-controller-686b9dff46-flk9d   1/1     Running   0          6m47s
   ```

## Install console from the source files

1. Clone the `console` repo:

 ```Shell
 git clone https://github.com/open-cluster-management/console.git
 cd console
 ```

2. Install node dependencies

```Shell
npm ci
```

3. Setup the environment to connect to the open-cluster-management kubernetes cluster.

```Shell
npm run setup
```

This will create a `.env` file in the backend directory containing the environment variables.

## Start the services locally
```Shell
npm start
```

This will start the frontend and the backend in parallel.  (It may take up to 30 seconds for the UI to appear in your preferred web browser at URL https://localhost:3000/multicloud)

The frontend will proxy requests to the backend using react scripts.

The backend will proxy requests to the kubernetes cluster specified by CLUSTER_API_URL in backend/.env.


Sample `npm start` output:
```
[ backend] DEBUG:process start  NODE_ENV:development  cpus:16  memory:16GB  nodeVersion:14.15.0  logLevel:debug
[ backend] DEBUG:server start  secure:true
[ backend] DEBUG:server listening  port:4000
[frontend] ℹ ｢wds｣: Project is running at https://192.168.1.12/
[frontend] ℹ ｢wds｣: webpack output is served from /multicloud
[frontend] ℹ ｢wds｣: Content not from webpack is served from /Users/johndoe/console/frontend/public
[frontend] ℹ ｢wds｣: 404s will fallback to /multicloud/
[frontend] Starting the development server...
[frontend]
[frontend] Compiled successfully!
[frontend]
[frontend] You can now view @open-cluster-management/console-frontend in the browser.
[frontend]
[frontend]   Local:            https://localhost:3000/multicloud
[frontend]   On Your Network:  https://192.168.1.12:3000/multicloud
[frontend]
[frontend] Note that the development build is not optimized.
[frontend] To create a production build, use npm run build.
[frontend]
[ backend]  INFO:Not Found  status:404  method:GET  path:/common/username/  ms:11.14
[ backend]  INFO:stream start  status:200  method:GET  path:/watch  events:112
[ backend]  INFO:Unauthorized  status:401  method:GET  path:/version/  ms:180.62
[ backend]  INFO:Found  status:302  method:GET  path:/login  ms:2.58
[ backend]  INFO:Unauthorized  status:401  method:POST  path:/apis/authorization.k8s.io/v1/selfsubjectaccessreviews  ms:141.4
[ backend]  INFO:Unauthorized  status:401  method:POST  path:/apis/authorization.k8s.io/v1/selfsubjectaccessreviews  ms:145.21
[ backend]  INFO:Found  status:302  method:GET  path:/login  ms:0.76
[ backend]  INFO:OK  status:200  method:GET  path:/watch  ms:1383.33
```

## Next steps

### Auto register a Hive-created cluster
1. If you created a OKD/Openshift cluster using [Hive](https://github.com/openshift/hive/blob/master/docs/using-hive.md#using-hive), you can auto-import the cluster by simply creating a managedcluster resource:

   ```Shell
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
   $ kubectl get managedcluster                                                                                                    
   NAME        HUB ACCEPTED   MANAGED CLUSTER URLS   JOINED   AVAILABLE   AGE
   hive-test   true                                  True     True        10m

   ```


### Manually register a cluster

1. Create a managedcluster resource:

   ```Shell
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
   $ kubectl get managedcluster                                                                                                    
   NAME        HUB ACCEPTED   MANAGED CLUSTER URLS   JOINED   AVAILABLE   AGE
   test-name   true                                  True     True        21m
   ```

 ### Manually register a cluster

 1. Create a managedcluster resource:

    ```Shell
    apiVersion: cluster.open-cluster-management.io/v1
    kind: ManagedCluster
    metadata:
      name: CLUSTER_NAME
    spec:
      hubAcceptsClient: true
    ```
