FROM node:24-bookworm-slim
WORKDIR /workspace
COPY . .
RUN npm install --ignore-scripts --no-audit --no-fund
ENV OS_DEV_PORT_POLICY=abort
CMD ["npm", "run", "dev"]
