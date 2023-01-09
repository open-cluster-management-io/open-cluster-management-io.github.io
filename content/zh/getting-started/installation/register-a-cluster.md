---
title: Klusterlet agent
weight: 2
---

After the cluster manager is installed on the hub cluster, you need to install the klusterlet agent on another cluster so that it can be registered and managed by the hub cluster.

<!-- spellchecker-disable -->

{{< toc >}}

<!-- spellchecker-enable -->

## Prerequisite

Ensure [kubectl](https://kubernetes.io/docs/tasks/tools/install-kubectl) and [kustomize](https://kubectl.docs.kubernetes.io/installation/kustomize/) are installed.

Ensure [golang](https://golang.org/doc/install) is installed, if you are planning to install from the source.

Ensure the open-cluster-management cluster manager is installed on the hub cluster. See [Cluster manager](../cluster-manager) for more information.

Prepare another Kubernetes cluster to function as the managed cluster. For example, use [kind](https://kind.sigs.k8s.io/docs/user/quick-start) to create another cluster as described in the following instructions. To use `kind`, you will need [docker](https://docs.docker.com/get-started) installed and running.

Set the following environment variables that will be used throughout to simplify the instructions:

```Shell
export MANAGED_CLUSTER_NAME=<your managed cluster name>     # export MANAGED_CLUSTER_NAME=cluster1
export CTX_MANAGED_CLUSTER=<your managed cluster context>   # export CTX_MANAGED_CLUSTER=kind-cluster1
```

Then create the managed cluster with `kind`, run:

```Shell
# kind delete cluster --name ${MANAGED_CLUSTER_NAME} # if the kind cluster is previously created and can be safely deleted
kind create cluster --name ${MANAGED_CLUSTER_NAME}
```

If you are using OKD, OpenShift, you will need to prepare a kubeconfig with `certificate-authority-data`, `client-certificate-data` and `client-key-data`. By default, it's located in `auth/kubeconfig` under your installation folder.

## Install from source

If you have not already done so, clone the `registration-operator`.

```Shell
git clone https://github.com/open-cluster-management-io/registration-operator
```

Ensure the `kubectl` context is set to point to the managed cluster:

```Shell
kubectl config use-context ${CTX_MANAGED_CLUSTER}
```

Deploy agent on a managed `kind` cluster.

```Shell
cd registration-operator
make deploy-spoke # make deploy-spoke GO_REQUIRED_MIN_VERSION:= # if you see warnings regarding go version
```

## Install community operator from OperatorHub.io

If you are using OKD, OpenShift, or have `OLM` installed in your cluster, you can install the klusterlet agent community operator with a released version from [OperatorHub.io](https://operatorhub.io/operator/klusterlet).

## What is next

After a successful deployment, a `certificatesigningrequest` and a `managedcluster` will be created on the hub cluster.

```Shell
$ kubectl get csr --context ${CTX_HUB_CLUSTER}
NAME                              AGE   REQUESTOR                       CONDITION
${MANAGED_CLUSTER_NAME}-<suffix>   41s   kubernetes-admin                Pending
csr-<suffix>                      76m   system:node:hub-control-plane   Approved,Issued
$ kubectl get managedcluster --context ${CTX_HUB_CLUSTER}
NAME                    HUB ACCEPTED   MANAGED CLUSTER URLS   JOINED   AVAILABLE   AGE
${MANAGED_CLUSTER_NAME}  false          https://localhost                           57s
```

Next approve the certificate and set managecluster to be accepted by the hub with following commands:

```Shell
kubectl certificate approve {csr name} --context ${CTX_HUB_CLUSTER}
kubectl patch managedcluster ${MANAGED_CLUSTER_NAME} -p='{"spec":{"hubAcceptsClient":true}}' --type=merge --context ${CTX_HUB_CLUSTER}
```

Run `kubectl get managedcluster --context ${CTX_HUB_CLUSTER}` again on the hub cluster. You should be able to see that the managed cluster is registered now.

```Shell
NAME                     HUB ACCEPTED   MANAGED CLUSTER URLS   JOINED   AVAILABLE   AGE
${MANAGED_CLUSTER_NAME}   true           https://localhost      True     True        7m58s
```

If the managed cluster status is not true, refer to [Troubleshooting](#troubleshooting) to debug on your cluster.

After the managed cluster is registered, test that you can deploy a pod to the managed cluster from the hub cluster. Create a `manifest-work.yaml` as shown in this example:

```yaml
apiVersion: work.open-cluster-management.io/v1
kind: ManifestWork
metadata:
  name: mw-01
  namespace: ${MANAGED_CLUSTER_NAME}
spec:
  workload:
    manifests:
      - apiVersion: v1
        kind: Pod
        metadata:
          name: hello
          namespace: default
        spec:
          containers:
            - name: hello
              image: busybox
              command: ["sh", "-c", 'echo "Hello, Kubernetes!" && sleep 3600']
          restartPolicy: OnFailure
```

Apply the yaml file to the hub cluster.

```Shell
kubectl apply -f manifest-work.yaml --context ${CTX_HUB_CLUSTER}
```

Verify that the `manifestwork` resource was applied to the hub.

```Shell
kubectl -n ${MANAGED_CLUSTER_NAME} get manifestwork/mw-01 --context ${CTX_HUB_CLUSTER} -o yaml
```

Check on the managed cluster and see the _hello_ Pod has been deployed from the hub cluster.

```Shell
$ kubectl -n default get pod --context ${CTX_MANAGED_CLUSTER}
NAME    READY   STATUS    RESTARTS   AGE
hello   1/1     Running   0          108s
```

## Troubleshooting

- The managed cluster status is not true.

  For example, the result below is shown when checking managedcluster.

  ```Shell
  $ kubectl get managedcluster --context ${CTX_HUB_CLUSTER}
  NAME                   HUB ACCEPTED   MANAGED CLUSTER URLS   JOINED   AVAILABLE   AGE
  ${MANAGED_CLUSTER_NAME} true           https://localhost               Unknown     46m
  ```

  There are many reasons for this problem. You can use the commands below to get more debug info. If the provided info doesn't help, please log an issue to us.

  On the hub cluster, check the managedcluster status.

  ```Shell
  kubectl get managedcluster ${MANAGED_CLUSTER_NAME} --context ${CTX_HUB_CLUSTER} -o yaml
  ```

  On the hub cluster, check the lease status.

  ```Shell
  kubectl get lease -n ${MANAGED_CLUSTER_NAME} --context ${CTX_HUB_CLUSTER}
  ```

  On the managed cluster, check the klusterlet status.

  ```Shell
  kubectl get klusterlet -o yaml --context ${CTX_MANAGED_CLUSTER}
  ```
