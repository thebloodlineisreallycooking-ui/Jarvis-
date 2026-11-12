import request from 'supertest';
import { randomUUID } from 'node:crypto';
import type Database from 'better-sqlite3';
import { createApp } from '../server/app';
export const testApp = (db: Database.Database) => createApp(db, { allowOriginlessLoopback: true });
export async function account(app: ReturnType<typeof createApp>, username: string) {
  const agent = request.agent(app);
  await agent.post('/api/auth/register').send({ username, password: 'test-password-123' }).expect(201);
  const conversationId = (await agent.get('/api/conversations').expect(200)).body.conversations[0].id as string;
  return { agent, conversationId, envelope: () => ({ requestId: randomUUID(), conversationId, mode: 'live' as const }) };
}
