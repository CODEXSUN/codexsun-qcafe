import cors from "@fastify/cors";
import Fastify, { type FastifyRequest } from "fastify";
import {
  CHAT_API_PREFIX,
  CHAT_LOCAL_ACCESS_TOKEN_PATH,
  conversationPreferencesSchema,
  createConversationSchema,
  historyQuerySchema,
  sendMessageSchema,
  success,
  type ChatActor,
} from "@codexsun/chat-contracts";
import { ChatService } from "../../application/chat-service.js";
import type { ChatIdentityProvider } from "../../application/ports.js";
import { ChatAccessError, ChatNotFoundError } from "../../domain/chat-errors.js";
import type { LocalAccessTokenIssuer } from "../../chat-module.js";

export function buildChatApp(service: ChatService, identities: ChatIdentityProvider, allowedOrigins: string[] = [], localAccessTokenIssuer?: LocalAccessTokenIssuer) {
  const app = Fastify({ logger: true });
  const actors = new WeakMap<FastifyRequest, ChatActor>();
  void app.register(cors, { origin: allowedOrigins });

  app.get("/health", async () => ({ status: "ok", service: "chat" }));
  app.addHook("preHandler", async (request, reply) => {
    if (request.url === "/health" || request.url === CHAT_LOCAL_ACCESS_TOKEN_PATH) return;
    const token = bearerToken(request.headers.authorization);
    const actor = token ? await identities.authenticate(token) : undefined;
    if (!actor) return reply.code(401).send(failure("CHAT_UNAUTHORIZED", "A valid Chat access token is required."));
    actors.set(request, actor);
  });

  app.post(CHAT_LOCAL_ACCESS_TOKEN_PATH, async (request, reply) => {
    if (!localAccessTokenIssuer) return reply.code(404).send(failure("CHAT_TOKEN_ISSUER_DISABLED", "Local Chat token generation is disabled."));
    if (!isLoopbackAddress(request.ip)) return reply.code(403).send(failure("CHAT_TOKEN_ISSUER_LOCAL_ONLY", "Local Chat tokens can only be issued from this device."));
    return success(localAccessTokenIssuer.issue());
  });

  app.get(`${CHAT_API_PREFIX}/profile`, async (request) => success(await service.profile(actor(request).uuid)));
  app.get(`${CHAT_API_PREFIX}/contacts`, async (request) => success(await service.contacts(actor(request).uuid)));
  app.get(`${CHAT_API_PREFIX}/conversations`, async (request) => success(await service.list(actor(request).uuid)));
  app.post(`${CHAT_API_PREFIX}/conversations`, async (request, reply) => {
    const input = createConversationSchema.safeParse(request.body);
    if (!input.success) return reply.code(400).send(failure("CHAT_INVALID_INPUT", "A valid peer actor is required."));
    return success(await service.open(actor(request).uuid, input.data.peerActorId));
  });
  app.get(`${CHAT_API_PREFIX}/conversations/:id/messages`, async (request, reply) => {
    const query = historyQuerySchema.safeParse(request.query);
    if (!query.success) return reply.code(400).send(failure("CHAT_INVALID_INPUT", "The history query is invalid."));
    return success(await service.history(actor(request).uuid, conversationId(request), query.data.limit, query.data.before));
  });
  app.post(`${CHAT_API_PREFIX}/conversations/:id/messages`, async (request, reply) => {
    const input = sendMessageSchema.safeParse(request.body);
    if (!input.success) return reply.code(400).send(failure("CHAT_INVALID_INPUT", "A message body is required."));
    return success(await service.send(actor(request).uuid, conversationId(request), input.data.body));
  });
  app.post(`${CHAT_API_PREFIX}/conversations/:id/read`, async (request) => {
    await service.markRead(actor(request).uuid, conversationId(request));
    return success({ read: true });
  });
  app.post(`${CHAT_API_PREFIX}/conversations/:id/preferences`, async (request, reply) => {
    const input = conversationPreferencesSchema.safeParse(request.body);
    if (!input.success) return reply.code(400).send(failure("CHAT_INVALID_INPUT", "Set an archive or mute preference."));
    return success(await service.setPreferences(actor(request).uuid, conversationId(request), input.data));
  });

  app.setErrorHandler((error, _request, reply) => {
    if (error instanceof ChatAccessError) return reply.code(403).send(failure("CHAT_FORBIDDEN", error.message));
    if (error instanceof ChatNotFoundError) return reply.code(404).send(failure("CHAT_NOT_FOUND", error.message));
    app.log.error(error);
    return reply.code(500).send(failure("CHAT_INTERNAL_ERROR", "Chat could not complete the request."));
  });
  return app;

  function actor(request: FastifyRequest) {
    const value = actors.get(request);
    if (!value) throw new ChatAccessError("Actor context is unavailable.");
    return value;
  }
}

function isLoopbackAddress(address: string) {
  return address === "127.0.0.1" || address === "::1" || address === "::ffff:127.0.0.1";
}

function bearerToken(value: string | undefined) {
  const match = value?.match(/^Bearer\s+(.+)$/iu);
  return match?.[1]?.trim();
}

function conversationId(request: FastifyRequest) {
  return (request.params as { id: string }).id;
}

function failure(code: string, message: string) {
  return { success: false as const, error: { code, message } };
}
