// Synthetic, local-only rehearsal. Requires git history and npm ci --include=dev.
// Run: node --import tsx scripts/verify-recovery.mjs
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash, randomUUID } from 'node:crypto';
import { chmodSync, copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, statSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import Database from 'better-sqlite3';
import request from 'supertest';
import { openDatabase } from '../server/db/database.ts';
import { createApp } from '../server/app.ts';
import { configuration, createBackup, restoreBackup, SERVICE_ID, verifyBackup } from './ops/database.mjs';
import { startMaintenance } from './ops/maintenance.mjs';
import { operation } from './ops/client.mjs';

const base = 'a21a3a9b4877ce31afc8eec28ae5557854f01b01';
const repo = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const directory = mkdtempSync(join(tmpdir(), 'jarvis-recovery-'));
const connections = [];
let maintenance;
const environment = process.env.NODE_ENV;
process.env.NODE_ENV = 'test';
const track = db => { connections.push(db); return db; };
const hash = path => createHash('sha256').update(readFileSync(path)).digest('hex');
const snapshot = db => Object.fromEntries(['accounts', 'sessions', 'tasks', 'messages', 'schema_migrations'].map(table => [table, db.prepare(`SELECT * FROM ${table} ORDER BY rowid`).all()]));
const check = db => {
  assert.deepEqual(db.pragma('integrity_check'), [{ integrity_check: 'ok' }]);
  assert.deepEqual(db.pragma('foreign_key_check'), []);
};
try {
  // Read actual deployed source at a fixed commit; do not create another checkout.
  for (const file of ['server/app.ts', 'server/db/migrations.ts', 'shared/contracts.ts']) {
    const target = join(directory, 'old-source', file);
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, execFileSync('git', ['show', `${base}:${file}`], { cwd: repo }));
  }
  writeFileSync(join(directory, 'old-source/package.json'), '{"type":"module"}');
  symlinkSync(join(repo, 'node_modules'), join(directory, 'old-source/node_modules'), 'dir');
  const { migrate: oldMigrate } = await import(pathToFileURL(join(directory, 'old-source/server/db/migrations.ts')).href);
  const { createApp: oldApp } = await import(pathToFileURL(join(directory, 'old-source/server/app.ts')).href);
  const config = configuration(directory, base);
  // This executor restricts other processes' /proc entries even for root.
  // The fixture points to the real test process, which owns every live test DB.
  // Production always uses /proc and fails closed on inaccessible same-user FDs.
  config.procRoot = join(directory, 'proc-fixture');
  mkdirSync(config.procRoot);
  symlinkSync('/proc/self', join(config.procRoot, String(process.pid)), 'dir');
  const sourcePath = config.db;
  const source = track(new Database(sourcePath));
  source.pragma('foreign_keys = ON');
  source.pragma('journal_mode = WAL');
  source.pragma('wal_autocheckpoint = 0');
  oldMigrate(source);
  const password = randomUUID();
  const alice = request.agent(oldApp(source));
  const bob = request.agent(oldApp(source));
  await alice.post('/api/auth/register').send({ username: 'recovery_alice', password }).expect(201);
  await bob.post('/api/auth/register').send({ username: 'recovery_bob', password }).expect(201);
  await alice.post('/api/commands').send({ text: 'Add a task to retain Alice data', mode: 'live' }).expect(201);
  await bob.post('/api/commands').send({ text: 'Add a task to retain Bob data', mode: 'live' }).expect(201);
  const before = snapshot(source);
  assert.ok(statSync(`${sourcePath}-wal`).size > 0, 'Exercise committed WAL data with source connection still open');

  // No import of application startup/migrate on the backup source connection.
  // Use the production backup implementation, without its maintenance guard,
  // to retain the original rehearsal of committed WAL data in an open source.
  const walBackup = await createBackup(config, Database);
  const backupPath = join(config.backups, walBackup.id, 'snapshot.db');
  const backup = track(new Database(backupPath, { readonly: true, fileMustExist: true }));
  check(backup);
  assert.deepEqual(snapshot(backup), before, 'Backup includes accounts, sessions and committed WAL rows');
  assert.equal(backup.pragma('journal_mode', { simple: true }), 'delete');
  backup.close();
  assert.equal(existsSync(`${backupPath}-wal`), false);
  const backupHash = hash(backupPath);
  console.log('PASS: SQLite native backup of open WAL database preserves all five tables');

  maintenance = await startMaintenance(config, { port: 0, Database });
  const publicUrl = `http://127.0.0.1:${maintenance.publicServer.address().port}`;
  assert.deepEqual(await (await fetch(`${publicUrl}/api/health`)).json(), { status: 'maintenance', applicationStarted: false });
  for (const route of ['/', '/api/commands', '/operation', `/jarvis-backups/${walBackup.id}/snapshot.db`]) {
    assert.equal((await fetch(publicUrl + route, { method: 'POST' })).status, 503);
  }
  assert.equal(statSync(config.controlFile).mode & 0o777, 0o600);
  const localPort = JSON.parse(readFileSync(config.controlFile, 'utf8')).port;
  assert.equal((await fetch(`http://127.0.0.1:${localPort}/status`)).status, 401);
  assert.equal(maintenance.control.address().address, '127.0.0.1');
  assert.equal(statSync(config.ops).mode & 0o777, 0o700);
  await assert.rejects(operation(config.controlFile, 'backup', undefined, SERVICE_ID), /database open/);
  source.close();
  await assert.rejects(operation(config.controlFile, 'backup', undefined, 'wrong-service'), /confirmation required/);
  const stoppedBackup = await operation(config.controlFile, 'backup', undefined, SERVICE_ID);
  assert.equal((await operation(config.controlFile, 'verify', stoppedBackup.id, SERVICE_ID)).verified, true);
  assert.equal((await operation(config.controlFile, 'status')).applicationStarted, false);
  assert.equal(statSync(backupPath).mode & 0o777, 0o400);
  await assert.rejects(verifyBackup(config, Database, '../outside'), /Invalid backup ID/);
  await assert.rejects(createBackup(config, Database, { expectedOwner: 'not_the_owner' }), /owner does not match/);
  const corruptPath = join(config.backups, stoppedBackup.id, 'snapshot.db');
  chmodSync(corruptPath, 0o600);
  writeFileSync(corruptPath, 'synthetic damaged backup');
  await assert.rejects(operation(config.controlFile, 'restore', stoppedBackup.id, SERVICE_ID), /checksum mismatch/);
  console.log('PASS: maintenance exposes no app/data route; private control rejects open DB, wrong service, wrong owner, invalid ID and damaged backup');

  const candidatePath = sourcePath;
  copyFileSync(backupPath, candidatePath);
  chmodSync(candidatePath, 0o600);
  const candidate = track(openDatabase(candidatePath));
  check(candidate);
  for (const table of ['accounts', 'sessions', 'tasks']) {
    assert.deepEqual(candidate.prepare(`SELECT * FROM ${table} ORDER BY rowid`).all(), before[table]);
  }
  assert.deepEqual(candidate.prepare('SELECT id,account_id,role,body,mode,created_at FROM messages ORDER BY sequence').all(), before.messages);
  assert.equal(candidate.prepare('SELECT MAX(version) FROM schema_migrations').pluck().get(), 2);
  const incompatible = request.agent(oldApp(candidate));
  await incompatible.post('/api/auth/login').send({ username: 'recovery_alice', password }).expect(200);
  await incompatible.get('/api/health').expect(200); // Health alone misses this failure.
  const beforeFailure = snapshot(candidate);
  const failed = await incompatible.post('/api/commands').send({ text: 'Add a task to expose old code incompatibility', mode: 'live' }).expect(500);
  assert.ok(failed.text.length > 0);
  assert.deepEqual(snapshot(candidate), beforeFailure, 'Failed old-code command rolls its task transaction back');
  assert.throws(() => candidate.prepare('INSERT INTO messages VALUES(?,?,?,?,?,?)'), /7 columns but 6 values/);
  console.log('PASS: migration preserves rows; actual old server has healthy GET but fails Live writes on schema 2');

  const upgraded = request.agent(createApp(candidate));
  await upgraded.post('/api/auth/login').send({ username: 'recovery_alice', password }).expect(200);
  const added = await upgraded.post('/api/commands').send({ text: 'Add a task to represent a post-backup write', mode: 'live' }).expect(201);
  assert.deepEqual(added.body.messages.map(message => message.role), ['user', 'assistant']);
  const migratedRows = candidate.prepare('SELECT sequence,id FROM messages ORDER BY sequence').all();
  candidate.close();
  const reopened = track(openDatabase(candidatePath));
  assert.deepEqual(reopened.prepare('SELECT sequence,id FROM messages ORDER BY sequence').all(), migratedRows);
  reopened.close();

  // Leave committed WAL/SHM behind as an interrupted Node process would.
  execFileSync(process.execPath, ['-e', `
    const Database = require('better-sqlite3');
    const db = new Database(process.argv[1]);
    db.pragma('journal_mode = WAL');
    db.pragma('wal_autocheckpoint = 0');
    db.prepare("INSERT INTO tasks(account_id,title,status,created_at) VALUES(1,'synthetic crash write','open','2026-10-14T00:00:00.000Z')").run();
    process.exit(0);
  `, candidatePath], { cwd: repo });
  assert.ok(statSync(candidatePath + '-wal').size > 0);

  // Reuse the production offline restore. Interrupt after quarantining the DB,
  // restart maintenance, then resume through its private control endpoint. No app starts.
  assert.equal(hash(backupPath), backupHash, 'Original backup remains unchanged');
  await assert.rejects(restoreBackup(config, Database, walBackup.id, step => {
    if (step === 'quarantined') throw new Error('synthetic process interruption');
  }), /synthetic process interruption/);
  assert.equal(existsSync(candidatePath), false);
  assert.equal((await operation(config.controlFile, 'status')).restorePending, true);
  await assert.rejects(operation(config.controlFile, 'backup', undefined, SERVICE_ID), /pending restore/);
  await maintenance.close();
  maintenance = await startMaintenance(config, { port: 0, Database });
  const resumed = await operation(config.controlFile, 'restore', walBackup.id, SERVICE_ID);
  assert.deepEqual(resumed, { restored: true, id: walBackup.id, schema: 1, requiredCodeCommit: base, applicationStarted: false });
  assert.equal((await operation(config.controlFile, 'status')).restorePending, false);
  assert.equal(hash(candidatePath), backupHash);
  const restored = track(new Database(candidatePath));
  restored.pragma('foreign_keys = ON');
  restored.pragma('journal_mode = WAL');
  oldMigrate(restored);
  check(restored);
  assert.deepEqual(snapshot(restored), before, 'Offline restore returns exactly to the pre-release point');
  assert.equal(restored.prepare('SELECT COUNT(*) FROM tasks WHERE title=?').pluck().get('represent a post-backup write'), 0);
  const recoveredAlice = request.agent(oldApp(restored));
  const recoveredBob = request.agent(oldApp(restored));
  await recoveredAlice.post('/api/auth/login').send({ username: 'recovery_alice', password }).expect(200);
  await recoveredBob.post('/api/auth/login').send({ username: 'recovery_bob', password }).expect(200);
  assert.equal((await recoveredAlice.get('/api/tasks').expect(200)).body.tasks.length, 1);
  assert.equal((await recoveredBob.get('/api/tasks').expect(200)).body.tasks.length, 1);
  await recoveredAlice.post('/api/commands').send({ text: 'Add a task to prove recovered old writes', mode: 'live' }).expect(201);
  assert.equal((await recoveredBob.get('/api/tasks').expect(200)).body.tasks.length, 1);
  await assert.rejects(operation(config.controlFile, 'restore', walBackup.id, SERVICE_ID), /database open/);
  restored.close();
  // A crash after the atomic install must also resume without mixing generations.
  await assert.rejects(restoreBackup(config, Database, walBackup.id, step => {
    if (step === 'installed') throw new Error('synthetic installed interruption');
  }), /synthetic installed interruption/);
  assert.equal((await operation(config.controlFile, 'restore', walBackup.id, SERVICE_ID)).restored, true);
  assert.equal(hash(backupPath), backupHash);
  console.log('PASS: offline restore plus old source restores accounts/sessions/data and isolated Live writes');
  console.log('PASS: interrupted quarantine/install resume under maintenance; no application or migrations are started');
  console.log('PASS: restore discards post-backup writes; this requires a release write freeze or explicit loss/reconciliation decision');
  console.log(`Recovery rehearsal passed against baseline ${base}; synthetic temporary data only`);
} finally {
  connections.forEach(db => { if (db.open) db.close(); });
  if (maintenance) await maintenance.close();
  if (environment === undefined) delete process.env.NODE_ENV;
  else process.env.NODE_ENV = environment;
  rmSync(directory, { recursive: true, force: true });
}
