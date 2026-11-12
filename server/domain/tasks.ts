import type Database from 'better-sqlite3';
import { z } from 'zod';
import { taskSchema, type Task, type TaskPage, type taskQuerySchema } from '../../shared/contracts.js';
import { HttpError, notFound } from '../http.js';
import { decodeCursor, encodeCursor } from './conversations.js';

type TaskRow = { id: number; title: string; status: string; created_at: string; updated_at: string; completed_at: string | null; version: number };
export function taskFrom(row: TaskRow): Task {
  return taskSchema.parse({ id: row.id, title: row.title, status: row.status, createdAt: row.created_at,
    updatedAt: row.updated_at, completedAt: row.completed_at, version: row.version, mode: 'live' });
}
export function getTask(db: Database.Database, accountId: number, id: number) {
  const row = db.prepare('SELECT * FROM tasks WHERE account_id=? AND id=?').get(accountId, id) as TaskRow | undefined;
  if (!row) throw notFound();
  return taskFrom(row);
}
export function listTasks(db: Database.Database, accountId: number, query: z.infer<typeof taskQuerySchema>): TaskPage {
  const page = query.cursor ? decodeCursor(query.cursor, z.object({ accountId: z.number(), before: z.number().int().positive(), status: z.string(), search: z.string() }).strict()) : null;
  if (page && (page.accountId !== accountId || page.status !== query.status || page.search !== query.search)) throw new HttpError(400, 'INVALID_CURSOR', 'Sidmarkören tillhör ett annat filter.');
  const search = `%${query.search.replace(/[!%_]/g, '!$&')}%`;
  const grouped = db.prepare("SELECT status,COUNT(*) AS count FROM tasks WHERE account_id=? AND title LIKE ? ESCAPE '!' GROUP BY status").all(accountId, search) as { status: string; count: number }[];
  const counts = { open: 0, completed: 0, all: 0 };
  for (const row of grouped) { if (row.status !== 'open' && row.status !== 'completed') throw new Error('Unsupported stored status'); counts[row.status] = row.count; counts.all += row.count; }
  const rows = db.prepare("SELECT * FROM tasks WHERE account_id=? AND title LIKE ? ESCAPE '!' AND (?='all' OR status=?) AND id<? ORDER BY id DESC LIMIT ?")
    .all(accountId, search, query.status, query.status, page?.before ?? Number.MAX_SAFE_INTEGER, query.limit + 1) as TaskRow[];
  const more = rows.length > query.limit; rows.length = Math.min(rows.length, query.limit);
  return { tasks: rows.map(taskFrom), counts, nextCursor: more ? encodeCursor({ accountId, before: rows.at(-1)!.id, status: query.status, search: query.search }) : null };
}
export type TaskAction = { type: 'create'; title: string } | { type: 'patch'; id: number; version: number; title?: string; status?: Task['status'] } | { type: 'delete'; id: number; version: number } | { type: 'text' };
// Called inside the operation's transaction; CAS also protects other DB clients.
export function mutateTask(db: Database.Database, accountId: number, action: TaskAction): { task: Task | null; deletedTaskId: number | null } {
  const now = new Date().toISOString();
  if (action.type === 'text') return { task: null, deletedTaskId: null };
  if (action.type === 'create') {
    const info = db.prepare('INSERT INTO tasks(account_id,title,status,created_at,updated_at) VALUES(?,?,?,?,?)').run(accountId, action.title, 'open', now, now);
    return { task: getTask(db, accountId, Number(info.lastInsertRowid)), deletedTaskId: null };
  }
  const current = getTask(db, accountId, action.id);
  if (current.version !== action.version) throw new HttpError(409, 'VERSION_CONFLICT', 'Uppgiften har ändrats. Läs aktuell version och försök igen.', current);
  if (action.type === 'delete') {
    db.prepare('DELETE FROM tasks WHERE account_id=? AND id=? AND version=?').run(accountId, action.id, action.version);
    return { task: null, deletedTaskId: action.id };
  }
  const title = action.title ?? current.title, status = action.status ?? current.status;
  if (title !== current.title || status !== current.status) {
    const completedAt = status === 'completed' ? current.completedAt ?? now : null;
    const info = db.prepare('UPDATE tasks SET title=?,status=?,updated_at=?,completed_at=?,version=version+1 WHERE account_id=? AND id=? AND version=?')
      .run(title, status, now, completedAt, accountId, action.id, action.version);
    if (info.changes !== 1) throw new HttpError(409, 'VERSION_CONFLICT', 'Uppgiften har ändrats. Läs aktuell version.');
  }
  return { task: getTask(db, accountId, action.id), deletedTaskId: null };
}
