---
title: Add-on Developer Guide
weight: 5
---

This page is a developer guide about how to build an OCM add-on using addon-framework.



## Supported version

The OCM v1.0.0 requires addon-framework v0.9.3 and above versions.

And notice there's breaking changes in [automatic installation](#automatic-installation) in addon-framework version v0.10.0.

## Overview

Add-on is an extension which can work with multiple clusters based on the foundation components in open-cluster-management.
Add-ons are Open Cluster Management-based extensions that can be used to work with multiple clusters.
Add-ons can support different configurations for different managed clusters, and can also be used to read data from the hub cluster.
For example, you might use the [managed-serviceaccount](https://github.com/open-cluster-management-io/managed-serviceaccount) add-on to collect the tokens from managed cluster back to the hub cluster,
use the [cluster-proxy ](https://github.com/open-cluster-management-io/cluster-proxy) addon to establish a reverse proxy tunnels from the managed cluster to the hub cluster, etc.

A typical add-on should consist of two kinds of components:

**Add-on agent:** The components running in the managed clusters which can be any kubernetes resources, for example
it might be a container with permissions to access the hub cluster, an Operator, or an instance of Operator, etc.

**Add-on manager:** A kubernetes controller in the hub cluster that generates and applies the add-on agent manifests to the managed clusters
via the ManifestWork API. The manager also can optionally manage the lifecycle of add-on.

There are 2 API resources for add-on in the OCM hub cluster:

**ClusterManagementAddOn:** This is a cluster-scoped resource which allows the user to discover which add-on is available
for the cluster manager and also provides metadata information about the add-on such as display name and description information.
The name of the `ClusterManagementAddOn` resource will be used for the namespace-scoped `ManagedClusterAddOn` resource.

**ManagedClusterAddOn:** This is a namespace-scoped resource which is used to trigger the add-on agent to be installed
on the managed cluster, and should be created in the `ManagedCluster` namespace of the hub cluster.
`ManagedClusterAddOn` also holds the current state of an add-on.

There is a library named [addon-framework](https://github.com/open-cluster-management-io/addon-framework) which provides
some simple user interfaces for developers to build their add-on managers easily.

We have some available add-ons in the OCM community:

* [cluster-proxy](https://github.com/open-cluster-management-io/cluster-proxy)
* [managed-serviceaccount](https://github.com/open-cluster-management-io/managed-serviceaccount)
* [argocd-pull-integration](https://github.com/open-cluster-management-io/argocd-pull-integration)
* [config-policy-controller](https://github.com/open-cluster-management-io/governance-policy-addon-controller)
* [governance-policy-framework](https://github.com/open-cluster-management-io/governance-policy-addon-controller)

## Write your first add-on

Let's implement a simple add-on manager using addon-framework,  which deploys a busybox deployment in the managed cluster.
You can find the example in [here](https://github.com/open-cluster-management-io/addon-framework/tree/4172c567862306031ac0405f82eb4f7b4d74b30a/cmd/example/busybox).

### Implement the addon manager

First, create your Go project, and the project should contain a `main.go` file and a folder `manifests`. The folder name
can be customized, the example uses `manifests` as the folder name. `main.go` contains the Go code of the addon manager.
`manifests` contains the addon agent's manifest files to be deployed on the managed cluster.

The `main.go` file is like this:

```go
package main

import (
  "context"
  "embed"
  "os"
  restclient "k8s.io/client-go/rest"
  "k8s.io/klog/v2"
  "open-cluster-management.io/addon-framework/pkg/addonfactory"
  "open-cluster-management.io/addon-framework/pkg/addonmanager"
)

//go:embed manifests
var FS embed.FS

const (
  addonName = "busybox-addon"
)

func main() {
  kubeConfig, err := restclient.InClusterConfig()
  if err != nil {
     os.Exit(1)
  }
  addonMgr, err := addonmanager.New(kubeConfig)
  if err != nil {
     klog.Errorf("unable to setup addon manager: %v", err)
     os.Exit(1)
  }

  agentAddon, err := addonfactory.NewAgentAddonFactory(addonName, FS, "manifests").BuildTemplateAgentAddon()
  if err != nil {
     klog.Errorf("failed to build agent addon %v", err)
     os.Exit(1)
  }

  err = addonMgr.AddAgent(agentAddon)
  if err != nil {
     klog.Errorf("failed to add addon agent: %v", err)
     os.Exit(1)
  }

  ctx := context.Background()
  go addonMgr.Start(ctx)

  <-ctx.Done()
}
```

You need to define an `embed.FS` to embed the files in `manifests` folder.

And then you need to build an `agentAddon` using the `agentAddonFactory`, and tell the `agentAddonFactory` the name of
the add-on and the agent manifests.

Finally, you just add the `agentAddon` to the `addonManager` and start the `addonManager`.

With above code, the addon manager is implemented. Next is to implement the addon agent part. In this example, the add-on agent
manifest to be deployed on managed cluster is a busybox deployment.

Create file `deployment.yaml` in `manifests` folder, the `deployment.yaml` is like this:

```
kind: Deployment
apiVersion: apps/v1
metadata:
 name: busybox
 namespace: open-cluster-management-agent-addon
spec:
 replicas: 1
 selector:
   matchLabels:
     addon: busybox
 template:
   metadata:
     labels:
       addon: busybox
   spec:
     containers:
       - name: busybox
         image: busybox
         imagePullPolicy: IfNotPresent
         args:
           - "sleep"
           - "3600"
```

Then you can follow next section to [deploy the add-on manager on your hub cluster](##deploy-the-add-on-manager-on-your-hub-cluster). The add-on manager will watch the `ManagedClusterAddOn`, and deploy the add-on agent manifests to the targeted managed cluster via `ManifestWork`.

### Deploy the add-on manager on your hub cluster

Now you can build your add-on manager as an image and deploy it on the hub cluster.

Following below steps to build the image for the [example](https://github.com/open-cluster-management-io/addon-framework/tree/4172c567862306031ac0405f82eb4f7b4d74b30a/cmd/example/busybox).
This image contains several example addon managers, including the busybox example.

```bash
git clone https://github.com/open-cluster-management-io/addon-framework.git
cd addon-framework
make images
```

In addition to the deployment definition, there are also some additional resources to be deployed on the hub cluster. An example of the deployment manifests for the add-on manager is [here](https://github.com/open-cluster-management-io/addon-framework/tree/main/examples/deploy/addon/busybox).
Following below steps to deploy the add-on manager.

```bash
make deploy-busybox
```

With the add-on manager deployed, you can see the `busybox-addon-controller` running in namespace `open-cluster-management` on the hub cluster.

```bash
$ oc get pods -n open-cluster-management
NAME                                       READY   STATUS    RESTARTS   AGE
busybox-addon-controller-d977665d5-x28qc   1/1     Running   0          27m
```

#### RBAC of the addon manager

There are some minimum required permissions for the addon manager controller to run on the hub cluster.  It needs to:

1. *get/list/watch/update* the `ManagedCluster`.
2. *get/list/watch/create/update/patch/delete* the `ManagedClusterAddOn` and `ManifestWork`.
3. *get/list/watch* the `ClusterManagementAddOn`.


#### ClusterManagementAddOn

From a user’s perspective, to install the addon to the hub cluster the hub admin should register a globally-unique
`ClusterManagementAddOn` resource as a singleton placeholder in the hub cluster. For instance, the [`ClusterManagementAddOn`](https://github.com/open-cluster-management-io/addon-framework/blob/main/examples/deploy/addon/busybox/resources/busybox_clustermanagementaddon.yaml)
for the busybox-addon:

```yaml
apiVersion: addon.open-cluster-management.io/v1alpha1
kind: ClusterManagementAddOn
metadata:
 name: busybox-addon
spec:
 addOnMeta:
   displayName: Busybox Addon
   description: "busybox-addon is an example addon to deploy busybox pod on the managed cluster"
```

### Enable the add-on for a managed cluster.

Now your addon-manager is running on the hub cluster.
To deploy the busybox add-on agent to a certain managed cluster, you need to create a `ManagedClusterAddOn` in the
managed cluster namespace of hub cluster.

```yaml
apiVersion: addon.open-cluster-management.io/v1alpha1
kind: ManagedClusterAddOn
metadata:
 name: busybox-addon
 namespace: cluster1
spec:
 installNamespace: open-cluster-management-agent-addon
```

You can set any existing namespace in the managed cluster as the `installNamespace` here, and the add-on manager will
deploy the add-on agent manifests in this namespace of the managed cluster.

> Note: `open-cluster-management-agent-addon` is our default namespace to install the add-on agent manifests in the managed cluster.

You can also use the `clusteradm` command to enable the busybox-addon for the managed cluster.

```bash
$ clusteradm addon enable --names busybox-addon --namespace open-cluster-management-agent-addon --clusters cluster1
```

After enabling the add-on for the managed cluster, you can find a `ManifestWork` named `addon-busybox-addon-deploy` is
deploying on the managed cluster namespace of the hub cluster.

```bash
$ kubectl get manifestworks.work.open-cluster-management.io -n cluster1
NAME                         AGE
addon-busybox-addon-deploy   2m
```

And the busybox deployment is deployed on the managed cluster too.

```bash
$ kubectl get deployment -n open-cluster-management-agent-addon
NAME                      READY   UP-TO-DATE   AVAILABLE   AGE
busybox                   1/1     1            1           2m
```

### Disable the add-on for a managed cluster

You can delete the `ManagedClusterAddOn` CR in the managed cluster namespace of the hub cluster to disable the add-on for
the managed cluster.The created `ManifestWork` will be deleted and the add-on agent manifests will be removed from the
managed cluster too.

You also can use the `clusteradm` command to disable the add-on for a managed cluster.

```bash
$ clusteradm addon disable --names busybox-addon --clusters cluster1
```

If you delete the `ClusterManagementAddOn` on the hub cluster, the `ManagedClusterAddOn` CRs in all managed cluster
namespaces will be deleted too.


### What’s the next

However, this add-on just ensures a pod to run on the managed cluster, and you cannot see the status of the addon,
and there are not any functionality to manage the clusters. The addon-framework also provides other configurations
for add-on developers.

```bash
$ kubectl get managedclusteraddons.addon.open-cluster-management.io -n cluster1
NAME                AVAILABLE   DEGRADED   PROGRESSING
busybox-addon      Unknown
```

Next, you need to configure the addon.

## Add-on agent configurations

### Monitor addon healthiness

In the busybox example above, we found the `AVAILABLE` status of the `ManagedClusterAddOn` is always `Unknown`.

That’s because the add-on manager did not monitor the status of the add-on agent from the hub cluster.

We support 3 kinds of health prober types to monitor the healthiness of add-on agents.

1. **Lease**

   The add-on agent maintains a `Lease` in its installation namespace with its status, the [registration agent](https://open-cluster-management.io/concepts/architecture/#registration) will
   check this `Lease` to maintain the `AVAILABLE` status of the `ManagedClusterAddOn`.

   The addon-framework provides a [leaseUpdater](https://github.com/open-cluster-management-io/addon-framework/blob/main/pkg/lease/lease_controller.go#L24) interface which can make it easier.

    ```go
    leaseUpdater := lease.NewLeaseUpdater(spokeKubeClient, addonName, installNamespace)
    go leaseUpdater.Start(context.Background())
    ```

   `Lease` is the default prober type for add-on, there is nothing to configure for the add-on manager.

2. **Work**

   `Work` health prober indicates the healthiness of the add-on is equal to the overall dispatching status of the
   corresponding ManifestWork resources. It's applicable to those add-ons that don't have a container agent
   in the managed clusters or don't expect to add `Lease` for the agent container.
   The add-on manager will check if the work is `Available` on the managed clusters.
   In addition, the user can define a `HealthCheck` prober function to check more detailed status based on status
   feedback from the `ManifestWork`.

   It is required to define a `HealthProber` instance first. Here is an example to check if the `availableReplicas` of
   add-on agent deployment is more than 1. If yes, it will set the `AVAILABLE` status of `ManagedClusterAddOn` to `true`.
   Otherwise, the `AVAILABLE` status of `ManagedClusterAddOn` will be false.

    ```go
    healthProber := utils.NewDeploymentProber(types.NamespacedName{Name: "workprober-addon-agent", Namespace: "open-cluster-management-agent-addon"})
    ```

   And then you can configure the `HealthProber` to the agentAddon.

    ```go
    agentAddon, err := addonfactory.NewAgentAddonFactory(addonName, FS, "manifests").
                        WithAgentHealthProber(healthProber).
                        BuildTemplateAgentAddon()
    ```

3. **DeploymentAvailability**

   `DeploymentAvailability` health prober indicates the healthiness of the add-on is connected to the availability of
   the corresponding agent deployment resources on the managed cluster. It's applicable to those add-ons that run
   `Deployment` type workload on the managed cluster. The add-on manager will check if the `readyReplicas` of the
   add-on agent deployment is more than 1 to set the addon Status.

   Set the type of `healthProber` to `DeploymentAvailability` to enable this prober.

    ```go
    healthProber := &agent.HealthProber{
        Type: agent.HealthProberTypeDeploymentAvailability,
    }
    ```

4. **WorkloadAvailability**

   `WorkloadAvailability` health prober indicates the healthiness of the add-on is connected to the availability of
   the corresponding agent workload resources(only `Deployment` and `DaemonSet` are supported for now) on the managed
   cluster. It's applicable to those add-ons that run `Deployment` and/or `DaemonSet` workloads on the managed
   cluster. The add-on manager will check if `readyReplicas > 1` for each `Deployment` and
   `NumberReady == DesiredNumberScheduled` for each `DaemonSet` of the add-on agent to set the addon Status.

   Set the type of `healthProber` to `WorkloadAvailability` to enable this prober.

    ```go
    healthProber := &agent.HealthProber{
        Type: agent.HealthProberTypeWorkloadAvailability,
    }
    ```

5. **None**

   If you want to check and maintain the `AVAILABLE` status of `ManagedClusterAddOn` by yourself, set the type of
   `healthProber` to `None`.

    ```go
    healthProber := &agent.HealthProber{
        Type: agent.HealthProberTypeNone,
    }
    ```

### Automatic installation

NOTE:
- The automatic installation is no longer supported since addon-framework v0.10.0. Please use the `InstallStrategy` in
[Managing the add-on agent lifecycle by addon-manager](#managing-the-add-on-agent-lifecycle-by-addon-manager) section
instead.
- The automatic installation is still avaliable in addon-framework version v0.9.3, which is also the
minimal supported addon-framework version in OCM v1.0.0. Using the previous version will have install conficts.

In the busybox add-on example, you need to create a `ManagedClusterAddOn` CR to enable the add-on manually.
The addon-framework also provides a configuration called `InstallStrategy` to support installing addon automatically.

Currently, the addon-framework supports `InstallAllStrategy` and `InstallByLabelStrategy` strategies.

`InstallAllStrategy` will create `ManagedClusterAddOn` for all managed cluster namespaces automatically.

```go
installStrategy := agent.InstallAllStrategy("open-cluster-management-agent-addon")
````

`InstallByLabelStrategy` will create `ManagedClusterAddOn` for the selected managed cluster namespaces automatically.

```go
installStrategy := &agent.InstallStrategy{
	Type:             agent.InstallByLabel,
    InstallNamespace: "open-cluster-management-agent-addon",
    LabelSelector:    &metav1.LabelSelector{...},
}
```

Configure the `InstallStrategy` to the agentAddon:

```go
agentAddon, err := addonfactory.NewAgentAddonFactory(addonName, FS, "manifests").
                    WithInstallStrategy(installStrategy).
                    BuildTemplateAgentAddon()
```

Addtionally, if you are using addon-framework v0.9.3 or higher, need to grant a `patch` permission on `ClusterManagementAddon` to your addon manager.

```yaml
kind: ClusterRole
  apiVersion: rbac.authorization.k8s.io/v1
  metadata:
    name: helloworld-addon
  rules:
...
    - apiGroups: ["addon.open-cluster-management.io"]
      resources: ["clustermanagementaddons"]
      verbs: ["get", "list", "watch", "patch"]
```

The below annotation will be added automatically to claim the `ManagedClusterAddon` lifecycle is managed by the addon itself.

```yaml
apiVersion: addon.open-cluster-management.io/v1alpha1
kind: ClusterManagementAddOn
metadata:
  annotations:
    addon.open-cluster-management.io/lifecycle: "self"
  name: helloworld
spec:
  installStrategy:
    type: Manual
```

### Register your add-on

In most cases, the add-ons have requirements to access the hub cluster or other central service endpoint with TLS authentication.
For example, an add-on agent needs to get a resource in its cluster namespace of the hub cluster, or the add-on agent
needs to access the exposed service on the hub cluster.

The addon-framework supports a solution that the addon can access the `kube-apiserver` with a kube style API or
other endpoints on the hub cluster with client certificate authentication after it is registered using `CSR`.

The addon-framework provides an interface to help add-on manager to save the add-on configuration information to
its corresponding `ManagedClusterAddOns`.

On the managed cluster, the registration agent watches `ManagedClusterAddOns` on the hub cluster.
The registration agent follows next steps to register an add-on:

1. The registration agent creates a `CSR` request with its own hub kubeConfig to register the add-on to the hub cluster.
2. On the hub cluster, the add-on manager approves the `CSR` request. The addon-framework also provides
   an interface which the add-on manager can implement it to approve its `CSR` automatically.
3. After the `CSR` request is approved on the hub cluster, the registration agent gets the certificate from
   the `CSR` request and saves the client certificate to a secret in the add-on agent install namespace.
   If the `SignerName` is `kubernetes.io/kube-apiserver-client`, the secret name will be `{addon name}-hub-kubeconfig`.
   Otherwise, the secret name will be `{addon name}-{signer name}-client-cert`.
4. The add-on agent can mount the secret to get the client certificate to connect with the hub cluster or the custom service endpoint.
5. When the certificate of managed cluster addon is about to expire, the registration agent will send a request to
   rotate the certificate on the hub cluster, the addon manager will approve the certificate rotation request.


Now we build another add-on that is going to sync configmap from the hub cluster to the managed cluster.
The add-on code can be found [here](https://github.com/open-cluster-management-io/addon-framework/tree/4172c567862306031ac0405f82eb4f7b4d74b30a/cmd/example/helloworld) .

Specifically, since the addon agent needs to read configmap from the hub, we need to define the registration option for this addon.

```go
func NewRegistrationOption(kubeConfig *rest.Config, addonName, agentName string) *agent.RegistrationOption {
    return &agent.RegistrationOption{
        CSRConfigurations: agent.KubeClientSignerConfigurations(addonName, agentName),
        CSRApproveCheck:   utils.DefaultCSRApprover(agentName),
        PermissionConfig:  rbac.AddonRBAC(kubeConfig),
    }
}
```

`CSRConfigurations` returns a list of `CSR` configuration for the addd-on agent in a managed cluster. The `CSR` will
be created from the managed cluster for add-on agent with each `CSRConfiguration`.

```go
func KubeClientSignerConfigurations(addonName, agentName string) func(cluster *clusterv1.ManagedCluster) []addonapiv1alpha1.RegistrationConfig {
	return func(cluster *clusterv1.ManagedCluster) []addonapiv1alpha1.RegistrationConfig {
        return []addonapiv1alpha1.RegistrationConfig{
            {
                SignerName: certificatesv1.KubeAPIServerClientSignerName,
                Subject: addonapiv1alpha1.Subject{
                    User:   DefaultUser(cluster.Name, addonName, agentName),
                    Groups: DefaultGroups(cluster.Name, addonName),
                },
            },
        }
	}
}
```

The original Kubernetes `CSR` API only supports three built-in signers:

* kubernetes.io/kube-apiserver-client
* kubernetes.io/kube-apiserver-client-kubelet
* kubernetes.io/kubelet-serving

However, in some cases, we need to sign additional custom certificates for the add-on agents which are not used for connecting any kube-apiserver.
The add-on manager can be serving as a custom `CSR` `signer` controller based on the addon-framework’s extensibility by implementing the signing logic.
The addon-framework will also keep rotating the certificates automatically for the add-on after successfully signing the certificates.

`CSRApproveCheck` checks whether the add-on agent registration should be approved by the add-on manager.
The `utils.DefaultCSRApprover` is implemented to auto-approve all the `CSRs`. A better `CSR check` is recommended to include:

1. The validity of the requester's requesting identity.
2. The other request payload such as key-usages.

If the function is not set, the registration and certificate renewal of the add-on agent needs to be approved manually on the hub cluster.

`PermissionConfig` defines a function for an add-on to set up RBAC permissions on the hub cluster after the `CSR` is approved.
In this example, it will create a role in the managed cluster namespace with *get/list/watch* configmaps permissions,
and bind the role to the group defined in `CSRConfigurations`.

Configure the registrationOption to the agentAddon.

```go
agentAddon, err := addonfactory.NewAgentAddonFactory(helloworld.AddonName, helloworld.FS, "manifests/templates").
                    WithGetValuesFuncs(helloworld.GetValues, addonfactory.GetValuesFromAddonAnnotation).
                    WithAgentRegistrationOption(registrationOption).
                    WithInstallStrategy(addonagent.InstallAllStrategy(agent.HelloworldAgentInstallationNamespace)).
                    BuildTemplateAgentAddon()

```

After deploying the example add-on, you can find the registration configuration in the `ManagedClusterAddOn` status.

```yaml
apiVersion: addon.open-cluster-management.io/v1alpha1
kind: ManagedClusterAddOn
metadata:
  name: helloworld
  namespace: cluster1
  ownerReferences:
  - apiVersion: addon.open-cluster-management.io/v1alpha1
    blockOwnerDeletion: true
    controller: true
    kind: ClusterManagementAddOn
    name: helloworld
spec:
  installNamespace: default
status:
  registrations:
  - signerName: kubernetes.io/kube-apiserver-client
    subject:
      groups:
      - system:open-cluster-management:cluster:cluster1:addon:helloworld
      - system:open-cluster-management:addon:helloworld
      - system:authenticated
      user: system:open-cluster-management:cluster:cluster1:addon:helloworld:agent:2rn8d
```

In this example, the addon requires a `CSR` access hub kube-api (with singer name `kubernetes.io/kube-apiserver-client`).
After the `CSR` is created on the hub cluster, the add-on manager will check the signer, group and subject of the `CSRs`
to verify whether the `CSR` is valid. If all fields are valid, the add-on manager will approve the `CSR`.

```yaml
apiVersion: certificates.k8s.io/v1
kind: CertificateSigningRequest
metadata:
  labels:
    open-cluster-management.io/addon-name: helloworld
    open-cluster-management.io/cluster-name: cluster1
  name: addon-cluster1-helloworld-lb7cb
spec:
  groups:
  - system:open-cluster-management:cluster1
  - system:open-cluster-management:managed-clusters
  - system:authenticated
  request: xxx
  signerName: kubernetes.io/kube-apiserver-client
  usages:
  - digital signature
  - key encipherment
  - client auth
  username: system:open-cluster-management:cluster1:9bkfw
```

After the `CSR` is approved, the add-on controller creates the `Role` and `Rolebinding` in the cluster namespace.

```bash
$ kubectl get role -n cluster1
NAME                                       CREATED AT
open-cluster-management:helloworld:agent   2022-07-10T10:08:37Z
$ kubectl get rolebinding -n cluster1
NAME                                                           ROLE                                                              AGE
open-cluster-management:helloworld:agent                       Role/open-cluster-management:helloworld:agent                     13m
```

The `Rolebinding` binds the `Role` to the Group `system:open-cluster-management:cluster:cluster1:addon:helloworld`.

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: open-cluster-management:helloworld:agent
  namespace: cluster1
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: Role
  name: open-cluster-management:helloworld:agent
subjects:
- apiGroup: rbac.authorization.k8s.io
  kind: Group
  name: system:open-cluster-management:cluster:cluster1:addon:helloworld
```

The registration agent will create a kubeConfig secret named `<add-on name>-hub-kubeconfig` in the `addonInstallNamesapce`.
The addon agent can mount the secret to get the hub kubeConfig to connect with the hub cluster to *get/list/watch* the Configmaps.

```bash
$ kubectl get secret -n default
NAME                              TYPE                                  DATA   AGE
helloworld-hub-kubeconfig         Opaque                                3      9m52s
```

### Add your add-on agent supported configurations

For some cases, you want to specify the configurations for your add-on agent, for example, you may want to use a configuration to configure your add-on agent image or use a configuration to configure your add-on agent node Selector and tolerations to make the agent to run on specific nodes.

The addon-framework supports re-rendering the add-on agent deployment when the add-on agent configurations are changed.

You can choose the [`AddOnDeploymentConfig`](https://github.com/open-cluster-management-io/api/blob/main/addon/v1alpha1/types_addondeploymentconfig.go) API as the configuration for your add-on agent, it supports setting customized variables and node placement for your add-on agent deployment, and meanwhile you can also choose your own configuration.

You can do the following steps to reference your configurations in your add-on APIs with add-on framework

1. Add the supported configuration types in your add-on `ClusterManagementAddOn`, we support to add multiple different configuration types in the `ClusterManagementAddOn`, for example

    ```yaml
    apiVersion: addon.open-cluster-management.io/v1alpha1
    kind: ClusterManagementAddOn
    metadata:
      name: helloworldhelm
    spec:
      # the add-on supported configurations
      supportedConfigs:
      - group: addon.open-cluster-management.io
        resource: addondeploymentconfigs
      - resource: configmaps
    ```

   In this example, the `helloworldhelm` add-on supports using `AddOnDeploymentConfig` and `ConfigMap` as its configuration, and you can specify one default configuration for one configuration type, for example

   ```yaml
    apiVersion: addon.open-cluster-management.io/v1alpha1
    kind: ClusterManagementAddOn
    metadata:
      name: helloworldhelm
    spec:
      # the add-on supported configurations
      supportedConfigs:
      - group: addon.open-cluster-management.io
        resource: addondeploymentconfigs
        # the default config for helloworldhelm
        defaultConfig:
          name: deploy-config
          namespace: open-cluster-management
      - resource: configmaps
   ```

   Thus, all helloworldhelm add-ons on each managed cluster have one same default configuration `open-cluster-management/deploy-config`

2. Register the supported configuration types when building one `AgentAddon` with `AgentAddonFactory`

3. Implement a `GetValuesFunc` to transform the configuration to addon-framework `Values` object and add the `GetValuesFunc` to the `AgentAddonFactory`, for example

    ```go
    agentAddon, err := addonfactory.NewAgentAddonFactory("helloworldhelm", helloworld_helm.FS, "manifests/charts/helloworld").
        // register the supported configuration types
        WithConfigGVRs(
          schema.GroupVersionResource{Version: "v1", Resource: "configmaps"},
          schema.GroupVersionResource{Group: "addon.open-cluster-management.io", Version: "v1alpha1", Resource: "addondeploymentconfigs"},
        ).
        WithGetValuesFuncs(
          // get the AddOnDeloymentConfig object and transform it to Values object
          addonfactory.GetAddOnDeloymentConfigValues(
            addonfactory.NewAddOnDeloymentConfigGetter(addonClient),
            addonfactory.ToAddOnNodePlacementValues,
          ),
          // get the ConfigMap object and transform it to Values object
          helloworld_helm.GetImageValues(kubeClient),
        ).WithAgentRegistrationOption(registrationOption).
        BuildHelmAgentAddon()
    ```

   In this example, we register the `ConfigMap` and `AddOnDeploymentConfig` as the `helloworldhelm` add-on configuration. We use add-on framework
   help function [`GetAddOnDeloymentConfigValues`](https://github.com/open-cluster-management-io/addon-framework/blob/main/pkg/addonfactory/addondeploymentconfig.go#L47) to transform the `AddOnDeploymentConfig`, and we implemented the [`GetImageValues`](https://github.com/open-cluster-management-io/addon-framework/blob/main/examples/helloworld_helm/helloworld_helm.go#L64) function to
   transform the `ConfigMap`, you can find more details for add-on framework `Values` from the [Values definition](#values-definition) part.

4. Add the `get`, `list` and `watch` permissions to an add-on `clusterrole`, for example, the [clusterrole](https://github.com/open-cluster-management-io/addon-framework/blob/main/examples/deploy/addon/helloworld-helm/resources/cluster_role.yaml) of `helloworldhelm` should have the following permissions

  ```yaml
  kind: ClusterRole
  apiVersion: rbac.authorization.k8s.io/v1
  metadata:
    name: helloworldhelm-addon
  rules:
    - apiGroups: [""]
      resources: ["configmaps"]
      verbs: ["get", "list", "watch"]
    - apiGroups: ["addon.open-cluster-management.io"]
      resources: ["addondeploymentconfigs"]
      verbs: ["get", "list", "watch"]
  ```

To configure add-on, the add-on user need reference their configuration objects in `ManagedClusterAddOn`, for example

```yaml
apiVersion: addon.open-cluster-management.io/v1alpha1
kind: ManagedClusterAddOn
metadata:
  name: helloworldhelm
  namespace: cluster1
spec:
  installNamespace: open-cluster-management-agent-addon
  configs:
  - group: addon.open-cluster-management.io
    resource: addondeploymentconfigs
    name: deploy-config
    namespace: cluster1
  - resource: configmaps
    name: image-config
    namespace: cluster1
```

In this example, the add-on user reference the configuration `cluster1/deploy-config` and `cluster1/image-config` for `helloworldhelm` on `cluster1`. When the configuration references are added to an add-on, the add-on framework will show them in the status of `ManagedClusterAddOn` and render the add-on once, during the rendering process, the add-on framework will callback the `GetValuesFunc`s to transform the add-on configuraton object to add-on framework `Values` object and use `Values` object to render the add-on agent deployment resources. If the add-on configuration objects are updated, the add-on framework will render the add-on again.

## Build an addon using helm charts or raw manifests.

### Building steps

The addon-framework supports helm charts or raw manifests as the add-on agent manifests. The building steps are the same:

1. Copy the helm chart or raw manifests files into the add-on manager project. And define an `embed.FS` to embed the files
   into your Go program.

   The example using helm chart is [helloworld_helm addon](https://github.com/open-cluster-management-io/addon-framework/tree/main/examples/helloworld_helm),
   and the example using raw manifests is [helloworld addon](https://github.com/open-cluster-management-io/addon-framework/tree/main/examples/helloworld).

2. Build different `agentAddons` using the `agentAddonFactory` instance with `BuildHelmAgentAddon` or `BuildTemplateAgentAddon`.

   For helm chart building:

    ```go
    agentAddon, err := addonfactory.NewAgentAddonFactory(helloworld_helm.AddonName, helloworld_helm.FS, "manifests/charts/helloworld").
                        WithGetValuesFuncs(helloworld_helm.GetValues, addonfactory.GetValuesFromAddonAnnotation).
                        WithAgentRegistrationOption(registrationOption).
                        BuildHelmAgentAddon()
    ```

   For raw manifests building:

    ```go
    agentAddon, err := addonfactory.NewAgentAddonFactory(helloworld.AddonName, helloworld.FS, "manifests/templates").
                        WithGetValuesFuncs(helloworld.GetValues, addonfactory.GetValuesFromAddonAnnotation).
                        WithAgentRegistrationOption(registrationOption).
                        WithInstallStrategy(addonagent.InstallAllStrategy(agent.HelloworldAgentInstallationNamespace)).
                        BuildTemplateAgentAddon()
    ```

3. Add the agentAddon to the addon manager.
4. Start the addon manager.

### Values definition

The addon-framework supports 3 add-on built-in values and 3 helm chart built-in values for helm chart add-on manifests.

* `Value.clusterName`
* `Value.addonInstallNamespace`
* `Value.hubKubeConfigSecret` (used when the add-on is needed to register to the hub cluster)
* `Capabilities.KubeVersion` is the `ManagedCluster.Status.Version.Kubernetes`.
* `Release.Name`  is the add-on name.
* `Release.Namespace` is the `addonInstallNamespace`.

The addon-framework supports 3 add-on built-in values in the config of templates for the raw manifests add-on.

* `ClusterName`
* `AddonInstallNamespace`
* `HubKubeConfigSecret` (used when the AddOn is needed to register to the hub cluster)

In the list of `GetValuesFuncs`, the values from the big index Func will override the one from low index Func.

The built-in values will override the values obtained from the list of `GetValuesFuncs`.

The Variable names in Values should begin with lowercase. So the best practice is to define a json struct for the values,
and convert it to Values using the `JsonStructToValues`.

Values from annotation of `ManagedClusterAddOn`

The addon-framework supports a helper `GetValuesFunc` named `GetValuesFromAddonAnnotation` which can get values from
the annotations of `ManagedClusterAddOn`.

The key of the Helm Chart values in annotation is `addon.open-cluster-management.io/values`,
and the value should be a valid json string which has key-value format.

## Hosted mode

The addon-framework supports add-on in Hosted mode, that the agent manifests will be deployed outside the managed cluster.
We can choose to run add-on in Hosted mode or Default mode if the managed cluster is imported to the hub in Hosted mode.
By default, the add-on agent will run on the managed cluster(Default mode).
We can add an annotation `addon.open-cluster-management.io/hosting-cluster-name` for the `ManagedClusterAddon`,
so that the add-on agent will be deployed on the certain hosting cluster(Hosted mode),
the value of the annotation is the hosting cluster which should:

* be a managed cluster of the hub as well.
* be the same cluster where the managed cluster `klusterlet`(registration-agent & work-agent) runs.

We defined a label `addon.open-cluster-management.io/hosted-manifest-location` to indicate which cluster the add-on
agent manifests should be deployed.

* No matter what the value is, all manifests will be deployed on the managed cluster in Default mode.
* When the label does not exist or the value is `managed`: the manifest will be deployed on the managed cluster in Hosted mode.
* When the value is `hosting`: the manifest will be deployed on the hosting cluster in Hosted mode.
* When the value is `none`: the manifest will not be deployed in Hosted mode.

More details you can find in the [design](https://github.com/open-cluster-management-io/enhancements/tree/main/enhancements/sig-architecture/63-hosted-addon),
and we have an example in [here](https://github.com/open-cluster-management-io/addon-framework/tree/main/examples/helloworld_hosted).

## Pre-delete hook

The addon-framework provides a hook manifest before delete the add-on.
The hook manifest supports `Jobs` or `Pods` to do some cleanup work before the add-on agent is deleted on the managed cluster.

You need only add the label `open-cluster-management.io/addon-pre-delete` to the `Jobs` or `Pods`in the add-on manifests.
The `Jobs` or `Pods` will not be applied until the `ManagedClusterAddOn` is deleted.
And the `Jobs` or `Pods` will be applied on the managed cluster by applying the manifestWork named `addon-<addon name>-pre-delete`
when the `ManagedClusterAddOn` is under deleting.
After the `Jobs` are `Completed` or `Pods` are in the `Succeeded` phase, all the deployed `ManifestWorks` will be deleted.

You can find the example from [here](https://github.com/open-cluster-management-io/addon-framework/tree/main/examples/helloworld_helm).

## Orphaning manifests on addon deletion

By default, when a `ManagedClusterAddOn` is deleted, all the resources deployed by the addon will be automatically removed from the managed cluster. However, in some cases, you may want to preserve certain resources even after the addon is deleted. The addon-framework provides the `addon.open-cluster-management.io/deletion-orphan` annotation to support this use case.

When you add this annotation to any resource in your addon manifests, that resource will be "orphaned" (left behind) when the addon is deleted, instead of being automatically cleaned up.

### How to use the deletion-orphan annotation

Add the `addon.open-cluster-management.io/deletion-orphan` annotation to any resources in your addon manifests that you want to preserve after addon deletion:

```yaml
kind: ConfigMap
apiVersion: v1
metadata:
  name: important-data
  namespace: open-cluster-management-agent-addon
  annotations:
    addon.open-cluster-management.io/deletion-orphan: ""
data:
  key: value
```

When the `ManagedClusterAddOn` is deleted:

1. Resources **without** the `deletion-orphan` annotation will be removed from the managed cluster
2. Resources **with** the `deletion-orphan` annotation will remain on the managed cluster

### Use cases

Common scenarios where orphaning manifests is useful:

* **Preserving data:** Keep ConfigMaps or Secrets containing important configuration or state data
* **Avoiding disruption:** Leave certain resources running to prevent service interruption during addon reinstallation
* **Manual cleanup:** Retain resources that need manual review or cleanup by administrators
* **Shared resources:** Keep resources that might be used by other components or addons

### Important notes

* The annotation value can be empty (`""`) or any string - only the presence of the annotation key matters
* Orphaned resources will not be managed by OCM after the addon is deleted. You'll need to clean them up manually if needed
* This annotation works for any Kubernetes resource type in your addon manifests
* You can combine this with the [pre-delete hook](#pre-delete-hook) to run cleanup jobs while preserving certain resources

### Example: Orphaning a PersistentVolumeClaim

Here's an example of an addon that deploys a stateful application and preserves the PersistentVolumeClaim when the addon is deleted:

```yaml
kind: Deployment
apiVersion: apps/v1
metadata:
  name: stateful-app
  namespace: open-cluster-management-agent-addon
spec:
  replicas: 1
  selector:
    matchLabels:
      app: stateful-app
  template:
    metadata:
      labels:
        app: stateful-app
    spec:
      containers:
        - name: app
          image: my-stateful-app:latest
          volumeMounts:
            - name: data
              mountPath: /data
      volumes:
        - name: data
          persistentVolumeClaim:
            claimName: app-data
---
kind: PersistentVolumeClaim
apiVersion: v1
metadata:
  name: app-data
  namespace: open-cluster-management-agent-addon
  annotations:
    addon.open-cluster-management.io/deletion-orphan: ""
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 10Gi
```

In this example, when the addon is deleted:

* The Deployment will be removed
* The PersistentVolumeClaim will be preserved with its data intact
* You can reinstall the addon later and it will reconnect to the existing PVC

## What happened under the scene

<div style="text-align: center; padding: 20px;">
   <img src="/addon-architecture.png" alt="Addon Architecture" style="margin: 0 auto; width: 80%">
</div>


This architecture graph shows how the coordination between add-on manager and add-on agent works.

1. The registration agent creates a `CSR` request with its own hub kubeConfig to register the add-on to the hub cluster.
2. On the hub cluster, the add-on manager approves the `CSR` request.
3. After the `CSR` request is approved on the hub cluster, the registration agent gets the certificate from the `CSR` request
   to establish the hub kubeConfig and save the hub kubeConfig to a secret in the managed cluster addon namespace.
4. The add-on manager is watching the `ManagedClusterAddOn` for all managed cluster namespaces.
   And will create an add-on deploy `ManifestWork` in the managed cluster namespace once the `ManagedClusterAddOn` is created in this managed cluster namespace.
5. The work agent will apply the manifests in the `ManifestWork` on the managed cluster.
6. The add-on agent will mount the secret created by the registration agent to get the hub kubeConfig to connect with the hub cluster.

## Managing the add-on agent lifecycle by addon-manager

The add-on agent lifecycle can now be managed by the general
`addon-manager` starting from OCM v0.11.0. This is achieved through enhancements
to the `ClusterManagementAddOn` and `ManagedClusterAddOn` APIs. 

More detailed usage of add-on install strategy and rollout strategy refer to the [Add-on lifecycle management](https://open-cluster-management.io/docs/getting-started/installation/addon-management/#add-on-lifecycle-management).

Add-on developers can use addon-framework v0.9.3 and the above versions
to support the scenarios mentioned above.

1. Modify the `go.mod` file to use the latest addon-framework and API versions.

```
open-cluster-management.io/addon-framework v0.9.3 // // or latest
open-cluster-management.io/api v0.13.0 // or latest
```

2. Remove the `WithInstallStrategy()` function described in the [automatic installation](#automatic-installation)
   section since it conflicts with the install strategy defined in the `ClusterManagementAddOn` API level.

3. Claim that the addon is managed by the general `addon-manager` by adding the annotation
   `addon.open-cluster-management.io/lifecycle: "addon-manager"` explicitly in the
   `ClusterManagementAddOn`.

Skip this step for OCM v0.14.0 and later version. The annotation is automatically added by the general addon manager.

```yaml
apiVersion: addon.open-cluster-management.io/v1alpha1
kind: ClusterManagementAddOn
metadata:
  name: helloworld
  annotations:
    addon.open-cluster-management.io/lifecycle: "addon-manager"
...
```

4. Define the `installStrategy` and `rolloutStrategy` in the `ClusterManagementAddOn`
   as shown in the example above. Note that the rollout strategy is triggered by
   changes in configurations, so if the addon does not have [supported cofingurations](#add-your-add-on-agent-supported-configurations),
   the rollout strategy will not take effect.

5. If you do not want the automatic addon installation, set the install strategy type to `Manual`.

```yaml
apiVersion: addon.open-cluster-management.io/v1alpha1
kind: ClusterManagementAddOn
metadata:
  annotations:
    addon.open-cluster-management.io/lifecycle: "addon-manager"
  name: helloworld
spec:
  installStrategy:
    type: Manual
```

## Build an addon with addon template

Using the addon-framework to develop an addon requires developers to implement the interface defined in the
addon-framework via code and deploy a dedicated addon manager deployment on the hub cluster.
But if the addon you are trying to develop:

* not going to support hosted mode
* the crucial agent workloads that need to be deployed to the managed cluster are `Deployments` and/or `DaemonSets`
* no other customized API is needed to configure the addon besides the `AddOnDeploymentConfig`
* no need to run anything on the hub cluster other than managing the addon agent

you can have a try with the new API `AddOnTemplate` introduced from OCM v0.12.0 to build the addon, which can get rid
of coding, and only need to define some yaml files to build an addon.

Using `AddOnTemplate` to build an addon, the `AddonManagement` feature gate must not be disabled in
`ClusterManager.spec.addOnManagerConfiguration` and `Klusterlet.spec.registrationConfiguration`

Enhancement proposal: [Add-on Template](https://github.com/open-cluster-management-io/enhancements/tree/main/enhancements/sig-architecture/82-addon-template)

Note: The `DaemonSet` type workload is supported in the addon template(injecting environment variables, injecting
volumes, health probe for daemonsets) from OCM v0.14.0.

### Steps to build an addon with addon template

1. Create an `AddOnTemplate` object to define the addon:
   The `AddOnTemplate` API provides two parts of information to build an addon:
    * `manifests`: what resources will be deployed to the managed cluster. You can add the `addon.open-cluster-management.io/deletion-orphan` annotation to any resource to preserve it when the addon is deleted (see [Orphaning manifests on addon deletion](#orphaning-manifests-on-addon-deletion)).
    * `registration`: how to register the addon to the hub cluster

   For example, the following yaml file defines the `hello-template` addon, which will:
    * deploy a `Deployment`, a `ServiceAccount`, and a `ClusterRoleBinding` to the managed cluster
    * register the addon to the hub cluster, and make the addon agent(Deployment hello-template-agent):
        * have the permission to access resources defined in the `cm-admin` clusterRole in the <managed-cluster-name>
          namespace on the hub cluster(KubeClient type registration, CurrentCluster)
        * have the permission to access resources defined in the `cm-reader` Role in the `open-cluster-management`
          namespace on the hub cluster(KubeClient type registration, SingleNamespace)
        * have the credential to access the customized endpoint(CustomSigner type registration)

   ```yaml
   apiVersion: addon.open-cluster-management.io/v1alpha1
   kind: AddOnTemplate
   metadata:
     name: hello-template
   spec:
     addonName: hello-template
     agentSpec: # required
         workload:
           manifests:
             - kind: Deployment
               apiVersion: apps/v1
               metadata:
                 name: hello-template-agent
                 namespace: open-cluster-management-agent-addon
                 labels:
                   app: hello-template-agent
               spec:
                 replicas: 1
                 selector:
                   matchLabels:
                     app: hello-template-agent
                 template:
                   metadata:
                     labels:
                       app: hello-template-agent
                   spec:
                     serviceAccountName: hello-template-agent-sa
                     containers:
                       - name: helloworld-agent
                         image: quay.io/open-cluster-management/addon-examples:latest
                         imagePullPolicy: IfNotPresent
                         args:
                           - "/helloworld"
                           - "agent"
                           - "--cluster-name={{CLUSTER_NAME}}"
                           - "--addon-namespace=open-cluster-management-agent-addon"
                           - "--addon-name=hello-template"
                           - "--hub-kubeconfig={{HUB_KUBECONFIG}}"
                           - "--v={{LOG_LEVEL}}" # addonDeploymentConfig variables
             - kind: ServiceAccount
               apiVersion: v1
               metadata:
                 name: hello-template-agent-sa
                 namespace: open-cluster-management-agent-addon
                 annotations:
                   addon.open-cluster-management.io/deletion-orphan: "" # Optional: preserve this resource when addon is deleted
             - kind: ClusterRoleBinding
               apiVersion: rbac.authorization.k8s.io/v1
               metadata:
                 name: hello-template-agent
               roleRef:
                 apiGroup: rbac.authorization.k8s.io
                 kind: ClusterRole
                 name: cluster-admin
               subjects:
                 - kind: ServiceAccount
                   name: hello-template-agent-sa
                   namespace: open-cluster-management-agent-addon
     registration: # optional
       # kubeClient or custom signer, if kubeClient, user and group is in a certain format.
       # user is "system:open-cluster-management:cluster:{clusterName}:addon:{addonName}:agent:{agentName}"
       # group is ["system:open-cluster-management:cluster:{clusterName}:addon:{addonName}",
       #           "system:open-cluster-management:addon:{addonName}", "system:authenticated"]
       - type: KubeClient
         kubeClient:
           hubPermissions:
             - type: CurrentCluster
               currentCluster:
                 clusterRoleName: cm-admin # should be created by user
             - type: SingleNamespace
               singleNamespace:
                 namespace: open-cluster-management
                 roleRef:
                   apiGroup: rbac.authorization.k8s.io
                   kind: Role
                   # should be created by user; the addon manager will grant the permission to the agent, so if the
                   # role/clusterRole contains some permissions that the addon manager doesn't have, user needs to grant
                   # the permission to the addon-manager (service account open-cluster-management-hub/addon-manager-controller-sa),
                   # otherwise the addon manager will fail to grant the permission to the agent
                   name: cm-reader
       - type: CustomSigner
         # addon-manager only generates the credential for the agent to authenticate to the hub cluster, not responsible
         # for the authroization which should be taken care of by the user
         customSigner:
           signerName: example.com/signer-test
           subject:
             user: user-test
             groups:
               - group-test
             organizationUnit:
               - organization-test
           signingCA:
             # type is "kubernetes.io/tls"; namespace is optional, "open-cluster-management-hub" will be used if
             # namespace is not set; user needs to grant the permission to the addon-manager (service account
             # open-cluster-management-hub/addon-manager-controller-sa) to access the secret
             name: ca-secret
             namespace: test-namespace
   ```

   **Notes**:

   * The permission related resources(i.e. `RoleBinding` `ClusterRoleBinding`) for *the addon agent access the local
     managed cluster* defined in the `addonTemplate.agentSpec.workload.manifests` will be created on the managed cluster
     by the work-agent, but the work-agent may not have permission to create these resources, users should refer to
     [permission-setting-for-work-agent](https://open-cluster-management.io/concepts/manifestwork/#permission-setting-for-work-agent)
     to grant the work-agnet permissions to address the permission issue on the managed cluster side.
   * Permissions for *the addon agent access the hub cluster* defined in
     `addonTemplate.registration[*].kubeClient.hubPermissions`, users should ensure:
       1) the referenced clusterrole/role(`.hubPermissions.currentCluster.clusterRoleName`
          `.hubPermissions.singleNamespace.roleRef.name`, `cm-admin` and `cm-reader` in the above example) exists on the
          hub cluster
       2) the addon-manager has permission to create rolebinding to bind these (cluster)role for the addon-agent. For
          example: users can create a clusterrolebinding to grant the permission to the addon-manager (service account
          `open-cluster-management-hub/addon-manager-controller-sa`) to address the permission issue on the hub cluster
          side. For the above example, if the addon-manager doesn't have the permission to create the `RoleBinding` to
          bind the `cm-admin` role, users can grant the permission to the addon-manager by creating a
          `ClusterRoleBinding` like below:

          ```yaml
          apiVersion: rbac.authorization.k8s.io/v1
          kind: ClusterRoleBinding
          metadata:
            name: addon-manager-cm-admin
          roleRef:
            apiGroup: rbac.authorization.k8s.io
            kind: ClusterRole
            name: cm-admin
          subjects:
            - kind: ServiceAccount
              name: addon-manager-controller-sa
              namespace: open-cluster-management-hub
          ```

2. Create a `ClusterManagementAddOn` to declare this is template type addon which should be managed by the
   addon-manager:

   ```yaml
   apiVersion: addon.open-cluster-management.io/v1alpha1
   kind: ClusterManagementAddOn
   metadata:
     name: hello-template
     annotations:
       addon.open-cluster-management.io/lifecycle: "addon-manager"
   spec:
     addOnMeta:
       description: hello-template is a addon built with addon template
       displayName: hello-template
     supportedConfigs: # declare it is a template type addon
     - group: addon.open-cluster-management.io
       resource: addontemplates
       defaultConfig:
         name: hello-template
   ```

3. Create a `ManagedClusterAddOn` to enable the addon on `cluster1`

   ```yaml
   apiVersion: addon.open-cluster-management.io/v1alpha1
   kind: ManagedClusterAddOn
   metadata:
     name: hello-template
     namespace: cluster1
   spec:
     installNamespace: open-cluster-management-agent-addon
   ```

### Use variables in the addon template

Users can use variables in the `addonTemplate.agentSpec.workload.manifests` field in the form of `{{VARIABLE_NAME}}`, it
is similar to go template syntax but not identical, only String value is supported. And there are two types of
variables:

1. **Built-in variables**:
    * **Constant parameters** (can not be overridden by user's variables):
        * `CLUSTER_NAME`: name of the managed cluster (e.g., cluster1)
    * **Default parameters** (can be overridden by user's variables):
        * `HUB_KUBECONFIG`: path of the kubeconfig to access the hub cluster, default value is
          `/managed/hub-kubeconfig/kubeconfig`

2. **Customized variables**: Variables defined in `addonDeploymentConfig.customizedVariables` can be used.

#### Using customized variables from AddOnDeploymentConfig

To use customized variables in your addon template, you need to:

1. **Define the variables in an AddOnDeploymentConfig**:

   ```yaml
   apiVersion: addon.open-cluster-management.io/v1alpha1
   kind: AddOnDeploymentConfig
   metadata:
     name: hello-template-deploy-config
     namespace: open-cluster-management
   spec:
     customizedVariables:
     - name: LOG_LEVEL
       value: "2"
     - name: REPLICA_COUNT
       value: "3"
     - name: IMAGE_TAG
       value: "v1.2.3"
     - name: CUSTOM_ENV_VAR
       value: "production"
   ```

2. **Reference the AddOnDeploymentConfig in your ClusterManagementAddOn**:

   ```yaml
   apiVersion: addon.open-cluster-management.io/v1alpha1
   kind: ClusterManagementAddOn
   metadata:
     name: hello-template
     annotations:
       addon.open-cluster-management.io/lifecycle: "addon-manager"
   spec:
     addOnMeta:
       description: hello-template is an addon built with addon template
       displayName: hello-template
     supportedConfigs:
     - group: addon.open-cluster-management.io
       resource: addontemplates
       defaultConfig:
         name: hello-template
     - group: addon.open-cluster-management.io
       resource: addondeploymentconfigs
       defaultConfig:
         name: hello-template-deploy-config
         namespace: open-cluster-management
   ```

3. **Use the variables in your AddOnTemplate**:

   ```yaml
   apiVersion: addon.open-cluster-management.io/v1alpha1
   kind: AddOnTemplate
   metadata:
     name: hello-template
   spec:
     addonName: hello-template
     agentSpec:
       workload:
         manifests:
           - kind: Deployment
             apiVersion: apps/v1
             metadata:
               name: hello-template-agent
               namespace: open-cluster-management-agent-addon
               labels:
                 app: hello-template-agent
                 version: "{{IMAGE_TAG}}"  # Using customized variable
             spec:
               replicas: {{REPLICA_COUNT}}  # Using customized variable
               selector:
                 matchLabels:
                   app: hello-template-agent
               template:
                 metadata:
                   labels:
                     app: hello-template-agent
                 spec:
                   serviceAccountName: hello-template-agent-sa
                   containers:
                     - name: helloworld-agent
                       image: quay.io/open-cluster-management/addon-examples:{{IMAGE_TAG}}  # Using customized variable
                       imagePullPolicy: IfNotPresent
                       env:
                         - name: CUSTOM_ENV
                           value: "{{CUSTOM_ENV_VAR}}"  # Using customized variable
                       args:
                         - "/helloworld"
                         - "agent"
                         - "--cluster-name={{CLUSTER_NAME}}"  # Using built-in variable
                         - "--addon-namespace=open-cluster-management-agent-addon"
                         - "--addon-name=hello-template"
                         - "--hub-kubeconfig={{HUB_KUBECONFIG}}"  # Using built-in variable
                         - "--v={{LOG_LEVEL}}"  # Using customized variable
   ```

#### Per-cluster customization

You can also override the default AddOnDeploymentConfig for specific clusters by referencing a different config in the ManagedClusterAddOn:

```yaml
apiVersion: addon.open-cluster-management.io/v1alpha1
kind: ManagedClusterAddOn
metadata:
  name: hello-template
  namespace: cluster1
spec:
  installNamespace: open-cluster-management-agent-addon
  configs:
  - group: addon.open-cluster-management.io
    resource: addondeploymentconfigs
    name: cluster1-specific-config  # Override with cluster-specific config
    namespace: cluster1
```

This allows you to have different variable values for different clusters while using the same addon template.

#### Namespace configuration with AddOnDeploymentConfig

When using `AddOnDeploymentConfig` with addon templates, the addon agent installation namespace is determined as follows:

* If `AddOnDeploymentConfig` is **not used**, the namespace of the manifest defined in the `AddOnTemplate` is used.
* If `AddOnDeploymentConfig` is **used** but `agentInstallNamespace: ""` (empty string), the namespace from `AddOnTemplate` is used.
* If `AddOnDeploymentConfig` is **used** but `agentInstallNamespace` is **not set**, the default namespace `open-cluster-management-agent-addon` is used.
* If `agentInstallNamespace` is set to a specific namespace, that namespace is used.

**Important:** To preserve a custom namespace from your `AddOnTemplate` when using `AddOnDeploymentConfig`, explicitly set `agentInstallNamespace: ""`.

Example:

```yaml
apiVersion: addon.open-cluster-management.io/v1alpha1
kind: AddOnDeploymentConfig
metadata:
  name: hello-template-deploy-config
  namespace: open-cluster-management
spec:
  agentInstallNamespace: ""  # Use namespace from AddOnTemplate
  customizedVariables:
  - name: LOG_LEVEL
    value: "2"
```

#### Variable naming and validation

When defining customized variables in AddOnDeploymentConfig, please note:

* **Variable names** must follow the pattern `^[a-zA-Z_][_a-zA-Z0-9]*$` (start with letter or underscore, followed by letters, numbers, or underscores)
* **Variable names** are case-sensitive and have a maximum length of 255 characters
* **Variable values** have a maximum length of 1024 characters
* **Variable names** should be descriptive and follow naming conventions (e.g., `LOG_LEVEL`, `IMAGE_TAG`, `REPLICA_COUNT`)

#### Variable precedence

Variables are resolved in the following order (later values override earlier ones):

1. Built-in default parameters (e.g., `HUB_KUBECONFIG`)
2. Variables from the default AddOnDeploymentConfig (referenced in ClusterManagementAddOn)
3. Variables from cluster-specific AddOnDeploymentConfig (referenced in ManagedClusterAddOn)
4. Built-in constant parameters (e.g., `CLUSTER_NAME`) - these cannot be overridden

#### Common use cases for variables

* **Image configuration**: Use variables like `IMAGE_TAG`, `IMAGE_REGISTRY` to customize container images
* **Resource configuration**: Use variables like `REPLICA_COUNT`, `CPU_LIMIT`, `MEMORY_LIMIT` for resource settings
* **Environment-specific settings**: Use variables like `LOG_LEVEL`, `DEBUG_MODE`, `ENVIRONMENT` for different environments
* **Feature flags**: Use variables like `ENABLE_FEATURE_X`, `USE_TLS` to enable/disable features

#### Complete example: Using variables for different environments

Here's a complete example showing how to use variables to deploy the same addon with different configurations for development and production environments:

**Development AddOnDeploymentConfig:**

```yaml
apiVersion: addon.open-cluster-management.io/v1alpha1
kind: AddOnDeploymentConfig
metadata:
  name: hello-template-dev-config
  namespace: open-cluster-management
spec:
  customizedVariables:
  - name: LOG_LEVEL
    value: "4"  # Debug level
  - name: REPLICA_COUNT
    value: "1"
  - name: IMAGE_TAG
    value: "latest"
  - name: ENVIRONMENT
    value: "development"
```

**Production AddOnDeploymentConfig:**

```yaml
apiVersion: addon.open-cluster-management.io/v1alpha1
kind: AddOnDeploymentConfig
metadata:
  name: hello-template-prod-config
  namespace: open-cluster-management
spec:
  customizedVariables:
  - name: LOG_LEVEL
    value: "1"  # Error level only
  - name: REPLICA_COUNT
    value: "3"
  - name: IMAGE_TAG
    value: "v1.2.3"
  - name: ENVIRONMENT
    value: "production"
```

**ManagedClusterAddOn for development cluster:**
```yaml
apiVersion: addon.open-cluster-management.io/v1alpha1
kind: ManagedClusterAddOn
metadata:
  name: hello-template
  namespace: dev-cluster
spec:
  installNamespace: open-cluster-management-agent-addon
  configs:
  - group: addon.open-cluster-management.io
    resource: addondeploymentconfigs
    name: hello-template-dev-config
    namespace: open-cluster-management
```

**ManagedClusterAddOn for production cluster:**
```yaml
apiVersion: addon.open-cluster-management.io/v1alpha1
kind: ManagedClusterAddOn
metadata:
  name: hello-template
  namespace: prod-cluster
spec:
  installNamespace: open-cluster-management-agent-addon
  configs:
  - group: addon.open-cluster-management.io
    resource: addondeploymentconfigs
    name: hello-template-prod-config
    namespace: open-cluster-management
```

With this setup, the same AddOnTemplate will be rendered differently for each environment, with appropriate log levels, replica counts, and image tags.

### Using kubeconfig/certificates in the addon agent Deployment

The addon manager will inject volumes into the addon agent deployments and daemonsets based on the
`addonTemplate.spec.registration` field.

1. If there is a `KubeClient` type registration, the hub kubeconfig will be injected to the deployments defined in the
   addon template, so users can use the hub kubeconfig located at `/managed/hub-kubeconfig/kubeconfig` to access the hub

   ```yaml
   ...
   spec:
     containers:
       - name: addon-agent
         ...
         volumeMounts:
           - mountPath: /managed/hub-kubeconfig
             name: hub-kubeconfig
     volumes:
       - name: hub-kubeconfig
         secret:
           defaultMode: 420
           secretName: <addon-name>-hub-kubeconfig
   ...
   ```

2. If there is a `CustomSigner` type registration, the secret signed via the custom signer defined in the
   `CustomSignerRegistrationConfig` will be injected to the deployments and daemonsets defined in the addon template,
   so users can use the certificate located at `/managed/<signer-name>/tls.crt` and `/managed/<signer-name>/tls.key`

   ```yaml
   ...
   spec:
     containers:
       - name: addon-agent
         ...
         volumeMounts:
           - mountPath: /managed/<signer-name> # if the signer name contains "/", it will be replaced by "-"
             name: cert-<signer-name>
     volumes:
       - name: cert-<signer-name> # if the signer name contains "/", it will be replaced by "-"
         secret:
           defaultMode: 420
           secretName: <addon-name>-<signer-name>-client-cert # if the signer name contains "/", it will be replaced by "-"
   ```

### Health probe of the template type addon

Since we only support the `Deployment` and `DaemonSet` resource as the crucial agent runtime workload, the addon-manager
will check if the deployment and daemonsets are available, if not, the addon will be considered as unhealthy.

### Support proxy configuration for the template type addon

From OCM v0.16.0, the template type addon can be configured to use the proxy by setting the
`addonDeploymentConfig.spec.proxyConfig`:

```yaml
apiVersion: addon.open-cluster-management.io/v1alpha1
kind: AddOnDeploymentConfig
metadata:
  name: proxy-deploy-config
  namespace: open-cluster-management-hub
spec:
  proxyConfig:
    httpProxy: "http://test.com"
    httpsProxy: "https://test.com"
    noProxy: "api.ocm-hub.com,172.30.0.1" # Example: hub cluster api server and the local managed cluster api server
    caBundle: dGVzdC1idW5kbGUK
```

The proxy configuration `httpProxy`, `httpsProxy`, and `noProxy` will be injected as environments
`HTTP_PROXY`, `http_proxy`, `HTTPS_PROXY`, `https_proxy`, `NO_PROXY`, `no_proxy`(both uppercase and lowercase) to
the addon agent deployments and daemonsets.

If the `caBundle` is set, the addon-manager will create a configmap containing the ca bundle data in the addon install
namespace, and mount the configmap to the addon agent deployments and daemonsets, and then set an environment
`CA_BUNDLE_FILE_PATH` to the file path of the mounted ca bundle. If the addon needs to support the `caBundle` for the
`proxyConfig`, the **addon developer should get the ca bundle from the environment variable** `CA_BUNDLE_FILE_PATH`
to make the agent work with the proxy.

### Add-on template configurations

[Add-on configurations](https://open-cluster-management.io/docs/getting-started/installation/addon-management/#add-on-configurations) provides examples of how to configure add-on templates for different use cases.
