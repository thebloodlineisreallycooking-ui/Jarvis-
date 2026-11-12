import { z } from 'zod';

export const limits = { text: 2000, taskTitle: 200, conversationTitle: 100, page: 100,
  contextCharacters: 12000, contextMessages: 24, outputCharacters: 12000,
  chunkCharacters: 512, providerTimeoutMs: 30000, concurrentPerAccount: 2, concurrentGlobal: 8 } as const;
export const modeSchema = z.enum(['live', 'demo']);
export type Mode = z.infer<typeof modeSchema>;
export const credentialsSchema = z.object({ username: z.string().trim().min(3).max(40).regex(/^[a-zA-Z0-9_-]+$/), password: z.string().min(10).max(128) }).strict();
export const idSchema = z.number().int().positive().max(Number.MAX_SAFE_INTEGER);
export const idParamSchema = z.string().regex(/^[1-9][0-9]*$/).transform(Number).pipe(idSchema);
export const requestIdSchema = z.uuid();
export const conversationIdSchema = z.string().max(80).regex(/^(?:[0-9a-f-]{36}|legacy-\d+|demo-[0-9a-f-]{36})$/i);
export const titleSchema = z.string().trim().min(1).max(limits.taskTitle);
export const conversationTitleSchema = z.string().trim().min(1).max(limits.conversationTitle);
export const taskStatusSchema = z.enum(['open', 'completed']);
export const taskSchema = z.object({
  id: z.number().int().safe().refine(value => value !== 0), title: titleSchema, status: taskStatusSchema,
  createdAt: z.string(), updatedAt: z.string(), completedAt: z.string().nullable(), version: idSchema, mode: modeSchema,
}).refine(task => task.mode === 'live' ? task.id > 0 : task.id < 0, 'Task ID must match mode');
export type Task = z.infer<typeof taskSchema>;
export const conversationSchema = z.object({
  id: conversationIdSchema, title: conversationTitleSchema, status: z.enum(['open', 'archived']),
  createdAt: z.string(), updatedAt: z.string(), version: idSchema, mode: modeSchema,
});
export type Conversation = z.infer<typeof conversationSchema>;
export const messageSchema = z.object({
  id: z.string().min(1).max(100), sequence: idSchema, conversationId: conversationIdSchema,
  operationId: requestIdSchema.nullable(), role: z.enum(['user', 'assistant']),
  kind: z.enum(['user_input', 'command_result', 'system_notice', 'provider_response', 'legacy']),
  delivery: z.enum(['complete', 'interrupted']), text: z.string().max(limits.outputCharacters),
  createdAt: z.string(), mode: modeSchema,
});
export type Message = z.infer<typeof messageSchema>;
export const operationStatusSchema = z.enum(['pending', 'succeeded', 'failed', 'cancelled', 'unknown']);
export const commandResponseSchema = z.object({
  requestId: requestIdSchema, conversationId: conversationIdSchema, status: operationStatusSchema,
  task: taskSchema.nullable(), deletedTaskId: idSchema.nullable(),
  messages: z.array(messageSchema).max(2), persisted: z.boolean(), code: z.string().nullable(),
});
export type CommandResponse = z.infer<typeof commandResponseSchema>;
export const envelopeSchema = z.object({ requestId: requestIdSchema, conversationId: conversationIdSchema, mode: z.literal('live') });
export const commandSchema = envelopeSchema.extend({ text: z.string().trim().min(1).max(limits.text) }).strict();
export const taskCreateSchema = envelopeSchema.extend({ title: titleSchema }).strict();
export const taskPatchSchema = envelopeSchema.extend({ version: idSchema, title: titleSchema.optional(), status: taskStatusSchema.optional() }).strict()
  .refine(value => value.title !== undefined || value.status !== undefined, 'Provide title or status');
export const taskDeleteSchema = envelopeSchema.extend({ version: idSchema }).strict();
export const conversationCreateSchema = z.object({ requestId: requestIdSchema, title: conversationTitleSchema }).strict();
export const conversationPatchSchema = z.object({ requestId: requestIdSchema, version: idSchema,
  title: conversationTitleSchema.optional(), status: z.enum(['open', 'archived']).optional() }).strict()
  .refine(value => value.title !== undefined || value.status !== undefined, 'Provide title or status');
export const pageQuerySchema = z.object({ limit: z.coerce.number().int().min(1).max(limits.page).default(50), cursor: z.string().min(1).max(512).optional() }).strict();
export const taskQuerySchema = pageQuerySchema.extend({ status: z.enum(['all', 'open', 'completed']).default('all'), search: z.string().trim().max(200).default('') });
export const taskPageSchema = z.object({ tasks: z.array(taskSchema).max(limits.page), nextCursor: z.string().nullable(),
  counts: z.object({ open: z.number().int().nonnegative(), completed: z.number().int().nonnegative(), all: z.number().int().nonnegative() }) });
export type TaskPage = z.infer<typeof taskPageSchema>;
export const historyPageSchema = z.object({ messages: z.array(messageSchema).max(limits.page), nextCursor: z.string().nullable() });
export type HistoryPage = z.infer<typeof historyPageSchema>;
export const conversationPageSchema = z.object({ conversations: z.array(conversationSchema).max(limits.page), nextCursor: z.string().nullable() });
export const capabilitySchema = z.object({ state: z.enum(['available', 'unconfigured', 'disabled']), reason: z.enum(['READY', 'PROVIDER_NOT_CONFIGURED', 'DISABLED']) });
export const capabilitiesSchema = z.object({ chat: capabilitySchema, transcription: capabilitySchema, speech: capabilitySchema });
export type Capabilities = z.infer<typeof capabilitiesSchema>;

// A recognised command with an invalid title is an error, never a silently
// truncated task or an accidental free-text/provider request.
export function parseTask(text: string): string | null {
  const match = text.trim().match(/^(add (?:a )?task|lägg till (?:en )?uppgift)(?=\s|$)([\s\S]*)$/i);
  if (!match) return null;
  const remainder = match[2]!.trim().replace(/^add/i.test(match[1]!) ? /^to(?:\s+|$)/i : /^att(?:\s+|$)/i, '');
  return titleSchema.parse(remainder);
}
