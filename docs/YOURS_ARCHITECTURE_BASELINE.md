# YOURS — Architecture and Implementation Baseline

**Status:** Additive engineering specification for the existing YOURS codebase.  
**Branch:** `manifex/yours-private-home-room-foundation-001`  
**Baseline examined:** `main` of `Evank253/yours-home`.

## Existing implementation observed

The existing application is a small Node.js HTTP application with:
- Cookie-based session authentication and password hashing in `src/auth.mjs`.
- JSON persistence through `src/store.mjs`.
- Account signup/login, profile/page editing, posts, comments, friend requests, groups, a live status flag, export, and deletion.
- A public profile route under `/u/:handle`.
- A private app shell at `public/app.html` and client-side navigation in `public/app.js`.
- A current Studio page that represents group rooms, not the private creative rooms described by this vision.

This is the starting codebase, not evidence that the full YOURS vision is implemented.

## Foundational separation

```
YOURS ACCOUNT
  |
  +-- PRIVATE HOME (authenticated control plane)
  |     |
  |     +-- Room registry and room navigation
  |     +-- Personal workspace layouts
  |     +-- Projects, assets, connected services
  |     +-- Privacy, sharing, consent, permissions
  |     |
  |     +-- Private Music Studio
  |     +-- Private Streaming Room
  |     +-- Private Social Media Room
  |     +-- Private Game Development Room
  |     +-- Private Creative Design Room
  |     +-- Private Podcast Room
  |
  +-- PUBLIC MASTER ROOM (/u/:handle)
        |
        +-- Owner-curated profile and portfolio
        +-- Explicitly published content
        +-- Public links and approved embeds
        +-- Owner-enabled visitor/community features
```

The public route must never serialize the private room registry, workspace configuration, connected-account tokens, drafts, or private project metadata.

## Room contract

Each room has:
- Stable room ID and display name.
- Functional purpose and capability status.
- Private-by-default visibility.
- Owner-only settings and workspace layout.
- Optional, explicit sharing policy (future work).
- Documented inputs/outputs for shared project and asset workflows.
- A lifecycle status that distinguishes implemented from planned.

Room registration is not proof that the room's full creative engine exists.

## Shared service boundaries

- **Identity:** account identity and sessions.
- **Room registry:** room definitions and owner room settings.
- **Personalization:** per-room layout preferences, separate from functional state.
- **Asset/project layer:** owner-scoped resources and lineage.
- **Integration adapters:** official OAuth/API/embed contracts only.
- **Publishing:** explicit owner-selected projection from private assets into public Master Room.
- **Governance/audit:** record access grants, publication actions, revocations, and changes.

## Initial implementation slice

This branch establishes the first product-architecture slice:
1. Preserve existing project files on a separate branch.
2. Add a stable catalog of private room definitions.
3. Add authenticated APIs for reading and saving the owner's room order/layout preferences.
4. Add a private Home/Rooms UI that shows room purpose and honest capability status.
5. Keep `/u/:handle` as the public Master Room and do not expose private room settings there.

It does not implement music production, livestream ingest, social OAuth, game engines, professional creative editing, podcast recording, cross-platform simulcast, or the AI creative orchestrator.

## Privacy invariants for the first slice

- Room settings are keyed to the authenticated owner, not a caller-supplied handle.
- Unauthenticated requests to private room APIs return 401.
- Public Master Room responses contain no room registry or room settings.
- Layout values are presentation preferences, never permissions.
- Unknown room IDs and malformed layouts are rejected.
- Existing public page behavior remains separate from private Home state.

## Later integration path

The native NSIGO scenario/orchestration reconstruction may later be evaluated as a YOURS Intelligence capability. It is not treated as a working dependency yet: its current reference foundation is not runtime-tested or qualified. Integration requires a versioned capability contract, isolation, explicit permissions, independent verification, and a human-approved release gate.

## Verification status

Repository files were inspected on `main`. This branch's code changes must be tested in an isolated checkout before qualification. No production deployment or external platform integration is claimed.
