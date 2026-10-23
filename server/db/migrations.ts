import type Database from 'better-sqlite3';
const migrations = [
`CREATE TABLE accounts (id INTEGER PRIMARY KEY, username TEXT NOT NULL UNIQUE, password_hash TEXT NOT NULL, created_at TEXT NOT NULL); CREATE TABLE sessions (token_hash TEXT PRIMARY KEY, account_id INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE, expires_at TEXT NOT NULL); CREATE TABLE tasks (id INTEGER PRIMARY KEY, account_id INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE, title TEXT NOT NULL CHECK(length(title) BETWEEN 1 AND 200), status TEXT NOT NULL DEFAULT 'open', created_at TEXT NOT NULL); CREATE TABLE messages (id TEXT PRIMARY KEY, account_id INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE, role TEXT NOT NULL, body TEXT NOT NULL, mode TEXT NOT NULL CHECK(mode = 'live'), created_at TEXT NOT NULL);`,
// Legacy timestamp ties use their existing row order, not UUID order. This is a
// deterministic baseline, not a claim that the original chronology is known.
`CREATE TABLE messages_ordered (
  sequence INTEGER PRIMARY KEY AUTOINCREMENT,
  id TEXT NOT NULL UNIQUE,
  account_id INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  role TEXT NOT NULL,
  body TEXT NOT NULL,
  mode TEXT NOT NULL CHECK(mode = 'live'),
  created_at TEXT NOT NULL
);
INSERT INTO messages_ordered(id,account_id,role,body,mode,created_at)
  SELECT id,account_id,role,body,mode,created_at FROM messages ORDER BY created_at,rowid;
DROP TABLE messages;
ALTER TABLE messages_ordered RENAME TO messages;
CREATE INDEX messages_account_sequence ON messages(account_id,sequence);
CREATE TRIGGER tasks_status_insert BEFORE INSERT ON tasks
  WHEN NEW.status NOT IN ('open') BEGIN SELECT RAISE(ABORT, 'Invalid task status'); END;
CREATE TRIGGER tasks_status_update BEFORE UPDATE OF status ON tasks
  WHEN NEW.status NOT IN ('open') BEGIN SELECT RAISE(ABORT, 'Invalid task status'); END;`
];
export function migrate(db: Database.Database) { db.exec('CREATE TABLE IF NOT EXISTS schema_migrations (version INTEGER PRIMARY KEY, applied_at TEXT NOT NULL)'); const current = (db.prepare('SELECT COALESCE(MAX(version),0) version FROM schema_migrations').get() as {version:number}).version; const apply = db.transaction(() => { migrations.forEach((sql, index) => { const version=index+1; if(version>current){ db.exec(sql); db.prepare('INSERT INTO schema_migrations VALUES (?,?)').run(version,new Date().toISOString()); } }); }); apply(); }
