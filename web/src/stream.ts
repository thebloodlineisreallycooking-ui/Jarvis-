import { limits, type CommandResponse } from '../../shared/contracts';
import { streamEventSchema, type StreamEvent } from '../../shared/stream';
import { ApiError, responseError } from './api';
export type StreamRequest = (payload: { requestId: string; conversationId: string; mode: 'live'; text: string }, options: { signal: AbortSignal; onEvent: (event: StreamEvent) => void }) => Promise<CommandResponse>;
const protocolError = () => new ApiError('Textströmmen bröts eller kunde inte valideras. Kontrollera sparat resultat.', null, 'network', 'INVALID_STREAM');
export async function readEventStream(response: Response, expected: { requestId: string; conversationId: string }, signal: AbortSignal, onEvent: (event: StreamEvent) => void): Promise<CommandResponse> {
  if (!response.ok) throw await responseError(response);
  if (!response.headers.get('content-type')?.startsWith('text/event-stream') || !response.body) throw protocolError();
  const reader = response.body.getReader(), decoder = new TextDecoder('utf-8', { fatal: true });
  let buffer = '', last = 0, outputCharacters = 0, totalBytes = 0;
  const seen = new Map<number, string>();
  let terminal: CommandResponse | undefined;
  const consume = (frame: string) => {
    if (!frame.trim() || frame.startsWith(':')) return;
    const lines = frame.split(/\r?\n/), data = lines.filter(line => line.startsWith('data:')).map(line => line.slice(5).trimStart()).join('\n');
    if (!data) throw protocolError();
    const parsed = streamEventSchema.safeParse(JSON.parse(data)); if (!parsed.success) throw protocolError();
    const event = parsed.data;
    if (event.operationId !== expected.requestId || event.conversationId !== expected.conversationId ||
      lines.find(line => line.startsWith('id:'))?.slice(3).trim() !== `${event.operationId}:${event.index}` ||
      lines.find(line => line.startsWith('event:'))?.slice(6).trim() !== event.type) throw protocolError();
    if (event.index <= last) { if (seen.get(event.index) !== data) throw protocolError(); return; }
    if (event.index !== last + 1 || event.index > limits.outputCharacters + 2 || (last === 0) !== (event.type === 'start')) throw protocolError();
    last = event.index; seen.set(last, data);
    if (event.type === 'delta') { outputCharacters += event.text.length; if (outputCharacters > limits.outputCharacters) throw protocolError(); }
    if (event.type === 'terminal') {
      if (event.result.requestId !== expected.requestId || event.result.conversationId !== expected.conversationId || !event.result.persisted || event.result.status === 'pending' || event.result.messages.some(m => m.conversationId !== expected.conversationId || m.operationId !== expected.requestId || m.mode !== 'live')) throw protocolError();
      terminal = event.result;
    }
    onEvent(event);
  };
  try {
    while (!terminal) {
      const chunk = await new Promise<ReadableStreamReadResult<Uint8Array>>((resolve, reject) => {
        const abort = () => reject(new ApiError('Anslutningen avbröts. Resultatet kan vara sparat.', null, 'network', 'CANCELLED'));
        if (signal.aborted) { abort(); return; }
        signal.addEventListener('abort', abort, { once: true });
        reader.read().then(resolve, reject).finally(() => signal.removeEventListener('abort', abort));
      });
      if (chunk.done) { buffer += decoder.decode(); if (!terminal) throw protocolError(); break; }
      totalBytes += chunk.value.byteLength; if (totalBytes > 4 * 1024 * 1024) throw protocolError();
      buffer += decoder.decode(chunk.value, { stream: true });
      let boundary = buffer.match(/\r?\n\r?\n/);
      while (boundary && !terminal) {
        const at = boundary.index!; if (at > 128000) throw protocolError();
        consume(buffer.slice(0, at)); buffer = buffer.slice(at + boundary[0].length); boundary = buffer.match(/\r?\n\r?\n/);
      }
      if (buffer.length > 128000 && !terminal) throw protocolError();
    }
    return terminal!;
  } catch (reason) { throw reason instanceof ApiError ? reason : protocolError(); }
  finally { void reader.cancel().catch(() => {}); reader.releaseLock(); }
}
export const streamChat: StreamRequest = async (payload, options) => {
  const controller = new AbortController(); const abort = () => controller.abort();
  options.signal.addEventListener('abort', abort, { once: true }); if (options.signal.aborted) abort();
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      new Promise<never>((_, reject) => { timer = setTimeout(() => { controller.abort(); reject(new ApiError('Textströmmen nådde tidsgränsen. Kontrollera sparat resultat.', null, 'network', 'TIMEOUT')); }, 35000); }),
      (async () => {
        let response: Response;
        try { response = await fetch('/api/chat/stream', { method: 'POST', credentials: 'same-origin', cache: 'no-store', headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream' }, body: JSON.stringify(payload), signal: controller.signal }); }
        catch { throw new ApiError('Anslutningen till textströmmen bröts. Resultatet kan vara sparat.', null, 'network'); }
        return readEventStream(response, payload, controller.signal, options.onEvent);
      })(),
    ]);
  } finally { clearTimeout(timer); options.signal.removeEventListener('abort', abort); }
};
