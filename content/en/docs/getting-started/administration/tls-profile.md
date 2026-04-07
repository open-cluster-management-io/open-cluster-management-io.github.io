---
title: Configuring TLS Profile
weight: 6
---

This guide describes how to configure the TLS profile (minimum TLS version and cipher suites) for OCM components
on both the hub and spoke (managed) clusters.

## Overview

OCM provides a standard mechanism for configuring TLS profiles across all components. This is useful for enforcing
security policies that require a specific minimum TLS version or a restricted set of cipher suites.

TLS configuration follows a **two-tier architecture**:

- **Tier 1 (Operators):** The `cluster-manager` operator (hub) and `klusterlet` operator (spoke) watch a ConfigMap
  named `ocm-tls-profile` in their namespace. When the ConfigMap changes, the operator restarts to pick up the new
  settings.
- **Tier 2 (Components):** Operators inject the TLS settings as command-line flags (`--tls-min-version`,
  `--tls-cipher-suites`) into the deployments they manage. Components themselves do not watch ConfigMaps.

## ConfigMap Format

Create or update the `ocm-tls-profile` ConfigMap in the operator's namespace.

**Hub cluster** (in the `cluster-manager` operator namespace, typically `open-cluster-management-hub`):

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: ocm-tls-profile
  namespace: open-cluster-management-hub
data:
  minTLSVersion: "VersionTLS12"
  cipherSuites: "TLS_ECDHE_RSA_WITH_AES_128_GCM_SHA256,TLS_ECDHE_RSA_WITH_AES_256_GCM_SHA384"
```

**Spoke cluster** (in the `klusterlet` operator namespace, typically `open-cluster-management-agent`):

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: ocm-tls-profile
  namespace: open-cluster-management-agent
data:
  minTLSVersion: "VersionTLS12"
  cipherSuites: "TLS_ECDHE_RSA_WITH_AES_128_GCM_SHA256,TLS_ECDHE_RSA_WITH_AES_256_GCM_SHA384"
```

Both fields are optional. If the ConfigMap does not exist or a field is omitted, defaults are used.

### `minTLSVersion`

Specifies the minimum TLS version that components will accept. The following values are supported:

| Value | TLS Version |
|---|---|
| `VersionTLS10` | TLS 1.0 |
| `VersionTLS11` | TLS 1.1 |
| `VersionTLS12` | TLS 1.2 (**default**) |
| `VersionTLS13` | TLS 1.3 |

### `cipherSuites`

A comma-separated list of TLS cipher suite names in IANA format. If omitted, Go's default cipher suites for the
specified TLS version are used. All cipher suites recognized by Go's `crypto/tls` package are accepted. Insecure
cipher suites are accepted but logged with a warning.

Example cipher suites for TLS 1.2:

- `TLS_ECDHE_ECDSA_WITH_AES_128_GCM_SHA256`
- `TLS_ECDHE_RSA_WITH_AES_128_GCM_SHA256`
- `TLS_ECDHE_ECDSA_WITH_AES_256_GCM_SHA384`
- `TLS_ECDHE_RSA_WITH_AES_256_GCM_SHA384`
- `TLS_ECDHE_ECDSA_WITH_CHACHA20_POLY1305_SHA256`
- `TLS_ECDHE_RSA_WITH_CHACHA20_POLY1305_SHA256`

> **Note:** When `minTLSVersion` is set to `VersionTLS13`, the `cipherSuites` field is ignored because TLS 1.3
> cipher suites are not configurable in Go — they are always set to the TLS 1.3 defaults
> (`TLS_AES_128_GCM_SHA256`, `TLS_AES_256_GCM_SHA384`, `TLS_CHACHA20_POLY1305_SHA256`).

## How It Works

### Hub Components

1. The `cluster-manager` operator watches the `ocm-tls-profile` ConfigMap in its namespace.
2. On startup, the operator reads the ConfigMap and parses the TLS settings. If the ConfigMap does not exist,
   it uses the defaults (TLS 1.2, Go's default cipher suites).
3. The operator injects the TLS settings as `--tls-min-version` and `--tls-cipher-suites` flags into the
   deployments of all hub components:
   - Registration controller and webhook
   - Work controller and webhook
   - Placement controller
   - Add-on manager and webhook
   - gRPC server
4. When the ConfigMap content changes, the operator restarts and re-renders the hub component deployments with
   the updated settings.

### Spoke Components

1. The `klusterlet` operator watches the `ocm-tls-profile` ConfigMap in its namespace
   (typically `open-cluster-management-agent`).
2. The operator injects TLS flags into the deployments of all spoke agents:
   - Registration agent
   - Work agent
   - Klusterlet agent
3. When the ConfigMap content changes, the operator restarts and re-renders the spoke agent deployments.

### Addon Agents

The `klusterlet` operator includes an `AddonTLSConfigController` that automatically copies the `ocm-tls-profile`
ConfigMap from the agent namespace to all addon namespaces (namespaces labeled with
`addon.open-cluster-management.io/namespace=true`). Addon agents can optionally watch this ConfigMap to configure
their own TLS settings.

## Component Coverage

| Component | Side | Configured By |
| --- | --- | --- |
| cluster-manager operator | Hub | ConfigMap (self-configure) |
| registration-controller | Hub | cluster-manager operator (flags) |
| registration-webhook | Hub | cluster-manager operator (flags) |
| work-controller | Hub | cluster-manager operator (flags) |
| work-webhook | Hub | cluster-manager operator (flags) |
| placement-controller | Hub | cluster-manager operator (flags) |
| addon-manager-controller | Hub | cluster-manager operator (flags) |
| addon-webhook | Hub | cluster-manager operator (flags) |
| klusterlet operator | Spoke | ConfigMap (self-configure) |
| registration-agent | Spoke | klusterlet operator (flags) |
| work-agent | Spoke | klusterlet operator (flags) |
| klusterlet-agent | Spoke | klusterlet operator (flags) |

## Examples

### Enforcing TLS 1.3 on Hub

```bash
kubectl apply -f - <<EOF
apiVersion: v1
kind: ConfigMap
metadata:
  name: ocm-tls-profile
  namespace: open-cluster-management-hub
data:
  minTLSVersion: "VersionTLS13"
EOF
```

### Enforcing TLS 1.3 on Spoke

```bash
kubectl apply -f - <<EOF
apiVersion: v1
kind: ConfigMap
metadata:
  name: ocm-tls-profile
  namespace: open-cluster-management-agent
data:
  minTLSVersion: "VersionTLS13"
EOF
```

### Restricting Cipher Suites for TLS 1.2

```bash
kubectl apply -f - <<EOF
apiVersion: v1
kind: ConfigMap
metadata:
  name: ocm-tls-profile
  namespace: open-cluster-management-hub
data:
  minTLSVersion: "VersionTLS12"
  cipherSuites: "TLS_ECDHE_RSA_WITH_AES_128_GCM_SHA256,TLS_ECDHE_RSA_WITH_AES_256_GCM_SHA384,TLS_ECDHE_ECDSA_WITH_AES_128_GCM_SHA256,TLS_ECDHE_ECDSA_WITH_AES_256_GCM_SHA384"
EOF
```

### Removing Custom TLS Configuration

To revert to the default TLS settings, delete the ConfigMap:

```bash
# Hub
kubectl delete configmap ocm-tls-profile -n open-cluster-management-hub

# Spoke
kubectl delete configmap ocm-tls-profile -n open-cluster-management-agent
```

The operators will restart and all components will use TLS 1.2 with Go's default cipher suites.
