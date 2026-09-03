import { buildZetroApp } from "./app.js";

const app = buildZetroApp();
await app.listen({ host: process.env.ZETRO_API_HOST ?? "127.0.0.1", port: Number(process.env.ZETRO_API_PORT ?? 4150) });
for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, () => void app.close());
