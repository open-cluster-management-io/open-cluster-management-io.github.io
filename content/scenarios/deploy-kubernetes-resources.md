---
title: Deploy Kubernetes resources to the desired clusters
weight: 1
---
- [Prerequisites](#prerequisites)
- [Select `dev` environment clusters using placement](#select-dev-environment-clusters-using-placement)
- [Apply the Kubernetes resources to the selected clusters](#apply-the-kubernetes-resources-to-the-selected-clusters)

After bootstrapped the Open Cluster Management environment, you can now deploy any Kubernetes resources(such as `Deployment`, `Service`, `Configmap`, `Secret`, and so on) to your desired clusters:
1. Use placement to [select the desired clusters](#select-dev-environment-clusters-using-placement) if you do not know the certain desired clusters’ name but could describe the expected characteristics of ideal clusters.
2. Use ManifestWork to [apply your Kubernetes resources to the selected clusters](#apply-the-kubernetes-resources-to-the-selected-clusters)

Here is a sample to deploy a `hello-world` `Deployment` to the `dev` environment clusters:

## Prerequisites

At least one cluster with the `environment: dev` label has registered to the hub cluster.
```
╰─$ kubectl --context ${CTX_HUB_CLUSTER} label managedcluster cluster1 environment=dev

╰─$ kubectl --context ${CTX_HUB_CLUSTER} get managedcluster -l environment=dev
NAME       HUB ACCEPTED   MANAGED CLUSTER URLS   JOINED   AVAILABLE   AGE
cluster1   true           https://localhost      True     True        44h
```

## Select `dev` environment clusters using placement

1. Create a `ManagedClusterSet`
```
╰─$ cat <<EOF | kubectl --context ${CTX_HUB_CLUSTER} apply -f -
apiVersion: cluster.open-cluster-management.io/v1alpha1
kind: ManagedClusterSet
metadata:
  name: clusterset1
EOF
```

2. Add `ManagedClusters` to the above `ManagedClusterSet`
```
╰─$ kubectl --context ${CTX_HUB_CLUSTER} label managedcluster cluster1 cluster.open-cluster-management.io/clusterset=clusterset1
```

3. Create a `ManagedClusterSetBinding` to bind the `ManagedClusterSet` to the `default` Namespace.
```
╰─$ cat <<EOF | kubectl --context ${CTX_HUB_CLUSTER} apply -f -
apiVersion: cluster.open-cluster-management.io/v1alpha1
kind: ManagedClusterSetBinding
metadata:
  name: clusterset1
  namespace: default
spec:
  clusterSet: clusterset1
EOF
```

4. Create a `Placement` to choose the `dev` environment cluster in `default` Namespace
```
╰─$ cat <<EOF | kubectl --context ${CTX_HUB_CLUSTER} apply -f -
apiVersion: cluster.open-cluster-management.io/v1alpha1
kind: Placement
metadata:
  name: placement1
  namespace: default
spec:
  predicates:
    - requiredClusterSelector:
        labelSelector:
          matchLabels:
            environment: dev
EOF
```

5. Get the desired clusters
```
╰─$ kubectl --context ${CTX_HUB_CLUSTER} get placementdecisions placement1-decision-1 -o jsonpath='{.status.decisions}'
[{"clusterName":"cluster1","reason":""}]%
```

## Apply the Kubernetes resources to the selected clusters

We got the target clusters, `cluster1`, which fulfill the `dev` environment condition. Now we start to deploy the `hello-world` Deployment on it.

1. (Optional) Check the status(allocatable, capacity, conditions, version) of managed clusters before/after you apply your Kubernetes resources by:
```
╰─$ kubectl --context ${CTX_HUB_CLUSTER} get managedcluster cluster1 -o jsonpath='{.status}' | python -m json.tool
```

2. Apply the `hello-world` description yaml to *cluster1* Namespace on the *hub* cluster.
```
cat <<EOF | kubectl --context ${CTX_HUB_CLUSTER} apply -f -
apiVersion: work.open-cluster-management.io/v1
kind: ManifestWork
metadata:
  name: hello-world
  namespace: cluster1
  labels:
    app: hello
spec:
  workload:
    manifests:
      - apiVersion: apps/v1
        kind: Deployment
        metadata:
          name: hello
          namespace: default

        spec:
          selector:
            matchLabels:
              app: hello
          template:
            metadata:
              labels:
                app: hello
            spec:
              containers:
                - name: hello
                  image: quay.io/asmacdo/busybox
                  command: ['sh', '-c', 'echo "Hello, World!" && sleep 3600']
EOF
```

3. Check if there is a Pod created on the `ManagedCluster `cluster1`
```
╰─$ kubectl --kubeconfig=<kubeconfig path of cluster1> get pod
NAME                     READY   STATUS    RESTARTS   AGE
hello-64dd6fd586-wrmdz   1/1     Running   0          118s
```

By now we have demonstrated how to deploy a `hello-world` Deployment into the desired clusters, you can apply any Kubernetes resource in that way.
