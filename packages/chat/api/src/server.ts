import { createChatModule } from "./chat-module.js";
import { StaticIdentityProvider } from "./infrastructure/static-identity-provider.js";

const demoToken = process.env.CHAT_DEMO_TOKEN ?? "local-demo-only";
const identities = new StaticIdentityProvider([
  { token: demoToken, actor: { uuid: "local-user", name: "Local User", email: "local@chat.test" } },
  { token: "local-contact-only", actor: { uuid: "local-contact", name: "Demo Contact", email: "contact@chat.test" } },
]);
const localAccessTokenIssuer = process.env.CHAT_LOCAL_TOKEN_ISSUER === "true"
  ? { issue: () => identities.issue("local-user", 8 * 60 * 60 * 1_000) }
  : undefined;
const { app } = createChatModule({
  identities,
  allowedOrigins: (process.env.CHAT_ALLOWED_ORIGINS ?? "http://127.0.0.1:5173,http://127.0.0.1:5176,http://tauri.localhost,https://tauri.localhost,tauri://localhost").split(",").map((origin) => origin.trim()),
  localAccessTokenIssuer,
});

await app.listen({ host: process.env.CHAT_API_HOST ?? "127.0.0.1", port: Number(process.env.CHAT_API_PORT ?? 4165) });
