---
title: Register CAPI Cluster  
weight: 1
---

[Cluster API (CAPI)](https://cluster-api.sigs.k8s.io/) is a Kubernetes sub-project focused on providing declarative APIs and
tooling to simplify provisioning, upgrading, and operating multiple Kubernetes clusters. This document provides a guideline on how
to use the Cluster API project and the [Open Cluster Management (OCM)](https://open-cluster-management.io/) project together.

### Prerequisites

#### Initialize Cluster API Management Plane

Refer to the [Cluster API (CAPI)](https://cluster-api.sigs.k8s.io/) official documentation to initialize the Cluster API management plane on the Hub cluster.

You can create CAPI clusters after the Cluster API management plane is installed on the Hub cluster.


### Register CAPI Cluster via clusteradm

The [clusteradm](https://github.com/open-cluster-management-io/clusteradm) supports joining a CAPI cluster starting from version 0.14.0.

```bash
clusteradm join --hub-token <hub token> --hub-apiserver <hub apiserver> --cluster-name <cluster_name> --capi-import --capi-cluster-name <capi cluster name>
```

### Auto Register CAPI Cluster

OCM supports registering CAPI clusters automatically starting from version 1.1.0.

1. Enable feature gates for auto registration.

```yaml
apiVersion: operator.open-cluster-management.io/v1
kind: ClusterManager
metadata:
  name: cluster-manager
spec:
  registrationConfiguration:
    featureGates:
    - feature: ClusterImporter
      mode: Enable
    - feature: ManagedClusterAutoApproval
      mode: Enable
    autoApproveUsers:
    - system:serviceaccount:multicluster-engine:agent-registration-bootstrap
```

2. Create ManagedCluster

Create a ManagedCluster for the CAPI cluster.

Add the annotation `cluster.x-k8s.io/cluster: <namespace>/<CAPI cluster name>` if the ManagedCluster name is different from the CAPI cluster namespace. Otherwise, the cluster name should be the same as the CAPI cluster namespace.


```yaml
apiVersion: cluster.open-cluster-management.io/v1
kind: ManagedCluster
metadata:
  name: <cluster name>
  annotations:
    cluster.x-k8s.io/cluster: <namespace>/<CAPI cluster name> # optional
spec:
  hubAcceptsClient: true
```

3. Create cluster-import-config Secret

Create the `cluster-import-config` secret that includes the [values.yaml](https://github.com/open-cluster-management-io/ocm/blob/main/deploy/klusterlet/chart/klusterlet/values.yaml) of the klusterlet Helm chart in the cluster namespace.

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: cluster-import-config
  namespace: <cluster name>
type: Opaque
data:
  values.yaml: <klusterlet helm chart values.yaml | base64>
```

An example for the `values.yaml`, more fields description can be found in the helm chart [values.yaml](https://github.com/open-cluster-management-io/ocm/blob/main/deploy/klusterlet/chart/klusterlet/values.yaml) file.

```yaml
affinity: {}
bootstrapHubKubeConfig: |
  apiVersion: v1
  clusters:
  - cluster:
      certificate-authority-data: hub cluster ca
      server: https://api.hubcluster.com:6443
    name: hub cluster name
  contexts:
  - context:
      cluster: hub cluster name
      namespace: default
      user: default-auth
    name: default-context
  current-context: default-context
  kind: Config
  ...
createNamespace: true
images:
  imageCredentials:
    createImageCredentials: true
    dockerConfigJson: |
      {
        "auths": {
          "quay.io": {
            "auth": "my auth",
            "email": "my email"
          }
        }
      }
  imagePullPolicy: IfNotPresent
  overrides:
    operatorImage: quay.io/stolostron/registration-operator:v1.1.0
    registrationImage: quay.io/stolostron/registration:v1.1.0
    workImage: quay.io/stolostron/work:v1.1.0
klusterlet:
  clusterName: managed cluster name
  mode: Singleton
  name: klusterlet
  namespace: open-cluster-management-agent
  nodePlacement:
    tolerations:
    - effect: NoSchedule
      key: node-role.kubernetes.io/infra
      operator: Exists
  registrationConfiguration:
    bootstrapKubeConfigs: {}
    registrationDriver:
      authType: csr
  workConfiguration: {}
podSecurityContext:
  runAsNonRoot: true
replicaCount: 1
resources:
  limits:
    memory: 2Gi
  requests:
    cpu: 50m
    memory: 64Mi
securityContext:
  allowPrivilegeEscalation: false
  capabilities:
    drop:
    - ALL
  privileged: false
  readOnlyRootFilesystem: true
  runAsNonRoot: true
tolerations:
- effect: NoSchedule
  key: node-role.kubernetes.io/infra
  operator: Exists
```

The ManagedCluster will be registered automatically after the `cluster-import-config` secret is created.
