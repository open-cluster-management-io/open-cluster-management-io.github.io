---
title: Register a cluster to hub through proxy server
weight: 1
---

When registering a cluster to an Open Cluster Management (OCM) hub, there is a network requirement for the managed cluster. It must be able to reach the hub cluster. Sometimes the managed cluster cannot directly connect to the hub cluster. For example, the hub cluster is in a public cloud, and the managed cluster is in a private cloud environment behind firewalls. The communications out of the private cloud can only go through a HTTP or HTTPS proxy server. 

In this scenario, you need to configure the proxy settings to allow the communications from the managed cluster to access the hub cluster through a forward proxy server.

### Klusterlet proxy settings
During the cluster registration, a bootstrap kubeconfig is required by the Klusterlet agent running on the managed cluster to connect to the hub cluster. When the agent accesses the hub cluster through a proxy server, the URL of the proxy server should be specified in `cluster.proxy-url` of the bootstrap kubeconfig. If a HTTPS proxy server is used, the proxy CA certificate should be appended to `cluster.certificate-authority-data` of the bootstrap kubeconfig as well.

```yaml
apiVersion: v1
clusters:
  - cluster:
      certificate-authority-data: LS0tLS...LS0tCg==
      server: https://api.server-foundation-sno-x4lcs.dev04.red-chesterfield.com:6443
      proxy-url: https://10.0.109.153:3129
    name: default-cluster
contexts:
  - context:
      cluster: default-cluster
      namespace: default
      user: default-auth
    name: default-context
current-context: default-context
kind: Config
preferences: {}
users:
  - name: default-auth
    user:
      token: eyJh...8PwGo
```

Since the communication between the managed cluster and the hub cluster leverages mTLS, the SSL connection should not be terminated on the proxy server. So the proxy server needs to support HTTP tunneling (for example, HTTP CONNECT method), which will establish a tunnel between the managed cluster and the hub cluster and forward the traffic from the managed cluster through this tunnel.

Once the Klusterlet agent finishes the cluster registration, a secret `hub-kubeconfig-secret` is generated with a new kubeconfig. It has the similar proxy settings and the appropriate permissions. The Klusterlet agent then uses this kubeconfig to access the hub cluster.

<div style="text-align: center; padding: 20px;">
   <img src="/klusterlet-proxy.png" alt="multiple hubs" style="margin: 0 auto; width: 75%">
</div>

You can find an example built with [kind](https://kind.sigs.k8s.io) and [clusteradm](https://github.com/open-cluster-management-io/clusteradm/releases) in [Join hub through a forward proxy server](https://github.com/open-cluster-management-io/OCM/tree/main/solutions/join-through-proxy-server).

### Add-on proxy settings

Typically the add-on agent running on the managed cluster also needs a kubeconfig to access the resources of the kube-apiserver on the hub cluster. The Klusterlet agent will generate this kubeconfig during the add-on registration. If the Klusterlet agent bootstraps with a proxy settings, the same settings will be put into the add-on kubeconfig as well. While agents of some add-ons may access services other than kube-apiserver on the hub cluster. For those add-ons, you may need to add additional configuration with proxy settings by creating a `AddOnDeploymentConfig`.

```yaml
apiVersion: addon.open-cluster-management.io/v1alpha1
kind: AddOnDeploymentConfig
metadata:
  name: addon-proxy-settings
  namespace: cluster1
spec:
  proxyConfig:
    httpProxy: "http://10.0.109.153:3128"
    httpsProxy: "https://10.0.109.153:3129"
    noProxy: ".cluster.local,.svc,10.96.0.1"
    caBundle: LS0tLS...LS0tCg==
```

The IP address of the `kube-apiserver` on the managed cluster should be included in the field `noProxy`. To get the IP address, run following command on the managed cluster: 
```bash
kubectl -n default describe svc kubernetes | grep IP:
```

You also need to associate the configuration to the `ManagedClusterAddOn` by adding an item to `spec.configs`.

```yaml
apiVersion: addon.open-cluster-management.io/v1alpha1
kind: ManagedClusterAddOn
metadata:
  name: my-addon
  namespace: cluster1
spec:
  installNamespace: open-cluster-management-agent-addon
  configs:
  - group: addon.open-cluster-management.io
    resource: addondeploymentconfigs
    name: addon-proxy-settings
    namespace: cluster1
```

With the above configuration, the add-on manager of this add-on running on the hub cluster can fetch the proxy settings and then propagate it to the managed cluster side, for example as environment variables by using `ManifestWork` API. And then the add-on agent can initiate the communication to a particular service on the hub cluster with the proxy settings.

<div style="text-align: center; padding: 20px;">
   <img src="/addon-proxy.png" alt="multiple hubs" style="margin: 0 auto; width: 75%">
</div>

Once both the klusterlet agent and the add-on agents are able to communicate with the hub cluster through the forward proxy server, workloads, like applications, can be scheduled to the managed cluster.