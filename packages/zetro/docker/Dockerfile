FROM node:24-bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends python3 ca-certificates git && rm -rf /var/lib/apt/lists/*
WORKDIR /app
RUN npm init -y && npm install --save-exact @openai/codex@0.153.0 @openai/codex-sdk@0.153.0 fastify@5 @fastify/static@8
COPY packages/zetro/docker/server.mjs /app/server.mjs
COPY packages/zetro/web/dist /app/web
RUN mkdir -p /state/codex /workspace && chown -R node:node /state /workspace /app
ENV NODE_ENV=production CODEX_HOME=/state/codex HOME=/state PATH=/app/node_modules/.bin:$PATH
USER node
EXPOSE 4200
CMD ["node", "/app/server.mjs"]
