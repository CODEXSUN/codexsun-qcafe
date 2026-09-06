FROM node:24-bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends python3 ca-certificates git && rm -rf /var/lib/apt/lists/*
WORKDIR /app
RUN npm init -y && npm install --save-exact @openai/codex@0.153.2 @openai/codex-sdk@0.153.2 @google/gemini-cli@0.58.0 opencode-ai@1.18.28 fastify@5 sharp@0.35.4
COPY packages/zxa/docker/server.mjs /app/server.mjs
COPY packages/zxa/docker/update-zxa.mjs /app/update-zxa.mjs
COPY packages/zxa/docker/update-zxa.sh /app/update-zxa.sh
COPY packages/zxa/web/dist /app/web
RUN chmod +x /app/update-zxa.sh && mkdir -p /state/codex /state/gemini /state/opencode /state/agents/candidates /runtime/releases /workspace && chown -R node:node /state /runtime /workspace
ENV NODE_ENV=production HOME=/state CODEX_HOME=/state/codex GEMINI_CLI_HOME=/state/gemini XDG_CONFIG_HOME=/state/opencode PATH=/runtime/current/node_modules/.bin:/app/node_modules/.bin:$PATH
USER node
EXPOSE 4200
CMD ["node", "/app/server.mjs"]
