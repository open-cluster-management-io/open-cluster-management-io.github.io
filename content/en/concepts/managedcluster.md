---
title: ManagedCluster
weight: 2
---

<!-- spellchecker-disable -->

{{< toc >}}

<!-- spellchecker-enable -->

## What is ManagedCluster?

`ManagedCluster` is a cluster scoped API in the hub cluster representing the
registered or pending-for-acceptance Kubernetes clusters in OCM. The 
[klusterlet agent](https://open-cluster-management.io/getting-started/core/register-cluster/)
working in the managed cluster is expected to actively maintain/refresh the 
status of the corresponding `ManagedCluster` resource on the hub cluster. 
On the other hand, removing the `ManagedCluster` from the hub cluster indicates
the cluster is denied/exiled from the hub cluster. The following is the
introduction of how the cluster registration lifecycle works under the hood:

### Cluster registration and acceptance

#### Bootstrapping registration

Firstly, the cluster registration process should be initiated by the 
registration agent which requires a bootstrap kubeconfig e.g.:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: bootstrap-hub-kubeconfig
  namespace: open-cluster-management-agent
type: Opaque
data:
  kubeconfig: <base64-encoded kubeconfig>
```

A minimal RBAC permission required for the subject in the bootstrap kubeconfig
will be:

- `CertficateSigningRequest`'s "get", "list", "watch", "create", "update".
- `ManagedCluster`'s "get", "list", "create", "update"
 
Note that ideally the bootstrap kubeconfig is supposed to live shortly 
(hour-ish) after signed by the hub cluster so that it won't be abused by 
unwelcome clients.

Last but not least, you can always live an easier life by leveraging OCM's
command-line tool `clusteradm` to manage the whole registration process.

#### Approving registration

When we're registering a new cluster into OCM, the registration agent will be 
starting by creating an unaccepted `ManagedCluster` into the hub cluster along
with a temporary [CertficateSigningRequest (CSR)](https://kubernetes.io/docs/reference/access-authn-authz/certificate-signing-requests/)
resource. The cluster will be accepted by the hub control plan, if the 
following requirements is meet:

- The CSR is approved and signed by any certificate provider setting filling
  `.status.certificate` with legit X.509 certificates.
- The `ManagedCluster` resource is approved by setting `.spec.hubAcceptsClient`
  to true in the spec.

Note that the cluster approval process above can be done by one-line:

```text
$ clusteradm accept --clusters <cluster name>
```

Upon the approval, the registration agent will observe the signed certificate
and persist them as a local secret named "hub-kubeconfig-secret" (by default 
in the "open-cluster-management-agent" namespace) which will be mounted to the 
other fundamental components of klusterlet such as the [work](https://open-cluster-management.io/concepts/manifestwork/) 
agent. In a word, if you can find your "hub-kubeconfig-secret" successfully
present in your managed cluster, the cluster registration is all set!


Overall the registration process in OCM is called `double opt-in` mechanism,
which means that a successful cluster registration requires both sides of 
approval and commitment from the hub cluster and the managed cluster. This
will be especially useful when the hub cluster and managed clusters are 
operated by different admins or teams. In OCM, we assume the clusters are
mutually untrusted in the beginning then set up the connection between them
gracefully with permission and validity under control.


Note that the functionality mentioned above are all managed by OCM's
[registration](https://github.com/open-cluster-management-io/registration) 
sub-project, which is the "root dependency" in the OCM world. It includes 
an agent in the managed cluster to register to the hub and a controller in
the hub cluster to coordinate with the agent.

### Cluster heartbeats and status

By default, the registration will be reporting and refreshing its healthiness
state to the hub cluster on a one-minute basis, and that interval can be easily
overridden by setting `.spec.leaseDurationSeconds` on the `ManagedCluster`.

In addition to that, a few commonly-used information will also be reflected
in the status of the `ManagedCluster`, e.g.:

```yaml
  status:
    version:
      kubernetes: v1.20.11-aliyun.1
    allocatable:
      cpu: 11700m
      ephemeral-storage: "342068531454"
      hugepages-1Gi: "0"
      hugepages-2Mi: "0"
      memory: 17474228Ki
      pods: "192"
    capacity:
      cpu: "12"
      ephemeral-storage: 371168112Ki
      hugepages-1Gi: "0"
      hugepages-2Mi: "0"
      memory: 23777972Ki
      pods: "192"
    conditions: ...
```

### Cluster removal

A previously registered cluster can opt-out cutting off the connection from 
either hub cluster or managed cluster. This is helpful for tackling emergency 
problems in your OCM environment, e.g.:

- When the hub cluster is overloaded, under emergency
- When the managed cluster is intended to detach from OCM
- When the hub cluster is found sending wrong orders to the managed cluster
- When the managed cluster is spamming requests to the hub cluster

#### Unregister from hub cluster

A recommended way to unregister a managed cluster will flip the 
`.spec.hubAcceptsClient` bit back to `false`, which will be trggering the hub
control plane to offload the managed cluster from effective management. 
Meanwhile, a permanent way to kick a managed cluster from the hub control plane
is simply deleting its `ManagedCluster` resource. 

```shell
$ kubectl delete managedcluster <cluster name>
```

This is also revoking the previously-granted RBAC permission for the managed
cluster instantly in the background. If we hope to defer the rejection to
the next time when the klusterlet agent is renewing its certificate, as a 
minimal operation we can remove the following RBAC rules from the cluster's
effective cluster role resource:

```yaml
# ClusterRole: open-cluster-management:managedcluster:<cluster name>
# Removing the following RBAC rule to stop the certificate rotation.
- apiGroups:
    - register.open-cluster-management.io
  resources:
    - managedclusters/clientcertificates
  verbs:
    - renew
```

#### Unregister from the managed cluster

The admin of the managed cluster can disable the prescriptions from hub cluster
by scaling the OCM klusterlet agents to `0`. Or just permanently deleting the 
agent components from the managed cluster.

## ManagedClusterSet

`ManagedClusterSet` is a cluster scoped API on the hub cluster to define a 
group of `ManagedCluster`s. Practically it's a common case for hub cluster to 
group the existing managed clusters according to their deploying environment
or data-center. For instance, you can create `dev`, `staging`, `prod` 
`ManagedClusterSet` for different purposes. Or you can create `north-america`, 
`europe`, `apac` `ManagedClusterSet` based on the region of the `ManagedCluster`.

To add a `ManagedCluster` to a `ManagedClusterSet`, user needs to set a label 
`cluster.open-cluster-management.io/clusterset={clusterset name}` on the 
`ManagedCluster`. The user must have the `create` permission to 
`managedclusterset/join` resource to add a `ManagedCluster` to a 
`ManagedClusterSet`.

An example of a `ManagedClusterSet` resource is shown in the following example.

```yaml
apiVersion: cluster.open-cluster-management.io/v1beta1
kind: ManagedClusterSet
metadata:
  name: prod
```

Furthermore, we can do advanced cluster matching/selecting within a 
`ManagedClusterSet` using the [placement](https://github.com/open-cluster-management-io/placement)
module.
