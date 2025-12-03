---
title: Register a cluster via gRPC
weight: 3
---

gRPC-based registration provides an alternative connection mechanism for managed clusters to register with the hub cluster. Instead of each klusterlet agent connecting directly to the hub's Kubernetes API server, agents communicate through a gRPC server deployed on the hub. This approach offers better isolation and reduces the exposure of the hub API server to managed clusters.

## Overview

In the traditional registration model, each managed cluster's klusterlet agent requires a hub-kubeconfig with limited permissions to connect directly to the hub API server. The gRPC-based registration introduces a gRPC server on the hub that acts as an intermediary, providing the same registration process while changing only the connection mechanism.

### Benefits

- **Better isolation**: Managed cluster agents do not connect directly to the hub API server
- **Reduced hub API server exposure**: Only the gRPC server needs to be accessible to managed clusters
- **Maintained compatibility**: Uses the same underlying APIs (ManagedCluster, ManifestWork, etc.)
- **Enhanced security**: Provides an additional layer of abstraction between managed clusters and the hub control plane

## Architecture

The gRPC-based registration consists of:

1. **gRPC Server**: Deployed on the hub cluster, exposes gRPC endpoints for cluster registration
2. **gRPC Driver**: Implemented in both the klusterlet agent and hub components to handle gRPC communication
3. **CloudEvents Protocol**: Used for resource management operations (ManagedCluster, ManifestWork, CSR, Lease, Events, ManagedClusterAddOn)

## Prerequisites

- **OCM v1.1.0 or later** (when gRPC support was introduced)
- Hub cluster with cluster manager installed
- Network connectivity from managed clusters to the hub's gRPC server endpoint
- Ensure [kubectl](https://kubernetes.io/docs/tasks/tools/install-kubectl) and [kustomize](https://kubectl.docs.kubernetes.io/installation/kustomize/) are installed
- A method to expose the gRPC server (using Ingress, Route, or LoadBalancer)

### Network requirements

Configure your network settings for the managed clusters to allow the following connections:

| Direction | Endpoint                          | Protocol | Purpose                                | Used by                            |
|-----------|-----------------------------------|----------|----------------------------------------|------------------------------------|
| Outbound  | https://{hub-grpc-server-url}     | TCP      | gRPC server endpoint on the hub cluster | OCM agents on the managed clusters |

## Deploy the gRPC server on the hub

### Step 1: Configure the ClusterManager with gRPC support

To enable gRPC-based registration, you need to configure the ClusterManager resource with the following:

1. Add `grpc` to the `registrationDrivers` field under `registrationConfiguration`
2. Configure the `serverConfiguration` section with endpoint exposure

Here's a complete example ClusterManager configuration:

```yaml
apiVersion: operator.open-cluster-management.io/v1
kind: ClusterManager
metadata:
  name: cluster-manager
spec:
  # Registration configuration with gRPC driver
  registrationConfiguration:
    # Add gRPC to the list of registration drivers
    registrationDrivers:
      - authType: grpc
        grpc:
          # Optional: list of auto-approved identities
          autoApprovedIdentities: []

  # Server configuration for the gRPC server
  serverConfiguration:
    # Optional: specify custom image for the server
    # imagePullSpec: quay.io/open-cluster-management/registration:latest

    # Endpoint exposure configuration
    # This section configures how the gRPC server endpoint is exposed to managed clusters
    endpointsExposure:
      - protocol: grpc
        # Usage indicates this endpoint is for agent to hub communication
        usage: agentToHub
        grpc:
          type: hostname
          hostname:
            # The hostname where managed clusters will connect
            # This should match your Ingress/Route hostname
            host: hub-grpc.example.com
            # Optional: CA bundle for TLS (base64 encoded)
            # caBundle: LS0tLS1CRUdJTi...
```

Apply the configuration:

```shell
kubectl apply -f clustermanager.yaml --context ${CTX_HUB_CLUSTER}
```

### Step 2: Expose the gRPC server

The gRPC server needs to be exposed externally so that managed clusters can connect to it. You must create an Ingress, Route (for OpenShift), or LoadBalancer service to expose the gRPC server.

**Important**: The hostname in your Ingress/Route **must match** the `host` value specified in the ClusterManager's `serverConfiguration.endpointsExposure[].grpc.hostname.host` field.

**Option 1: Using Ingress (for Kubernetes)**

Create an Ingress resource to expose the gRPC server:

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: cluster-manager-grpc-server
  namespace: open-cluster-management-hub
  annotations:
    # For nginx ingress controller with gRPC support
    nginx.ingress.kubernetes.io/backend-protocol: "GRPC"
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
spec:
  ingressClassName: nginx
  rules:
    - host: hub-grpc.example.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: cluster-manager-grpc-server
                port:
                  number: 443
  tls:
    - hosts:
        - hub-grpc.example.com
      secretName: grpc-tls-secret
```

Apply the Ingress:

```shell
kubectl apply -f grpc-ingress.yaml --context ${CTX_HUB_CLUSTER}
```

**Option 2: Using Route (for OpenShift)**

Create a Route to expose the gRPC server:

```yaml
apiVersion: route.openshift.io/v1
kind: Route
metadata:
  name: cluster-manager-grpc-server
  namespace: open-cluster-management-hub
spec:
  to:
    kind: Service
    name: cluster-manager-grpc-server
    weight: 100
  port:
    targetPort: 8090
  tls:
    termination: passthrough
  wildcardPolicy: None
```

Apply the Route:

```shell
oc apply -f grpc-route.yaml --context ${CTX_HUB_CLUSTER}
```

### Step 3: Verify the gRPC server deployment

Check that the gRPC server is running on the hub cluster:

```shell
kubectl get pods -n open-cluster-management-hub --context ${CTX_HUB_CLUSTER}
```

You should see a pod named similar to `cluster-manager-grpc-server-*` in running state.

Check the gRPC server service:

```shell
kubectl get svc -n open-cluster-management-hub cluster-manager-grpc-server --context ${CTX_HUB_CLUSTER}
```

Verify your Ingress or Route is created and working:

```shell
# For Kubernetes Ingress
kubectl get ingress -n open-cluster-management-hub --context ${CTX_HUB_CLUSTER}

# For OpenShift Route
oc get route -n open-cluster-management-hub --context ${CTX_HUB_CLUSTER}
```

Test connectivity to the gRPC endpoint:

```shell
# Test DNS resolution and HTTPS connectivity
curl -v https://hub-grpc.example.com
```

## Register a managed cluster using gRPC

### Step 1: Generate the join token

Generate the join token on the hub cluster:

```shell
clusteradm get token --context ${CTX_HUB_CLUSTER}
```

This will output a command similar to:

```shell
clusteradm join --hub-token <token> --hub-apiserver <hub-api-url> --cluster-name <cluster-name>
```

### Step 2: Bootstrap the klusterlet

On the managed cluster, bootstrap the klusterlet. Use the gRPC server endpoint (the hostname configured in the ClusterManager):

{{< tabpane text=true >}}
{{% tab header="kind" %}}
```shell
clusteradm join \
    --hub-token <your token data> \
    --hub-apiserver https://hub-grpc.example.com \
    --cluster-name "cluster1" \
    --wait \
    --force-internal-endpoint-lookup \
    --context ${CTX_MANAGED_CLUSTER}
```
{{% /tab %}}
{{% tab header="k3s, openshift 4.X" %}}
```shell
clusteradm join \
    --hub-token <your token data> \
    --hub-apiserver https://hub-grpc.example.com \
    --cluster-name "cluster1" \
    --wait \
    --context ${CTX_MANAGED_CLUSTER}
```
{{% /tab %}}
{{< /tabpane >}}

### Step 3: Configure the klusterlet to use gRPC driver

After bootstrapping, configure the klusterlet to use the gRPC registration driver:

```shell
kubectl edit klusterlet --context ${CTX_MANAGED_CLUSTER}
```

Update the klusterlet configuration:

```yaml
spec:
  registrationConfiguration:
    # Specify the gRPC registration driver
    registrationDriver:
      authType: grpc
```

The klusterlet will automatically restart and re-register using the gRPC connection.

### Step 4: Accept the join request

On the hub cluster, accept the cluster registration request:

```shell
clusteradm accept --clusters cluster1 --context ${CTX_HUB_CLUSTER}
```

### Step 5: Verify the registration

Verify that the managed cluster is registered successfully:

```shell
kubectl get managedcluster cluster1 --context ${CTX_HUB_CLUSTER}
```

You should see output similar to:

```shell
NAME       HUB ACCEPTED   MANAGED CLUSTER URLS           JOINED   AVAILABLE   AGE
cluster1   true           https://hub-grpc.example.com   True     True        2m
```

Check the klusterlet status on the managed cluster:

```shell
kubectl get klusterlet -o yaml --context ${CTX_MANAGED_CLUSTER}
```

The klusterlet should show the gRPC registration driver in use:

```yaml
spec:
  registrationConfiguration:
    registrationDriver:
      authType: grpc
```

Check the klusterlet registration agent logs to verify gRPC connection:

```shell
kubectl logs -n open-cluster-management-agent deployment/klusterlet-registration-agent --context ${CTX_MANAGED_CLUSTER}
```

You should see log entries indicating successful gRPC connection to the hub.

## Important limitations

**Add-on compatibility**: Currently, add-ons are **not able to use the gRPC endpoint**. Add-ons will continue to connect directly to the hub cluster's Kubernetes API server even when the klusterlet is using gRPC-based registration. This means:

- You must ensure that add-ons can still reach the hub cluster's Kubernetes API server
- The network requirements for add-ons remain unchanged from the standard registration model
- This limitation may be addressed in future versions of OCM

## Configuration examples

### Complete ClusterManager configuration with both CSR and gRPC drivers

Here's an example that supports both traditional CSR-based and gRPC-based registration:

```yaml
apiVersion: operator.open-cluster-management.io/v1
kind: ClusterManager
metadata:
  name: cluster-manager
spec:
  registrationConfiguration:
    # Support both CSR (traditional) and gRPC registration
    registrationDrivers:
      # Keep CSR for backward compatibility
      - authType: csr
      # Add gRPC driver
      - authType: grpc
        grpc:
          # Optional: auto-approve specific identities
          autoApprovedIdentities:
            - system:serviceaccount:open-cluster-management:cluster-bootstrap

  serverConfiguration:
    # Optionally specify a custom image
    imagePullSpec: quay.io/open-cluster-management/registration:v0.15.0

    endpointsExposure:
      - protocol: grpc
        usage: agentToHub
        grpc:
          type: hostname
          hostname:
            host: hub-grpc.example.com
```

### ClusterManager configuration for OpenShift

For OpenShift environments, the configuration is the same:

```yaml
apiVersion: operator.open-cluster-management.io/v1
kind: ClusterManager
metadata:
  name: cluster-manager
spec:
  registrationConfiguration:
    registrationDrivers:
      - authType: grpc

  serverConfiguration:
    endpointsExposure:
      - protocol: grpc
        usage: agentToHub
        grpc:
          type: hostname
          hostname:
            # Use your OpenShift apps domain
            host: hub-grpc.apps.example.com
```

Then create a Route as shown in Step 2 to expose the service.

### Klusterlet configuration

The klusterlet configuration is simple - just specify the gRPC auth type:

```yaml
apiVersion: operator.open-cluster-management.io/v1
kind: Klusterlet
metadata:
  name: klusterlet
spec:
  clusterName: cluster1
  registrationConfiguration:
    registrationDriver:
      authType: grpc
```

The gRPC endpoint information is automatically provided through the bootstrap secret - no additional endpoint configuration is needed in the Klusterlet spec.

## Troubleshooting

### gRPC server not running

If the gRPC server pod is not running on the hub:

```shell
# Check pod status
kubectl get pods -n open-cluster-management-hub --context ${CTX_HUB_CLUSTER}

# Check pod logs
kubectl logs -n open-cluster-management-hub deployment/cluster-manager-grpc-server --context ${CTX_HUB_CLUSTER}

# Verify ClusterManager configuration
kubectl get clustermanager cluster-manager -o yaml --context ${CTX_HUB_CLUSTER}
```

Common issues:
- Missing `registrationDrivers` field with `grpc` authType in `registrationConfiguration`
- Missing `serverConfiguration` section
- Missing or incorrect `endpointsExposure` configuration
- Ensure the `protocol` field is set to `grpc` in `endpointsExposure`

### Ingress or Route not working

If you created an Ingress or Route but it's not working:

```shell
# Check Ingress
kubectl describe ingress cluster-manager-grpc-server -n open-cluster-management-hub --context ${CTX_HUB_CLUSTER}

# Check OpenShift Route
oc describe route cluster-manager-grpc-server -n open-cluster-management-hub --context ${CTX_HUB_CLUSTER}

# Verify the service exists
kubectl get svc cluster-manager-grpc-server -n open-cluster-management-hub --context ${CTX_HUB_CLUSTER}
```

Verify that:
- Your Ingress controller supports gRPC (e.g., nginx-ingress with gRPC support enabled)
- The hostname in the ClusterManager's `endpointsExposure` matches the Ingress/Route hostname exactly
- DNS is properly configured to resolve the hostname
- TLS certificates are valid and properly configured

For nginx-ingress, ensure you have the gRPC backend annotation:
```yaml
annotations:
  nginx.ingress.kubernetes.io/backend-protocol: "GRPC"
```

### Connection issues from managed cluster

If the managed cluster cannot connect to the gRPC server:

1. Verify network connectivity from the managed cluster:
   ```shell
   # From a pod in the managed cluster or from a node
   curl -v https://hub-grpc.example.com
   ```

2. Check klusterlet registration agent logs:
   ```shell
   kubectl logs -n open-cluster-management-agent deployment/klusterlet-registration-agent --context ${CTX_MANAGED_CLUSTER}
   ```

3. Verify the klusterlet configuration:
   ```shell
   kubectl get klusterlet -o jsonpath='{.spec.registrationConfiguration.registrationDriver.authType}' --context ${CTX_MANAGED_CLUSTER}
   ```

   Expected output: `grpc`

4. Check the bootstrap secret for gRPC configuration:
   ```shell
   kubectl get secret bootstrap-hub-kubeconfig -n open-cluster-management-agent -o yaml --context ${CTX_MANAGED_CLUSTER}
   ```

### TLS certificate issues

If you encounter TLS certificate validation errors:

1. Verify the CA bundle is correctly configured in the ClusterManager (if using custom CA):
   ```shell
   kubectl -n open-cluster-management-hub get cm ca-bundle-configmap -ojsonpath='{.data.ca-bundle\.crt}'
   kubectl -n open-cluster-management-hub get secrets signer-secret -ojsonpath="{.data.tls\.crt}"
   kubectl -n open-cluster-management-hub get secrets signer-secret -ojsonpath="{.data.tls\.key}"
   ```

2. Check certificate validity:
   ```shell
   echo | openssl s_client -connect hub-grpc.example.com:443 2>/dev/null | openssl x509 -noout -dates
   ```

3. Verify the certificate matches the hostname:
   ```shell
   echo | openssl s_client -connect hub-grpc.example.com:443 2>/dev/null | openssl x509 -noout -text | grep DNS
   ```

### Registration driver mismatch

If you see errors related to registration driver:

```shell
# Verify the registration driver is set to grpc
kubectl get klusterlet -o jsonpath='{.spec.registrationConfiguration.registrationDriver.authType}' --context ${CTX_MANAGED_CLUSTER}
```

Expected output: `grpc`

If the driver is not set or incorrect:
```shell
kubectl edit klusterlet --context ${CTX_MANAGED_CLUSTER}
```

And ensure:
```yaml
spec:
  registrationConfiguration:
    registrationDriver:
      authType: grpc
```

### Add-on connection issues

Remember that **add-ons cannot use the gRPC endpoint** in the current version. If you experience add-on connection issues:

1. Ensure that add-ons can still reach the hub cluster's Kubernetes API server directly
2. Verify network policies allow add-on traffic to the hub API server
3. Check add-on agent logs for connection errors:
   ```shell
   kubectl logs -n open-cluster-management-agent-addon <addon-pod-name> --context ${CTX_MANAGED_CLUSTER}
   ```

## Next steps

- Learn about [add-on management]({{< ref "addon-management.md" >}})
- Explore [ManifestWork]({{< ref "/docs/concepts/manifestwork" >}}) for deploying resources to managed clusters
- Review the [register a cluster]({{< ref "register-a-cluster.md" >}}) documentation for standard API-based registration
