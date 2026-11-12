import type express from 'express';
import { randomBytes, scryptSync, timingSafeEqual, createHash } from 'node:crypto';
import type Database from 'better-sqlite3';
import { credentialsSchema } from '../shared/contracts.js';
import { input, rateLimit } from './http.js';
import { createDefaultConversation } from './domain/conversations.js';

const hashToken = (value: string) => createHash('sha256').update(value).digest('hex');
const hashPassword = (password: string, salt = randomBytes(16).toString('hex')) => `${salt}:${scryptSync(password, salt, 64).toString('hex')}`;
const verifyPassword = (password: string, hash: string) => {
  const [salt, key] = hash.split(':');
  if (!salt || !key || !/^[a-f0-9]{128}$/.test(key)) return false;
  return timingSafeEqual(Buffer.from(key, 'hex'), scryptSync(password, salt, 64));
};
export function provisionProductionOwner(db: Database.Database) {
  if (process.env.NODE_ENV !== 'production') return;
  const parsed = credentialsSchema.safeParse({ username: process.env.JARVIS_OWNER_USERNAME, password: process.env.JARVIS_OWNER_PASSWORD });
  if (!parsed.success) throw new Error('Production requires JARVIS_OWNER_USERNAME and a 10–128 character JARVIS_OWNER_PASSWORD');
  const username = parsed.data.username.toLowerCase();
  const accounts = db.prepare('SELECT id,username FROM accounts').all() as { id: number; username: string }[];
  if (!accounts.length) {
    db.transaction(() => {
      const info = db.prepare('INSERT INTO accounts(username,password_hash,created_at) VALUES(?,?,?)').run(username, hashPassword(parsed.data.password), new Date().toISOString());
      createDefaultConversation(db, Number(info.lastInsertRowid));
    })();
  } else if (accounts.length !== 1 || accounts[0]?.username !== username) throw new Error('Production database must contain only the configured owner account');
}
export function authentication(db: Database.Database): express.RequestHandler {
  return (req, res, next) => {
    const token: unknown = req.cookies?.jarvis_session;
    if (typeof token !== 'string' || token.length > 100) return res.status(401).json({ error: 'Authentication required' });
    const row = db.prepare('SELECT account_id FROM sessions WHERE token_hash=? AND expires_at>?').get(hashToken(token), new Date().toISOString()) as { account_id: number } | undefined;
    if (!row) return res.status(401).json({ error: 'Session expired' });
    res.locals.accountId = row.account_id; next();
  };
}
export function authRoutes(app: express.Express, db: Database.Database) {
  const auth = authentication(db);
  const loginLimit = rateLimit(10, 15 * 60000, req => req.socket.remoteAddress ?? 'unknown');
  function issueSession(accountId: number, res: express.Response) {
    const token = randomBytes(32).toString('base64url');
    const expires = new Date(Date.now() + 7 * 86400000);
    db.prepare('INSERT INTO sessions VALUES(?,?,?)').run(hashToken(token), accountId, expires.toISOString());
    res.cookie('jarvis_session', token, { httpOnly: true, sameSite: 'strict', secure: process.env.NODE_ENV === 'production', expires, path: '/' });
  }
  app.post('/api/auth/register', loginLimit, (req, res) => {
    if (process.env.NODE_ENV === 'production') return res.status(404).json({ error: 'Not found' });
    const credentials = input(credentialsSchema, req.body);
    const username = credentials.username.toLowerCase();
    if (db.prepare('SELECT 1 FROM accounts WHERE username=?').get(username)) return res.status(409).json({ error: 'Account already exists' });
    const accountId = db.transaction(() => {
      const info = db.prepare('INSERT INTO accounts(username,password_hash,created_at) VALUES(?,?,?)').run(username, hashPassword(credentials.password), new Date().toISOString());
      createDefaultConversation(db, Number(info.lastInsertRowid));
      return Number(info.lastInsertRowid);
    })();
    issueSession(accountId, res); res.status(201).json({ username });
  });
  app.post('/api/auth/login', loginLimit, (req, res) => {
    const credentials = input(credentialsSchema, req.body);
    const row = db.prepare('SELECT id,password_hash FROM accounts WHERE username=?').get(credentials.username.toLowerCase()) as { id: number; password_hash: string } | undefined;
    if (!row || !verifyPassword(credentials.password, row.password_hash)) return res.status(401).json({ error: 'Invalid credentials' });
    issueSession(row.id, res); res.json({ username: credentials.username.toLowerCase() });
  });
  app.post('/api/auth/logout', auth, (req, res) => {
    db.prepare('DELETE FROM sessions WHERE token_hash=?').run(hashToken(req.cookies.jarvis_session));
    res.clearCookie('jarvis_session', { path: '/', httpOnly: true, sameSite: 'strict', secure: process.env.NODE_ENV === 'production' });
    res.status(204).end();
  });
}
