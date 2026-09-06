# YOURS

**A home you’re in charge of.**

Private product source. Owner: Evank253.

## Run

```
cd yours-home
npm start
```

Open http://127.0.0.1:3333

Create a home (email + handle + password). Then:

- `/home` — desk + posts + likes
- `/customize` — build the page (House / Grid / Stage)
- `/u/yourhandle` — public page
- `/search` — find people by name (no faces)
- `/live` — live door stub (Yours destination)
- `/studio` — start a group

Data lives in `data/db.json` on your machine (gitignored). Passwords are scrypt-hashed. Session cookie is HttpOnly.

Set `YOURS_SESSION_SECRET` before anything public.
