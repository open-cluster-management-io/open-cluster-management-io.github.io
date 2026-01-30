---
title: Register a cluster
weight: 2
---

After the cluster manager is installed on the hub cluster, you need to install the klusterlet agent on another cluster so that it can be registered and managed by the hub cluster.



## Prerequisites

- The managed clusters should be `v1.11+`.
- Ensure [kubectl](https://kubernetes.io/docs/tasks/tools/install-kubectl) and [kustomize](https://kubectl.docs.kubernetes.io/installation/kustomize/) are installed.

### Network requirements

Configure your network settings for the managed clusters to allow the following connections.

| Direction | Endpoint                            | Protocol | Purpose                                  | Used by                                                                  |
|-----------|-------------------------------------|----------|------------------------------------------|--------------------------------------------------------------------------|
| Outbound  | https://{hub-api-server-url}:{port} | TCP      | Kubernetes API server of the hub cluster | OCM agents, including the add-on agents, running on the managed clusters |

To use a proxy, please make sure the proxy server is well configured to allow the above connections and the proxy server is reachable for the managed clusters. See [Register a cluster to hub through proxy server]({{< ref "/docs/scenarios/register-cluster-through-proxy/" >}}) for more details.

## Install clusteradm CLI tool

It's recommended to run the following command to download and install **the
latest release** of the `clusteradm` command-line tool:

```shell
curl -L https://raw.githubusercontent.com/open-cluster-management-io/clusteradm/main/install.sh | bash
```

You can also install **the latest development version** (main branch) by running:

```shell
# Installing clusteradm to $GOPATH/bin/
GO111MODULE=off go get -u open-cluster-management.io/clusteradm/...
```

## Bootstrap a klusterlet

Before actually installing the OCM components into your clusters, export
the following environment variables in your terminal before running our
command-line tool `clusteradm` so that it can correctly discriminate the managed cluster:

```Shell
# The context name of the clusters in your kubeconfig
export CTX_HUB_CLUSTER=<your hub cluster context>
export CTX_MANAGED_CLUSTER=<your managed cluster context>
```

Copy the previously generated command -- `clusteradm join`, and add the arguments respectively based
on your deployment scenario.

**NOTE**: If there is no configmap `kube-root-ca.crt` in kube-public namespace of the hub cluster,
the flag --ca-file should be set to provide a valid hub ca file to help set
up the external client.

### Understanding deployment scenarios

Before running the `clusteradm join` command, understand your deployment scenario:

- **Both hub and managed clusters are local (e.g., kind)**: Use `--force-internal-endpoint-lookup` flag. Both clusters must be able to reach each other over the network (typically when running on the same machine).

- **Managed cluster is on a cloud provider (GKE, AKS, etc.)**: The `--hub-apiserver` URL must be a network-accessible endpoint that the cloud-hosted managed cluster can reach. A localhost URL (e.g., `https://127.0.0.1:xxxxx`) from a local kind hub cluster **will not work**. Your hub cluster must be network-accessible from the cloud environment.

- **EKS clusters**: AWS EKS requires special handling with registration drivers (grpc or awsirsa) because EKS doesn't support CSR API by default. See the [Running on EKS]({{< ref "/docs/getting-started/installation/running-on-eks" >}}) guide.

{{< tabpane text=true >}}
{{% tab header="kind (local testing)"  %}}
  ```shell
  # Both hub and managed clusters running locally (e.g., two kind clusters on the same machine)
  # Use --force-internal-endpoint-lookup to allow internal endpoint resolution
  clusteradm join \
      --hub-token <your token data> \
      --hub-apiserver <your hub cluster endpoint> \
      --wait \
      --cluster-name "cluster1" \    # Or other arbitrary unique name
      --force-internal-endpoint-lookup \
      --context ${CTX_MANAGED_CLUSTER}
  ```
{{% /tab %}}
{{% tab header="GKE, AKS, other cloud providers"  %}}
  ```shell
  # Managed cluster on GKE, AKS, or other standard Kubernetes cloud provider
  # Hub cluster must have a network-accessible API server endpoint
  # Do NOT use --force-internal-endpoint-lookup
  clusteradm join \
      --hub-token <your token data> \
      --hub-apiserver <your hub cluster endpoint> \   # Must be accessible from the cloud
      --wait \
      --cluster-name "cluster1" \   # Or other arbitrary unique name
      --context ${CTX_MANAGED_CLUSTER}
  ```

  **Important**: If your hub cluster is a local kind cluster, the managed cluster will not be able to reach
  the localhost API server URL. You must use a hub cluster that is network-accessible from your cloud
  environment, or set up appropriate networking (load balancer, VPN, ingress, etc.) to expose your hub API server.
{{% /tab %}}
{{% tab header="EKS"  %}}
  AWS EKS clusters require special registration drivers (grpc or awsirsa) because EKS doesn't support
  the CSR API by default.

  Please follow the [Running on EKS]({{< ref "/docs/getting-started/installation/running-on-eks" >}}) guide
  for detailed instructions on registering EKS clusters.
{{% /tab %}}
{{% tab header="k3s, openshift 4.X"  %}}
  ```shell
  clusteradm join \
      --hub-token <your token data> \
      --hub-apiserver <your hub cluster endpoint> \
      --wait \
      --cluster-name "cluster1" \   # Or other arbitrary unique name
      --context ${CTX_MANAGED_CLUSTER}
  ```
{{% /tab %}}
{{< /tabpane >}}

### Configure CPU and memory resources

You can configure CPU and memory resources for the klusterlet agent components by adding resource flags to the `clusteradm join` command. These flags indicate that all components in the klusterlet agent will use the same resource requirement or limit:

{{< tabpane text=true >}}
{{% tab header="kind (local testing)"  %}}
  ```shell
  # Configure resource requests and limits for klusterlet components
  clusteradm join \
      --hub-token <your token data> \
      --hub-apiserver <your hub cluster endpoint> \
      --wait \
      --cluster-name "cluster1" \
      --resource-qos-class ResourceRequirement \
      --resource-limits cpu=800m,memory=800Mi \
      --resource-requests cpu=400m,memory=400Mi \
      --force-internal-endpoint-lookup \
      --context ${CTX_MANAGED_CLUSTER}
  ```
{{% /tab %}}
{{% tab header="GKE, AKS, other cloud providers"  %}}
  ```shell
  # Configure resource requests and limits for klusterlet components
  clusteradm join \
      --hub-token <your token data> \
      --hub-apiserver <your hub cluster endpoint> \
      --wait \
      --cluster-name "cluster1" \
      --resource-qos-class ResourceRequirement \
      --resource-limits cpu=800m,memory=800Mi \
      --resource-requests cpu=400m,memory=400Mi \
      --context ${CTX_MANAGED_CLUSTER}
  ```
{{% /tab %}}
{{% tab header="k3s, openshift 4.X"  %}}
  ```shell
  # Configure resource requests and limits for klusterlet components
  clusteradm join \
      --hub-token <your token data> \
      --hub-apiserver <your hub cluster endpoint> \
      --wait \
      --cluster-name "cluster1" \
      --resource-qos-class ResourceRequirement \
      --resource-limits cpu=800m,memory=800Mi \
      --resource-requests cpu=400m,memory=400Mi \
      --context ${CTX_MANAGED_CLUSTER}
  ```
{{% /tab %}}
{{< /tabpane >}}

Available resource configuration flags:
- `--resource-qos-class`: Sets the resource QoS class (`Default`, `BestEffort`, or `ResourceRequirement`)
- `--resource-limits`: Specifies resource limits as key-value pairs (e.g., `cpu=800m,memory=800Mi`)
- `--resource-requests`: Specifies resource requests as key-value pairs (e.g., `cpu=500m,memory=500Mi`)

### Bootstrap a klusterlet in hosted mode (Optional)

Using the above command, the klusterlet components(registration-agent and work-agent) will be deployed on the managed
cluster, it is mandatory to expose the hub cluster to the managed cluster. We provide an option for running the
klusterlet components outside the managed cluster, for example, on the hub cluster(hosted mode).

The hosted mode deployment is still in experimental stage, consider using it only when:

- you want to reduce the footprint of the managed cluster.
- you do not want to expose the hub cluster to the managed cluster directly

In hosted mode, the cluster where the klusterlet is running is called the hosting cluster. Running the following command
to the hosting cluster to register the managed cluster to the hub.

{{< tabpane text=true >}}
{{% tab header="kind (local testing)"  %}}
  ```shell
  # NOTE for KinD clusters (both hub and managed are kind on the same machine):
  #  1. hub is KinD, use the parameter: --force-internal-endpoint-lookup
  #  2. managed is Kind, --managed-cluster-kubeconfig should be internal: `kind get kubeconfig --name managed --internal`
  clusteradm join \
      --hub-token <your token data> \
      --hub-apiserver <your hub cluster endpoint> \
      --wait \
      --cluster-name "cluster1" \    # Or other arbitrary unique name
      --mode hosted \
      --managed-cluster-kubeconfig <your managed cluster kubeconfig> \    # Should be an internal kubeconfig
      --force-internal-endpoint-lookup \
      --context <your hosting cluster context>
  ```
{{% /tab %}}
{{% tab header="GKE, AKS, other cloud providers" %}}
  ```shell
  # For cloud-hosted managed clusters
  # Hub cluster must have a network-accessible API server endpoint
  # Do NOT use --force-internal-endpoint-lookup
  clusteradm join \
      --hub-token <your token data> \
      --hub-apiserver <your hub cluster endpoint> \   # Must be accessible from the cloud
      --wait \
      --cluster-name "cluster1" \    # Or other arbitrary unique name
      --mode hosted \
      --managed-cluster-kubeconfig <your managed cluster kubeconfig> \
      --context <your hosting cluster context>
  ```
{{% /tab %}}
{{% tab header="EKS" %}}
  AWS EKS clusters require special registration drivers. See the [Running on EKS]({{< ref "/docs/getting-started/installation/running-on-eks" >}}) guide.
{{% /tab %}}
{{% tab header="k3s, openshift 4.X" %}}
  ```shell
  clusteradm join \
      --hub-token <your token data> \
      --hub-apiserver <your hub cluster endpoint> \
      --wait \
      --cluster-name "cluster1" \    # Or other arbitrary unique name
      --mode hosted \
      --managed-cluster-kubeconfig <your managed cluster kubeconfig> \
      --context <your hosting cluster context>
  ```
{{% /tab %}}
{{< /tabpane >}}

**Resource configuration in hosted mode:**

You can also configure CPU and memory resources when using hosted mode by adding the same resource flags:

{{< tabpane text=true >}}
{{% tab header="kind (local testing)"  %}}
  ```shell
  # Configure resource requests and limits for klusterlet components in hosted mode
  clusteradm join \
      --hub-token <your token data> \
      --hub-apiserver <your hub cluster endpoint> \
      --wait \
      --cluster-name "cluster1" \
      --mode hosted \
      --managed-cluster-kubeconfig <your managed cluster kubeconfig> \
      --resource-qos-class ResourceRequirement \
      --resource-limits cpu=800m,memory=800Mi \
      --resource-requests cpu=400m,memory=400Mi \
      --force-internal-endpoint-lookup \
      --context <your hosting cluster context>
  ```
{{% /tab %}}
{{% tab header="GKE, AKS, other cloud providers" %}}
  ```shell
  # Configure resource requests and limits for klusterlet components in hosted mode
  clusteradm join \
      --hub-token <your token data> \
      --hub-apiserver <your hub cluster endpoint> \
      --wait \
      --cluster-name "cluster1" \
      --mode hosted \
      --managed-cluster-kubeconfig <your managed cluster kubeconfig> \
      --resource-qos-class ResourceRequirement \
      --resource-limits cpu=800m,memory=800Mi \
      --resource-requests cpu=400m,memory=400Mi \
      --context <your hosting cluster context>
  ```
{{% /tab %}}
{{% tab header="k3s, openshift 4.X" %}}
  ```shell
  # Configure resource requests and limits for klusterlet components in hosted mode
  clusteradm join \
      --hub-token <your token data> \
      --hub-apiserver <your hub cluster endpoint> \
      --wait \
      --cluster-name "cluster1" \
      --mode hosted \
      --managed-cluster-kubeconfig <your managed cluster kubeconfig> \
      --resource-qos-class ResourceRequirement \
      --resource-limits cpu=800m,memory=800Mi \
      --resource-requests cpu=400m,memory=400Mi \
      --context <your hosting cluster context>
  ```
{{% /tab %}}
{{< /tabpane >}}

### Bootstrap a klusterlet in singleton mode

To reduce the footprint of agent in the managed cluster, singleton mode is introduced since `v0.12.0`.
In the singleton mode, the work and registration agent will be run as a single pod in the managed
cluster.

**Note:** to run klusterlet in singleton mode, you must have a clusteradm version equal or higher than
`v0.12.0`

{{< tabpane text=true >}}
{{% tab header="kind (local testing)" %}}
  ```shell
  # Both hub and managed clusters running locally
  # Use --force-internal-endpoint-lookup
  clusteradm join \
      --hub-token <your token data> \
      --hub-apiserver <your hub cluster endpoint> \
      --wait \
      --cluster-name "cluster1" \    # Or other arbitrary unique name
      --singleton \
      --force-internal-endpoint-lookup \
      --context ${CTX_MANAGED_CLUSTER}
  ```
{{% /tab %}}
{{% tab header="GKE, AKS, other cloud providers" %}}
  ```shell
  # Managed cluster on cloud provider
  # Hub must be network-accessible, do NOT use --force-internal-endpoint-lookup
  clusteradm join \
      --hub-token <your token data> \
      --hub-apiserver <your hub cluster endpoint> \
      --wait \
      --cluster-name "cluster1" \   # Or other arbitrary unique name
      --singleton \
      --context ${CTX_MANAGED_CLUSTER}
  ```
{{% /tab %}}
{{% tab header="k3s, openshift 4.X" %}}
  ```shell
  clusteradm join \
      --hub-token <your token data> \
      --hub-apiserver <your hub cluster endpoint> \
      --wait \
      --cluster-name "cluster1" \   # Or other arbitrary unique name
      --singleton \
      --context ${CTX_MANAGED_CLUSTER}
  ```
{{% /tab %}}
{{< /tabpane >}}

**Resource configuration in singleton mode:**

You can also configure CPU and memory resources when using singleton mode:

{{< tabpane text=true >}}
{{% tab header="kind (local testing)" %}}
  ```shell
  # Configure resource requests and limits for klusterlet components in singleton mode
  clusteradm join \
      --hub-token <your token data> \
      --hub-apiserver <your hub cluster endpoint> \
      --wait \
      --cluster-name "cluster1" \
      --singleton \
      --resource-qos-class ResourceRequirement \
      --resource-limits cpu=600m,memory=600Mi \
      --resource-requests cpu=300m,memory=300Mi \
      --force-internal-endpoint-lookup \
      --context ${CTX_MANAGED_CLUSTER}
  ```
{{% /tab %}}
{{% tab header="GKE, AKS, other cloud providers" %}}
  ```shell
  # Configure resource requests and limits for klusterlet components in singleton mode
  clusteradm join \
      --hub-token <your token data> \
      --hub-apiserver <your hub cluster endpoint> \
      --wait \
      --cluster-name "cluster1" \
      --singleton \
      --resource-qos-class ResourceRequirement \
      --resource-limits cpu=600m,memory=600Mi \
      --resource-requests cpu=300m,memory=300Mi \
      --context ${CTX_MANAGED_CLUSTER}
  ```
{{% /tab %}}
{{% tab header="k3s, openshift 4.X" %}}
  ```shell
  # Configure resource requests and limits for klusterlet components in singleton mode
  clusteradm join \
      --hub-token <your token data> \
      --hub-apiserver <your hub cluster endpoint> \
      --wait \
      --cluster-name "cluster1" \
      --singleton \
      --resource-qos-class ResourceRequirement \
      --resource-limits cpu=600m,memory=600Mi \
      --resource-requests cpu=300m,memory=300Mi \
      --context ${CTX_MANAGED_CLUSTER}
  ```
{{% /tab %}}
{{< /tabpane >}}

## Accept the join request and verify

After the OCM agent is running on your managed cluster, it will be sending a "handshake" to your
hub cluster and waiting for an approval from the hub cluster admin. In this section, we will walk
through accepting the registration requests from the perspective of an OCM's hub admin.

1. Wait for the creation of the CSR object which will be created by your managed
   clusters' OCM agents on the hub cluster:

   ```Shell
   kubectl get csr -w --context ${CTX_HUB_CLUSTER} | grep cluster1  # or the previously chosen cluster name
   ```

   An example of a pending CSR request is shown below:

   ```Shell
   cluster1-tqcjj   33s   kubernetes.io/kube-apiserver-client   system:serviceaccount:open-cluster-management:cluster-bootstrap   Pending
   ```

2. Accept the join request using the `clusteradm` tool:

   ```Shell
   clusteradm accept --clusters cluster1 --context ${CTX_HUB_CLUSTER}
   ```

   After running the `accept` command, the CSR from your managed cluster
   named "cluster1" will be approved. Additionally, it will instruct
   the OCM hub control plane to setup related objects (such as a namespace
   named "cluster1" in the hub cluster) and RBAC permissions automatically.

3. Verify the installation of the OCM agents on your managed cluster by running:

   ```shell
   kubectl -n open-cluster-management-agent get pod --context ${CTX_MANAGED_CLUSTER}
   NAME                                             READY   STATUS    RESTARTS   AGE
   klusterlet-registration-agent-598fd79988-jxx7n   1/1     Running   0          19d
   klusterlet-work-agent-7d47f4b5c5-dnkqw           1/1     Running   0          19d
   ```

4. Verify that the `cluster1` `ManagedCluster` object was created successfully by running:

   ```Shell
   kubectl get managedcluster --context ${CTX_HUB_CLUSTER}
   ```

   Then you should get a result that resembles the following:

   ```Shell
   NAME       HUB ACCEPTED   MANAGED CLUSTER URLS      JOINED   AVAILABLE   AGE
   cluster1   true           <your endpoint>           True     True        5m23s
   ```

If the managed cluster status is not true, refer to [Troubleshooting](#troubleshooting) to debug on your cluster.

## Apply a Manifestwork

After the managed cluster is registered, test that you can deploy a pod to the managed cluster from the hub cluster. Create a `manifest-work.yaml` as shown in this example:

```yaml
apiVersion: work.open-cluster-management.io/v1
kind: ManifestWork
metadata:
  name: mw-01
  namespace: ${MANAGED_CLUSTER_NAME}
spec:
  workload:
    manifests:
      - apiVersion: v1
        kind: Pod
        metadata:
          name: hello
          namespace: default
        spec:
          containers:
            - name: hello
              image: busybox
              command: ["sh", "-c", 'echo "Hello, Kubernetes!" && sleep 3600']
          restartPolicy: OnFailure
```

Apply the yaml file to the hub cluster.

```Shell
kubectl apply -f manifest-work.yaml --context ${CTX_HUB_CLUSTER}
```

Verify that the `manifestwork` resource was applied to the hub.

```Shell
kubectl -n ${MANAGED_CLUSTER_NAME} get manifestwork/mw-01 --context ${CTX_HUB_CLUSTER} -o yaml
```

Check on the managed cluster and see the _hello_ Pod has been deployed from the hub cluster.

```Shell
$ kubectl -n default get pod --context ${CTX_MANAGED_CLUSTER}
NAME    READY   STATUS    RESTARTS   AGE
hello   1/1     Running   0          108s
```

### Troubleshooting

- **If the managed cluster status is not true.**

  For example, the result below is shown when checking managedcluster.

  ```Shell
  $ kubectl get managedcluster --context ${CTX_HUB_CLUSTER}
  NAME                   HUB ACCEPTED   MANAGED CLUSTER URLS   JOINED   AVAILABLE   AGE
  ${MANAGED_CLUSTER_NAME} true           https://localhost               Unknown     46m
  ```

  There are many reasons for this problem. You can use the commands below to get more debug info. If the provided info doesn't help, please log an issue to us.

  On the hub cluster, check the managedcluster status.

  ```Shell
  kubectl get managedcluster ${MANAGED_CLUSTER_NAME} --context ${CTX_HUB_CLUSTER} -o yaml
  ```

  On the hub cluster, check the lease status.

  ```Shell
  kubectl get lease -n ${MANAGED_CLUSTER_NAME} --context ${CTX_HUB_CLUSTER}
  ```

  On the managed cluster, check the klusterlet status.

  ```Shell
  kubectl get klusterlet -o yaml --context ${CTX_MANAGED_CLUSTER}
  ```

## Detach the cluster from hub

Remove the resources generated when registering with the hub cluster.

```Shell
clusteradm unjoin --cluster-name "cluster1" --context ${CTX_MANAGED_CLUSTER}
```

Check the installation of the OCM agent is removed from the managed cluster.

```Shell
kubectl -n open-cluster-management-agent get pod --context ${CTX_MANAGED_CLUSTER}
No resources found in open-cluster-management-agent namespace.
```

Check the klusterlet is removed from the managed cluster.

```Shell
kubectl get klusterlet --context ${CTX_MANAGED_CLUSTER}
error: the server doesn't have a resource type "klusterlet
```

### Resource cleanup when the managed cluster is deleted

When a user deletes the managedCluster resource, all associated resources within the cluster namespace must also be removed. This includes managedClusterAddons, manifestWorks, and the roleBindings for the klusterlet agent. Resource cleanup follows a specific sequence to prevent resources from being stuck in a terminating state:

1. managedClusterAddons are deleted first.
2. manifestWorks are removed subsequently after all managedClusterAddons are deleted.
3. For the same resource as managedClusterAddon or manifestWork, custom deletion ordering can be defined using the `open-cluster-management.io/cleanup-priority` annotation:
   - Priority values range from 0 to 100 (lower values execute first).

The `open-cluster-management.io/cleanup-priority` annotation controls deletion order when resource instances have dependencies. For example:

A manifestWork that applies a CRD and operator should be deleted after a manifestWork that creates a CR instance, allowing the operator to perform cleanup after the CR is removed.


The `ResourceCleanup` featureGate for cluster registration on the Hub cluster enables automatic cleanup of managedClusterAddons and manifestWorks within the cluster namespace after cluster unjoining.

**Version Compatibility:**
- The `ResourceCleanup` featureGate was introduced in OCM v0.13.0, and was **disabled by default** in OCM v0.16.0 and earlier versions. To activate it, you need to modify the clusterManager CR configuration:
```yaml
registrationConfiguration:
  featureGates:
  - feature: ResourceCleanup
    mode: Enable
```

- Starting with OCM v0.17.0, the `ResourceCleanup` featureGate has been upgraded from Alpha to Beta status and is **enabled by default**.

**Disabling the Feature:**
To deactivate this functionality, update the clusterManager CR on the hub cluster:
```yaml
registrationConfiguration:
  featureGates:
  - feature: ResourceCleanup
    mode: Disable
```
