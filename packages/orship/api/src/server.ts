import { buildOrshipApp } from "./app.js";

const app = buildOrshipApp();
await app.listen({ host: process.env.ORSHIP_API_HOST ?? "127.0.0.1", port: Number(process.env.ORSHIP_API_PORT ?? 4190) });
for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, () => void app.close());
