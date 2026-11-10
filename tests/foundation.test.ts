import { afterEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import Database from 'better-sqlite3';
import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { randomUUID } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { openDatabase } from '../server/db/database';
import { migrate } from '../server/db/migrations';
import { createApp } from '../server/app';
import { account, testApp } from './helpers';
import { parseTask } from '../shared/contracts';

const dirs: string[] = [], connections: Database.Database[] = [];
function setup() {
  const dir = mkdtempSync(join(tmpdir(), 'jarvis-foundation-')); dirs.push(dir);
  const path = join(dir, 'test.db'), db = openDatabase(path); connections.push(db);
  return { db, path, app: testApp(db) };
}
afterEach(() => { connections.splice(0).forEach(db => { if (db.open) db.close(); }); dirs.splice(0).forEach(dir => rmSync(dir, { recursive: true, force: true })); vi.restoreAllMocks(); });

describe('Tasks, ownership and durable operations', () => {
  it('runs the lifecycle with CAS, no-op transitions, deletion and stable replay after restart', async () => {
    const { app, db, path } = setup(), alice = await account(app, 'alice');
    const body = { ...alice.envelope(), text: 'Lägg till en uppgift att testa hela flödet' };
    const original = (await alice.agent.post('/api/commands').send(body).expect(201)).body;
    const task = original.task;
    expect(task).toMatchObject({ title: 'testa hela flödet', version: 1, status: 'open', completedAt: null });
    const edit = (await alice.agent.patch(`/api/tasks/${task.id}`).send({ ...alice.envelope(), version: 1, title: ' Ändrad ' }).expect(200)).body.task;
    const conflict = await alice.agent.patch(`/api/tasks/${task.id}`).send({ ...alice.envelope(), version: 1, title: 'stale' }).expect(409);
    expect(conflict.body.current).toEqual(edit);
    const completed = (await alice.agent.patch(`/api/tasks/${task.id}`).send({ ...alice.envelope(), version: 2, status: 'completed' }).expect(200)).body.task;
    expect(completed.completedAt).toBeTruthy();
    const repeated = (await alice.agent.patch(`/api/tasks/${task.id}`).send({ ...alice.envelope(), version: 3, status: 'completed' }).expect(200)).body.task;
    expect(repeated).toEqual(completed);
    const reopened = (await alice.agent.patch(`/api/tasks/${task.id}`).send({ ...alice.envelope(), version: 3, status: 'open' }).expect(200)).body.task;
    expect(reopened).toMatchObject({ version: 4, completedAt: null, createdAt: task.createdAt });
    await alice.agent.delete(`/api/tasks/${task.id}`).send({ ...alice.envelope(), version: 3 }).expect(409);
    await alice.agent.delete(`/api/tasks/${task.id}`).send({ ...alice.envelope(), version: 4 }).expect(200);
    expect((await alice.agent.post('/api/commands').send(body)).body).toEqual(original);
    expect((await alice.agent.get(`/api/conversations/${alice.conversationId}/messages`)).body.messages).toEqual(original.messages);
    expect(db.pragma('foreign_key_check')).toEqual([]);
    db.close();
    const next = openDatabase(path); connections.push(next);
    const session = request.agent(testApp(next));
    await session.post('/api/auth/login').send({ username: 'alice', password: 'test-password-123' }).expect(200);
    expect((await session.post('/api/commands').send(body).expect(201)).body).toEqual(original);
    expect((await session.get('/api/tasks')).body.tasks).toEqual([]);
    const newTask = (await session.post('/api/commands').send({ ...body, requestId: randomUUID() })).body.task;
    expect(newTask.id).toBeGreaterThan(task.id);
    expect(next.pragma('integrity_check')).toEqual([{ integrity_check: 'ok' }]);
  });
  it('deduplicates simultaneous/lost-response writes, rejects changed intent and rolls back a broken pair', async () => {
    const { app, db } = setup(), alice = await account(app, 'alice');
    const body = { ...alice.envelope(), text: 'Add a task to one intent' };
    const [a, b] = await Promise.all([alice.agent.post('/api/commands').send(body), alice.agent.post('/api/commands').send(body)]);
    expect(a.body).toEqual(b.body);
    expect(db.prepare('SELECT COUNT(*) FROM tasks').pluck().get()).toBe(1);
    expect(db.prepare('SELECT COUNT(*) FROM messages').pluck().get()).toBe(2);
    expect((await alice.agent.get(`/api/operations/${body.requestId}`)).body).toEqual(a.body);
    await alice.agent.post('/api/commands').send({ ...body, text: 'Add a task to changed' }).expect(409);
    const thread = (await alice.agent.post('/api/conversations').send({ requestId: randomUUID(), title: 'Second' })).body.conversation;
    await alice.agent.post('/api/commands').send({ ...body, conversationId: thread.id }).expect(409);
    db.exec("CREATE TRIGGER fail_reply BEFORE INSERT ON messages WHEN NEW.role='assistant' BEGIN SELECT RAISE(ABORT,'test failure'); END;");
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    await alice.agent.post('/api/commands').send({ ...body, requestId: randomUUID() }).expect(500);
    expect(db.prepare('SELECT COUNT(*) FROM tasks').pluck().get()).toBe(1);
    expect(db.prepare('SELECT COUNT(*) FROM operations').pluck().get()).toBe(2); // command + thread creation
    expect(JSON.stringify(spy.mock.calls)).not.toContain('one intent');
  });
  it('uses the same not-found policy for foreign/missing resources and scopes identical IDs to accounts', async () => {
    const { app } = setup(), alice = await account(app, 'alice'), bob = await account(app, 'bob');
    const payload = { ...alice.envelope(), text: 'Add a task to private' };
    const saved = (await alice.agent.post('/api/commands').send(payload)).body;
    const foreign = await bob.agent.get(`/api/tasks/${saved.task.id}`).expect(404);
    const absent = await bob.agent.get('/api/tasks/999').expect(404);
    expect(foreign.body).toEqual(absent.body);
    await bob.agent.patch(`/api/tasks/${saved.task.id}`).send({ ...bob.envelope(), version: 1, title: 'stolen' }).expect(404);
    await bob.agent.delete(`/api/tasks/${saved.task.id}`).send({ ...bob.envelope(), version: 1 }).expect(404);
    await bob.agent.get(`/api/conversations/${alice.conversationId}/messages`).expect(404);
    await bob.agent.get(`/api/operations/${payload.requestId}`).expect(404);
    await bob.agent.post('/api/commands').send({ ...payload, conversationId: bob.conversationId }).expect(201);
    await alice.agent.post('/api/commands').send({ ...alice.envelope(), conversationId: bob.conversationId, text: 'ordinary text' }).expect(404);
  });
  it('rejects invalid/extra fields without truncation and bounds/filter/searches task pages', async () => {
    const { app } = setup(), alice = await account(app, 'alice');
    for (const title of ['', ' '.repeat(5), 'a'.repeat(201)]) await alice.agent.post('/api/tasks').send({ ...alice.envelope(), title }).expect(400);
    for (const extra of [{ accountId: 99 }, { mode: 'demo' }, { requestId: 'invalid' }]) await alice.agent.post('/api/commands').send({ ...alice.envelope(), text: 'Add a task to safe', ...extra }).expect(400);
    await alice.agent.post('/api/commands').send({ ...alice.envelope(), text: `Add a task to ${'x'.repeat(201)}` }).expect(400);
    const one = (await alice.agent.post('/api/tasks').send({ ...alice.envelope(), title: 'one 100%' })).body.task;
    await alice.agent.post('/api/tasks').send({ ...alice.envelope(), title: 'two' });
    await alice.agent.patch(`/api/tasks/${one.id}`).send({ ...alice.envelope(), version: 1, status: 'completed' });
    const first = (await alice.agent.get('/api/tasks?limit=1')).body;
    expect(first.counts).toEqual({ open: 1, completed: 1, all: 2 });
    const second = (await alice.agent.get(`/api/tasks?limit=1&cursor=${first.nextCursor}`)).body;
    expect(second.tasks[0].id).toBe(one.id);
    expect((await alice.agent.get('/api/tasks?search=%25')).body.tasks).toHaveLength(1);
    expect((await alice.agent.get('/api/tasks?status=completed')).body.tasks[0].id).toBe(one.id);
    await alice.agent.get('/api/tasks?limit=101').expect(400);
    await alice.agent.patch(`/api/tasks/${one.id}`).send({ ...alice.envelope(), version: 2 }).expect(400);
  });
});

describe('Conversations and migrations', () => {
  it('keeps threads and stable cursor pages isolated while new messages arrive', async () => {
    const { app } = setup(), alice = await account(app, 'alice'), bob = await account(app, 'bob');
    const create = { requestId: randomUUID(), title: 'Second thread' };
    const thread = (await alice.agent.post('/api/conversations').send(create)).body.conversation;
    expect((await alice.agent.post('/api/conversations').send(create)).body.conversation).toEqual(thread);
    for (let i = 0; i < 4; i++) await alice.agent.post('/api/commands').send({ ...alice.envelope(), text: `ordinary ${i}` });
    const first = (await alice.agent.get(`/api/conversations/${alice.conversationId}/messages?limit=3`)).body;
    await alice.agent.post('/api/commands').send({ ...alice.envelope(), text: 'new between pages' });
    const all = [...first.messages]; let cursor = first.nextCursor;
    while (cursor) { const next = (await alice.agent.get(`/api/conversations/${alice.conversationId}/messages?limit=3&cursor=${cursor}`)).body; all.unshift(...next.messages); cursor = next.nextCursor; }
    expect(all).toHaveLength(8);
    expect(new Set(all.map(m => m.id)).size).toBe(8);
    expect(all.map(m => m.sequence)).toEqual([...all.map(m => m.sequence)].sort((a, b) => a - b));
    await alice.agent.get(`/api/conversations/${thread.id}/messages?cursor=${first.nextCursor}`).expect(400);
    await bob.agent.get(`/api/conversations/${bob.conversationId}/messages?cursor=${first.nextCursor}`).expect(400);
    expect((await alice.agent.get('/api/tasks')).body.tasks).toEqual([]);
    expect(all[1].kind).toBe('system_notice');
    expect(all[1].text).toContain('AI är inte ansluten');
    const archived = (await alice.agent.patch(`/api/conversations/${thread.id}`).send({ requestId: randomUUID(), version: 1, title: 'Nytt namn', status: 'archived' })).body.conversation;
    await alice.agent.post('/api/commands').send({ ...alice.envelope(), conversationId: thread.id, text: 'blocked' }).expect(409);
    await alice.agent.patch(`/api/conversations/${thread.id}`).send({ requestId: randomUUID(), version: archived.version, status: 'open' }).expect(200);
    await alice.agent.post('/api/commands').send({ ...alice.envelope(), conversationId: thread.id, text: 'in this thread' }).expect(201);
    expect((await alice.agent.get(`/api/conversations/${thread.id}/messages`)).body.messages).toHaveLength(2);
  });
  it('preserves schema 2 records exactly, reopens repeatedly, and rolls back a failed forward migration', () => {
    const dir = mkdtempSync(join(tmpdir(), 'jarvis-legacy-')); dirs.push(dir);
    const db = new Database(join(dir, 'legacy.db')); connections.push(db); db.pragma('foreign_keys=ON');
    // Extract only the two immutable SQL migrations from the verified base.
    const source = execFileSync('git', ['show', '6abfbb0572f526fa9ad7c52f429c74ea2c1226ff:server/db/migrations.ts'], { cwd: join(import.meta.dirname, '..'), encoding: 'utf8' });
    const sql = [...source.matchAll(/`([\s\S]*?)`/g)].map(m => m[1]!);
    db.exec('CREATE TABLE schema_migrations(version INTEGER PRIMARY KEY,applied_at TEXT NOT NULL)');
    sql.forEach((s, i) => { db.exec(s); db.prepare('INSERT INTO schema_migrations VALUES(?,?)').run(i + 1, 'old'); });
    db.exec("INSERT INTO accounts VALUES(1,'legacy','unused','old'); INSERT INTO tasks VALUES(11,1,'Original','open','old'); INSERT INTO messages(id,account_id,role,body,mode,created_at) VALUES('z',1,'assistant','Original reply','live','old'),('a',1,'user','Original text','live','old');");
    const before = db.prepare('SELECT * FROM messages ORDER BY sequence').all();
    db.exec('CREATE TABLE conversations(block TEXT)');
    expect(() => migrate(db)).toThrow();
    expect(db.prepare('SELECT MAX(version) FROM schema_migrations').pluck().get()).toBe(2);
    expect(db.prepare('SELECT * FROM tasks').get()).toEqual({ id: 11, account_id: 1, title: 'Original', status: 'open', created_at: 'old' });
    db.exec('DROP TABLE conversations'); migrate(db); migrate(db);
    expect(db.prepare('SELECT sequence,id,account_id,role,body,mode,created_at FROM messages ORDER BY sequence').all()).toEqual(before);
    expect(db.prepare('SELECT DISTINCT conversation_id,kind,operation_id FROM messages').all()).toEqual([{ conversation_id: 'legacy-1', kind: 'legacy', operation_id: null }]);
    expect(db.prepare('SELECT id,title,created_at FROM tasks').get()).toEqual({ id: 11, title: 'Original', created_at: 'old' });
    expect(db.pragma('foreign_key_check')).toEqual([]);
    expect(db.pragma('integrity_check')).toEqual([{ integrity_check: 'ok' }]);
  });
  it('regresses Swedish/English parsing and rejects excessive titles', () => {
    expect(parseTask('  Lägg till en uppgift att Granska JARVIS  ')).toBe('Granska JARVIS');
    expect(parseTask('Add task to review')).toBe('review');
    expect(parseTask('a normal message')).toBeNull();
    expect(() => parseTask('Add a task to ' + 'x'.repeat(201))).toThrow();
    expect(parseTask('Add a task to ' + 'x'.repeat(200))).toHaveLength(200);
  });
});

describe('HTTP trust boundaries', () => {
  it('enforces Origin, safe errors, no-store, JSON/body limits and login throttling', async () => {
    const { db } = setup();
    const app = createApp(db, { allowedOrigins: ['https://jarvis.example'] });
    const credentials = { username: 'alice', password: 'test-password-123' };
    await request(app).post('/api/auth/register').send(credentials).expect(403);
    await request(app).post('/api/auth/register').set('Origin', 'https://evil.example').send(credentials).expect(403);
    const agent = request.agent(app);
    await agent.post('/api/auth/register').set('Origin', 'https://jarvis.example').send(credentials).expect(201);
    const response = await agent.get('/api/tasks').expect(200);
    expect(response.headers['cache-control']).toBe('private, no-store');
    expect(response.headers['access-control-allow-origin']).toBeUndefined();
    await agent.post('/api/commands').set('Origin', 'https://jarvis.example').set('Sec-Fetch-Site', 'cross-site').send({}).expect(403);
    await agent.post('/api/commands').set('Origin', 'https://jarvis.example').set('Content-Type', 'application/json').send('{bad').expect(400);
    await agent.post('/api/commands').set('Origin', 'https://jarvis.example').send({ data: 'x'.repeat(34000) }).expect(413);
    for (let i = 0; i < 9; i++) await agent.post('/api/auth/login').set('Origin', 'https://jarvis.example').send({ ...credentials, password: 'incorrect-password' }).expect(401);
    const limited = await agent.post('/api/auth/login').set('Origin', 'https://jarvis.example').send(credentials).expect(429);
    expect(Number(limited.headers['retry-after'])).toBeGreaterThan(0);
    expect(JSON.stringify(limited.body)).not.toMatch(/stack|SQL|\/workspace/);
  });
});
