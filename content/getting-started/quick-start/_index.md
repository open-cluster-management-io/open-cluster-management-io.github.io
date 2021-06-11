---
title: Quick Start
weight: 1
---

![open-cluster-management](/ocm-logo.png)

Install `Open Cluster Management` in few steps:

1. Install the clusteradm command-line:
```bash
export VERSION=...
export OS=...
export ARCH=...
export TMP_DIR=
export BIN_DIR=
#Install the clusteradm cli
# Windows: https://github.com/open-cluster-management-io/clusteradm/releases/download/$VERSION/clusteradm_windows_amd64.zip -O $DEST_DIR/clusteradm.zip
wget -no-check-certificate -P ${TMP_DIR} https://github.com/open-cluster-management-io/clusteradm/releases/download/${VERSION}/clusteradm_${OS}_${ARCH}.tar.gz 
tar -xvf ${TMP_DIR}/clusteradm_${OS}_${ARCH}.tar.gz -C ${BIN_DIR}

```

2. Initialize the hub:

Login to the hub and run:

```bash
clusteradm init
```

Reponse:
```
clusteradm join ....
```
3. Join a spoke cluster:

Login to the spoke cluster, copy/paste the output from the previous and run it:

```bash
clusteradm join .... --clusters <Your_cluster_name>
```

Response:
```bash
clusteradm accept ...
```

4. Accept the spoke cluster on the hub:

Login back to the hub, copy/paste the output from the previous and run:

```bash
clusteradm accept...
```

For more details see [Core Components](getting-started/core).
