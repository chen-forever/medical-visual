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

## Endpoints

- `GET /api/health`
- `GET /api/cases`
- `POST /api/cases` with `{ "patient": { ... } }`
- `GET /api/cases/:id`
- `PATCH /api/cases/:id` with `{ patient, version, lesions? }`
- `DELETE /api/cases/:id` (soft delete)
- `POST /api/cases/:id/analyze`
- `GET /api/cases/:id/analyses`
- `POST /api/cases/:id/formulas`
- `GET /api/cases/:id/formulas`
- `POST /api/cases/:id/reports`
- `GET /api/cases/:id/reports`
- `GET /api/reports/:id`
- `POST /api/analyze` (legacy, no persistence)

## Storage

Cases, analysis runs, formulas, and immutable report snapshots are stored in
SQLite at `data/qihuang.sqlite`. The data directory is ignored by Git.

This Backend Lite has **no login or multi-user permissions**. Keep it bound to
localhost; add authentication before exposing it to a network.

## Security

- Never commit `.env.local`.
- The API key stays server-side.
- Input is limited to 64 KB and analysis requests are rate-limited.
- The browser never receives the DeepSeek key or raw upstream errors.
