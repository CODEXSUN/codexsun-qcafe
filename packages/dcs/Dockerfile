FROM node:24-bookworm-slim
WORKDIR /app
COPY packages/dcs/package.json ./package.json
RUN npm install --omit=dev --ignore-scripts
COPY packages/dcs/src ./src
USER node
ENV DCS_HOST=0.0.0.0
EXPOSE 4170
CMD ["node", "src/server.mjs"]
