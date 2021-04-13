---
title: Install cluster lifecycle console
weight: 3
---

After hub is installed, you could install the cluster lifecycle console components locally to access the hub.

<!-- spellchecker-disable -->

{{< toc >}}

<!-- spellchecker-enable -->

## Prerequisite

Ensure [kubectl](https://kubernetes.io/docs/tasks/tools/install-kubectl/) and [kustomize](https://kubernetes-sigs.github.io/kustomize/installation/) are installed.

Ensure [npm](https://nodejs.org/en/download/) is installed.

Ensure that [okd](https://www.okd.io/) or [OpenShift Container Platform](https://www.openshift.com/products/container-platform) is installed.  This is required for console oauth authentication. (The use of _kind_ is not supported)

Ensure you are logged into the cluster using `kubectl` or `oc`.

## Install from source
Clone the `console`

```Shell
git clone https://github.com/open-cluster-management/console
cd console
```

## Install node dependencies

```Shell
npm ci
```

## Setup the environment to connect to the open-cluster-management kubernetes cluster.

```Shell
npm run setup
```

This will create a `.env` file in the backend directory containing the environment variables.

## Start the services locally
```Shell
npm start
```

This will start the frontend and the backend in parallel.  (It may take up to 30 seconds for the UI to appear in your preferred web browser at URL https://localhost:3000/multicloud)

The frontend will proxy requests to the backend using react scripts.

The backend will proxy requests to the kubernetes cluster specified by CLUSTER_API_URL in backend/.env.

Sample `npm start` output:
```
[ backend] DEBUG:process start  NODE_ENV:development  cpus:16  memory:16GB  nodeVersion:14.15.0  logLevel:debug
[ backend] DEBUG:server start  secure:true
[ backend] DEBUG:server listening  port:4000
[frontend] ℹ ｢wds｣: Project is running at https://192.168.1.12/
[frontend] ℹ ｢wds｣: webpack output is served from /multicloud
[frontend] ℹ ｢wds｣: Content not from webpack is served from /Users/johndoe/console/frontend/public
[frontend] ℹ ｢wds｣: 404s will fallback to /multicloud/
[frontend] Starting the development server...
[frontend]
[frontend] Compiled successfully!
[frontend]
[frontend] You can now view @open-cluster-management/console-frontend in the browser.
[frontend]
[frontend]   Local:            https://localhost:3000/multicloud
[frontend]   On Your Network:  https://192.168.1.12:3000/multicloud
[frontend]
[frontend] Note that the development build is not optimized.
[frontend] To create a production build, use npm run build.
[frontend]
[ backend]  INFO:Not Found  status:404  method:GET  path:/common/username/  ms:11.14
[ backend]  INFO:stream start  status:200  method:GET  path:/watch  events:112
[ backend]  INFO:Unauthorized  status:401  method:GET  path:/version/  ms:180.62
[ backend]  INFO:Found  status:302  method:GET  path:/login  ms:2.58
[ backend]  INFO:Unauthorized  status:401  method:POST  path:/apis/authorization.k8s.io/v1/selfsubjectaccessreviews  ms:141.4
[ backend]  INFO:Unauthorized  status:401  method:POST  path:/apis/authorization.k8s.io/v1/selfsubjectaccessreviews  ms:145.21
[ backend]  INFO:Found  status:302  method:GET  path:/login  ms:0.76
[ backend]  INFO:OK  status:200  method:GET  path:/watch  ms:1383.33
```
