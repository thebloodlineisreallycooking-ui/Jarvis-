import express from 'express';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import type Database from 'better-sqlite3';
import { commandSchema, conversationCreateSchema, conversationIdSchema, conversationPatchSchema, idParamSchema,
  pageQuerySchema, parseTask, requestIdSchema, taskCreateSchema, taskDeleteSchema, taskPatchSchema, taskQuerySchema } from '../shared/contracts.js';
import { authentication, authRoutes } from './auth.js';
import { errorHandler, HttpError, input, originGuard, privateHeaders, rateLimit, type SecurityOptions } from './http.js';
import { getTask, listTasks } from './domain/tasks.js';
import { history, listConversations, getConversation } from './domain/conversations.js';
import { createConversation, executeLocal, operationResult, patchConversation } from './domain/operations.js';
import { providerRoutes } from './providers/chat.js';
import { unconfiguredProviders, type Providers } from './providers/contracts.js';
export { provisionProductionOwner } from './auth.js';

export function createApp(db: Database.Database, options: SecurityOptions & { providers?: Providers; providerTimeoutMs?: number } = {}) {
  const app = express();
  app.disable('x-powered-by');
  app.use(helmet({ contentSecurityPolicy: { directives: { defaultSrc: ["'self'"], scriptSrc: ["'self'"], styleSrc: ["'self'", "'unsafe-inline'"], imgSrc: ["'self'", 'data:'], connectSrc: ["'self'"], objectSrc: ["'none'"], frameAncestors: ["'none'"], upgradeInsecureRequests: process.env.NODE_ENV === 'production' ? [] : null } } }));
  app.use('/api', privateHeaders, originGuard(options));
  app.use(express.json({ limit: '32kb' }), cookieParser());
  app.get('/api/health', (_req, res) => { db.prepare('SELECT 1').get(); res.json({ status: 'ok' }); });
  authRoutes(app, db);
  app.use('/api', authentication(db));
  const mutationLimit = rateLimit(120, 60000, (_req, res) => String(res.locals.accountId));
  app.use('/api', (req, res, next) => ['GET', 'HEAD', 'OPTIONS'].includes(req.method) ? next() : mutationLimit(req, res, next));
  providerRoutes(app, db, options.providers ?? unconfiguredProviders(), options.providerTimeoutMs);
  app.get('/api/tasks', (req, res) => res.json(listTasks(db, res.locals.accountId, input(taskQuerySchema, req.query))));
  app.get('/api/tasks/:id', (req, res) => res.json({ task: getTask(db, res.locals.accountId, input(idParamSchema, req.params.id)) }));
  app.post('/api/tasks', (req, res) => {
    const data = input(taskCreateSchema, req.body);
    res.status(201).json(executeLocal(db, res.locals.accountId, { requestId: data.requestId, conversationId: data.conversationId, mode: data.mode, action: { type: 'create', title: data.title } }));
  });
  app.patch('/api/tasks/:id', (req, res) => {
    const data = input(taskPatchSchema, req.body), id = input(idParamSchema, req.params.id);
    res.json(executeLocal(db, res.locals.accountId, { requestId: data.requestId, conversationId: data.conversationId, mode: data.mode, action: { type: 'patch', id, version: data.version, ...(data.title === undefined ? {} : { title: data.title }), ...(data.status === undefined ? {} : { status: data.status }) } }));
  });
  app.delete('/api/tasks/:id', (req, res) => {
    const data = input(taskDeleteSchema, req.body), id = input(idParamSchema, req.params.id);
    res.json(executeLocal(db, res.locals.accountId, { ...data, action: { type: 'delete', id, version: data.version } }));
  });
  app.get('/api/conversations', (req, res) => {
    const query = input(pageQuerySchema, req.query);
    res.json(listConversations(db, res.locals.accountId, query.limit, query.cursor));
  });
  app.get('/api/conversations/:id', (req, res) => res.json({ conversation: getConversation(db, res.locals.accountId, input(conversationIdSchema, req.params.id)) }));
  app.post('/api/conversations', (req, res) => res.status(201).json({ conversation: createConversation(db, res.locals.accountId, input(conversationCreateSchema, req.body)) }));
  app.patch('/api/conversations/:id', (req, res) => res.json({ conversation: patchConversation(db, res.locals.accountId, input(conversationIdSchema, req.params.id), input(conversationPatchSchema, req.body)) }));
  app.get('/api/conversations/:id/messages', (req, res) => {
    const query = input(pageQuerySchema, req.query);
    res.json(history(db, res.locals.accountId, input(conversationIdSchema, req.params.id), query.limit, query.cursor));
  });
  app.post('/api/commands', (req, res) => {
    const data = input(commandSchema, req.body);
    // Parse errors belong to request validation, not internal error details.
    let task: string | null;
    try { task = parseTask(data.text); } catch { throw new HttpError(400, 'INVALID_TITLE', 'Uppgiftens titel måste vara 1–200 tecken.'); }
    res.status(201).json(executeLocal(db, res.locals.accountId, { ...data, action: task ? { type: 'create', title: task } : { type: 'text' } }));
  });
  app.get('/api/operations/:id', (req, res) => res.json(operationResult(db, res.locals.accountId, input(requestIdSchema, req.params.id))));
  app.use('/api', (_req, res) => res.status(404).json({ code: 'NOT_FOUND', error: 'Not found' }));
  app.use(errorHandler);
  return app;
}
