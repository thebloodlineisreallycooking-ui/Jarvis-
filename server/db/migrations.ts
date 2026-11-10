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
  WHEN NEW.status NOT IN ('open') BEGIN SELECT RAISE(ABORT, 'Invalid task status'); END;`,
// Forward only: preserve legacy fields/sequence, without inventing old pairs.
`CREATE TABLE tasks_versioned (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  account_id INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  title TEXT NOT NULL CHECK(length(title) BETWEEN 1 AND 200),
  status TEXT NOT NULL DEFAULT 'open', created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL, completed_at TEXT,
  version INTEGER NOT NULL DEFAULT 1 CHECK(version > 0)
);
INSERT INTO tasks_versioned(id,account_id,title,status,created_at,updated_at)
  SELECT id,account_id,title,status,created_at,created_at FROM tasks;
DROP TABLE tasks;
ALTER TABLE tasks_versioned RENAME TO tasks;
CREATE TRIGGER tasks_status_insert BEFORE INSERT ON tasks
  WHEN NEW.status NOT IN ('open','completed') BEGIN SELECT RAISE(ABORT, 'Invalid task status'); END;
CREATE TRIGGER tasks_status_update BEFORE UPDATE OF status ON tasks
  WHEN NEW.status NOT IN ('open','completed') BEGIN SELECT RAISE(ABORT, 'Invalid task status'); END;
CREATE TABLE conversations (
  account_id INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  id TEXT NOT NULL, title TEXT NOT NULL CHECK(length(title) BETWEEN 1 AND 100),
  status TEXT NOT NULL DEFAULT 'open' CHECK(status IN ('open','archived')),
  created_at TEXT NOT NULL, updated_at TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 1 CHECK(version > 0), PRIMARY KEY(account_id,id)
);
INSERT INTO conversations(account_id,id,title,created_at,updated_at)
  SELECT id,'legacy-' || id,'Tidigare samtal',created_at,created_at FROM accounts;
CREATE TABLE operations (
  account_id INTEGER NOT NULL, id TEXT NOT NULL, conversation_id TEXT NOT NULL,
  mode TEXT NOT NULL CHECK(mode='live'), kind TEXT NOT NULL, payload TEXT NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('pending','succeeded','failed','cancelled','unknown')),
  result TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL,
  PRIMARY KEY(account_id,id),
  FOREIGN KEY(account_id,conversation_id) REFERENCES conversations(account_id,id) ON DELETE CASCADE
);
CREATE TABLE messages_threaded (
  sequence INTEGER PRIMARY KEY AUTOINCREMENT, id TEXT NOT NULL UNIQUE,
  account_id INTEGER NOT NULL, role TEXT NOT NULL, body TEXT NOT NULL,
  mode TEXT NOT NULL CHECK(mode='live'), created_at TEXT NOT NULL,
  conversation_id TEXT NOT NULL, operation_id TEXT,
  kind TEXT NOT NULL CHECK(kind IN ('user_input','command_result','system_notice','provider_response','legacy')),
  delivery TEXT NOT NULL DEFAULT 'complete' CHECK(delivery IN ('complete','interrupted')),
  FOREIGN KEY(account_id,conversation_id) REFERENCES conversations(account_id,id) ON DELETE CASCADE,
  FOREIGN KEY(account_id,operation_id) REFERENCES operations(account_id,id)
);
INSERT INTO messages_threaded(sequence,id,account_id,role,body,mode,created_at,conversation_id,kind)
  SELECT sequence,id,account_id,role,body,mode,created_at,'legacy-' || account_id,'legacy' FROM messages;
DROP TABLE messages;
ALTER TABLE messages_threaded RENAME TO messages;
CREATE INDEX messages_conversation_sequence ON messages(account_id,conversation_id,sequence);
CREATE INDEX tasks_account_id ON tasks(account_id,id);
CREATE INDEX operations_pending ON operations(status) WHERE status='pending';`
];
export function migrate(db: Database.Database) { db.exec('CREATE TABLE IF NOT EXISTS schema_migrations (version INTEGER PRIMARY KEY, applied_at TEXT NOT NULL)'); const current = (db.prepare('SELECT COALESCE(MAX(version),0) version FROM schema_migrations').get() as {version:number}).version; const apply = db.transaction(() => { migrations.forEach((sql, index) => { const version=index+1; if(version>current){ db.exec(sql); db.prepare('INSERT INTO schema_migrations VALUES (?,?)').run(version,new Date().toISOString()); } }); }); apply(); }
