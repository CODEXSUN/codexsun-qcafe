import { createServer } from "node:http";
import { timingSafeEqual } from "node:crypto";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { createToolServer } from "./mcp.mjs";

export function createRunnerHttp({ workspace, token, audit }) {
  if (!token || token.length < 32) throw new Error("A private tool token of at least 32 characters is required.");
  let active = 0;
  return createServer(async (request, response) => {
    const send = (status, body) => { response.writeHead(status, { "Content-Type": "application/json" }); response.end(JSON.stringify(body)); };
    const hostname = (request.headers.host ?? "").split(":")[0];
    if (!["127.0.0.1", "localhost", "host.docker.internal"].includes(hostname) || request.headers.origin) return send(403, { error: "Origin not allowed." });
    if (request.url === "/health" && request.method === "GET") return send(200, { status: "ok", service: "zetro-local-runner", tools: 3 });
    const supplied = Buffer.from(request.headers.authorization ?? "");
    const expected = Buffer.from(`Bearer ${token}`);
    if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) return send(401, { error: "Authentication required." });
    if (request.url !== "/mcp" || request.method !== "POST") return send(405, { error: "Use POST /mcp." });
    if (active >= 8) return send(429, { error: "Runner is busy." });
    active++;
    const server = createToolServer(workspace, audit);
    const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined, enableJsonResponse: true });
    try {
      const chunks = [];
      let size = 0;
      for await (const chunk of request) {
        size += chunk.length;
        if (size > 8192) return send(413, { error: "Request too large." });
        chunks.push(chunk);
      }
      let body;
      try { body = JSON.parse(Buffer.concat(chunks).toString("utf8")); }
      catch { return send(400, { error: "Invalid JSON." }); }
      await server.connect(transport);
      await transport.handleRequest(request, response, body);
    } catch {
      if (!response.headersSent) send(500, { error: "Tool transport failed." });
    } finally {
      await transport.close();
      await server.close();
      active--;
    }
  });
}
