# Local API server

Small local BFF for the Qihuang front-end. It keeps the DeepSeek API key on the
server and returns validated `AnalysisResult` JSON.

## Run

```bash
cd server
cp .env.example .env.local
# put a NEW DeepSeek key in .env.local
npm run dev
```

Then in another terminal:

```bash
cd app
npm run dev
```

Vite proxies `/api` to `http://127.0.0.1:8787`.

## Production-style run

```bash
cd app
npm run build
cd ..
node server/index.mjs
```

The server serves `app/dist` plus the API on one port. See
[DEPLOYMENT.md](<DEPLOYMENT.md>) for the Docker image and deployment checklist.

Without a key the server still starts; `/api/health` reports
`configured: false`, and `/api/analyze` returns `CONFIG_MISSING`.

## Login

Set `APP_ACCESS_PASSWORD` and `SESSION_SECRET` in `server/.env.local`:

```text
APP_ACCESS_PASSWORD=choose-a-local-password
SESSION_SECRET=random-long-string
COOKIE_SECURE=false
```

When `APP_ACCESS_PASSWORD` is set, case APIs require a signed HttpOnly session
cookie. If it is empty, login is disabled for local-only use. The login
password is not stored in the browser.

## Endpoints

- `GET /api/health` (public)
- `GET /api/auth/me` (public status)
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/cases`
- `POST /api/cases` with `{ "patient": { ... } }`
- `GET /api/cases/:id`
- `PATCH /api/cases/:id` with `{ patient, version, lesions? }`
- `DELETE /api/cases/:id` (soft delete)
- `PATCH /api/cases/:id/lesions` with `{ lesions, version }`
- `GET /api/cases/:id/events` (audit trail)
- `POST /api/cases/:id/analyze`
- `GET /api/cases/:id/analyses`
- `POST /api/cases/:id/formulas`
- `GET /api/cases/:id/formulas`
- `POST /api/cases/:id/reports`
- `GET /api/cases/:id/reports`
- `GET /api/reports/:id`
- `POST /api/analyze` (legacy, no persistence)

## Storage

Cases, analysis runs, formulas, immutable report snapshots, and case audit
events are stored in SQLite at `data/qihuang.sqlite`. The data directory is
ignored by Git.

This is a single-practitioner backend. It has login but **no multi-user roles or
RBAC**. Keep it bound to localhost until those are added.

## Security

- Never commit `.env.local`.
- The API key stays server-side.
- Sessions are HMAC-signed HttpOnly cookies with a 12-hour expiry.
- Login attempts are rate-limited.
- Input is limited to 64 KB and analysis requests are rate-limited.
- The browser never receives the DeepSeek key or raw upstream errors.
