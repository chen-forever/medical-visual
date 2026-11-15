# Production deployment

The local BFF can also serve the built frontend, so one Node process can run the
whole demo.

## Build and run locally

```bash
cd app
npm run build
cd ..
node server/index.mjs
```

Open `http://127.0.0.1:8787/`.

The server reads `server/.env.local` for the DeepSeek key and serves
`app/dist` by default. Override with `STATIC_DIR` if needed.

## Docker

```bash
docker build -t qihuang-state .
docker run --rm -p 8787:8787 \
  -v qihuang-data:/repo/data \
  -e DEEPSEEK_API_KEY="your-new-key" \
  qihuang-state
```

Do **not** bake the key into the image. Pass it at runtime. The named volume
keeps the SQLite database across container restarts.

For a public deployment also set:

```text
HOST=0.0.0.0
ALLOWED_ORIGIN=https://your-domain.example
```

**Do not expose Backend Lite publicly without authentication first.** It is a
local single-user backend and has no login, RBAC, or audit access control yet.

## Still needed for real deployment

- Domain / HTTPS
- A Node-capable host or container platform
- China ICP filing if hosting in mainland China
- Privacy/consent and medical-boundary review before real patient use
