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

Without a key the server still starts; `/api/health` reports
`configured: false`, and `/api/analyze` returns `CONFIG_MISSING`.

## Endpoints

- `GET /api/health`
- `POST /api/analyze` with `{ "patient": { ... } }`

## Security

- Never commit `.env.local`.
- The API key stays server-side.
- Input is limited to 64 KB and analysis requests are rate-limited.
- The browser never receives the DeepSeek key or raw upstream errors.
