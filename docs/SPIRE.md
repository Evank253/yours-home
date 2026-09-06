# SPIRE policy and attestation (later)

Not required to ship the door. Logged here so the design is in git.

## Policy engine

SPIRE Server can evaluate admin/API calls with embedded OPA (Rego + JSON data).
Default: allow admin or local for sensitive RPCs such as BatchCreateEntry.
Custom: bind a SPIFFE ID to a path prefix, e.g. only `spiffe://yours.prod/schedulers/live` may create entries under `/ingest/`.

AuthN (SVID) ≠ AuthZ (Rego). Envoy+OPA tutorials show request allow lists on SPIFFE ID + method + path.

## Attestation (two layers)

**Node** — the machine is real.

- `k8s_psat` — projected service account token on the node
- `aws_iid` — EC2 instance identity document → agent ID includes account + instance
- `x509pop` — existing machine cert

**Workload** — the process on that node is the one in the entry.

- `unix` — uid, user, gid; optional path + sha256 of the binary
- `k8s` — namespace, service account, pod image (from kubelet); optional Sigstore image signature
- `docker` — container labels via Docker/Podman socket + cgroup

Entry example:

```
SPIFFE ID  spiffe://yours.prod/worker/publish
Parent     agent on this node
Selectors  unix:user:yours-worker
           unix:sha256:<bin>
```

No selector match → no SVID. Policy then says that ID may call vault refresh, not dump.
