# MANIFEX Deployment Reality Audit — YOURS

Status: IN PROGRESS

## Source baseline

- Repository: `Evank253/yours-home`
- Source branch: `main`
- Baseline commit: `dc9ccb0240f367624fe96da2439a4da580d326c6`
- Controlled work branch: `manifex/yours-deployment-audit-001`
- Default branch: `Python-3` (currently exposes only the initial README through the connected view)
- Source actually containing the application: `main`

## Runtime findings

- Application runtime: Node.js
- Minimum declared Node version: `>=18`
- Start command: `node src/server.mjs`
- Frontend: static HTML/CSS/JavaScript served by the Node HTTP server
- Backend: Node `node:http`
- Persistence: local JSON file at `data/db.json`
- Dependencies: no external npm dependencies declared
- Environment variables observed: `PORT`, `YOURS_PUBLIC_URL`, `YOURS_SESSION_SECRET`

## Candidate deployment direction

- GitHub Actions: verification/CI candidate
- Dagger/Earthly: reproducible verification candidates
- AppDeploy: current fallback deployment candidate because Vercel billing is unavailable
- Vercel: not selected because the user reports billing blocks deployment
- Railway/self-hosted runner: secondary candidates if persistent filesystem or custom runtime becomes necessary

## Blocking findings

1. `public/app.js` contains a broken HTML escaping implementation in the current `main` baseline. The existing `escapeHtml` function returns the original characters instead of HTML entities, and `escapeAttr` does not escape quotes. This is a security/correctness blocker because user-controlled values are inserted through `innerHTML`.
2. The server currently binds to `127.0.0.1`. That is suitable for local execution but is incompatible with most externally exposed container/application hosts unless the platform provides a loopback proxy.
3. The session signing secret has a development fallback. A production deployment must require `YOURS_SESSION_SECRET` rather than silently using `dev-only-change-me-before-public`.
4. There is no declared automated test script in `package.json`.
5. There is no health/readiness endpoint for deployment smoke tests.
6. Persistence is process-local filesystem JSON. A deployment platform must either provide persistent storage or explicitly treat the deployed instance as disposable prototype state.

## Required gates

- Source baseline recorded
- Syntax checks
- Automated smoke tests
- Security/static checks
- Runtime compatibility check
- Deployment health check
- Browser smoke test
- Evidence recorded before promotion

## Tooling note

The exact user-referenced `Kronos Vibe Coder` and `Vibe Developer` installations are not exposed through the connected tool surface, and public search did not identify a matching implementation with enough confidence to claim execution. They remain required gates in the workflow, but this audit does not falsely claim they have run.

## Decision

Current deployment state: **BLOCKED** until the application source is hardened and the required verification gates pass.
