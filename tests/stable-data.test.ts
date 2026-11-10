import { afterEach, describe, expect, it, vi } from 'vitest';
import Database from 'better-sqlite3';
import request from 'supertest';
import { mkdtempSync, rmSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { openDatabase } from '../server/db/database';
import { account, testApp } from './helpers';
const databases: Database.Database[] = [], directories: string[] = [];
afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); databases.splice(0).forEach(db => { if (db.open) db.close(); }); directories.splice(0).forEach(dir => rmSync(dir, { recursive: true, force: true })); });
function setup() { const dir = mkdtempSync(join(tmpdir(), 'jarvis-stability-')); directories.push(dir); const path = join(dir, 'test.db'); const db = openDatabase(path); databases.push(db); return { db, path, app: testApp(db) }; }
describe('Stable message persistence', () => {
  it('preserves client error status for invalid or oversized request JSON', async () => {
    const { app } = setup();
    await request(app).post('/api/auth/login').set('Content-Type', 'application/json').send('{broken').expect(400);
    await request(app).post('/api/auth/login').send({ data: 'x'.repeat(34000) }).expect(413);
  });
  it('returns the exact command pair at identical timestamps and preserves order after restart', async () => {
    const { db, path, app } = setup(), alice = await account(app, 'alice'), bob = await account(app, 'bob');
    vi.useFakeTimers({ toFake: ['Date'] }); vi.setSystemTime(new Date('2026-11-10T12:00:00Z'));
    const expected: { id: string }[] = [];
    for (let i = 0; i < 12; i++) {
      const text = `Add a task to exact task ${i}`, result = await alice.agent.post('/api/commands').send({ ...alice.envelope(), text }).expect(201);
      expect(result.body.messages.map((m: { role: string }) => m.role)).toEqual(['user', 'assistant']);
      expect(result.body.messages[0].text).toBe(text); expect(result.body.messages[1].text).toBe(`Task added: exact task ${i}`); expected.push(...result.body.messages);
    }
    db.prepare("UPDATE messages SET created_at='2099-01-01T00:00:00Z' WHERE sequence<=2").run();
    const last = await alice.agent.post('/api/commands').send({ ...alice.envelope(), text: 'Lägg till en uppgift att testa' }).expect(201);
    expect(last.body.messages.map((m: { text: string }) => m.text)).toEqual(['Lägg till en uppgift att testa', 'Task added: testa']);
    expect((await bob.agent.get(`/api/conversations/${bob.conversationId}/messages`)).body.messages).toEqual([]);
    const before = (await alice.agent.get(`/api/conversations/${alice.conversationId}/messages`)).body.messages;
    expect(before.map((m: { id: string }) => m.id)).toEqual([...expected, ...last.body.messages].map(m => m.id));
    db.close(); const reopened = openDatabase(path); databases.push(reopened); const again = request.agent(testApp(reopened));
    await again.post('/api/auth/login').send({ username: 'alice', password: 'test-password-123' }).expect(200);
    expect((await again.get(`/api/conversations/${alice.conversationId}/messages`)).body.messages).toEqual(before);
    expect((await again.get('/api/tasks')).body.tasks).toHaveLength(13);
  });
  it('migrates legacy rows without loss, fabricated pairs or rewriting unknown task status', () => {
    const dir = mkdtempSync(join(tmpdir(), 'jarvis-v1-')); directories.push(dir); const path = join(dir, 'legacy.db');
    const legacy = new Database(path);
    const source = execFileSync('git', ['show', 'a21a3a9:server/db/migrations.ts'], { cwd: join(import.meta.dirname, '..'), encoding: 'utf8' });
    legacy.exec(source.match(/`([\s\S]*?)`/)![1]!);
    legacy.exec("CREATE TABLE schema_migrations(version INTEGER PRIMARY KEY,applied_at TEXT); INSERT INTO schema_migrations VALUES(1,'old'); INSERT INTO accounts VALUES(1,'legacy','unused','old'); INSERT INTO tasks VALUES(1,1,'Legacy','unexpected-status','old'); INSERT INTO messages VALUES('z',1,'assistant','Legacy first','live','old'),('a',1,'user','Legacy second','live','old');");
    const rows = legacy.prepare('SELECT * FROM messages ORDER BY rowid').all(); legacy.close();
    const db = openDatabase(path); databases.push(db);
    expect(db.prepare('SELECT id,account_id,role,body,mode,created_at FROM messages ORDER BY sequence').all()).toEqual(rows);
    expect(db.prepare('SELECT status FROM tasks').get()).toEqual({ status: 'unexpected-status' });
    expect(db.prepare('SELECT version FROM schema_migrations ORDER BY version').all()).toEqual([{ version: 1 }, { version: 2 }, { version: 3 }]);
    db.close(); const twice = openDatabase(path); databases.push(twice);
    expect(twice.prepare('SELECT sequence,id FROM messages ORDER BY sequence').all()).toEqual([{ sequence: 1, id: 'z' }, { sequence: 2, id: 'a' }]);
  });
  it('does not change Live data or sequence when rejecting Demo on the server', async () => {
    const { db, app } = setup(), user = await account(app, 'demo_check');
    await user.agent.post('/api/commands').send({ ...user.envelope(), text: 'Add a task to persist' }).expect(201);
    const snapshot = () => ['tasks', 'messages', 'sqlite_sequence', 'operations'].map(table => db.prepare(`SELECT * FROM ${table}`).all()); const before = snapshot();
    for (let i = 0; i < 3; i++) await user.agent.post('/api/commands').send({ ...user.envelope(), text: 'Add a task to preview', mode: 'demo' }).expect(400);
    expect(snapshot()).toEqual(before);
    expect(() => db.prepare("UPDATE messages SET mode='demo'").run()).toThrow();
  });
  it('validates stored status instead of silently claiming open', async () => {
    const { db, app } = setup(), user = await account(app, 'status_check');
    await user.agent.post('/api/commands').send({ ...user.envelope(), text: 'Add a task to check status' }).expect(201);
    expect((await user.agent.get('/api/tasks')).body.tasks[0].status).toBe('open');
    expect(() => db.prepare("UPDATE tasks SET status='invalid'").run()).toThrow('Invalid task status');
    expect(() => db.prepare("INSERT INTO tasks(account_id,title,status,created_at,updated_at) VALUES(1,'bad','invalid','today','today')").run()).toThrow('Invalid task status');
    db.exec("DROP TRIGGER tasks_status_update; UPDATE tasks SET status='legacy-unknown'"); vi.spyOn(console, 'warn').mockImplementation(() => {});
    await user.agent.get('/api/tasks').expect(500); expect(db.prepare('SELECT status FROM tasks').get()).toEqual({ status: 'legacy-unknown' });
  });
});
