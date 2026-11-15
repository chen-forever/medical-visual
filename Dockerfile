# syntax=docker/dockerfile:1
FROM node:24-alpine AS build
WORKDIR /repo
COPY app/package.json app/package-lock.json ./app/
RUN cd app && npm ci --no-audit --no-fund
COPY app ./app
RUN cd app && npm run build

FROM node:24-alpine AS runtime
WORKDIR /repo
ENV NODE_ENV=production
ENV PORT=8787
ENV HOST=0.0.0.0
ENV STATIC_DIR=/repo/static
ENV DATABASE_PATH=/repo/data/qihuang.sqlite
COPY server ./server
COPY --from=build /repo/app/dist ./static
VOLUME ["/repo/data"]
EXPOSE 8787
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s \
  CMD node -e "fetch('http://127.0.0.1:8787/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "server/index.mjs"]
