# Release Runbook

This document describes the steps to create a new release for the Open Cluster Management documentation website.

## Prerequisites

- You must have owner permissions for this repository (ability to create new release branches)
- You must have owner permissions for the Netlify open-cluster-management.io project

## Release Steps

### 1. Update Version Configuration

Edit the `hugo.yaml` file to add the new version. For example, to add version v0.15:

```yaml
versions:
  - version: main
    url: "https://open-cluster-management.io"
  - version: v0.15
    url: "https://v0-15--open-cluster-management.io"
```

### 2. Create Release Branch

After the version update is committed, create a new release branch from that commit.

### 3. Configure Netlify Branch Deploy

1. Go to the [Netlify branches-and-deploy-contexts](https://app.netlify.com/sites/open-cluster-management/configuration/deploys#branches-and-deploy-contexts) section
2. Under "Branch deploys", add the new release branch name (e.g., `v0.15`)

After completing these steps, the new version will appear in the version selector in the top right corner of the documentation website.
