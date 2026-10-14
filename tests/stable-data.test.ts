import { afterEach, describe, expect, it, vi } from 'vitest';
import Database from 'better-sqlite3';
import request from 'supertest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { openDatabase } from '../server/db/database';
import { createApp } from '../server/app';

const databases: Database.Database[] = [];
const directories: string[] = [];
afterEach(() => {
  vi.useRealTimers();
  databases.splice(0).forEach(db => { if (db.open) db.close(); });
  directories.splice(0).forEach(dir => rmSync(dir, { recursive: true, force: true }));
});
function setup() {
  const directory = mkdtempSync(join(tmpdir(), 'jarvis-stability-'));
  directories.push(directory);
  const path = join(directory, 'test.db');
  const db = openDatabase(path);
  databases.push(db);
  return { db, path, app: createApp(db) };
}
async function account(app: ReturnType<typeof createApp>, username: string) {
  const agent = request.agent(app);
  await agent.post('/api/auth/register').send({ username, password: 'test-password-123' }).expect(201);
  return agent;
}

describe('Stable message persistence', () => {
  it('preserves client error status for invalid or oversized request JSON', async () => {
    const { app } = setup();
    await request(app).post('/api/auth/login').set('Content-Type', 'application/json').send('{broken').expect(400);
    await request(app).post('/api/auth/login').send({ data: 'x'.repeat(34000) }).expect(413);
  });
  it('returns the exact command pair at identical timestamps and preserves order after restart', async () => {
    const { db, path, app } = setup();
    const alice = await account(app, 'alice');
    const bob = await account(app, 'bob');
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-10-13T12:00:00Z'));
    const expected = [];
    for (let i = 0; i < 12; i++) {
      const text = `Add a task to exact task ${i}`;
      const result = await alice.post('/api/commands').send({ text, mode: 'live' }).expect(201);
      expect(result.body.messages.map((m: { role: string }) => m.role)).toEqual(['user', 'assistant']);
      expect(result.body.messages[0].text).toBe(text);
      expect(result.body.messages[1].text).toBe(`Task added: exact task ${i}`);
      expected.push(...result.body.messages);
    }
    // A future-dated older row must not be mistaken for the current response.
    db.prepare("UPDATE messages SET created_at='2099-01-01T00:00:00Z' WHERE sequence<=2").run();
    const last = await alice.post('/api/commands').send({ text: 'Lägg till en uppgift att testa', mode: 'live' }).expect(201);
    expect(last.body.messages.map((m: { text: string }) => m.text)).toEqual(['Lägg till en uppgift att testa', 'Task added: testa']);
    expect((await bob.get('/api/messages').expect(200)).body.messages).toEqual([]);
    const before = (await alice.get('/api/messages').expect(200)).body.messages;
    expect(before.map((m: { id: string }) => m.id)).toEqual([...expected, ...last.body.messages].map(m => m.id));
    db.close();
    const reopened = openDatabase(path);
    databases.push(reopened);
    const again = request.agent(createApp(reopened));
    await again.post('/api/auth/login').send({ username: 'alice', password: 'test-password-123' }).expect(200);
    expect((await again.get('/api/messages').expect(200)).body.messages).toEqual(before);
    expect((await again.get('/api/tasks').expect(200)).body.tasks).toHaveLength(13);
  });

  it('migrates legacy rows without losing data and does not invent role-based history', async () => {
    const { db, path } = setup();
    // Recreate the original v1 message table and migration marker as a legacy fixture.
    db.exec(`DROP TRIGGER tasks_status_insert; DROP TRIGGER tasks_status_update;
      DROP TABLE messages;
      CREATE TABLE messages (id TEXT PRIMARY KEY, account_id INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
        role TEXT NOT NULL, body TEXT NOT NULL, mode TEXT NOT NULL CHECK(mode='live'), created_at TEXT NOT NULL);
      DELETE FROM schema_migrations WHERE version>1;
      INSERT INTO accounts VALUES(1,'legacy','unused-hash','2026-10-01');
      INSERT INTO tasks VALUES(1,1,'Legacy task','unexpected-status','2026-10-01');
      INSERT INTO messages VALUES('z',1,'assistant','Legacy first','live','2026-10-01');
      INSERT INTO messages VALUES('a',1,'user','Legacy second','live','2026-10-01');`);
    const rows = db.prepare('SELECT * FROM messages ORDER BY rowid').all();
    db.close();
    const reopened = openDatabase(path);
    databases.push(reopened);
    expect(reopened.prepare('SELECT id,account_id,role,body,mode,created_at FROM messages ORDER BY sequence').all()).toEqual(rows);
    expect(reopened.prepare('SELECT status FROM tasks').get()).toEqual({ status: 'unexpected-status' });
    expect(reopened.prepare('SELECT version FROM schema_migrations ORDER BY version').all()).toEqual([{ version: 1 }, { version: 2 }]);
    reopened.close();
    const twice = openDatabase(path);
    databases.push(twice);
    expect(twice.prepare('SELECT sequence,id FROM messages ORDER BY sequence').all()).toEqual([{ sequence: 1, id: 'z' }, { sequence: 2, id: 'a' }]);
  });

  it('does not change any Live data or sequence when running Demo', async () => {
    const { db, app } = setup();
    const user = await account(app, 'demo_check');
    await user.post('/api/commands').send({ text: 'Add a task to persist', mode: 'live' }).expect(201);
    const snapshot = () => ['tasks', 'messages', 'sqlite_sequence'].map(table => db.prepare(`SELECT * FROM ${table}`).all());
    const before = snapshot();
    for (let i = 0; i < 3; i++) await user.post('/api/commands').send({ text: 'Add a task to preview', mode: 'demo' }).expect(200);
    expect(snapshot()).toEqual(before);
    expect(() => db.prepare("INSERT INTO messages(id,account_id,role,body,mode,created_at) VALUES('demo',1,'user','x','demo','today')").run()).toThrow();
  });

  it('validates stored status instead of silently claiming open', async () => {
    const { db, app } = setup();
    const user = await account(app, 'status_check');
    await user.post('/api/commands').send({ text: 'Add a task to check status', mode: 'live' }).expect(201);
    expect((await user.get('/api/tasks').expect(200)).body.tasks[0].status).toBe('open');
    expect(() => db.prepare("UPDATE tasks SET status='invalid'").run()).toThrow('Invalid task status');
    expect(() => db.prepare("INSERT INTO tasks(account_id,title,status,created_at) VALUES(1,'bad','invalid','today')").run()).toThrow('Invalid task status');
    db.exec("DROP TRIGGER tasks_status_update; UPDATE tasks SET status='legacy-unknown'");
    await user.get('/api/tasks').expect(500);
    expect(db.prepare('SELECT status FROM tasks').get()).toEqual({ status: 'legacy-unknown' });
  });
});
