---
title: Policy
weight: 5
---

<!-- spellchecker-disable -->

{{< toc >}}

<!-- spellchecker-enable -->

## Overview

The policy framework has the following API concepts:

- _Policy Templates_ are the policies that perform a desired check or action. For example,
  [ConfigurationPolicy](/getting-started/integration/policy-controllers#install-the-configuration-policy-controller)
  objects are embedded in `Policy` objects under the `policy-templates` array. These cannot be
  deployed to managed clusters on their own.
- A [`Policy`](#policy) is a grouping mechanism for _Policy Templates_ and is the smallest
  deployable unit on the hub cluster. Embedded _Policy Templates_ are distributed to applicable
  managed clusters and acted upon by the appropriate
  [policy controller](/getting-started/integration/policy-controllers).
- A [`PolicySet`](#policyset) is a grouping mechanism of `Policy` objects. Compliance of all grouped
  `Policy` objects is summarized in the `PolicySet`. A `PolicySet` is a deployable unit and its
  distribution is controlled by a [Placement](/concepts/placement).
- A [`PlacementBinding`](#placementbinding) binds a [Placement](/concepts/placement) to a `Policy`
  or `PolicySet`.

The second half of the
[KubeCon NA 2022 - OCM Multicluster App & Config Management](/kubecon-na-2022-ocm-multicluster-app-and-config-management.pdf)
also covers an overview of the Policy addon.

## Policy

A `Policy` is a grouping mechanism for _Policy Templates_ and is the smallest deployable unit on the
hub cluster. Embedded _Policy Templates_ are distributed to applicable managed clusters and acted
upon by the appropriate [policy controller](/getting-started/integration/policy-controllers). The
compliance state and status of a `Policy` represents all embedded _Policy Templates_ in the
`Policy`. The distribution of `Policy` objects is controlled by a [Placement](/concepts/placement).

View a simple example of a `Policy` that embeds a `ConfigurationPolicy` policy template to manage a
namespace called "prod".

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

At first, you may notice the `annotations`. These are standard annotations that are for
informational purposes and can be used by user interfaces, custom report scripts, or components that
integrate with OCM.

Next, you may notice the optional `spec.remediationAction` field. This dictates if the policy
controller should `inform` or `enforce` when violations are found and overrides the
`remediationAction` field on each policy template. When set to `inform`, the `Policy` will become
noncompliant if the underlying policy templates detect that the desired state is not met. When set
to `enforce`, the policy controller applies the desired state when necessary and feasible.

The `policy-templates` array contains a single `ConfigurationPolicy` called
`policy-namespace-example`. This `ConfigurationPolicy` has the `remediationAction` set to `inform`
but it is overridden by the optional global `spec.remediationAction`. The `severity` is for
informational purposes similar to the `annotations`.

The most interesting part is the `object-templates` section under the embedded
`ConfigurationPolicy`. This describes the `prod` `Namespace` object that the `Policy` applies to.
The action that the `ConfigurationPolicy` will take is determined by the `complianceType`. In this
case, it is set to `MustHave` which means the `prod` `Namespace` object will be created if it
doesn't exist. Other compliance types include `MustNotHave` and `MustOnlyHave`. `MustNotHave` would
delete the `prod` `Namespace` object. `MustOnlyHave` would ensure the `prod` `Namespace` object only
exists with the fields defined in the `ConfigurationPolicy`.

When the `Policy` is bound to a [`Placement`](/concepts/placement), the `Policy` status will report
on each cluster that matched the bound `Placement`:

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

## PlacementBinding

A `PlacementBinding` binds a [Placement](/concepts/placement) to a [`Policy`](#policy) or
[`PolicySet`](#policyset).

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

## PolicySet

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
  description:
    Apply standard best practices for hardening your Open Cluster Management installation.
  policies:
    - policy-check-backups
    - policy-managedclusteraddon-available
    - policy-subscriptions
```

## Policy Templates

Configuration policies support the inclusion of Golang text templates in the object definitions.
These templates are resolved at runtime either on the hub cluster or the target managed cluster
using configurations related to that cluster. This gives you the ability to define configuration
policies with dynamic content and to inform or enforce Kubernetes resources that are customized to
the target cluster.

The template syntax must follow the Golang template language specification, and the resource
definition generated from the resolved template must be a valid YAML. (See the
[Golang documentation about package templates](https://golang.org/pkg/text/template/) for more
information.) Any errors in template validation appear as policy violations. When you use a custom
template function, the values are replaced at runtime.

Template functions, such as resource-specific and generic `lookup` template functions, are available
for referencing Kubernetes resources on the hub cluster (using the `{{hub ... hub}}` delimiters), or
managed cluster (using the `{{ ... }}` delimiters). See the
[Hub cluster templates section](#hub-cluster-templates) for more details. The resource-specific
functions are used for convenience and makes content of the resources more accessible. If you use
the generic function, `lookup`, which is more advanced, it is best to be familiar with the YAML
structure of the resource that is being looked up. In addition to these functions, utility functions
like `base64encode`, `base64decode`, `indent`, `autoindent`, `toInt`, and `toBool` are also
available.

To conform templates with YAML syntax, templates must be set in the policy resource as strings using
quotes or a block character (`|` or `>`). This causes the resolved template value to also be a
string. To override this, consider using `toInt` or `toBool` as the final function in the template
to initiate further processing that forces the value to be interpreted as an integer or boolean
respectively.

To bypass template processing you can either:

- Override a single template by wrapping the template in additional braces. For example, the
  template `{{ template content }}` would become `{{ '{{ template content }}' }}`.
- Override all templates in a `ConfigurationPolicy` by adding the
  `policy.open-cluster-management.io/disable-templates: "true"` annotation in the
  `ConfigurationPolicy` section of your `Policy`. Template processing will be bypassed for that
  `ConfigurationPolicy`.

### Hub cluster templates

Hub cluster templates are used to define configuration policies that are dynamically customized to
the target cluster. This reduces the need to create separate policies for each target cluster or
hardcode configuration values in the policy definitions.

Hub cluster templates are based on Golang text template specifications, and the `{{hub … hub}}`
delimiter indicates a hub cluster template in a configuration policy.

A configuration policy definition can contain both hub cluster and managed cluster templates. Hub
cluster templates are processed first on the hub cluster, then the policy definition with resolved
hub cluster templates is propagated to the target clusters. On the managed cluster, the
Configuration Policy controller processes any managed cluster templates in the policy definition and
then enforces or verifies the fully resolved object definition.

In OCM versions 0.9.x and older, policies are processed on the hub cluster only upon creation or
after an update. Therefore, hub cluster templates are only resolved to the data in the referenced
resources upon policy creation or update. Any changes to the referenced resources are not
automatically synced to the policies.

A special annotation, `policy.open-cluster-management.io/trigger-update` can be used to indicate
changes to the data referenced by the templates. Any change to the special annotation value
initiates template processing, and the latest contents of the referenced resource are read and
updated in the policy definition that is the propagator for processing on managed clusters. A
typical way to use this annotation is to increment the value by one each time.

### Template encryption details

The encryption algorithm uses AES-CBC with 256-bit keys. Each encryption key is unique per managed
cluster and is automatically rotated every 30 days. This ensures that your decrypted value is never
stored in the policy on the managed cluster.

To force an immediate encryption key rotation, delete the
`policy.open-cluster-management.io/last-rotated` annotation on the `policy-encryption-key` Secret in
the managed cluster namespace on the hub cluster. Policies are then reprocessed to use the new
encryption key.

### Template functions

| Function           | Description                                                                                                                                                                                                         | Sample                                                                                                                                       |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `fromSecret`       | Returns the value of the given data key in the secret.                                                                                                                                                              | `PASSWORD: '{{ fromSecret "default" "localsecret" "PASSWORD" }}'`                                                                            |
| `fromConfigmap`    | Returns the value of the given data key in the ConfigMap.                                                                                                                                                           | `log-file: '{{ fromConfigMap "default" "logs-config" "log-file" }}'`                                                                         |
| `fromClusterClaim` | Returns the value of `spec.value` in the `ClusterClaim` resource.                                                                                                                                                   | `platform: '{{ fromClusterClaim "platform.open-cluster-management.io" }}'`                                                                   |
| `lookup`           | Returns the Kubernetes resource as a JSON compatible map. Note that if the requested resource does not exist, an empty map is returned.                                                                             | `metrics-url: \|`<br />`http://{{ (lookup "v1" "Service" "default" "metrics").spec.clusterIP }}:8080`                                        |
| `base64enc`        | Returns a `base64` encoded value of the input string.                                                                                                                                                               | `USER_NAME: '{{ fromConfigMap "default" "myconfigmap" "admin-user" \| base64enc }}'`                                                         |
| `base64dec`        | Returns a `base64` decoded value of the input string.                                                                                                                                                               | `app-name: \|`<br />`"{{ ( lookup "v1" "Secret" "testns" "mytestsecret") .data.appname ) \| base64dec }}"`                                   |
| `indent`           | Returns the input string indented by the given number of spaces.                                                                                                                                                    | `Ca-cert: \|`<br />`{{ ( index ( lookup "v1" "Secret" "default" "mycert-tls" ).data "ca.pem" ) \| base64dec \| indent 4 }}`                  |
| `autoindent`       | Acts like the `indent` function but automatically determines the number of leading spaces needed based on the number of spaces before the template.                                                                 | `Ca-cert: \|`<br />`{{ ( index ( lookup "v1" "Secret" "default" "mycert-tls" ).data "ca.pem" ) \| base64dec \| autoindent }}`                |
| `toInt`            | Returns the integer value of the string and ensures that the value is interpreted as an integer in the YAML.                                                                                                        | `vlanid: \|`<br />`{{ (fromConfigMap "site-config" "site1" "vlan") \| toInt }}`                                                              |
| `toBool`           | Returns the boolean value of the input string and ensures that the value is interpreted as a boolean in the YAML.                                                                                                   | `enabled: \|`<br />`{{ (fromConfigMap "site-config" "site1" "enabled") \| toBool }}`                                                         |
| `protect`          | Encrypts the input string. It is decrypted when the policy is evaluated. On the replicated policy in the managed cluster namespace, the resulting value resembles the following: `$ocm_encrypted:<encrypted-value>` | `enabled: \|`<br />`{{hub "(lookup "route.openshift.io/v1" "Route" "openshift-authentication" "oauth-openshift").spec.host \| protect hub}}` |

Additionally, OCM supports the following template functions that are included from the `sprig` open
source project:

- `cat`
- `contains`
- `default`
- `empty`
- `fromJson`
- `hasPrefix`
- `hasSuffix`
- `join`
- `list`
- `lower`
- `mustFromJson`
- `quote`
- `replace`
- `semver`
- `semverCompare`
- `split`
- `splitn`
- `ternary`
- `trim`
- `until`
- `untilStep`
- `upper`

See the [Sprig documentation](https://masterminds.github.io/sprig) for more details.
