---
title: Policy framework
weight: 10
---

The policy framework provides governance capability to gain visibility, and drive remediation for various security and configuration aspects to help IT administrators meet their requirements.

<!-- spellchecker-disable -->

{{< toc >}}

<!-- spellchecker-enable -->

## Architecture

- You can find the analysis of the architectural components [here](https://github.com/open-cluster-management/governance-policy-framework#architecture)

<img src="/policy-framework-architecture-diagram.jpg" 
alt="Policy framework architecture" 
class="responsive3">

## Prerequisite

You must meet the following prerequisites to install the policy framework:

- Ensure [`kubectl`](https://kubernetes.io/docs/tasks/tools/install-kubectl) and [`kustomize`](https://kubernetes-sigs.github.io/kustomize/installation) are installed.

- Ensure [Golang](https://golang.org/doc/install) is installed, if you are planning to install from the source.

- Ensure the `open-cluster-management` _cluster manager_ is installed. See [Cluster Manager](/getting-started/core/cluster-manager) for more information.

- Ensure the `open-cluster-management` _klusterlet_ is installed. See [Klusterlet](/getting-started/core/register-cluster) for more information.

- Ensure the `open-cluster-management` _application_ is installed if you are using `PlacementRules` with your policies. See [Application management](/getting-started/integration/app-lifecycle) for more information. While installing Application management for the `PlacementRules` API is the recommended approach, if you are only using the new `Placement` API, you can skip the Application management installation, but you do need to install the `PlacementRule` CRD with this command:

   ```Shell
   kubectl apply -f https://raw.githubusercontent.com/open-cluster-management-io/multicloud-operators-subscription/main/deploy/hub-common/apps.open-cluster-management.io_placementrules_crd.yaml
   ```

## Install from prebuilt images on Quay.io

Complete the following steps to install the policy framework from prebuilt images on Quay.io:

1. Deploy the policy Custom Resource Definitions (CRD) and policy propagator component to the `open-cluster-management` namespace on the hub cluster with the following commands:

   ```Shell
   # Configure kubectl to point to the hub cluster
   kubectl config use-context ${CTX_HUB_CLUSTER}

   # Create the namespace
   export HUB_NAMESPACE="open-cluster-management"
   kubectl create ns ${HUB_NAMESPACE}

   # Apply the CRDs
   export GIT_PATH="https://raw.githubusercontent.com/open-cluster-management-io/governance-policy-propagator/main/deploy"
   kubectl apply -f ${GIT_PATH}/crds/policy.open-cluster-management.io_policies_crd.yaml
   kubectl apply -f ${GIT_PATH}/crds/policy.open-cluster-management.io_placementbindings_crd.yaml
   kubectl apply -f ${GIT_PATH}/crds/policy.open-cluster-management.io_policyautomations_crd.yaml

   # Deploy the policy-propagator
   kubectl apply -f ${GIT_PATH}/operator.yaml -n ${HUB_NAMESPACE}
   ```

   - See more about the policy propagator:
     - [policy-propagator](https://github.com/open-cluster-management-io/governance-policy-propagator)

2. Ensure the pods are running on the hub with the following command:

   ```Shell
   $ kubectl get pods -n ${HUB_NAMESPACE}
   NAME                                           READY   STATUS    RESTARTS   AGE
   governance-policy-propagator-8c77f7f5f-kthvh   1/1     Running   0          94s
   ```

3. Export the hub cluster `kubeconfig` with the following command:

   For `kind` cluster:

   ```Shell
   kind get kubeconfig --name ${HUB_CLUSTER_NAME} --internal > ${HUB_KUBECONFIG}
   ```

   For non-`kind` clusters:

   ```Shell
   kubectl config view --context=${CTX_HUB_CLUSTER} --minify --flatten > ${HUB_KUBECONFIG}
   ```

4. Deploy the policy synchronization components to the managed cluster. Run the following commands:

   ```Shell
   # Configure kubectl to point to the managed cluster
   kubectl config use-context ${CTX_MANAGED_CLUSTER}

   # Create the namespace
   export MANAGED_NAMESPACE="open-cluster-management-agent-addon"
   kubectl create ns ${MANAGED_NAMESPACE}

   # Create the secret to authenticate with the hub
   kubectl -n ${MANAGED_NAMESPACE} create secret generic hub-kubeconfig --from-file=kubeconfig=${HUB_KUBECONFIG}

   # Apply the policy CRD
   export GIT_PATH="https://raw.githubusercontent.com/open-cluster-management-io"
   kubectl apply -f ${GIT_PATH}/governance-policy-propagator/main/deploy/crds/policy.open-cluster-management.io_policies_crd.yaml

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

5. Verify that the pods are running on the managed cluster with the following command:

   ```Shell
   $ kubectl get pods -n open-cluster-management-agent-addon
   NAME                                               READY   STATUS    RESTARTS   AGE
   governance-policy-spec-sync-6474b6d898-tmkw6       1/1     Running   0          2m14s
   governance-policy-status-sync-84cbb795df-pgbgt     1/1     Running   0          2m14s
   governance-policy-template-sync-759b9b556f-mx46t   1/1     Running   0          2m14s
   ```

## What is next

Install the [policy controllers](../policy-controllers) to the managed clusters.
