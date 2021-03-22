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

Ensure the open-cluster-management _hub_ is installed. See [Install Hub](install-hub.md) for more information.

Ensure you are logged into the cluster using `kubectl` or `oc`.

## Install from source
Clone the `console`

```Shell
git clone https://github.com/open-cluster-management/console
```

## Install node dependencies

```Shell
npm ci
```

## Setup the environmnent to connect to the open-cluster-management _hub_.

```Shell
npm run setup
```

This will create a `.env` file in the backend directory containing the environment variables.

## Start the services locally
```Shell
npm start
```

This will start the frontend and the backend in parallel.  (It may take up to 30 seconds for the UI to appear)

The frontend will proxy requests to the backend using react scripts.

The backend will proxy requests to the kubernetes cluster specified by CLUSTER_API_URL in backend/.env.
