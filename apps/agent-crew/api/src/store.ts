import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { z } from "zod";
import { agentIdSchema } from "@codexsun/zetro-api/contracts";

const conversationSchema = z.object({
  schemaVersion: z.literal(1), agentId: agentIdSchema, id: z.string().uuid(),
  messages: z.array(z.object({ role: z.enum(["user", "assistant"]), content: z.string() })).max(100),
});
export type Conversation = z.infer<typeof conversationSchema>;

export class ConversationStore {
  constructor(private readonly directory: string, private readonly agentId: string) {}

  async load(id?: string): Promise<Conversation> {
    if (!id) return { schemaVersion: 1, agentId: this.agentId, id: randomUUID(), messages: [] };
    z.string().uuid().parse(id);
    const value = conversationSchema.parse(JSON.parse(await readFile(join(this.directory, `${id}.json`), "utf8")));
    if (value.agentId !== this.agentId || value.id !== id) throw new Error("Conversation identity mismatch.");
    return value;
  }

  async save(conversation: Conversation) {
    conversationSchema.parse(conversation);
    if (conversation.agentId !== this.agentId) throw new Error("Conversation identity mismatch.");
    await mkdir(this.directory, { recursive: true });
    const destination = join(this.directory, `${conversation.id}.json`);
    const temporary = `${destination}.${randomUUID()}.tmp`;
    await writeFile(temporary, JSON.stringify(conversation), { mode: 0o600 });
    await rename(temporary, destination);
  }
}
