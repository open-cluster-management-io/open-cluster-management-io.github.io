---
title: Managed service account
weight: 5
---

<!-- spellchecker-disable -->

{{< toc >}}

<!-- spellchecker-enable -->

[Managed Service Account](https://github.com/open-cluster-management-io/managed-serviceaccount)
is an OCM addon enabling a hub cluster admin to manage [service account](https://kubernetes.io/docs/reference/access-authn-authz/service-accounts-admin/)
across multiple clusters on ease. By controlling the creation and removal of
the service account, the addon agent will project and rotate the corresponding
token back to the hub cluster which is very useful for the Kube API client from
the hub cluster to request against the managed clusters.

## Background

Normally there are two major approaches for a Kube API client to authenticate
and access a Kubernetes cluster:

- Valid X.509 certificate-key pair
- Service account bearer token

The service account token will be automatically persisted as a secret
resource inside the hosting Kubernetes clusters upon creation, which is commonly
used for the ["in-cluster"](https://github.com/kubernetes/client-go/tree/master/examples/in-cluster-client-configuration)
client. However, in terms of OCM, the hub cluster is completely an external
system to the managed clusters, so we will need a local agent in each managed
cluster to reflect the tokens consistently to the hub cluster so that the
Kube API client from hub cluster can "push" the requests directly against the
managed cluster. By delegating the multi-cluster service account management to
this addon, we can:

- Project the service account token from the managed clusters to the hub cluster
  with custom API audience.
- Rotate the service account tokens dynamically.
- Homogenize the client identities so that we can easily write a static RBAC
  policy that applies to multiple managed clusters.

## Prerequisite

You must meet the following prerequisites to install the managed service
account:

* Ensure your `open-cluster-management` release is greater than `v0.5.0`.

* Ensure [`kubectl`](https://kubernetes.io/docs/tasks/tools/install-kubectl) is installed.

* Ensure [`helm`](https://helm.sh/docs/intro/install/) is installed.

## Installation

To install the managed service account addon to the OCM control plane, run:

```shell
$ helm repo add ocm https://openclustermanagement.blob.core.windows.net/releases/
$ helm repo update
$ helm search repo ocm
NAME                              	CHART VERSION	APP VERSION	DESCRIPTION                                   
ocm/managed-serviceaccount          <...>           1.0.0       A Helm chart for Managed ServiceAccount Addon
...
```

Then run the following helm command to continue the installation:

```shell
$ helm install -n open-cluster-management-addon --create-namespace \
    managed-serviceaccount  ocm/managed-serviceaccount
$ kubectl -n open-cluster-management-addon get pod
NAME                                                    READY   STATUS    RESTARTS   AGE
managed-serviceaccount-addon-manager-5m9c95b7d8-xsb94   1/1     Running   1          4d4h 
...
```

By default, the addon manager will be automatically discovering the addition or
removal the managed clusters and installs the managed serviceaccount agents into 
them on the fly. To check out the healthiness status of the managed serviceaccount 
agents, we can run:

```shell
$ kubectl get managedclusteraddon -A
NAMESPACE         NAME                     AVAILABLE   DEGRADED   PROGRESSING
<cluster name>    managed-serviceaccount   True  
```

## Usage

To exercise the new `ManagedServiceAccount` API introduced by this addon, we
can start by applying the following sample resource:

```shell
$ export CLUSTER_NAME=<cluster name>
$ kubectl create -f - <<EOF
apiVersion: authentication.open-cluster-management.io/v1alpha1
kind: ManagedServiceAccount
metadata:
  name: my-sample
  namespace: ${CLUSTER_NAME}
spec:
  rotation: {}
EOF
```

Then the addon agent in each of the managed cluster is responsible for
executing and refreshing the status of the `ManagedServiceAccount`, e.g.:

```shell
$ kubectl describe ManagedServiceAccount -n cluster1
...
  status:
    conditions:
    - lastTransitionTime: "2021-12-09T09:08:15Z"
      message: ""
      reason: TokenReported
      status: "True"
      type: TokenReported
    - lastTransitionTime: "2021-12-09T09:08:15Z"
      message: ""
      reason: SecretCreated
      status: "True"
      type: SecretCreated
    expirationTimestamp: "2022-12-04T09:08:15Z"
    tokenSecretRef:
      lastRefreshTimestamp: "2021-12-09T09:08:15Z"
      name: my-sample
```

The service account will be created in the managed cluster (assume the name is `cluster1`):
```
$ kubectl get sa my-sample -n open-cluster-management-managed-serviceaccount --context kind-cluster1
NAME        SECRETS   AGE
my-sample   1         9m57s
```

The corresponding secret will also be created in the hub cluster, which is
visible via:

```shell
$ kubectl -n <your cluster> get secret my-sample  
NAME        TYPE     DATA   AGE
my-sample   Opaque   2      2m23s
```

## Related materials

Repo: https://github.com/open-cluster-management-io/managed-serviceaccount

See the design proposal at: [https://github.com/open-cluster-management-io/enhancements/tree/main/enhancements/sig-architecture/19-projected-serviceaccount-token](https://github.com/open-cluster-management-io/enhancements/tree/main/enhancements/sig-architecture/19-projected-serviceaccount-token)
