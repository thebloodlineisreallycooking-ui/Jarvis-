// Runtime-only operations. No application/server/migration imports.
import { createHash, randomUUID } from 'node:crypto';
import { createReadStream, constants, chmodSync, closeSync, copyFileSync, existsSync, fsyncSync, lstatSync, mkdirSync, openSync, readFileSync, readdirSync, readlinkSync, realpathSync, renameSync, statfsSync, statSync, unlinkSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join, resolve } from 'node:path';

export const SERVICE_ID = 'srv-db1vle3bc2fs73em1t30';
export const BASE_COMMIT = 'a21a3a9b4877ce31afc8eec28ae5557854f01b01';
const tables = ['accounts', 'sessions', 'tasks', 'messages', 'schema_migrations'];
const idPattern = /^backup-[a-f0-9-]{36}$/;
const check = (condition, message) => { if (!condition) throw new Error(message); };

export function configuration(root, commit, serviceId = SERVICE_ID) {
  return { root, db: join(root, 'jarvis.db'), ops: join(root, 'jarvis-ops'), backups: join(root, 'jarvis-backups'), controlFile: join(root, 'jarvis-ops/control.json'), procRoot: '/proc', commit, serviceId };
}
export function productionConfiguration() {
  check(process.env.RENDER_SERVICE_ID === SERVICE_ID, 'Wrong Render service');
  check(process.env.DATABASE_PATH === '/var/data/jarvis.db', 'DATABASE_PATH must be /var/data/jarvis.db');
  check(typeof process.env.JARVIS_OWNER_USERNAME === 'string' && process.env.JARVIS_OWNER_USERNAME.trim().length > 0, 'Existing owner configuration is required');
  check(/^[a-f0-9]{40}$/.test(process.env.RENDER_GIT_COMMIT ?? ''), 'Missing deployed commit');
  check(process.platform === 'linux', 'Linux runtime required');
  check(readFileSync('/proc/self/mountinfo', 'utf8').split('\n').some(line => line.split(' ')[4] === '/var/data'), '/var/data must be a mounted disk');
  check(realpathSync('/var/data') === '/var/data', 'Unexpected disk path');
  const [major, minor] = process.versions.node.split('.').map(Number);
  check(major >= 20 && major < 25 && (major !== 20 || minor >= 19), 'Unsupported Node version');
  return configuration('/var/data', process.env.RENDER_GIT_COMMIT);
}
export function loadDatabase() {
  // Works with pinned operations files on /var/data and either old/new app code.
  return createRequire(resolve('package.json'))('better-sqlite3');
}
export function privateDirectory(path) {
  mkdirSync(path, { recursive: true, mode: 0o700 });
  const info = lstatSync(path);
  check(info.isDirectory() && !info.isSymbolicLink() && info.uid === process.getuid(), 'Unsafe private directory');
  chmodSync(path, 0o700);
}
function regularFile(path) {
  const info = lstatSync(path);
  check(info.isFile() && !info.isSymbolicLink() && info.nlink === 1, 'Expected a regular file with one hard link');
  return info;
}
function syncFile(path) { const fd = openSync(path, 'r'); try { fsyncSync(fd); } finally { closeSync(fd); } }
function syncDirectory(path) { syncFile(path); }
function writeJson(path, value) {
  const temp = `${path}.${randomUUID()}.tmp`;
  writeFileSync(temp, JSON.stringify(value, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
  syncFile(temp); renameSync(temp, path); syncDirectory(dirname(path));
}
export async function hashFile(path) {
  const hash = createHash('sha256');
  for await (const chunk of createReadStream(path)) hash.update(chunk);
  return hash.digest('hex');
}
export function runtimeStatus(config) {
  const disk = statfsSync(config.root, { bigint: true });
  return { serviceId: config.serviceId, deployedCommit: config.commit, node: process.version,
    databasePath: config.db, availableBytes: String(disk.bavail * disk.bsize),
    applicationStarted: false, restorePending: existsSync(join(config.ops, 'restore-pending.json')) };
}
export function assertNoDatabaseUsers(config) {
  // Render replaces the old disk-backed instance before this maintenance start.
  // Additionally refuse any same-user process still holding the DB or sidecars.
  check(process.platform === 'linux', 'Cannot verify open database files');
  const targets = ['', '-wal', '-shm', '-journal'].map(suffix => config.db + suffix);
  const inodes = targets.filter(existsSync).map(path => statSync(path)).map(s => `${s.dev}:${s.ino}`);
  for (const pid of readdirSync(config.procRoot).filter(name => /^\d+$/.test(name))) {
    try {
      const status = readFileSync(`${config.procRoot}/${pid}/status`, 'utf8');
      const uid = Number(status.match(/^Uid:\s+(\d+)/m)?.[1]);
      if (uid !== process.getuid()) continue;
      for (const fd of readdirSync(`${config.procRoot}/${pid}/fd`)) {
        try {
          const path = `${config.procRoot}/${pid}/fd/${fd}`;
          const link = readlinkSync(path).replace(/ \(deleted\)$/, '');
          if (targets.includes(link)) throw new Error('A process still has the database open');
          const info = statSync(path);
          if (inodes.includes(`${info.dev}:${info.ino}`)) throw new Error('A process still has the database open');
        } catch (error) { if (error.code !== 'ENOENT' && error.code !== 'ESRCH') throw error; }
      }
    } catch (error) { if (error.code !== 'ENOENT' && error.code !== 'ESRCH') throw error; }
  }
}
function inspect(db) {
  check(JSON.stringify(db.pragma('integrity_check')) === JSON.stringify([{ integrity_check: 'ok' }]), 'SQLite integrity check failed');
  check(db.pragma('foreign_key_check').length === 0, 'SQLite foreign key check failed');
  const schema = db.prepare('SELECT MAX(version) FROM schema_migrations').pluck().get();
  check(schema === 1 || schema === 2, 'Unexpected database schema');
  return { schema, counts: Object.fromEntries(tables.map(table => [table, db.prepare(`SELECT COUNT(*) FROM ${table}`).pluck().get()])),
    unsupportedStatuses: db.prepare("SELECT COUNT(*) FROM tasks WHERE status NOT IN ('open')").pluck().get() };
}
function requireSpace(config, required) {
  const disk = statfsSync(config.root, { bigint: true });
  check(disk.bavail * disk.bsize >= BigInt(required), 'Insufficient disk space; no automatic resize');
}
export async function createBackup(config, Database, { release = true, expectedOwner } = {}) {
  check(!existsSync(join(config.ops, 'restore-pending.json')), 'Complete the pending restore first');
  if (release) check(config.commit === BASE_COMMIT, 'Pre-release backup requires the known old commit');
  const size = ['', '-wal', '-shm'].map(s => config.db + s).filter(existsSync).reduce((n, p) => n + regularFile(p).size, 0);
  // Conservative headroom for backup, restoration staging, migration table/index/WAL.
  requireSpace(config, 64 * 1024 * 1024 + 4 * size);
  regularFile(config.db);
  privateDirectory(config.backups);
  const id = `backup-${randomUUID()}`;
  const folder = join(config.backups, id);
  privateDirectory(folder);
  const path = join(folder, 'snapshot.db');
  const source = new Database(config.db, { readonly: true, fileMustExist: true });
  let summary;
  try {
    const version = source.pragma('data_version', { simple: true });
    summary = inspect(source);
    if (release) {
      check(summary.schema === 1 && summary.unsupportedStatuses === 0, 'Release preflight failed: schema or task status');
      if (expectedOwner !== undefined) check(summary.counts.accounts === 1 && source.prepare('SELECT username FROM accounts').pluck().get() === expectedOwner.trim().toLowerCase(), 'Existing owner does not match configuration');
    }
    await source.backup(path);
    check(source.pragma('data_version', { simple: true }) === version, 'Source changed during backup; keep writes stopped and create a fresh backup');
  } finally { source.close(); }
  chmodSync(path, 0o600);
  const copy = new Database(path, { fileMustExist: true });
  try {
    check(JSON.stringify(inspect(copy)) === JSON.stringify(summary), 'Backup validation mismatch');
    check(copy.pragma('journal_mode = DELETE', { simple: true }) === 'delete', 'Backup journal normalization failed');
  } finally { copy.close(); }
  check(!['-wal', '-shm', '-journal'].some(s => existsSync(path + s)), 'Backup is not self-contained');
  syncFile(path);
  const sha256 = await hashFile(path);
  const manifest = { format: 1, id, createdAt: new Date().toISOString(), serviceId: config.serviceId, sourceCommit: config.commit,
    sourcePath: config.db, ...summary, bytes: statSync(path).size, sha256 };
  writeJson(join(folder, 'manifest.json'), manifest);
  chmodSync(path, 0o400); chmodSync(join(folder, 'manifest.json'), 0o400);
  syncDirectory(folder); syncDirectory(config.backups);
  return { id, sha256, bytes: manifest.bytes, schema: summary.schema };
}
export async function verifyBackup(config, Database, id) {
  check(idPattern.test(id), 'Invalid backup ID');
  const folder = join(config.backups, id);
  check(realpathSync(folder) === folder, 'Unexpected backup location');
  const path = join(folder, 'snapshot.db');
  const manifestPath = join(folder, 'manifest.json');
  regularFile(path); regularFile(manifestPath);
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  check(manifest.format === 1 && manifest.id === id && manifest.serviceId === config.serviceId && manifest.sourcePath === config.db, 'Wrong backup identity');
  check(!['-wal', '-shm', '-journal'].some(s => existsSync(path + s)), 'Backup has sidecars');
  check(statSync(path).size === manifest.bytes && await hashFile(path) === manifest.sha256, 'Backup checksum mismatch');
  const db = new Database(path, { readonly: true, fileMustExist: true });
  try {
    check(db.pragma('journal_mode', { simple: true }) === 'delete', 'Backup is not a single-file snapshot');
    const summary = inspect(db);
    check(summary.schema === manifest.schema && summary.unsupportedStatuses === manifest.unsupportedStatuses && JSON.stringify(summary.counts) === JSON.stringify(manifest.counts), 'Backup manifest mismatch');
  } finally { db.close(); }
  return { path, manifest };
}
export async function restoreBackup(config, Database, id, onStep = () => {}) {
  const { path, manifest } = await verifyBackup(config, Database, id);
  check(manifest.schema === 1 && manifest.sourceCommit === BASE_COMMIT, 'Old-code restore requires the schema-1 baseline backup');
  privateDirectory(config.ops);
  const journal = join(config.ops, 'restore-pending.json');
  let state;
  if (existsSync(journal)) {
    regularFile(journal);
    state = JSON.parse(readFileSync(journal, 'utf8'));
    check(state.id === id && state.sha256 === manifest.sha256 && /^[a-f0-9-]{36}$/.test(state.operation), 'Resume the original pending restore only');
  } else {
    requireSpace(config, manifest.bytes + 64 * 1024 * 1024);
    const operation = randomUUID();
    const staged = join(config.root, `.jarvis-restore-${operation}.db`);
    copyFileSync(path, staged, constants.COPYFILE_EXCL); chmodSync(staged, 0o600); syncFile(staged);
    check(await hashFile(staged) === manifest.sha256, 'Staged restore checksum mismatch');
    state = { id, sha256: manifest.sha256, operation, originals: ['', '-wal', '-shm', '-journal'].filter(s => existsSync(config.db + s)) };
    writeJson(journal, state);
    onStep('prepared');
  }
  const staged = join(config.root, `.jarvis-restore-${state.operation}.db`);
  const quarantine = join(config.ops, `quarantine-${state.operation}`);
  privateDirectory(quarantine);
  for (const suffix of state.originals) {
    check(['', '-wal', '-shm', '-journal'].includes(suffix), 'Invalid recovery journal');
    const current = config.db + suffix, saved = join(quarantine, `jarvis.db${suffix}`);
    if (!existsSync(saved)) {
      regularFile(current); renameSync(current, saved);
      syncDirectory(config.root); syncDirectory(quarantine);
      onStep(`quarantined${suffix}`);
    } else if (existsSync(current)) {
      check(suffix === '' && !existsSync(staged) && await hashFile(current) === manifest.sha256, 'Unexpected file appeared during restore');
    }
  }
  check(!['-wal', '-shm', '-journal'].some(s => existsSync(config.db + s)), 'Old database sidecars remain');
  if (existsSync(staged)) {
    check(!existsSync(config.db), 'Refusing to overwrite an unexpected database');
    check(await hashFile(staged) === manifest.sha256, 'Staged snapshot changed');
    renameSync(staged, config.db); syncDirectory(config.root);
    onStep('installed');
  }
  check(await hashFile(config.db) === manifest.sha256, 'Restored checksum mismatch');
  const restored = new Database(config.db, { readonly: true, fileMustExist: true });
  try { check(inspect(restored).schema === 1, 'Restored schema mismatch'); } finally { restored.close(); }
  writeJson(join(quarantine, 'restore-complete.json'), { id, sha256: manifest.sha256, completedAt: new Date().toISOString() });
  unlinkSync(journal); syncDirectory(config.ops);
  return { restored: true, id, schema: 1, requiredCodeCommit: BASE_COMMIT, applicationStarted: false };
}
