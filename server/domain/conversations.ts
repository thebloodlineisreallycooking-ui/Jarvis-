import { randomUUID } from 'node:crypto';
import type Database from 'better-sqlite3';
import { z } from 'zod';
import { conversationSchema, messageSchema, type Conversation, type Message, type HistoryPage } from '../../shared/contracts.js';
import { HttpError, input, notFound } from '../http.js';

type ConversationRow = { id: string; title: string; status: string; created_at: string; updated_at: string; version: number };
export function conversationFrom(row: ConversationRow): Conversation {
  return conversationSchema.parse({ id: row.id, title: row.title, status: row.status, createdAt: row.created_at, updatedAt: row.updated_at, version: row.version, mode: 'live' });
}
export function createDefaultConversation(db: Database.Database, accountId: number) {
  const now = new Date().toISOString();
  db.prepare('INSERT INTO conversations(account_id,id,title,created_at,updated_at) VALUES(?,?,?,?,?)').run(accountId, randomUUID(), 'Mitt första samtal', now, now);
}
export function getConversation(db: Database.Database, accountId: number, id: string, writable = false): Conversation {
  const row = db.prepare('SELECT * FROM conversations WHERE account_id=? AND id=?').get(accountId, id) as ConversationRow | undefined;
  if (!row) throw notFound();
  const conversation = conversationFrom(row);
  if (writable && conversation.status !== 'open') throw new HttpError(409, 'CONVERSATION_ARCHIVED', 'Återöppna samtalet innan du skickar något.');
  return conversation;
}
export function encodeCursor(value: unknown) { return Buffer.from(JSON.stringify(value)).toString('base64url'); }
export function decodeCursor<T>(cursor: string, schema: z.ZodType<T>) {
  try { return input(schema, JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8'))); }
  catch { throw new HttpError(400, 'INVALID_CURSOR', 'Sidmarkören är ogiltig. Läs in listan på nytt.'); }
}
export function listConversations(db: Database.Database, accountId: number, limit: number, cursor?: string) {
  const page = cursor ? decodeCursor(cursor, z.object({ accountId: z.number(), row: z.number().int().positive() }).strict()) : null;
  if (page && page.accountId !== accountId) throw new HttpError(400, 'INVALID_CURSOR', 'Sidmarkören tillhör en annan lista.');
  const rows = db.prepare('SELECT rowid AS row,* FROM conversations WHERE account_id=? AND rowid<? ORDER BY rowid DESC LIMIT ?').all(accountId, page?.row ?? Number.MAX_SAFE_INTEGER, limit + 1) as (ConversationRow & { row: number })[];
  const more = rows.length > limit; rows.length = Math.min(rows.length, limit);
  return { conversations: rows.map(conversationFrom), nextCursor: more ? encodeCursor({ accountId, row: rows.at(-1)!.row }) : null };
}
export type MessageRow = { id: string; sequence: number; conversation_id: string; operation_id: string | null; role: string; kind: string; delivery: string; body: string; created_at: string };
export function messageFrom(row: MessageRow): Message {
  return messageSchema.parse({ id: row.id, sequence: row.sequence, conversationId: row.conversation_id, operationId: row.operation_id,
    role: row.role, kind: row.kind, delivery: row.delivery, text: row.body, createdAt: row.created_at, mode: 'live' });
}
export function history(db: Database.Database, accountId: number, conversationId: string, limit: number, cursor?: string): HistoryPage {
  getConversation(db, accountId, conversationId);
  const page = cursor ? decodeCursor(cursor, z.object({ accountId: z.number(), conversationId: z.string(), before: z.number().int().positive(), ceiling: z.number().int().nonnegative() }).strict()) : null;
  if (page && (page.accountId !== accountId || page.conversationId !== conversationId || page.before > page.ceiling)) throw new HttpError(400, 'INVALID_CURSOR', 'Sidmarkören tillhör ett annat samtal.');
  const ceiling = page?.ceiling ?? db.prepare('SELECT COALESCE(MAX(sequence),0) FROM messages WHERE account_id=? AND conversation_id=?').pluck().get(accountId, conversationId) as number;
  const rows = db.prepare('SELECT * FROM messages WHERE account_id=? AND conversation_id=? AND sequence<=? AND sequence<? ORDER BY sequence DESC LIMIT ?').all(accountId, conversationId, ceiling, page?.before ?? Number.MAX_SAFE_INTEGER, limit + 1) as MessageRow[];
  const more = rows.length > limit; rows.length = Math.min(rows.length, limit);
  return { messages: rows.map(messageFrom).reverse(), nextCursor: more ? encodeCursor({ accountId, conversationId, ceiling, before: rows.at(-1)!.sequence }) : null };
}
export function addMessage(db: Database.Database, accountId: number, conversationId: string, operationId: string, role: Message['role'], kind: Message['kind'], text: string, delivery: Message['delivery'] = 'complete'): Message {
  const id = randomUUID(), now = new Date().toISOString();
  const info = db.prepare('INSERT INTO messages(id,account_id,role,body,mode,created_at,conversation_id,operation_id,kind,delivery) VALUES(?,?,?,?,?,?,?,?,?,?)')
    .run(id, accountId, role, text, 'live', now, conversationId, operationId, kind, delivery);
  return messageSchema.parse({ id, sequence: Number(info.lastInsertRowid), conversationId, operationId, role, kind, text, delivery, createdAt: now, mode: 'live' });
}
