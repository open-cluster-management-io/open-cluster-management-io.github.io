---
title: Register a cluster
weight: 2
---

After the cluster manager is installed on the hub cluster, you need to install the klusterlet agent on another cluster so that it can be registered and managed by the hub cluster.



## Prerequisite

- The managed clusters should be `v1.11+`.
- Ensure [kubectl](https://kubernetes.io/docs/tasks/tools/install-kubectl) and [kustomize](https://kubectl.docs.kubernetes.io/installation/kustomize/) are installed.

### Network requirements

Configure your network settings for the managed clusters to allow the following connections.

| Direction | Endpoint                            | Protocol | Purpose                                  | Used by                                                                  |
|-----------|-------------------------------------|----------|------------------------------------------|--------------------------------------------------------------------------|
| Outbound  | https://{hub-api-server-url}:{port} | TCP      | Kubernetes API server of the hub cluster | OCM agents, including the add-on agents, running on the managed clusters |

To use a proxy, please make sure the proxy server is well configured to allow the above connections and the proxy server is reachable for the managed clusters. See [Register a cluster to hub through proxy server](https://open-cluster-management.io/scenarios/register-cluster-through-proxy/) for more details.

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
on the different distribution.

**NOTE**: If there is no configmap `kube-root-ca.crt` in kube-public namespace of the hub cluster,
the flag --ca-file should be set to provide a valid hub ca file to help set
up the external client.

{{< tabpane text=true >}}
{{% tab header="kind"  %}}
  ```shell
  # NOTE: For KinD clusters use the parameter: --force-internal-endpoint-lookup
  clusteradm join \
      --hub-token <your token data> \
      --hub-apiserver <your hub cluster endpoint> \
      --wait \
      --cluster-name "cluster1" \    # Or other arbitrary unique name
      --force-internal-endpoint-lookup \
      --context ${CTX_MANAGED_CLUSTER}
  ```
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

### Bootstrap a klusterlet in hosted mode(Optional)

Using the above command, the klusterlet components(registration-agent and work-agent) will be deployed on the managed
cluster, it is mandatory to expose the hub cluster to the managed cluster. We provide an option for running the
klusterlet components outside the managed cluster, for example, on the hub cluster(hosted mode).

The hosted mode deploying is till in experimental stage, consider to use it only when:

- want to reduce the footprints of the managed cluster.
- do not want to expose the hub cluster to the managed cluster directly

In hosted mode, the cluster where the klusterlet is running is called the hosting cluster. Running the following command
to the hosting cluster to register the managed cluster to the hub.

{{< tabpane text=true >}}
{{% tab header="kind"  %}}
  ```shell
  # NOTE for KinD clusters:
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

### Bootstrap a klusterlet in singleton mode

To reduce the footprint of agent in the managed cluster, singleton mode is introduced since `v0.12.0`.
In the singleton mode, the work and registration agent will be run as a single pod in the managed
cluster.

**Note:** to run klusterlet in singleton mode, you must have a clusteradm version equal or higher than
`v0.12.0`

{{< tabpane text=true >}}
{{% tab header="kind" %}}
  ```shell
  # NOTE: For KinD clusters use the parameter: --force-internal-endpoint-lookup
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

### ResourceCleanup FeatureGate

The `ResourceCleanup` featureGate for cluster registration on the Hub cluster enables automatic cleanup of managedClusterAddons and manifestWorks within the cluster namespace after cluster unjoining. 

**Version Compatibility:**
- The `ResourceCleanup` featureGate was introdueced in OCM v0.13.0, and was **disabled by default** in OCM v0.16.0 and earlier versions. To activate it, need to modify the clusterManager CR configuration:
```yaml
registrationConfiguration:
  featureGates:
  - feature: ResourceCleanup
    mode: Enable
```

- Starting with OCM v0.17.0, the `ResourceCleanup` featureGate has been upgraded from Alpha to Beta status and is **enabled by default**.

**Deletion Sequence:**
1. managedClusterAddons are deleted first.
2. manifestWorks are removed subsequently after there is no managedClusterAddon.
3. Custom ordering can be defined using the `open-cluster-management.io/cleanup-priority` annotation:
   - Priority values range 0-100 (lower values execute first).

**Disabling the Feature:**
To deactivate this functionality, update the clusterManager CR on the hub cluster:
```yaml
registrationConfiguration:
  featureGates:
  - feature: ResourceCleanup
    mode: Disable
```
