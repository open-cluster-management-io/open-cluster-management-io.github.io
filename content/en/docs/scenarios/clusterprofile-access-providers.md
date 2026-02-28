---
title: ClusterProfile Access Providers
weight: 1
---

The [Cluster Inventory API](https://multicluster.sigs.k8s.io/concepts/cluster-profile-api/) provides a standardized interface for representing cluster properties and status. OCM's ClusterProfile access provider feature enables applications running on the hub cluster to discover and access managed clusters dynamically without managing kubeconfig files directly.

Hub applications (such as MultiKueue, Argo CD, or custom controllers) can reference ClusterProfile objects to obtain credentials and connection information automatically. This significantly reduces the management overhead for multi-cluster applications.

## How It Works

When enabled, OCM creates ClusterProfile objects that contain:
- Cluster connection information (API server endpoint, certificate authority)
- Access provider references (credentials for authentication)

Hub applications can then:
1. Discover available clusters by querying ClusterProfile objects
2. Authenticate using the access provider plugin (`cp-creds`)
3. Dynamically connect to managed clusters as needed

ClusterProfile objects are scoped to namespaces via ManagedClusterSetBinding, providing permission isolation between different hub applications.

## Hub Cluster Setup

### Step 1: Enable ClusterProfile Feature Gate

Initialize or update the OCM hub with the ClusterProfile feature gate:

```shell
clusteradm init --feature-gates=ClusterProfile=true
```

This enables the registration controller to maintain ClusterProfile objects for managed clusters. Instead of creating ClusterProfile objects for all managed clusters, the controller only creates them for clusters selected by a ManagedClusterSet that is bound to a ManagedClusterSetBinding.

This design provides permission isolation - different hub applications can access different sets of clusters. For example:
- MultiKueue can bind to a ManagedClusterSet with compute clusters in the `kueue-system` namespace
- Argo CD can bind to a different ManagedClusterSet with deployment targets in the `argocd` namespace

### Step 2: Create ManagedClusterSet and ManagedClusterSetBinding

For each consumer application, create a namespace and bind it to a ManagedClusterSet. This makes ClusterProfile objects available in the consumer's namespace.

Example for a consumer application in namespace `my-app`:

```yaml
apiVersion: cluster.open-cluster-management.io/v1beta2
kind: ManagedClusterSet
metadata:
  name: my-app-clusters
spec:
  clusterSelector:
    labelSelector: {}  # Adjust to select specific clusters
    selectorType: LabelSelector
---
apiVersion: cluster.open-cluster-management.io/v1beta2
kind: ManagedClusterSetBinding
metadata:
  name: my-app-clusters
  namespace: my-app
spec:
  clusterSet: my-app-clusters
```

Verify ClusterProfile objects are created:

```shell
kubectl -n my-app get clusterprofiles
```

### Step 3: Install cluster-proxy Addon

The cluster-proxy addon provides connectivity from the hub to managed cluster API servers and provisions access providers for ClusterProfile objects.

**Important**: You must enable the following flags for ClusterProfile support:
- `userServer.enabled=true` - Enable the user server for cluster proxy
- `enableServiceProxy=true` - Enable service proxy functionality
- `featureGates.clusterProfileAccessProvider=true` - **Required** to provision access providers for ClusterProfile

```shell
helm install cluster-proxy ocm/cluster-proxy \
  -n open-cluster-management-addon \
  --create-namespace \
  --set userServer.enabled=true \
  --set enableServiceProxy=true \
  --set featureGates.clusterProfileAccessProvider=true
```

### Step 4: Install managed-serviceaccount Addon

The managed-serviceaccount addon enables hub applications to authenticate to managed clusters using dynamically provisioned service account tokens.

**Important**: You must enable the feature gate for ClusterProfile credential syncing:
- `featureGates.clusterProfileCredSyncer=true` - **Required** to sync ManagedServiceAccount credentials to ClusterProfile objects

```shell
helm install managed-serviceaccount ocm/managed-serviceaccount \
  -n open-cluster-management-addon \
  --create-namespace \
  --set featureGates.clusterProfileCredSyncer=true
```

### Step 5: Create ManagedServiceAccount Resources

Create a ManagedServiceAccount in each managed cluster's namespace on the hub. These service accounts will be created on the managed clusters and their tokens synced to the ClusterProfile.

**Important**: The label `authentication.open-cluster-management.io/sync-to-clusterprofile: "true"` is required to sync credentials to ClusterProfile objects.

Example for accessing managed clusters `cluster1` and `cluster2` from a consumer named `my-app`:

```yaml
apiVersion: authentication.open-cluster-management.io/v1beta1
kind: ManagedServiceAccount
metadata:
  name: my-app
  namespace: cluster1
  labels:
    authentication.open-cluster-management.io/sync-to-clusterprofile: "true"
spec:
  rotation:
    enabled: true
    validity: 8640h0m0s
---
apiVersion: authentication.open-cluster-management.io/v1beta1
kind: ManagedServiceAccount
metadata:
  name: my-app
  namespace: cluster2
  labels:
    authentication.open-cluster-management.io/sync-to-clusterprofile: "true"
spec:
  rotation:
    enabled: true
    validity: 8640h0m0s
```

### Step 6: Install cluster-permission Addon (Optional)

To grant specific permissions to the managed service accounts on managed clusters, install the cluster-permission addon:

```shell
helm install cluster-permission ocm/cluster-permission \
  -n open-cluster-management \
  --create-namespace
```

Then create ClusterPermission resources in each managed cluster namespace to define the required RBAC permissions.

## Consumer Application Setup

Applications consuming ClusterProfile objects need to:
1. Mount the `cp-creds` executable plugin
2. Configure the credentials provider in their application config

### Mount the Access Provider Plugin

The ClusterProfile access provider uses an executable plugin (`cp-creds`) that must be available in the consumer application's pods. The plugin is included in the managed-serviceaccount image.

**Option 1: Using initContainers**

Use an initContainer to copy the plugin to a shared volume:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app-controller
  namespace: my-app
spec:
  template:
    spec:
      initContainers:
      - name: install-cp-creds
        image: quay.io/open-cluster-management/cp-creds:latest
        command: ["cp", "/cp-creds", "/plugins/cp-creds"]
        volumeMounts:
        - name: clusterprofile-plugins
          mountPath: "/plugins"
      containers:
      - name: controller
        volumeMounts:
        - name: clusterprofile-plugins
          mountPath: "/plugins"
      volumes:
      - name: clusterprofile-plugins
        emptyDir: {}
```

**Option 2: Using Image Volumes (Kubernetes 1.35+)**

Kubernetes 1.35+ supports [mounting content from OCI registries](https://kubernetes.io/docs/tasks/configure-pod-container/image-volumes/) directly:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app-controller
  namespace: my-app
spec:
  template:
    spec:
      containers:
      - name: controller
        volumeMounts:
        - name: clusterprofile-plugins
          mountPath: "/plugins"
      volumes:
      - name: clusterprofile-plugins
        image:
          reference: quay.io/open-cluster-management/cp-creds:latest
          pullPolicy: IfNotPresent
```

### Configure the Credentials Provider

Configure your application to use the ClusterProfile credentials provider. The configuration method varies by application.

**Key configuration elements:**
- **Provider name**: Must match the `accessProviders` name in ClusterProfile objects (use `open-cluster-management`)
- **Command**: Path to the `cp-creds` executable (e.g., `/plugins/cp-creds`)
- **ManagedServiceAccount name**: The name of the ManagedServiceAccount resources created in step 5

The plugin uses the Kubernetes [client-go credential plugin](https://kubernetes.io/docs/reference/access-authn-authz/authentication/#client-go-credential-plugins) mechanism with `execConfig`.

### Verify the Setup

Verify that ClusterProfile objects contain the access provider configuration:

```shell
kubectl -n my-app get clusterprofile <cluster-name> -o yaml
```

Look for the `accessProviders` section with provider name `open-cluster-management`, an example of clusterprofile would be like:

```yaml
apiVersion: multicluster.x-k8s.io/v1alpha1
kind: ClusterProfile
metadata:
  labels:
    multicluster.x-k8s.io/clusterset: default
    open-cluster-management.io/cluster-name: cluster1
    x-k8s.io/cluster-manager: open-cluster-management
  name: cluster1
spec:
  clusterManager:
    name: open-cluster-management
  displayName: cluster1
status:
  accessProviders:
  - cluster:
      certificate-authority-data: <ENCODED_CA_DATA>
      extensions:
      - extension:
          clusterName: cluster1
        name: client.authentication.k8s.io/exec
      server: https://cluster-proxy-addon-user.open-cluster-management-addon:9092/cluster1
    name: open-cluster-management
```

## Example: MultiKueue Integration

This example shows complete configuration for MultiKueue, which uses ClusterProfile to discover and access worker clusters for federated job scheduling.

### Create ManagedClusterSet for MultiKueue

```yaml
apiVersion: cluster.open-cluster-management.io/v1beta2
kind: ManagedClusterSet
metadata:
  name: multikueue
spec:
  clusterSelector:
    labelSelector: {}
    selectorType: LabelSelector
---
apiVersion: cluster.open-cluster-management.io/v1beta2
kind: ManagedClusterSetBinding
metadata:
  name: multikueue
  namespace: kueue-system
spec:
  clusterSet: multikueue
```

### Create ManagedServiceAccounts

```yaml
apiVersion: authentication.open-cluster-management.io/v1beta1
kind: ManagedServiceAccount
metadata:
  name: multikueue
  namespace: cluster1
  labels:
    authentication.open-cluster-management.io/sync-to-clusterprofile: "true"
spec:
  rotation:
    enabled: true
    validity: 8640h0m0s
---
apiVersion: authentication.open-cluster-management.io/v1beta1
kind: ManagedServiceAccount
metadata:
  name: multikueue
  namespace: cluster2
  labels:
    authentication.open-cluster-management.io/sync-to-clusterprofile: "true"
spec:
  rotation:
    enabled: true
    validity: 8640h0m0s
```

### Configure Kueue Controller

Update the Kueue manager configuration:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: kueue-manager-config
  namespace: kueue-system
data:
  controller_manager_config.yaml: |
    apiVersion: config.kueue.x-k8s.io/v1beta2
    kind: Configuration
    featureGates:
      MultiKueueClusterProfile: true
    multiKueue:
      clusterProfile:
        credentialsProviders:
        - name: open-cluster-management
          execConfig:
            apiVersion: client.authentication.k8s.io/v1
            command: /plugins/cp-creds
            args:
            - --managed-serviceaccount=multikueue
            provideClusterInfo: true
            interactiveMode: Never
```

### Mount Plugin in Kueue Deployment

Patch the Kueue controller to mount the plugin (using image volume):

```shell
kubectl patch deploy kueue-controller-manager -n kueue-system --type='json' -p='[
  {
    "op": "add",
    "path": "/spec/template/spec/volumes/-",
    "value": {
      "name": "clusterprofile-plugins",
      "image": {
        "reference": "quay.io/open-cluster-management/cp-creds:latest",
        "pullPolicy": "IfNotPresent"
      }
    }
  },
  {
    "op": "add",
    "path": "/spec/template/spec/containers/0/volumeMounts/-",
    "value": {
      "name": "clusterprofile-plugins",
      "mountPath": "/plugins"
    }
  }
]'
```

### Create MultiKueueCluster Resources

Create MultiKueueCluster resources that reference the ClusterProfile objects:

```yaml
apiVersion: kueue.x-k8s.io/v1beta2
kind: MultiKueueCluster
metadata:
  name: cluster1
spec:
  clusterSource:
    clusterProfileRef:
      name: cluster1
---
apiVersion: kueue.x-k8s.io/v1beta2
kind: MultiKueueCluster
metadata:
  name: cluster2
spec:
  clusterSource:
    clusterProfileRef:
      name: cluster2
```

### Verify MultiKueue Setup

```shell
# Check ClusterProfiles
kubectl -n kueue-system get clusterprofiles

# Check MultiKueueClusters
kubectl get multikueuecluster

# Verify a specific MultiKueueCluster is active
kubectl get multikueuecluster cluster1 -o jsonpath='{.status.conditions}'
```
