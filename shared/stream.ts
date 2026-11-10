import { z } from 'zod';
import { commandResponseSchema, conversationIdSchema, limits, requestIdSchema } from './contracts.js';
const identity = { operationId: requestIdSchema, conversationId: conversationIdSchema, index: z.number().int().positive() };
export const streamEventSchema = z.discriminatedUnion('type', [
  z.object({ ...identity, type: z.literal('start') }).strict(),
  z.object({ ...identity, type: z.literal('delta'), text: z.string().min(1).max(limits.chunkCharacters) }).strict(),
  z.object({ ...identity, type: z.literal('terminal'), result: commandResponseSchema }).strict(),
]);
export type StreamEvent = z.infer<typeof streamEventSchema>;
export function encodeEvent(event: StreamEvent): string {
  return `id: ${event.operationId}:${event.index}\nevent: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`;
}
