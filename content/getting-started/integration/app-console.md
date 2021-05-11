---
title: Application Console
weight: 5
---

The Application Console is the UI component for [Application Lifecycle Management](/getting-started/integration/app-lifecycle). Installing this component will allow the creation and management of applications from the browser.

<!-- spellchecker-disable -->

{{< toc >}}

<!-- spellchecker-enable -->

## Prerequisite

You must meet the following prerequistes to install the Application Console add-on:

* General knowledge of Kubernetes and container based software development.

* Ensure the open-cluster-management Cluster Manager is installed. See [Cluster Manager](/getting-started/core/cluster-manager) for more information.

* Ensure the open-cluster-management Klusterlet is installed. See [Klusterlet](/getting-started/core/register-cluster) for more information.

* Ensure the open-cluster-management Application Lifecycle Management is installed. See [Application Lifecycle Management](/getting-started/integration/app-lifecycle) for more information.

* Ensure the open-cluster-management Management Ingress is installed. See [Management Ingress](https://github.com/open-cluster-management/management-ingress-chart). For the required images see https://quay.io/repository/open-cluster-management/management-ingress and https://quay.io/repository/open-cluster-management/origin-oauth-proxy. Deploy this in the same namespace as the Application Console below.

## Install from source
At the moment, the Application Console can only be installed from the source.

* Build the application-ui image from source and upload it to an image repository. See [application-ui](https://github.com/open-cluster-management/application-ui) for more information.

* Build the console-api image from source and upload it to an image repository. See [console-api](https://github.com/open-cluster-management/console-api) for more information.

* Build the application-chart. See [application-chart](https://github.com/open-cluster-management/application-chart) for more information.

Install the application-chart

```Shell
helm install applicationui application-chart-2.1.0.tgz --namespace open-cluster-management --set global.imageOverrides.application_ui="quay.io/open-cluster-management/application-ui:2.3.0-SNAPSHOT-2021-05-07-18-06-08",global.imageOverrides.console_api="quay.io/open-cluster-management/console-api:2.3.0-SNAPSHOT-2021-05-07-18-06-08",pullSecret="feng-quay"
```
Override the chart values:
* **global.imageOverrides.application_ui** - Repository path for the application-ui image built above
* **global.imageOverrides.console_api** - Repository path for the console-api image built above
* **pullSecret** - Optional pull secret if the image repository is not public

The namespace choosen here is _open-cluster-management_ which is also where the Management Ingress is installed. Make sure to choose the same namespace where Management Ingress is installed.

## Accessing the Application Console

After everything is successfully deployed, the Application Console should be accessible using the following URL:

```Shell
https://multicloud-console.<domain>/multicloud/applications
```

Use the same credentials used for Kubernetes.