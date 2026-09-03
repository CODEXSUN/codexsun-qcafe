FROM node:24.9.0-bookworm-slim AS build
WORKDIR /build
COPY package.json package-lock.json tsconfig.base.json ./
COPY packages/contracts/package.json packages/contracts/package.json
COPY packages/zetro/api/package.json packages/zetro/api/package.json
COPY apps/agent-crew/api/package.json apps/agent-crew/api/package.json
RUN npm ci --ignore-scripts
COPY packages/contracts packages/contracts
COPY packages/zetro/api packages/zetro/api
COPY apps/agent-crew/api apps/agent-crew/api
RUN npm run build -w @codexsun/agent-crew-api

FROM node:24.9.0-bookworm-slim
ENV NODE_ENV=production
RUN groupadd --system agent && useradd --system --gid agent --home /nonexistent agent
WORKDIR /app
COPY --from=build /build/apps/agent-crew/api/dist ./dist
COPY --from=build /build/node_modules ./node_modules
COPY apps/agent-crew/docker/entrypoint.sh /entrypoint.sh
RUN chmod 755 /entrypoint.sh
EXPOSE 4200
ENTRYPOINT ["/entrypoint.sh"]
