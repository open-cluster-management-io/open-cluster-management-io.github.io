---
title: Start the control plane
weight: 1
---

<!-- spellchecker-disable -->

{{< toc >}}

<!-- spellchecker-enable -->

## Prerequisite

- The hub cluster should be `v1.19+`.
  (To run on hub cluster version between \[`v1.16`, `v1.18`\],
  please manually enable feature gate "V1beta1CSRAPICompatibility").
- Currently the bootstrap process relies on client authentication via CSR. Therefore, if your Kubernetes distributions (like [EKS](https://github.com/aws/containers-roadmap/issues/1856)) don't support it, you can choose the [multicluster-controlplane](https://github.com/open-cluster-management-io/multicluster-controlplane) as the hub controlplane.
- Ensure [kubectl](https://kubernetes.io/docs/tasks/tools/install-kubectl) and [kustomize](https://kubectl.docs.kubernetes.io/installation/kustomize/) are installed.

### Network requirements

Configure your network settings for the hub cluster to allow the following connections. 

| Direction | Endpoint                            | Protocol | Purpose                                  | Used by                                                                  |
|-----------|-------------------------------------|----------|------------------------------------------|--------------------------------------------------------------------------|
| Inbound   | https://{hub-api-server-url}:{port} | TCP      | Kubernetes API server of the hub cluster | OCM agents, including the add-on agents, running on the managed clusters |

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

## Bootstrap a cluster manager

Before actually installing the OCM components into your clusters, export
the following environment variables in your terminal before running our
command-line tool `clusteradm` so that it can correctly discriminate the
hub cluster.

```shell
# The context name of the clusters in your kubeconfig
export CTX_HUB_CLUSTER=<your hub cluster context>
```

Call `clusteradm init`:

 ```shell
  # By default, it installs the latest release of the OCM components.
  # Use e.g. "--bundle-version=latest" to install latest development builds.
  # NOTE: For hub cluster version between v1.16 to v1.19 use the parameter: --use-bootstrap-token
  clusteradm init --wait --context ${CTX_HUB_CLUSTER}
```

The `clusteradm init` command installs the
[registration-operator](https://github.com/open-cluster-management-io/ocm/tree/main/cmd/registration-operator)
on the hub cluster, which is responsible for consistently installing
and upgrading a few core components for the OCM environment.

After the `init` command completes, a generated command is output on the console to
register your managed clusters. An example of the generated command is shown below.

```shell
clusteradm join \
    --hub-token <your token data> \
    --hub-apiserver <your hub kube-apiserver endpoint> \
    --wait \
    --cluster-name <cluster_name>
```

It's recommended to save the command somewhere secure for future use. If it's lost, you can use
`clusteradm get token` to get the generated command again.

## Check out the running instances of the control plane

```shell
kubectl -n open-cluster-management get pod --context ${CTX_HUB_CLUSTER}
NAME                               READY   STATUS    RESTARTS   AGE
cluster-manager-695d945d4d-5dn8k   1/1     Running   0          19d
```

Additionally, to check out the instances of OCM's hub control plane, run
the following command:

```shell
kubectl -n open-cluster-management-hub get pod --context ${CTX_HUB_CLUSTER}
NAME                               READY   STATUS    RESTARTS   AGE
cluster-manager-placement-controller-857f8f7654-x7sfz      1/1     Running   0          19d
cluster-manager-registration-controller-85b6bd784f-jbg8s   1/1     Running   0          19d
cluster-manager-registration-webhook-59c9b89499-n7m2x      1/1     Running   0          19d
cluster-manager-work-webhook-59cf7dc855-shq5p              1/1     Running   0          19d
...
```

The overall installation information is visible on the `clustermanager` custom resource:

```shell
kubectl get clustermanager cluster-manager -o yaml --context ${CTX_HUB_CLUSTER}
```

## Uninstall the OCM from the control plane

Before uninstalling the OCM components from your clusters, please detach the
managed cluster from the control plane.

```shell
clusteradm clean --context ${CTX_HUB_CLUSTER}
```

Check the instances of OCM's hub control plane are removed.

```shell
kubectl -n open-cluster-management-hub get pod --context ${CTX_HUB_CLUSTER}
No resources found in open-cluster-management-hub namespace.
```

```shell
kubectl -n open-cluster-management get pod --context ${CTX_HUB_CLUSTER}
No resources found in open-cluster-management namespace.
```

Check the `clustermanager` resource is removed from the control plane.

```shell
kubectl get clustermanager --context ${CTX_HUB_CLUSTER}
error: the server doesn't have a resource type "clustermanager"
```
