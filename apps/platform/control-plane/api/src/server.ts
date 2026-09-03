import { buildApp } from "./app.js";

const host = process.env.OS_API_HOST ?? "127.0.0.1";
const port = Number.parseInt(process.env.OS_API_PORT ?? "4100", 10);
const app = buildApp();

async function shutdown() {
  await app.close();
}

process.once("SIGINT", () => void shutdown());
process.once("SIGTERM", () => void shutdown());

try {
  await app.listen({ host, port });
} catch (error) {
  app.log.error(error);
  process.exitCode = 1;
}
