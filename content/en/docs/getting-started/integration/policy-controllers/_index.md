---
title: Policy
weight: 1
---

The Policy Add-on enables auditing and enforcement of configuration across clusters managed by OCM, enhancing security,
easing maintenance burdens, and increasing consistency across the clusters for your compliance and reliability
requirements.

View the following sections to learn more about the Policy Add-on:

- ### [Policy framework]({{< ref "docs/getting-started/integration/policy-controllers/policy-framework" >}})

  Learn about the architecture of the Policy Add-on that delivers policies defined on the hub cluster to the managed
  clusters and how to install and enable the add-on for your OCM clusters.

- ### [Policy API concepts]({{< ref "docs/getting-started/integration/policy-controllers/policy" >}})

  Learn about the APIs that the Policy Add-on uses and how the APIs are related to one another to deliver policies to
  the clusters managed by OCM.

- ### Supported managed cluster policy engines

  - #### [Configuration policy]({{< ref "docs/getting-started/integration/policy-controllers/configuration-policy" >}})

    The `ConfigurationPolicy` is provided by OCM and defines Kubernetes manifests to compare with objects that currently
    exist on the cluster. The action that the `ConfigurationPolicy` will take is determined by its `complianceType`.
    Compliance types include `musthave`, `mustnothave`, and `mustonlyhave`. `musthave` means the object should have the
    listed keys and values as a subset of the larger object. `mustnothave` means an object matching the listed keys and
    values should not exist. `mustonlyhave` ensures objects only exist with the keys and values exactly as defined.

  - #### [Open Policy Agent Gatekeeper]({{< ref "docs/getting-started/integration/policy-controllers/gatekeeper" >}})

    Gatekeeper is a validating webhook with auditing capabilities that can enforce custom resource definition-based
    policies that are run with the Open Policy Agent (OPA). Gatekeeper `ConstraintTemplates` and constraints can be
    provided in an OCM `Policy` to sync to managed clusters that have Gatekeeper installed on them.
