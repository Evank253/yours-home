# Security phases

## Now

- Private repo.
- No secrets in git.
- Refresh tokens never in the browser.
- Idempotency keys on publish jobs: `publish:{user}:{event}:{door}:{version}`.

## Next

- OAuth 2.1 client profile: PKCE, exact redirects, no implicit, rotate refresh.
- DPoP toward Google + Yours-native payments (`cnf.jkt`).
- Encrypted vault per `user + network + account`.

## Later (when there are many services)

SPIFFE IDs:

- `spiffe://yours.prod/edge/web`
- `spiffe://yours.prod/worker/publish`
- `spiffe://yours.prod/svc/vault`
- `spiffe://yours.prod/ingest/live`

Web never holds a vault SVID. mTLS between worker and vault. SPIRE attestation + OPA on SPIRE APIs. See `docs/SPIRE.md`.
