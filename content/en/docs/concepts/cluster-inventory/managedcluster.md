---
title: ManagedCluster
weight: 2
---



## What is ManagedCluster?

`ManagedCluster` is a cluster scoped API in the hub cluster representing the
registered or pending-for-acceptance Kubernetes clusters in OCM. The
[klusterlet agent]({{< ref "docs/getting-started/installation/register-a-cluster" >}})
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

- `CertificateSigningRequest`'s "get", "list", "watch", "create", "update".
- `ManagedCluster`'s "get", "list", "create", "update"

Note that ideally the bootstrap kubeconfig is supposed to live shortly
(hour-ish) after signed by the hub cluster so that it won't be abused by
unwelcome clients.

Last but not least, you can always live an easier life by leveraging OCM's
command-line tool `clusteradm` to manage the whole registration process.

#### Approving registration

When we're registering a new cluster into OCM, the registration agent will be
starting by creating an unaccepted `ManagedCluster` into the hub cluster along
with a temporary [CertificateSigningRequest (CSR)](https://kubernetes.io/docs/reference/access-authn-authz/certificate-signing-requests/)
resource. The cluster will be accepted by the hub control plane, if the
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
other fundamental components of klusterlet such as the [work]({{< ref "docs/concepts/manifestwork" >}})
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
[registration](https://github.com/open-cluster-management-io/ocm/tree/main/cmd/registration)
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
      kubernetes: v1.20.11
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

### Cluster taints and tolerations

To support filtering unhealthy/not-reporting clusters and keep workloads from
being placed in unhealthy or unreachable clusters, we introduce the similar
concept of taint/toleration in Kubernetes. It also allows user to add a
customized taint to deselect a cluster from placement. This is useful when the
user wants to set a cluster to maintenance mode and evict workload from this
cluster.

In OCM, Taints and Tolerations work together to allow users to control the
selection of managed clusters more flexibly.

#### Taints of ManagedClusters

Taints are properties of ManagedClusters, they allow a Placement to repel a set
of ManagedClusters. A Taint includes the following fields:
- __Key__ (required). The taint key applied to a cluster. e.g. bar or
foo.example.com/bar.
- __Value__ (optional). The taint value corresponding to the taint key.
- __Effect__ (required). The Effect of the taint on Placements that do not
tolerate the taint. Valid effects are
  - `NoSelect`. It means Placements are not allowed to select a cluster unless
  they tolerate this taint. The cluster will be removed from the placement
  decision if it has already been selected by the Placement.
  - `PreferNoSelect`. It means the scheduler tries not to select the cluster,
  rather than prohibiting Placements from selecting the cluster entirely.
  (This is not implemented yet, currently clusters with effect `PreferNoSelect`
  will always be selected.)
  - `NoSelectIfNew`. It means Placements are not allowed to select the cluster
  unless: 1) they tolerate the taint; 2) they have already had the cluster in
  their cluster decisions;
- __TimeAdded__ (required). The time at which the taint was added. It is set
automatically and the user should not to set/update its value.

**Builtin taints to reflect the status of ManagedClusters**

There are two builtin taints, which will be automatically added to
ManagedClusters, according to their conditions.
- `cluster.open-cluster-management.io/unavailable`. The taint is added to a
ManagedCluster when it is not available. To be specific, the cluster has a
condition 'ManagedClusterConditionAvailable' with status of 'False'. The taint
has the effect `NoSelect` and an empty value. Example,
  ```yaml
  apiVersion: cluster.open-cluster-management.io/v1
  kind: ManagedCluster
  metadata:
   name: cluster1
  spec:
   hubAcceptsClient: true
   taints:
     - effect: NoSelect
       key: cluster.open-cluster-management.io/unavailable
       timeAdded: '2022-02-21T08:11:54Z'
  ```
- `cluster.open-cluster-management.io/unreachable`. The taint is added to a
ManagedCluster when it is not reachable. To be specific,
  - 1) The cluster has no condition 'ManagedClusterConditionAvailable';
  - 2) Or the status of condition 'ManagedClusterConditionAvailable' is
  'Unknown';
  The taint has the effect `NoSelect` and an empty value. Example,
  ```yaml
  apiVersion: cluster.open-cluster-management.io/v1
  kind: ManagedCluster
  metadata:
    name: cluster1
  spec:
    hubAcceptsClient: true
    taints:
      - effect: NoSelect
        key: cluster.open-cluster-management.io/unreachable
        timeAdded: '2022-02-21T08:11:06Z'
  ```

#### Tolerations of Placements

Tolerations are applied to Placements, and allow Placements to select
ManagedClusters with matching taints. Refer to [Placement
Taints/Tolerations](../placement/#taintstolerations) to see how it is used for
cluster selection.

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
`.spec.hubAcceptsClient` bit back to `false`, which will be triggering the hub
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

## Managed Cluster's certificate rotation

The certificates used by the agents from the managed cluster to talk to
the hub control plane will be periodically rotated with an ephemeral and random
identity. The following picture shows the automated certificate rotation works.

<div style="text-align: center; padding: 20px;">
   <img src="/registration-process.png" alt="Registration Process" style="margin: 0 auto; width: 80%">
</div>

## What's next?

Furthermore, we can do advanced cluster matching/selecting within a
[managedclusterset](./managedclusterset.md) using the [placement](./placement.md)
module.
