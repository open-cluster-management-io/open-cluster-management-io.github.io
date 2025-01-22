---
title: Open Policy Agent Gatekeeper
weight: 4
hide_summary: true
---

[Gatekeeper](https://open-policy-agent.github.io/gatekeeper/website/) is a validating webhook with auditing capabilities
that can enforce custom resource definition-based policies that are run with the Open Policy Agent (OPA). Gatekeeper
constraints can be used to evaluate Kubernetes resource compliance. You can leverage OPA as the policy engine, and use
Rego as the policy language.



## Installing Gatekeeper

See the [Gatekeeper documentation](https://open-policy-agent.github.io/gatekeeper/website/docs/install) to install the
desired version of Gatekeeper to the managed cluster.

## Sample Gatekeeper policy

Gatekeeper policies are written using constraint templates and constraints. View the following YAML examples that use
Gatekeeper constraints in an OCM `Policy`:

- `ConstraintTemplates` and constraints: Use the Gatekeeper integration feature by using OCM policies for multicluster
  distribution of Gatekeeper constraints and Gatekeeper audit results aggregation on the hub cluster. The following
  example defines a Gatekeeper `ConstraintTemplate` and constraint (`K8sRequiredLabels`) to ensure the "gatekeeper"
  label is set on all namespaces:

  ```yaml
  apiVersion: policy.open-cluster-management.io/v1
  kind: Policy
  metadata:
    name: require-gatekeeper-labels-on-ns
  spec:
    remediationAction: inform # (1)
    disabled: false
    policy-templates:
      - objectDefinition:
          apiVersion: templates.gatekeeper.sh/v1beta1
          kind: ConstraintTemplate
          metadata:
            name: k8srequiredlabels
          spec:
            crd:
              spec:
                names:
                  kind: K8sRequiredLabels
                validation:
                  openAPIV3Schema:
                    properties:
                      labels:
                        type: array
                        items: string
            targets:
              - target: admission.k8s.gatekeeper.sh
                rego: |
                  package k8srequiredlabels
                  violation[{"msg": msg, "details": {"missing_labels": missing}}] {
                    provided := {label | input.review.object.metadata.labels[label]}
                    required := {label | label := input.parameters.labels[_]}
                    missing := required - provided
                    count(missing) > 0
                    msg := sprintf("you must provide labels: %v", [missing])
                  }
      - objectDefinition:
          apiVersion: constraints.gatekeeper.sh/v1beta1
          kind: K8sRequiredLabels
          metadata:
            name: ns-must-have-gk
          spec:
            enforcementAction: dryrun
            match:
              kinds:
                - apiGroups: [""]
                  kinds: ["Namespace"]
            parameters:
              labels: ["gatekeeper"]
  ```

  1. Since the remediationAction is set to "inform", the `enforcementAction` field of the Gatekeeper constraint is
     overridden to "warn". This means that Gatekeeper detects and warns you about creating or updating a namespace that
     is missing the "gatekeeper" label. If the policy `remediationAction` is set to "enforce", the Gatekeeper constraint
     `enforcementAction` field is overridden to "deny". In this context, this configuration prevents any user from
     creating or updating a namespace that is missing the gatekeeper label.

  With the previous policy, you might receive the following policy status message:

  > warn - you must provide labels: {"gatekeeper"} (on Namespace default); warn - you must provide labels:
  > {"gatekeeper"} (on Namespace gatekeeper-system).

  Once a policy containing Gatekeeper constraints or `ConstraintTemplates` is deleted, the constraints and
  `ConstraintTemplates` are also deleted from the managed cluster.

  **Notes:**

  - The Gatekeeper audit functionality runs every minute by default. Audit results are sent back to the hub cluster to
    be viewed in the OCM policy status of the managed cluster.

- Auditing Gatekeeper events: The following example uses an OCM
  [configuration policy](getting-started/integration/configuration-policy) within an OCM policy to check for Kubernetes
  API requests denied by the Gatekeeper admission webhook:

  ```yaml
  apiVersion: policy.open-cluster-management.io/v1
  kind: Policy
  metadata:
    name: policy-gatekeeper-admission
  spec:
    remediationAction: inform
    disabled: false
    policy-templates:
      - objectDefinition:
        apiVersion: policy.open-cluster-management.io/v1
        kind: ConfigurationPolicy
        metadata:
          name: policy-gatekeeper-admission
        spec:
          remediationAction: inform # will be overridden by remediationAction in parent policy
          severity: low
          object-templates:
            - complianceType: mustnothave
              objectDefinition:
                apiVersion: v1
                kind: Event
                metadata:
                  namespace: gatekeeper-system # set it to the actual namespace where gatekeeper is running if different
                  annotations:
                    constraint_action: deny
                    constraint_kind: K8sRequiredLabels
                    constraint_name: ns-must-have-gk
                    event_type: violation
  ```
