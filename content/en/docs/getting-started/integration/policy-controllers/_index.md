---
title: Policy controllers
weight: 10
---

The [Policy API]({{< ref "docs/getting-started/integration/policy-controllers/policy" >}}) on the hub delivers the policies defined in `spec.policy-templates` to the managed
clusters via the [policy framework controllers]({{< ref "docs/getting-started/integration/policy-controllers/policy-framework" >}}). Once on the managed
cluster, these _Policy Templates_ are acted upon by the associated controller on the managed cluster. The policy
framework supports delivering the _Policy Template_ kinds listed.



## [Configuration policy]({{< ref "docs/getting-started/integration/policy-controllers/configuration-policy" >}})

  The `ConfigurationPolicy` is provided by OCM and defines Kubernetes manifests to compare with objects that currently
  exist on the cluster. The action that the `ConfigurationPolicy` will take is determined by its `complianceType`.
  Compliance types include `musthave`, `mustnothave`, and `mustonlyhave`. `musthave` means the object should have the
  listed keys and values as a subset of the larger object. `mustnothave` means an object matching the listed keys and
  values should not exist. `mustonlyhave` ensures objects only exist with the keys and values exactly as defined.

## [Open Policy Agent Gatekeeper]({{< ref "docs/getting-started/integration/policy-controllers/gatekeeper" >}})

  Gatekeeper is a validating webhook with auditing capabilities that can enforce custom resource definition-based
  policies that are run with the Open Policy Agent (OPA). Gatekeeper `ConstraintTemplates` and constraints can be
  provided in an OCM `Policy` to sync to managed clusters that have Gatekeeper installed on them.
