import { describe, it, expect, afterEach } from 'vitest';
import request from 'supertest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type Database from 'better-sqlite3';
import { openDatabase } from '../server/db/database';
import { provisionProductionOwner } from '../server/app';
import { account, testApp } from './helpers';
const dirs: string[] = [], databases: Database.Database[] = [];
function setup() { const dir = mkdtempSync(join(tmpdir(), 'jarvis-')); dirs.push(dir); const path = join(dir, 'data.db'); const db = openDatabase(path); databases.push(db); return { path, db, app: testApp(db) }; }
afterEach(() => { databases.splice(0).forEach(db => { if (db.open) db.close(); }); dirs.splice(0).forEach(dir => rmSync(dir, { recursive: true, force: true })); });
describe('Phase A persistence boundary', () => {
  it('persists a live task across database restart and isolates accounts', async () => {
    const s = setup(), alice = await account(s.app, 'alice');
    await alice.agent.post('/api/commands').send({ ...alice.envelope(), text: 'Add a task to review JARVIS' }).expect(201);
    s.db.close(); const db = openDatabase(s.path); databases.push(db); const app = testApp(db), again = request.agent(app);
    await again.post('/api/auth/login').send({ username: 'alice', password: 'test-password-123' }).expect(200);
    expect((await again.get('/api/tasks')).body.tasks[0].title).toBe('review JARVIS');
    const bob = await account(app, 'bob'); expect((await bob.agent.get('/api/tasks')).body.tasks).toEqual([]);
  });
  it('refuses Demo through the Live API without writing any Live tables', async () => {
    const s = setup(), user = await account(s.app, 'demo_user');
    await user.agent.post('/api/commands').send({ ...user.envelope(), text: 'Add a task to review JARVIS', mode: 'demo' }).expect(400);
    for (const table of ['tasks', 'messages', 'operations']) expect(s.db.prepare(`SELECT COUNT(*) FROM ${table}`).pluck().get()).toBe(0);
  });
});
describe('Production access boundary', () => {
  it('provisions one owner once, preserves password, disables registration and hardens cookies', async () => {
    const previous = { node: process.env.NODE_ENV, user: process.env.JARVIS_OWNER_USERNAME, password: process.env.JARVIS_OWNER_PASSWORD };
    process.env.NODE_ENV = 'production'; process.env.JARVIS_OWNER_USERNAME = 'private_owner'; process.env.JARVIS_OWNER_PASSWORD = 'unique-owner-pass';
    try {
      const s = setup(); provisionProductionOwner(s.db); provisionProductionOwner(s.db);
      expect(s.db.prepare('SELECT username FROM accounts').all()).toEqual([{ username: 'private_owner' }]);
      expect(s.db.prepare('SELECT COUNT(*) FROM conversations').pluck().get()).toBe(1);
      process.env.JARVIS_OWNER_PASSWORD = 'different-owner-password'; provisionProductionOwner(s.db);
      const agent = request.agent(s.app);
      await agent.post('/api/auth/register').send({ username: 'intruder', password: 'strong-pass-123' }).expect(404);
      const login = await agent.post('/api/auth/login').send({ username: 'private_owner', password: 'unique-owner-pass' }).expect(200);
      expect(login.headers['set-cookie']?.[0]).toMatch(/HttpOnly; Secure; SameSite=Strict/);
      await agent.get('/api/health').expect(200, { status: 'ok' });
    } finally {
      for (const [name, value] of Object.entries({ NODE_ENV: previous.node, JARVIS_OWNER_USERNAME: previous.user, JARVIS_OWNER_PASSWORD: previous.password })) { if (value === undefined) delete process.env[name]; else process.env[name] = value; }
    }
  });
});
