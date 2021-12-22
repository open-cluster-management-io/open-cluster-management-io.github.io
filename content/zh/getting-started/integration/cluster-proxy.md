---
title: 多集群网络隧道
weight: 5
---

[Cluster proxy](https://github.com/open-cluster-management-io/cluster-proxy)
is an OCM addon providing L4 network connectivity from hub cluster to
the managed clusters without __any additional requirement__ to the managed
cluster's network infrastructure by leveraging the Kubernetes official SIG
sub-project [apiserver-network-proxy](https://github.com/kubernetes-sigs/apiserver-network-proxy).

<!-- spellchecker-disable -->

{{< toc >}}

<!-- spellchecker-enable -->

## Background

The original architecture of OCM allows a cluster from anywhere to be
registered and managed by OCM's control plane (i.e. the hub cluster)
as long as the [klusterlet agent](https://open-cluster-management.io/getting-started/core/register-cluster/)
can reach hub cluster's endpoint. So the minimal requirement for the
managed cluster's network infrastructure in OCM is "klusterlet -> hub"
connectivity. However, there are still some cases where the components
in the hub cluster hope to proactively dail/request the services in the
managed clusters which will need the "hub -> klusterlet" connectivity on
the other hand. In addition to that, the cases can be even more complex
when each of the managed clusters are not in the same network.

Cluster proxy is aiming at seamlessly delivering the outbound L4 requests
to the services in the managed cluster's network without any assumptions
upon the infrastructure as long as the clusters are successfully registered.
Basically the connectivity provided by cluster proxy is working over the
secured reserve proxy tunnels established by the apiserver-network-proxy.


### About apiserver-network-proxy

Apiserver-network-proxy is the underlying technique of a Kubernetes'
feature called [konnectivity egress-selector](https://kubernetes.io/docs/tasks/extend-kubernetes/setup-konnectivity/)
which is majorly for setting up a TCP-level proxy for kube-apiserver
to get access to the node/cluster network. Here are a few terms we need
to clarify before we elaborate on how the cluster proxy resolve multi-cluster
control plan network connectivity for us:

- __Proxy Tunnel__: A Grpc long connection that multiplexes and transmits
  TCP-level traffic from the proxy servers to the proxy agents. Note that
  there will be only one tunnel instance between each pair of server and
  agent.
- __Proxy Server__: An mTLS Grpc server opened for establishing tunnels
  which is the traffic ingress of proxy tunnel.
- __Proxy Agent__: A mTLS Grpc agent that maintains the tunnel between the
  server and is also the egress of the proxy tunnel.
- __Konnectivity Client__: The SDK library for talking through the tunnel.  
  Applicable to any Golang client of which the `Dialer` is overridable.
  Note that for non-golang clients, the proxy server also supports
  HTTP-Connect based proxying as alternative.


## Architecture


Cluster proxy runs inside OCM's hub cluster as an addon manager which is
developed based on the [Addon-Framework](https://open-cluster-management.io/concepts/addon/).
The addon manager of cluster proxy will be responsible for:

1. Managing the installation of proxy servers in the hub cluster.
2. Managing the installation of proxy agents in the managed cluster.
3. Collecting healthiness and the other stats consistently in the hub cluster.

The following picture shows the overall architecture of cluster proxy:

<div style="text-align: center; padding: 20px;">
   <img src="/cluster-proxy-architecture.png" alt="Cluster proxy architecture" style="margin: 0 auto; width: 60%">
</div>

Note that the green lines in the picture above is the active proxy tunnels
between proxy servers and agents, and HA setup is natively supported by
apiserver-network-proxy both for the servers and the agents. The orange
dash line started by the konnectivity client is the path of how the traffic
flows from the hub cluster to arbitrary managed clusters. Meanwhile the core
components including registration and work will help us manage the lifecycle
of all the components distributed in the multiple managed clusters, so the
hub admin won't need to directly operate the managed clusters to install
or configure the proxy agents no more.


## Prerequisite

You must meet the following prerequisites to install the cluster-proxy:

* Ensure your `open-cluster-management` release is greater than `v0.5.0`.

* Ensure [`kubectl`](https://kubernetes.io/docs/tasks/tools/install-kubectl) is installed.

* Ensure [`helm`](https://helm.sh/docs/intro/install/) is installed.

## Installation

To install the cluster proxy addon to the OCM control plane, run:

```shell
$ helm repo add ocm https://open-cluster-management.oss-us-west-1.aliyuncs.com
$ helm repo update
$ helm search repo ocm
NAME                              	CHART VERSION	APP VERSION	DESCRIPTION                                   
ocm/cluster-proxy                 	v0.1.1       	1.0.0      	A Helm chart for Cluster-Proxy                
...
```

Then run the following helm command to install the cluster-proxy addon:

```shell
$ helm install -n open-cluster-management-addon --create-namespace \
    cluster-proxy ocm/cluster-proxy 
$ kubectl -n open-cluster-management-addon get deploy
NAME                                   READY   UP-TO-DATE   AVAILABLE   AGE
cluster-proxy                          3/3     3            3           24h
cluster-proxy-addon-manager            1/1     1            1           24h
...
```

Then the addon manager of cluster-proxy will be created into the hub cluster
in the form of a deployment named `cluster-proxy-addon-manager`. As is also
shown above, the proxy servers will also be created as deployment resource
called `cluster-proxy`.

By default, the addon manager will be automatically discovering the addition
or removal the managed clusters and installs the proxy agents into them on
the fly. To check out the healthiness status of the proxy agents, we can run:

```shell
$  kubectl get managedclusteraddon -A
NAMESPACE     NAME                     AVAILABLE   DEGRADED   PROGRESSING
<cluster#1>   cluster-proxy            True                   
<cluster#2>   cluster-proxy            True                   
```

The proxy agent distributed in the managed cluster will be periodically
renewing the lease lock of the addon instance.

## Usage

### Command-line tools

Using the [clusteradm](https://open-cluster-management.io/getting-started/quick-start/#install-clusteradm-cli-tool)
to check the status of the cluster-proxy addon:

```shell
$ clusteradm proxy health
CLUSTER NAME    INSTALLED    AVAILABLE    PROBED HEALTH    LATENCY
<cluster#1>     True         True         True             67.595144ms
<cluster#2>     True         True         True             85.418368ms
```

### Example code

An [example client](https://github.com/open-cluster-management-io/cluster-proxy/blob/main/examples/test-client/main.go)
in the cluster proxy repo shows us how to dynamically talk to the kube-apiserver
of a managed cluster from the hub cluster by simply prescribing the name of
the target cluster. Here's also a TL;DR code snippet:

```go
// 1. instantiate a dialing tunnel instance.
// NOTE: recommended to be a singleton in your golang program.
tunnel, err := konnectivity.CreateSingleUseGrpcTunnel(
    context.TODO(),
    <your proxy server endpoint>,
    grpc.WithTransportCredentials(grpccredentials.NewTLS(<your proxy server TLS config>)),
)
if err != nil {
    panic(err)
}
...
// 2. Overriding the Dialer to tunnel. Dialer is a common abstraction
// in Golang SDK.
cfg.Dial = tunnel.DialContext
```

Another example will be [cluster-gateway](https://github.com/oam-dev/cluster-gateway/blob/063b60e959ba607f0108c8b4cb99963f82f504b5/pkg/apis/cluster/v1alpha1/transport.go#L50-L58)
which is an aggregated apiserver optionally working over cluster-proxy for
routing traffic to the managed clusters dynamically in HTTPs protocol.

Note that by default the client credential for konnectivity client will be
persisted as secrets resources under the namespace where the addon-manager
is running. With that being said, to mount the secret to the systems in the
other namespaces, the users are expected to copy the secret on their own
manually.

## More insight

### Troubleshooting

The installation of proxy servers and agents are prescribed by the custom
resource called "managedproxyconfiguration". We can check it out by the
following commands:

```shell
$ kubectl get managedproxyconfiguration cluster-proxy -o yaml
apiVersion: proxy.open-cluster-management.io/v1alpha1
kind: ManagedProxyConfiguration
metadata: ...
spec:
  proxyAgent:
    image: <expected image of the proxy agents>
    replicas: <expected replicas of proxy agents>
  proxyServer:
    entrypoint:
      loadBalancerService:
        name: proxy-agent-entrypoint
      type: LoadBalancerService # Or "Hostname" to set a fixed address
                                # for establishing proxy tunnels.
    image: <expected image of the proxy servers>
    inClusterServiceName: proxy-entrypoint
    namespace: <target namespace to install proxy server>
    replicas: <expected replicas of proxy servers>
  authentication: # Customize authentication between proxy server/agent
status:
  conditions: ...
```


### Related materials

See the original [design proposal](https://github.com/open-cluster-management-io/enhancements/tree/main/enhancements/sig-architecture/14-addon-cluster-proxy)
for reference.
