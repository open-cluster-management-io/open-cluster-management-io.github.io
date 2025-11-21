---
title: Cluster Proxy Now Supports "Service Proxy" — An Easy Way to Access Services in Managed Clusters
date: 2025-11-11
author: Zhao Xue [@xuezhaojun](https://github.com/xuezhaojun)
toc_hide: true
---

## Introduction

Cluster Proxy is an [OCM addon](https://github.com/open-cluster-management-io/cluster-proxy) that provides L4 network connectivity between hub and managed clusters through a reverse proxy tunnel. In previous versions, accessing services on managed clusters through cluster-proxy required using a specialized Go package, the [konnectivity client](https://github.com/open-cluster-management-io/cluster-proxy/blob/main/examples/test-client.md).

With the new v0.9.0 release, we've introduced a more convenient approach — "Service Proxy". This feature provides an HTTPS service that allows users to access the kube-apiserver and other services in managed clusters through a specific URL structure. Additionally, it introduces a more user-friendly authentication and authorization mechanism using **Impersonation**, enabling users to authenticate and authorize against the managed cluster's kube-apiserver using their hub user token.

Let's set up a simple test environment to demonstrate these new capabilities.

## Setting Up the Environment

First, create a basic OCM environment with one hub cluster and one managed cluster.

Create a hub cluster with port mapping for the proxy-entrypoint service. The `extraPortMappings` configuration exposes port 30091 from the container to the host machine, allowing external access to the proxy service:

```bash
# Create hub cluster with port mapping for proxy-entrypoint service
cat <<EOF | kind create cluster --name "hub" --config=-
kind: Cluster
apiVersion: kind.x-k8s.io/v1alpha4
nodes:
- role: control-plane
  extraPortMappings:
  - containerPort: 30091
    hostPort: 30091
    protocol: TCP
EOF

# Create managed cluster
kind create cluster --name "managed"

# Initialize the OCM hub cluster
echo "Initializing the OCM hub cluster..."
clusteradm init --wait --context kind-hub

# Get join command from hub
joincmd=$(clusteradm get token --context kind-hub | grep clusteradm)

# Join managed cluster to hub
echo "Joining managed cluster to hub..."
$(echo ${joincmd} --force-internal-endpoint-lookup --wait --context kind-managed | sed "s/<cluster_name>/managed/g")

# Accept the managed cluster
echo "Accepting managed cluster..."
clusteradm accept --context kind-hub --clusters managed --wait

# Verify the setup
echo "Verifying the setup..."
kubectl get managedclusters --all-namespaces --context kind-hub
```

## Installing Cluster Proxy

Next, install the Cluster Proxy addon following the [official installation guide](https://open-cluster-management.io/docs/getting-started/integration/cluster-proxy/):

```shell
helm repo add ocm https://open-cluster-management.io/helm-charts/
helm repo update
helm search repo ocm/cluster-proxy
```

Verify that the CHART VERSION is v0.9.0 or later:

```shell
$ helm search repo ocm/cluster-proxy
NAME                    CHART VERSION   APP VERSION     DESCRIPTION
ocm/cluster-proxy       0.9.0           1.1.0           A Helm chart for Cluster-Proxy OCM Addon
```

### Setting Up TLS Certificates

The new deployment `cluster-proxy-addon-user` requires server certificates for its HTTPS service, otherwise the deployment will hang in the container creating state:

To create the certificates, first install cert-manager:

```shell
kubectl --context kind-hub apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.17.0/cert-manager.yaml
kubectl --context kind-hub wait --for=condition=ready pod -l app.kubernetes.io/instance=cert-manager -n cert-manager --timeout=300s
```

Next, create the certificate resources using the kind cluster's root CA. This approach allows all pods and services in the kind cluster to automatically trust the cluster-proxy certificates without requiring additional CA certificate mounting:

```shell
# Create namespace and certificates using kind cluster's CA
kubectl --context kind-hub create namespace open-cluster-management-addon
CA_CRT=$(kubectl --context kind-hub config view --raw -o jsonpath='{.clusters[?(@.name=="kind-hub")].cluster.certificate-authority-data}')
CA_KEY=$(docker exec hub-control-plane cat /etc/kubernetes/pki/ca.key | base64 -w 0)

kubectl --context kind-hub apply -f - <<EOF
apiVersion: v1
kind: Secret
metadata:
  name: kind-cluster-ca
  namespace: open-cluster-management-addon
type: kubernetes.io/tls
data:
  tls.crt: ${CA_CRT}
  tls.key: ${CA_KEY}
---
apiVersion: cert-manager.io/v1
kind: Issuer
metadata:
  name: kind-ca-issuer
  namespace: open-cluster-management-addon
spec:
  ca:
    secretName: kind-cluster-ca
---
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: cluster-proxy-user-serving-cert
  namespace: open-cluster-management-addon
spec:
  secretName: cluster-proxy-user-serving-cert
  duration: 8760h  # 1 year
  renewBefore: 720h  # 30 days
  commonName: cluster-proxy-addon-user.open-cluster-management-addon.svc
  dnsNames:
    - cluster-proxy-addon-user
    - cluster-proxy-addon-user.open-cluster-management-addon
    - cluster-proxy-addon-user.open-cluster-management-addon.svc
    - cluster-proxy-addon-user.open-cluster-management-addon.svc.cluster.local
  privateKey:
    algorithm: RSA
    size: 2048
  issuerRef:
    name: kind-ca-issuer
    kind: Issuer
EOF
```

Verify the secret is created:

```shell
kubectl --context kind-hub get secret -n open-cluster-management-addon cluster-proxy-user-serving-cert
```

### Installing the Cluster Proxy Helm Chart

Now install the cluster-proxy addon with the necessary configuration:

```shell
# Set the gateway IP address for the proxy server
# This is the Docker gateway IP that allows the Kind cluster to communicate with services
# running on the host machine. The managed cluster will use this address to connect
# to the proxy server running in the hub cluster.
GATEWAY_IP=$(docker inspect hub-control-plane --format '{{.NetworkSettings.Networks.kind.IPAddress}}')

kubectl config use-context kind-hub
helm install -n open-cluster-management-addon --create-namespace \
    cluster-proxy ocm/cluster-proxy \
    --set "proxyServer.entrypointAddress=${GATEWAY_IP}" \
    --set "proxyServer.port=30091" \
    --set "enableServiceProxy=true"
```

To expose the proxy server to the managed clusters, we need to create a service that makes the proxy server accessible from the external network.

```shell
cat <<'EOF' | kubectl --context kind-hub apply -f -
apiVersion: v1
kind: Service
metadata:
  name: proxy-entrypoint-external
  namespace: open-cluster-management-addon
  labels:
    app: cluster-proxy
    component: proxy-entrypoint-external
spec:
  type: NodePort
  selector:
    proxy.open-cluster-management.io/component-name: proxy-server
  ports:
  - name: agent-server
    port: 8091
    targetPort: 8091
    nodePort: 30091
    protocol: TCP
EOF
```

### Verifying the Deployment

After completing the installation, verify that the `cluster-proxy-addon-user` deployment and service have been created and are running in the `open-cluster-management-addon` namespace:

```shell
kubectl get deploy -n open-cluster-management-addon
NAME                       READY   UP-TO-DATE   AVAILABLE   AGE
cluster-proxy-addon-user   1/1     1            1           10s
```

```shell
kubectl get svc -n open-cluster-management-addon
NAME                       TYPE        CLUSTER-IP     EXTERNAL-IP   PORT(S)   AGE
cluster-proxy-addon-user   ClusterIP   10.96.100.100   <none>        443/TCP   10s
```

## Using Service Proxy to Access Managed Clusters

Now that the installation is complete, let's demonstrate how to use the Service Proxy feature to access resources in managed clusters. We'll access pods in the `open-cluster-management-agent` namespace in the `managed` cluster, which will also showcase the impersonation authentication mechanism.

### Creating a Hub User

First, create a hub user (a service account in the hub cluster) named `test-sa`:

```
kubectl --context kind-hub create serviceaccount -n open-cluster-management-hub test-sa
```

### Configuring RBAC Permissions

Next, create a Role and RoleBinding in the `managed` cluster to grant the `test-sa` user permission to list and get pods in the `open-cluster-management-agent` namespace:

```
kubectl --context kind-managed apply -f - <<EOF
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: test-sa-rolebinding
  namespace: open-cluster-management-agent
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: Role
  name: test-sa-role
subjects:
- kind: User
  name: cluster:hub:system:serviceaccount:open-cluster-management-hub:test-sa
  apiGroup: rbac.authorization.k8s.io
---
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: test-sa-role
  namespace: open-cluster-management-agent
rules:
- apiGroups: [""]
  resources: ["pods"]
  verbs: ["get", "list"]
EOF
```

**Important Note:**

- The `User` name follows the format `cluster:hub:system:serviceaccount:<namespace>:<serviceaccount>`, where `<namespace>` and `<serviceaccount>` are the namespace and name of the service account in the hub cluster.
- Alternatively, you can use [cluster-permission](https://github.com/open-cluster-management-io/cluster-permission) to create roles and role bindings from the hub cluster side.

### Generating an Access Token

Generate a token for the `test-sa` service account:

```shell
TOKEN=$(kubectl --context kind-hub -n open-cluster-management-hub create token test-sa)
```

### Testing the Service Proxy

Now let's test accessing pods in the `managed` cluster through the `cluster-proxy-addon-user` service. We'll start a debug container in the hub cluster and use curl to make the request:

```bash
POD=$(kubectl get pods -n open-cluster-management-addon -l component=cluster-proxy-addon-user --field-selector=status.phase=Running -o jsonpath='{.items[0].metadata.name}')

kubectl debug -it $POD -n open-cluster-management-addon --image=praqma/network-multitool -- sh -c "curl -k -H 'Authorization: Bearer $TOKEN' https://cluster-proxy-addon-user.open-cluster-management-addon.svc.cluster.local:9092/managed/api/v1/namespaces/open-cluster-management-agent/pods"
```

The URL structure for accessing resources is:

```
https://cluster-proxy-addon-user.<namespace>.svc.cluster.local:9092/<cluster-name>/<kubernetes-api-path>
```

You should see a JSON response listing the pods in the `open-cluster-management-agent` namespace of the `managed` cluster, demonstrating successful authentication and authorization through the impersonation mechanism.

## Summary

In this blog post, we've demonstrated the new Service Proxy feature introduced in cluster-proxy v0.9.0. The key highlights include:

- **Service Proxy**: A new HTTPS-based method to access services in managed clusters without requiring the konnectivity client package
- **Impersonation**: A user-friendly authentication mechanism that allows hub users to access managed cluster resources using their hub tokens
- **Simple URL Structure**: Access managed cluster resources through a straightforward URL pattern

These features significantly simplify the process of accessing managed cluster services, making it easier to build tools and integrations on top of OCM's multi-cluster management capabilities.

We hope you find these new features useful! For more information, please visit the [cluster-proxy GitHub repository](https://github.com/open-cluster-management-io/cluster-proxy).
