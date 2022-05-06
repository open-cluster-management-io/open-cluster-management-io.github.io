---
title: Policy framework
weight: 10
---

The policy framework provides governance capabilities to OCM managed Kubernetes clusters. Policies
provide visibility and drive remediation for various security and configuration aspects to help IT
administrators meet their requirements.

<!-- spellchecker-disable -->

{{< toc >}}

<!-- spellchecker-enable -->

## API Concepts

### Overview

The policy framework has the following API concepts:

- *Policy Templates* are the policies that perform a desired check or action. For example,
  [ConfigurationPolicy](/getting-started/integration/policy-controllers#install-the-configuration-policy-controller)
  objects are embedded in `Policy` objects under the `policy-templates` array. These cannot be
  deployed to managed clusters on their own.
- A [`Policy`](#policy) is a grouping mechanism for *Policy Templates* and is the smallest
  deployable unit on the hub cluster. Embedded *Policy Templates* are distributed to applicable
  managed clusters and acted upon by the appropriate
  [policy controller](/getting-started/integration/policy-controllers).
- A [`PolicySet`](#policyset) is a grouping mechanism of `Policy` objects. Compliance of all grouped
  `Policy` objects is summarized in the `PolicySet`. A `PolicySet` is a deployable unit and its
  distribution is controlled by a [Placement](/concepts/placement).
- A [`PlacementBinding`](#placementbinding) binds a [Placement](/concepts/placement) to a
  `Policy` or `PolicySet`.

### Policy

A `Policy` is a grouping mechanism for *Policy Templates* and is the smallest deployable unit on the
hub cluster. Embedded *Policy Templates* are distributed to applicable managed clusters and acted
upon by the appropriate [policy controller](/getting-started/integration/policy-controllers).
The compliance state and status of a `Policy` represents all embedded *Policy Templates* in the
`Policy`. The distribution of `Policy` objects is controlled by a [Placement](/concepts/placement).

View a simple example of a `Policy` that embeds a `ConfigurationPolicy` policy template to manage
a namespace called "prod".

```yaml
apiVersion: policy.open-cluster-management.io/v1
kind: Policy
metadata:
  name: policy-namespace
  namespace: policies
  annotations:
    policy.open-cluster-management.io/standards: NIST SP 800-53
    policy.open-cluster-management.io/categories: CM Configuration Management
    policy.open-cluster-management.io/controls: CM-2 Baseline Configuration
spec:
  remediationAction: enforce
  disabled: false
  policy-templates:
    - objectDefinition:
        apiVersion: policy.open-cluster-management.io/v1
        kind: ConfigurationPolicy
        metadata:
          name: policy-namespace-example
        spec:
          remediationAction: inform
          severity: low
          object-templates:
            - complianceType: MustHave
              objectDefinition:
                kind: Namespace # must have namespace 'prod'
                apiVersion: v1
                metadata:
                  name: prod
```

At first, you may notice the `annotations`. These are standard
annotations that are for informational purposes and can be used by user interfaces, custom report
scripts, or components that integrate with OCM.

Next, you may notice the optional `spec.remediationAction` field. This dictates if the policy
controller should `inform` or `enforce` when violations are found and overrides the
`remediationAction` field on each policy template. When set to `inform`, the `Policy` will become
noncompliant if the underlying policy templates detect that the desired state is not met. When set
to `enforce`, the policy controller applies the desired state when necessary and feasible.

The `policy-templates` array contains a single `ConfigurationPolicy` called
`policy-namespace-example`. This `ConfigurationPolicy` has the `remediationAction` set to `inform`
but it is overridden by the optional global `spec.remediationAction`. The `severity` is for
informational purposes similar to the `annotations`.

The most interesting part is the `object-templates` section under the embedded `ConfigurationPolicy`.
This describes the `prod` `Namespace` object that the `Policy` applies to. The action that the
`ConfigurationPolicy` will take is determined by the `complianceType`. In this case, it is set to
`MustHave` which means the `prod` `Namespace` object will be created if it doesn't exist. Other
compliance types include `MustNotHave` and `MustOnlyHave`. `MustNotHave` would delete the `prod`
`Namespace` object. `MustOnlyHave` would ensure the `prod` `Namespace` object only exists with the
fields defined in the `ConfigurationPolicy`.

When the `Policy` is bound to a [`Placement`](/concepts/placement), the `Policy` status will
report on each cluster that matched the bound `Placement`:

```yaml
status:
  compliant: Compliant
  placement:
    - placement: placement-hub-cluster
      placementBinding: binding-policy-namespace
  status:
    - clustername: local-cluster
      clusternamespace: local-cluster
      compliant: Compliant
```

To fully explore the `Policy` API, run the following command:

```shell
kubectl get crd policies.policy.open-cluster-management.io -o yaml 
```

To fully explore the `ConfigurationPolicy` API, run the following command:

```shell
kubectl get crd configurationpolicies.policy.open-cluster-management.io -o yaml 
```

### PlacementBinding

A `PlacementBinding` binds a [Placement](/concepts/placement) to a [`Policy`](#policy) or
`PolicySet`.

Below is an example of a `PlacementBinding` that binds the `policy-namespace` `Policy` to the
`placement-hub-cluster` `Placement`.

```yaml
apiVersion: policy.open-cluster-management.io/v1
kind: PlacementBinding
metadata:
  name: binding-policy-namespace
  namespace: policies
placementRef:
  apiGroup: cluster.open-cluster-management.io
  kind: Placement
  name: placement-hub-cluster
subjects:
- apiGroup: policy.open-cluster-management.io
  kind: Policy
  name: policy-namespace
```

Once the `Policy` is bound, it will be distributed to and acted upon by the managed clusters that
match the `Placement`.

### PolicySet

A `PolicySet` is a grouping mechanism of [`Policy`](#policy) objects. Compliance of all grouped
`Policy` objects is summarized in the `PolicySet`. A `PolicySet` is a deployable unit and its
distribution is controlled by a [Placement](/concepts/placement) when bound through a
[`PlacementBinding`](#placementbinding).

This enables a workflow where subject matter experts write `Policy` objects and then an IT
administrator creates a `PolicySet` that groups the previously written `Policy` objects and binds
the `PolicySet` to a `Placement` that deploys the `PolicySet`.

An example of a `PolicySet` is shown below.

```yaml
apiVersion: policy.open-cluster-management.io/v1beta1
kind: PolicySet
metadata:
  name: acm-hardening
  namespace: policies
spec:
  description: Apply standard best practices for hardening your Open Cluster Management installation.
  policies:
    - policy-check-backups
    - policy-managedclusteraddon-available
    - policy-subscriptions
```

## Architecture

<div style="text-align: center; padding: 20px;">
   <img src="/policy-framework-architecture-diagram.jpg" alt="Policy framework architecture" style="margin: 0 auto; width: 80%">
</div>

The governance policy framework distributes policies to managed clusters and collect results to send
back to the hub cluster.

- [Policy propagator](https://github.com/open-cluster-management-io/governance-policy-propagator)
- [Policy spec sync](https://github.com/open-cluster-management-io/governance-policy-spec-sync)
- [Policy status sync](https://github.com/open-cluster-management-io/governance-policy-status-sync)
- [Policy template sync](https://github.com/open-cluster-management-io/governance-policy-template-sync)

## Prerequisite

You must meet the following prerequisites to install the policy framework:

- Ensure [`kubectl`](https://kubernetes.io/docs/tasks/tools/install-kubectl) and
  [`kustomize`](https://kubectl.docs.kubernetes.io/installation/kustomize/) are installed.

- Ensure [Golang](https://golang.org/doc/install) is installed, if you are planning to install from
  the source.

- Ensure the `open-cluster-management` _cluster manager_ is installed. See
  [Cluster Manager](/getting-started/core/cluster-manager) for more information.

- Ensure the `open-cluster-management` _klusterlet_ is installed. See
  [Klusterlet](/getting-started/core/register-cluster) for more information.

- If you are using `PlacementRules` with your policies, ensure the `open-cluster-management`
  _application_ is installed . See
  [Application management](/getting-started/integration/app-lifecycle) for more information. If you
  are using the default `Placement` API, you can skip the Application management installation, but
  you do need to install the `PlacementRule` CRD with this command:

  ```Shell
  kubectl apply -f https://raw.githubusercontent.com/open-cluster-management-io/multicloud-operators-subscription/main/deploy/hub-common/apps.open-cluster-management.io_placementrules_crd.yaml
  ```

## Install the policy-framework hub components

### Install via Clusteradm CLI

Ensure `clusteradm` CLI is installed. Download and extract the
[clusteradm binary](https://github.com/open-cluster-management-io/clusteradm/releases/latest). For
more details see the
[clusteradm GitHub page](https://github.com/open-cluster-management-io/clusteradm/blob/main/README.md#quick-start).

Deploy the policy framework controllers to the hub cluster:

```Shell
# Configure kubectl to point to the hub cluster
kubectl config use-context ${CTX_HUB_CLUSTER}

# Deploy the policy framework hub controllers
clusteradm install hub-addon --names policy-framework
```

### Install from source

Deploy the policy Custom Resource Definitions (CRD) and policy propagator component to the
`open-cluster-management` namespace on the hub cluster with the following commands:

```Shell
# Configure kubectl to point to the hub cluster
kubectl config use-context ${CTX_HUB_CLUSTER}

# Create the namespace
export HUB_NAMESPACE="open-cluster-management"
kubectl create ns ${HUB_NAMESPACE}

# Apply the CRDs
export GIT_PATH="https://raw.githubusercontent.com/open-cluster-management-io/governance-policy-propagator/main/deploy"
kubectl apply -f ${GIT_PATH}/crds/policy.open-cluster-management.io_policies.yaml
kubectl apply -f ${GIT_PATH}/crds/policy.open-cluster-management.io_placementbindings.yaml
kubectl apply -f ${GIT_PATH}/crds/policy.open-cluster-management.io_policyautomations.yaml
kubectl apply -f ${GIT_PATH}/crds/policy.open-cluster-management.io_policysets.yaml

# Deploy the policy-propagator
kubectl apply -f ${GIT_PATH}/operator.yaml -n ${HUB_NAMESPACE}
```

- See more about the policy propagator:
  - [policy-propagator](https://github.com/open-cluster-management-io/governance-policy-propagator)

## Verify the installation

Ensure the pods are running on the hub with the following command:

```Shell
$ kubectl get pods -n ${HUB_NAMESPACE}
NAME                                           READY   STATUS    RESTARTS   AGE
governance-policy-propagator-8c77f7f5f-kthvh   1/1     Running   0          94s
```

## Deploy the synchronization components to the managed cluster(s)

1. Export the hub cluster `kubeconfig` with the following command:

   For `kind` cluster:

   ```Shell
   kind get kubeconfig --name ${HUB_CLUSTER_NAME} --internal > ${HUB_KUBECONFIG}
   ```

   For non-`kind` clusters:

   ```Shell
   kubectl config view --context=${CTX_HUB_CLUSTER} --minify --flatten > ${HUB_KUBECONFIG}
   ```

2. Deploy the policy synchronization components to each managed cluster. Run the following commands:

   **NOTE**: The spec synchronization component should be skipped when deploying the synchronization
   components to a hub that is managing itself.

   ```Shell
   # Configure kubectl to point to the managed cluster
   kubectl config use-context ${CTX_MANAGED_CLUSTER}

   # Create the namespace for the synchronization components
   export MANAGED_NAMESPACE="open-cluster-management-agent-addon"
   kubectl create ns ${MANAGED_NAMESPACE}

   # Create the secret to authenticate with the hub
   kubectl -n ${MANAGED_NAMESPACE} create secret generic hub-kubeconfig --from-file=kubeconfig=${HUB_KUBECONFIG}

   # Apply the policy CRD
   export GIT_PATH="https://raw.githubusercontent.com/open-cluster-management-io"
   kubectl apply -f ${GIT_PATH}/governance-policy-propagator/main/deploy/crds/policy.open-cluster-management.io_policies.yaml

   # Set the managed cluster name and create the namespace
   export MANAGED_CLUSTER_NAME=cluster1
   kubectl create ns ${MANAGED_CLUSTER_NAME}

   # Deploy the spec synchronization component
   export COMPONENT="governance-policy-spec-sync"
   kubectl apply -f ${GIT_PATH}/${COMPONENT}/main/deploy/operator.yaml -n ${MANAGED_NAMESPACE}
   kubectl set env deployment/${COMPONENT} -n ${MANAGED_NAMESPACE} --containers="${COMPONENT}" WATCH_NAMESPACE=${MANAGED_CLUSTER_NAME}

   # Deploy the status synchronization component
   export COMPONENT="governance-policy-status-sync"
   kubectl apply -f ${GIT_PATH}/${COMPONENT}/main/deploy/operator.yaml -n ${MANAGED_NAMESPACE}
   kubectl set env deployment/${COMPONENT} -n ${MANAGED_NAMESPACE} --containers="${COMPONENT}" WATCH_NAMESPACE=${MANAGED_CLUSTER_NAME}

   # Deploy the template synchronization component
   export COMPONENT="governance-policy-template-sync"
   kubectl apply -f ${GIT_PATH}/${COMPONENT}/main/deploy/operator.yaml -n ${MANAGED_NAMESPACE}
   kubectl set env deployment/${COMPONENT} -n ${MANAGED_NAMESPACE} --containers="${COMPONENT}" WATCH_NAMESPACE=${MANAGED_CLUSTER_NAME}
   ```

   - See more about the synchronization components:
     - [policy-spec-sync](https://github.com/open-cluster-management-io/governance-policy-spec-sync)
     - [policy-status-sync](https://github.com/open-cluster-management-io/governance-policy-status-sync)
     - [policy-template-sync](https://github.com/open-cluster-management-io/governance-policy-template-sync)

3. Verify that the pods are running on the managed cluster with the following command:

   ```Shell
   $ kubectl get pods -n ${MANAGED_NAMESPACE}
   NAME                                               READY   STATUS    RESTARTS   AGE
   governance-policy-spec-sync-6474b6d898-tmkw6       1/1     Running   0          2m14s
   governance-policy-status-sync-84cbb795df-pgbgt     1/1     Running   0          2m14s
   governance-policy-template-sync-759b9b556f-mx46t   1/1     Running   0          2m14s
   ```

## What is next

Install the [policy controllers](../policy-controllers) to the managed clusters.
