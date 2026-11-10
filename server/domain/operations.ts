import type Database from 'better-sqlite3';
import { commandResponseSchema, type CommandResponse, type Conversation } from '../../shared/contracts.js';
import { getConversation, addMessage } from './conversations.js';
import { mutateTask, type TaskAction } from './tasks.js';
import { HttpError, notFound } from '../http.js';

export type OperationRow = { id: string; conversation_id: string; kind: string; payload: string; status: CommandResponse['status']; result: string | null };
// Canonical JSON is saved only in the private DB, never logged. Payload equality
// binds every validated field, including mode, thread, intent and resource version.
export function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value && typeof value === 'object') return `{${Object.entries(value).filter(([, v]) => v !== undefined).sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => `${JSON.stringify(k)}:${canonical(v)}`).join(',')}}`;
  return JSON.stringify(value);
}
export function getOperation(db: Database.Database, accountId: number, id: string) {
  return db.prepare('SELECT * FROM operations WHERE account_id=? AND id=?').get(accountId, id) as OperationRow | undefined;
}
export function replay(db: Database.Database, accountId: number, id: string, payload: unknown): OperationRow | undefined {
  const previous = getOperation(db, accountId, id);
  if (previous && previous.payload !== canonical(payload)) throw new HttpError(409, 'IDEMPOTENCY_CONFLICT', 'Detta request-ID används redan för en annan avsikt.');
  return previous;
}
export function beginOperation(db: Database.Database, accountId: number, id: string, conversationId: string, kind: string, payload: unknown) {
  const now = new Date().toISOString();
  db.prepare("INSERT INTO operations(account_id,id,conversation_id,mode,kind,payload,status,created_at,updated_at) VALUES(?,?,?,'live',?,?,'pending',?,?)")
    .run(accountId, id, conversationId, kind, canonical(payload), now, now);
}
export function finishOperation(db: Database.Database, accountId: number, id: string, status: CommandResponse['status'], result: unknown) {
  db.prepare('UPDATE operations SET status=?,result=?,updated_at=? WHERE account_id=? AND id=?').run(status, JSON.stringify(result), new Date().toISOString(), accountId, id);
}
export function operationResult(db: Database.Database, accountId: number, id: string): CommandResponse {
  const row = getOperation(db, accountId, id);
  if (!row || !['command', 'task', 'chat'].includes(row.kind)) throw notFound();
  if (row.result) return commandResponseSchema.parse(JSON.parse(row.result));
  return { requestId: id, conversationId: row.conversation_id, status: row.status, task: null, deletedTaskId: null, messages: [], persisted: true, code: row.status === 'unknown' ? 'INTERRUPTED_BY_RESTART' : null };
}
export function executeLocal(db: Database.Database, accountId: number, command: { requestId: string; conversationId: string; mode: 'live'; text?: string; action: TaskAction }) {
  const payload = { kind: command.text === undefined ? 'task' : 'command', ...command };
  return db.transaction(() => {
    if (replay(db, accountId, command.requestId, payload)) return operationResult(db, accountId, command.requestId);
    getConversation(db, accountId, command.conversationId, true);
    beginOperation(db, accountId, command.requestId, command.conversationId, payload.kind, payload);
    const effect = mutateTask(db, accountId, command.action);
    const messages = [];
    if (command.text !== undefined) {
      messages.push(addMessage(db, accountId, command.conversationId, command.requestId, 'user', 'user_input', command.text));
      messages.push(addMessage(db, accountId, command.conversationId, command.requestId, 'assistant', effect.task ? 'command_result' : 'system_notice',
        effect.task ? `Task added: ${effect.task.title}` : 'AI är inte ansluten. Din text är sparad i detta samtal. Du kan skapa uppgifter med ”Lägg till en uppgift att …”.'));
    }
    const result: CommandResponse = { requestId: command.requestId, conversationId: command.conversationId, status: 'succeeded', ...effect, messages, persisted: true, code: effect.task || command.action.type !== 'text' ? null : 'PROVIDER_NOT_CONFIGURED' };
    finishOperation(db, accountId, command.requestId, result.status, result);
    return result;
  })();
}
export function createConversation(db: Database.Database, accountId: number, data: { requestId: string; title: string }): Conversation {
  const payload = { kind: 'conversation_create', mode: 'live', ...data };
  return db.transaction(() => {
    const old = replay(db, accountId, data.requestId, payload);
    if (old) return JSON.parse(old.result!) as Conversation;
    const now = new Date().toISOString(), id = data.requestId;
    db.prepare('INSERT INTO conversations(account_id,id,title,created_at,updated_at) VALUES(?,?,?,?,?)').run(accountId, id, data.title, now, now);
    beginOperation(db, accountId, data.requestId, id, payload.kind, payload);
    const result = getConversation(db, accountId, id);
    finishOperation(db, accountId, data.requestId, 'succeeded', result);
    return result;
  })();
}
export function patchConversation(db: Database.Database, accountId: number, id: string, data: { requestId: string; version: number; title?: string | undefined; status?: 'open' | 'archived' | undefined }): Conversation {
  const payload = { kind: 'conversation_patch', mode: 'live', conversationId: id, ...data };
  return db.transaction(() => {
    const old = replay(db, accountId, data.requestId, payload);
    if (old) return JSON.parse(old.result!) as Conversation;
    const current = getConversation(db, accountId, id);
    if (current.version !== data.version) throw new HttpError(409, 'VERSION_CONFLICT', 'Samtalet har ändrats. Läs in den aktuella versionen.', current);
    db.prepare('UPDATE conversations SET title=?,status=?,version=version+1,updated_at=? WHERE account_id=? AND id=? AND version=?')
      .run(data.title ?? current.title, data.status ?? current.status, new Date().toISOString(), accountId, id, data.version);
    beginOperation(db, accountId, data.requestId, id, payload.kind, payload);
    const result = getConversation(db, accountId, id);
    finishOperation(db, accountId, data.requestId, 'succeeded', result);
    return result;
  })();
}
// Called once on process startup, never on a request or reload. No external retry.
export function recoverPendingOperations(db: Database.Database) {
  db.prepare("UPDATE operations SET status='unknown',updated_at=? WHERE status='pending'").run(new Date().toISOString());
}
