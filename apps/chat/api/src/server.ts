import { buildChatApp } from "./app.js";
const app = buildChatApp();
await app.listen({ host: process.env.CHAT_API_HOST ?? "127.0.0.1", port: Number(process.env.CHAT_API_PORT ?? 4160) });
