---
title: Configuring TLS Profile
weight: 6
---

This guide describes how to configure the TLS profile (minimum TLS version and cipher suites) for OCM hub components.

## Overview

OCM allows you to customize the TLS settings for hub-side components, including registration, work, placement,
addon-manager, and gRPC server. This is useful for enforcing security policies that require a specific minimum TLS
version or a restricted set of cipher suites.

The TLS profile is configured via a ConfigMap named `ocm-tls-profile` in the cluster-manager operator's namespace
(typically `open-cluster-management-hub`). When the ConfigMap is created or updated, the operator picks up the
changes and propagates them to all hub components.

## Configuration

Create or update the `ocm-tls-profile` ConfigMap in the namespace where the cluster-manager operator is running:

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

Both fields are optional. If the ConfigMap does not exist or a field is omitted, defaults are used.

### `minTLSVersion`

Specifies the minimum TLS version that hub components will accept. The following values are supported:

| Value | TLS Version |
|---|---|
| `VersionTLS10` or `TLSv1.0` | TLS 1.0 |
| `VersionTLS11` or `TLSv1.1` | TLS 1.1 |
| `VersionTLS12` or `TLSv1.2` | TLS 1.2 (**default**) |
| `VersionTLS13` or `TLSv1.3` | TLS 1.3 |

### `cipherSuites`

A comma-separated list of TLS cipher suite names (IANA names). If omitted, Go's default cipher suites for the
specified TLS version are used. All cipher suites recognized by Go's `crypto/tls` package are accepted. Insecure
cipher suites are accepted but logged with a warning.

Example cipher suites for TLS 1.2:

- `TLS_ECDHE_ECDSA_WITH_AES_128_GCM_SHA256`
- `TLS_ECDHE_RSA_WITH_AES_128_GCM_SHA256`
- `TLS_ECDHE_ECDSA_WITH_AES_256_GCM_SHA384`
- `TLS_ECDHE_RSA_WITH_AES_256_GCM_SHA384`
- `TLS_ECDHE_ECDSA_WITH_CHACHA20_POLY1305_SHA256`
- `TLS_ECDHE_RSA_WITH_CHACHA20_POLY1305_SHA256`

> **Note:** When `minTLSVersion` is set to `VersionTLS13`, the `cipherSuites` field is not applicable because
> TLS 1.3 cipher suites are not configurable in Go — they are always set to the TLS 1.3 defaults.

## How It Works

1. The cluster-manager operator watches the `ocm-tls-profile` ConfigMap in its namespace.
2. On startup, the operator reads the ConfigMap and parses the TLS settings. If the ConfigMap does not exist,
   it uses the defaults (TLS 1.2, Go's default cipher suites).
3. The operator passes the TLS settings as `--tls-min-version` and `--tls-cipher-suites` flags to the
   deployments of all hub components:
   - Registration controller and webhook
   - Work controller and webhook
   - Placement controller
   - Add-on manager and webhook
   - gRPC server
4. When the ConfigMap content changes, the operator restarts to pick up the new TLS configuration and
   re-renders the hub component deployments with the updated settings.

## Example: Enforcing TLS 1.3

To enforce TLS 1.3 across all hub components:

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

## Example: Restricting Cipher Suites for TLS 1.2

To use TLS 1.2 with a restricted set of cipher suites:

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

## Removing Custom TLS Configuration

To revert to the default TLS settings, delete the ConfigMap:

```bash
kubectl delete configmap ocm-tls-profile -n open-cluster-management-hub
```

The operator will restart and all hub components will use TLS 1.2 with Go's default cipher suites.
