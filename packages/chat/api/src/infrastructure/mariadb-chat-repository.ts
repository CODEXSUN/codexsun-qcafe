import mysql, { type Pool, type RowDataPacket } from "mysql2/promise";
import type { ChatMessage, ChatEvent } from "@codexsun/chat-contracts";
import type { ChatRepository } from "../application/ports.js";
import type { ConversationState } from "../domain/conversation.js";

export class MariaDbChatRepository implements ChatRepository {
  private readonly pool: Pool;
  constructor(url: string) { this.pool = mysql.createPool(url); }

  async start() {
    await this.pool.execute("CREATE TABLE IF NOT EXISTS chat_conversations (id VARCHAR(100) PRIMARY KEY, members VARCHAR(500) NOT NULL UNIQUE, document LONGTEXT NOT NULL)");
    await this.pool.execute("CREATE TABLE IF NOT EXISTS chat_messages (id VARCHAR(100) PRIMARY KEY, conversation_id VARCHAR(100) NOT NULL, created_at VARCHAR(40) NOT NULL, document LONGTEXT NOT NULL, INDEX chat_history(conversation_id,created_at))");
    await this.pool.execute("CREATE TABLE IF NOT EXISTS chat_outbox (id BIGINT AUTO_INCREMENT PRIMARY KEY, document LONGTEXT NOT NULL, created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP)");
  }
  async close() { await this.pool.end(); }
  async findConversation(id: string) { return (await this.read<ConversationState>("SELECT document FROM chat_conversations WHERE id=?", [id]))[0]; }
  async findDirectConversation(actorIds: [string, string]) { return (await this.read<ConversationState>("SELECT document FROM chat_conversations WHERE members=?", [JSON.stringify([...actorIds].sort())]))[0]; }
  async listConversations(actorId: string) { return (await this.read<ConversationState>("SELECT document FROM chat_conversations WHERE JSON_CONTAINS(members, ?)", [JSON.stringify(actorId)])); }
  async listMessages(conversationId: string) { return this.read<ChatMessage>("SELECT document FROM chat_messages WHERE conversation_id=? ORDER BY created_at,id", [conversationId]); }
  async saveConversation(conversation: ConversationState) {
    await this.pool.execute("INSERT INTO chat_conversations(id,members,document) VALUES(?,?,?) ON DUPLICATE KEY UPDATE document=VALUES(document)", [conversation.id, JSON.stringify([...conversation.memberIds].sort()), JSON.stringify(conversation)]);
  }
  async saveMessage(conversationId: string, message: ChatMessage) {
    await this.pool.execute("INSERT INTO chat_messages(id,conversation_id,created_at,document) VALUES(?,?,?,?)", [message.uuid, conversationId, message.createdAt, JSON.stringify(message)]);
  }
  async saveTurn(conversation: ConversationState, message: ChatMessage, event: ChatEvent) {
    const connection = await this.pool.getConnection();
    try {
      await connection.beginTransaction();
      await connection.execute("INSERT INTO chat_messages(id,conversation_id,created_at,document) VALUES(?,?,?,?)", [message.uuid, conversation.id, message.createdAt, JSON.stringify(message)]);
      await connection.execute("UPDATE chat_conversations SET document=? WHERE id=?", [JSON.stringify(conversation), conversation.id]);
      await connection.execute("INSERT INTO chat_outbox(document) VALUES(?)", [JSON.stringify(event)]);
      await connection.commit();
    } catch (error) { await connection.rollback(); throw error; }
    finally { connection.release(); }
  }
  private async read<T>(sql: string, parameters: string[] = []): Promise<T[]> {
    const [rows] = await this.pool.execute<RowDataPacket[]>(sql, parameters);
    return rows.map(row => JSON.parse(row.document as string) as T);
  }
}
