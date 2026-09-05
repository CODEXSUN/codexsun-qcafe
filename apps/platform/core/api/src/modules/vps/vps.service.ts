import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { createRequire } from "node:module";
import { z } from "zod";

const require = createRequire(import.meta.url);
const serverSchema = z.object({ id: z.number(), hostname: z.string().optional(), state: z.string().optional() });

export class HostingerInventory {
  constructor(private readonly token?: string) {}
  async list() {
    if (!this.token?.trim()) throw new Error("Hostinger authentication required.");
    const client = new Client({ name: "codexsun-vps", version: "1.0.0" });
    const transport = new StdioClientTransport({
      command: process.execPath,
      args: [require.resolve("hostinger-api-mcp/src/servers/vps.js")],
      env: { PATH: process.env.PATH ?? "", ...(process.env.SystemRoot ? { SystemRoot: process.env.SystemRoot } : {}), HOSTINGER_API_TOKEN: this.token },
      stderr: "pipe",
    });
    try {
      await client.connect(transport, { timeout: 15000 });
      const result = await client.callTool({ name: "VPS_getVirtualMachinesV1", arguments: {} }, undefined, { timeout: 30000 });
      if (result.isError) throw new Error("Hostinger rejected the inventory request.");
      const block = (result.content as { type: string; text?: string }[]).find((item) => item.type === "text");
      if (!block?.text) throw new Error("Hostinger returned no inventory.");
      return serverSchema.array().parse(JSON.parse(block.text));
    } finally { await client.close(); await transport.close(); }
  }
}
