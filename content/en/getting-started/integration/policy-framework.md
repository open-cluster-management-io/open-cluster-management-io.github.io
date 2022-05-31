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

### Policy Templates

Configuration policies support the inclusion of Golang text templates in the object 
definitions. These templates are resolved at runtime either on the hub cluster or the 
target managed cluster using configurations related to that cluster. This gives you the 
ability to define configuration policies with dynamic content and to inform or enforce Kubernetes 
resources that are customized to the target cluster.

The template syntax must follow the Golang template language specification, 
and the resource definition generated from the resolved template must be a valid YAML. 
(See the [Golang documentation about package templates](https://golang.org/pkg/text/template/) 
for more information.) Any errors in template validation appear as policy violations. 
When you use a custom template function, the values are replaced at runtime.

Template functions, such as resource-specific and generic `lookup` template functions, are 
available for referencing Kubernetes resources on the cluster. The resource-specific functions 
are used for convenience and makes content of the resources more accessible. In addition to these 
functions, utility functions like `base64encode`, `base64decode`, `indent`, `autoindent`, `toInt`, 
`toBool`, and more are also available.

To conform templates to YAML syntax, templates must be set in the policy resource as 
strings using quotes or a block character (`|` or `>`). This causes the resolved template value 
to also be a string. To override this, consider using `toInt` or `toBool` as the final function 
in the template to initiate further processing that forces the value to be interpreted 
as an integer, or boolean.

To bypass template processing you can either:
- Override a single template by wrapping the template in additional braces. For example, the 
  template `{{ template content }}` would become `{{ '{{ template content }}' }}`.
- Override all templates in a `ConfigurationPolicy` by adding the 
  `policy.open-cluster-management.io/disable-templates: "true"` annotation in the 
  `ConfigurationPolicy` section of your `Policy`. Template processing will be bypassed for 
  that `ConfigurationPolicy`.

#### Hub cluster templates

Hub cluster templates are used to define configuration policies that are dynamically 
customized to the target cluster. This reduces the need to create separate policies 
for each target cluster or hardcode configuration values in the policy definitions. 

Hub cluster templates are based on Golang text template specifications, and the `{{hub … hub}}` 
delimiter indicates a hub cluster template in a configuration policy.

A configuration policy definition can contain both hub cluster and managed cluster 
templates. Hub cluster templates are processed first on the hub cluster, then the policy 
definition with resolved hub cluster templates is propagated to the target clusters. 
On the managed cluster, the Configuration Policy controller processes any managed cluster 
templates in the policy definition and then enforces or verifies the fully resolved object 
definition.

Policies are processed on the hub cluster only upon creation or after an update. Therefore, 
hub cluster templates are only resolved to the data in the referenced resources upon policy 
creation or update. Any changes to the referenced resources are not automatically synced 
to the policies. 

A special annotation, `policy.open-cluster-management.io/trigger-update` can be used to 
indicate changes to the data referenced by the templates. Any change to the special annotation 
value initiates template processing, and the latest contents of the referenced resource are 
read and updated in the policy definition that is the propagator for processing on managed 
clusters. A typical way to use this annotation is to increment the value by one each time.


#### Template encryption details

The encryption algorithm uses AES-CBC with 256-bit keys. Each encryption key is unique per 
managed cluster and is automatically rotated every 30 days. This ensures that your decrypted 
value is never stored in the policy on the managed cluster.

To force an immediate encryption key rotation, delete the 
`policy.open-cluster-management.io/last-rotated` annotation on the `policy-encryption-key` 
Secret in the managed cluster namespace on the hub cluster. Policies are then reprocessed to 
use the new encryption key.


#### Template functions

| Function | Description | Sample |
| -------- | ----------- | ------ |
| `fromSecret` | Returns the value of the given data key in the secret. | `PASSWORD: '{{ fromSecret "default" "localsecret" "PASSWORD" }}'` |
| `fromConfigmap` | Returns the value of the given data key in the ConfigMap. | `log-file: '{{ fromConfigMap "default" "logs-config" "log-file" }}'` |
| `fromClusterClaim` | Returns the value of `spec.value` in the `ClusterClaim` resource. | `platform: '{{ fromClusterClaim "platform.open-cluster-management.io" }}'` |
| `lookup` | Returns the Kubernetes resource as a JSON compatible map. Note that if the requested resource does not exist, an empty map is returned. | `metrics-url: \|`<br />`http://{{ (lookup "v1" "Service" "default" "metrics").spec.clusterIP }}:8080` |
| `base64enc` | Returns a `base64` encoded value of the input string. | `USER_NAME: '{{ fromConfigMap "default" "myconfigmap" "admin-user" \| base64enc }}'` |
| `base64dec` | Returns a `base64` decoded value of the input string. | `app-name: \|`<br />`"{{ ( lookup "v1"  "Secret" "testns" "mytestsecret") .data.appname ) \| base64dec }}"` |
| `indent` | Returns the input string indented by the given number of spaces. | `Ca-cert:  \|`<br />`{{ ( index ( lookup "v1" "Secret" "default" "mycert-tls"  ).data  "ca.pem"  ) \|  base64dec \| indent 4  }}` |
| `autoindent` | Acts like the `indent` function but automatically determines the number of leading spaces needed based on the number of spaces before the template. | `Ca-cert:  \|`<br />`{{ ( index ( lookup "v1" "Secret" "default" "mycert-tls"  ).data  "ca.pem"  ) \|  base64dec \| autoindent }}` |
| `toInt` | Returns the integer value of the string and ensures that the value is interpreted as an integer in the YAML. | `vlanid:  \|`<br />`{{ (fromConfigMap "site-config" "site1" "vlan")  \| toInt }}` |
| `toBool` | Returns the boolean value of the input string and ensures that the value is interpreted as a boolean in the YAML. | `enabled:  \|`<br />`{{ (fromConfigMap "site-config" "site1" "enabled")  \| toBool }}` |
| `protect` | Encrypts the input string. It is decrypted when the policy is evaluated. On the replicated policy in the managed cluster namespace, the resulting value might resemble the following: `$ocm_encrypted:okrrBqt72oI+3WT/0vxeI3vGa+wpLD7Z0ZxFMLvL204=` | `enabled: \|`<br />`{{hub "(lookup "route.openshift.io/v1" "Route" "openshift-authentication" "oauth-openshift").spec.host \| protect hub}}` |




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

Ensure `clusteradm` CLI is installed and is newer than v0.2.0. Download and extract the
[clusteradm binary](https://github.com/open-cluster-management-io/clusteradm/releases/latest). For
more details see the
[clusteradm GitHub page](https://github.com/open-cluster-management-io/clusteradm/blob/main/README.md#quick-start).

Deploy the policy framework controllers to the hub cluster:

```Shell
# The context name of the clusters in your kubeconfig
# If the clusters are created by KinD, then the context name will the follow the pattern "kind-<cluster name>".
export CTX_HUB_CLUSTER=<your hub cluster context>           # export CTX_HUB_CLUSTER=kind-hub
export CTX_MANAGED_CLUSTER=<your managed cluster context>   # export CTX_MANAGED_CLUSTER=kind-cluster1

# Configure kubectl to point to the hub cluster
kubectl config use-context ${CTX_HUB_CLUSTER}

# Set the deployment namespace
export HUB_NAMESPACE="open-cluster-management"

# Set the hub cluster name
export HUB_CLUSTER_NAME="hub"

# Set the hub kubeconfig file
export HUB_KUBECONFIG="hub-kubeconfig"

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

# Set the hub cluster name
export HUB_CLUSTER_NAME="hub"

# Set the hub kubeconfig file
export HUB_KUBECONFIG="hub-kubeconfig"

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
   export MANAGED_CLUSTER_NAME=<your managed cluster name>  # export MANAGED_CLUSTER_NAME=cluster1
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
