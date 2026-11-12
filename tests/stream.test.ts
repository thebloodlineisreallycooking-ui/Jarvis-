import { describe, expect, it, vi } from 'vitest';
import { randomUUID } from 'node:crypto';
import { encodeEvent, type StreamEvent } from '../shared/stream';
import { readEventStream } from '../web/src/stream';
import type { CommandResponse } from '../shared/contracts';

function fixture() {
  const requestId = randomUUID(), conversationId = randomUUID(), identity = { operationId: requestId, conversationId };
  const result: CommandResponse = { requestId, conversationId, status: 'succeeded', task: null, deletedTaskId: null, code: null, persisted: true, messages: [
    { id: randomUUID(), sequence: 1, operationId: requestId, conversationId, mode: 'live', role: 'assistant', kind: 'provider_response', delivery: 'complete', text: 'Hej åäö 🌍', createdAt: '2026-11-10' },
  ] };
  const events: StreamEvent[] = [{ ...identity, index: 1, type: 'start' }, { ...identity, index: 2, type: 'delta', text: 'Hej åäö 🌍' }, { ...identity, index: 3, type: 'terminal', result }];
  return { requestId, conversationId, events, result };
}
function response(text: string, width = 1) {
  const bytes = new TextEncoder().encode(text); let offset = 0;
  return new Response(new ReadableStream<Uint8Array>({ pull(controller) { if (offset >= bytes.length) { controller.close(); return; } controller.enqueue(bytes.slice(offset, offset + width)); offset += width; } }), { headers: { 'Content-Type': 'text/event-stream; charset=utf-8' } });
}
describe('Client stream trust boundary', () => {
  it('reconstructs split UTF-8/events, ignores exact duplicates and ignores events after terminal', async () => {
    const f = fixture(), seen: StreamEvent[] = [];
    const wire = [f.events[0]!, f.events[1]!, f.events[1]!, f.events[2]!].map(encodeEvent).join('') + 'data: invalid late event\n\n';
    expect(await readEventStream(response(wire), f, new AbortController().signal, event => seen.push(event))).toEqual(f.result);
    expect(seen.map(event => event.type)).toEqual(['start', 'delta', 'terminal']); expect(seen[1]).toMatchObject({ text: 'Hej åäö 🌍' });
  });
  it.each(['gap', 'wrong-thread', 'changed-duplicate', 'wrong-id', 'large-chunk', 'bad-terminal', 'truncated'] as const)('rejects %s without accepting a final result', async kind => {
    const f = fixture(), events = structuredClone(f.events) as unknown as Record<string, unknown>[];
    if (kind === 'gap') events[1]!.index = 3;
    if (kind === 'wrong-thread') events[1]!.conversationId = randomUUID();
    if (kind === 'wrong-id') events[1]!.operationId = randomUUID();
    if (kind === 'large-chunk') events[1]!.text = 'x'.repeat(513);
    if (kind === 'changed-duplicate') events.splice(2, 0, { ...events[1], text: 'different' });
    if (kind === 'bad-terminal') (events[2]!.result as CommandResponse).conversationId = randomUUID();
    if (kind === 'truncated') events.pop();
    const wire = (events as unknown as StreamEvent[]).map(encodeEvent).join('');
    await expect(readEventStream(response(wire, 15), f, new AbortController().signal, () => {})).rejects.toMatchObject({ code: 'INVALID_STREAM' });
  });
  it('authenticates before reading, bounds malformed frames, and cancels a hung read', async () => {
    const f = fixture();
    await expect(readEventStream(new Response('{"error":"expired"}', { status: 401 }), f, new AbortController().signal, () => {})).rejects.toMatchObject({ status: 401 });
    await expect(readEventStream(response('x'.repeat(128001), 5000), f, new AbortController().signal, () => {})).rejects.toMatchObject({ code: 'INVALID_STREAM' });
    const cancelled = vi.fn(), controller = new AbortController();
    const pending = readEventStream(new Response(new ReadableStream({ cancel: cancelled }), { headers: { 'Content-Type': 'text/event-stream' } }), f, controller.signal, () => {});
    controller.abort(); await expect(pending).rejects.toMatchObject({ code: 'CANCELLED' }); expect(cancelled).toHaveBeenCalled();
  });
});
