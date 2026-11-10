import type { Capabilities } from '../../shared/contracts.js';
import type { AudioMetadata } from '../../shared/audio.js';
export type ProviderBudget = { maxOutputCharacters: number; timeoutMs: number };
export type ProviderCall = { signal: AbortSignal; budget: ProviderBudget };
export type ChatInput = { system: string; messages: { role: 'user' | 'assistant'; text: string }[] };
export interface ChatProvider { capability: Capabilities['chat']; stream(input: ChatInput, call: ProviderCall): AsyncIterable<{ text: string }>; }
export interface TranscriptionProvider { capability: Capabilities['transcription']; transcribe(audio: { bytes: Uint8Array; metadata: AudioMetadata }, call: ProviderCall): Promise<{ text: string; language: 'sv' | 'en' }>; }
export interface SpeechProvider { capability: Capabilities['speech']; synthesize(input: { text: string; language: 'sv' | 'en' }, call: ProviderCall): Promise<{ bytes: Uint8Array; metadata: AudioMetadata }>; }
export type Providers = { chat: ChatProvider; transcription: TranscriptionProvider; speech: SpeechProvider };
export class ProviderFailure extends Error {
  constructor(readonly code: 'PROVIDER_NOT_CONFIGURED' | 'DISABLED' | 'PROVIDER_ERROR' | 'PROVIDER_TIMEOUT' | 'CANCELLED' | 'BUDGET_EXCEEDED' | 'INVALID_PROVIDER_OUTPUT') { super(code); }
}
const unconfigured = { state: 'unconfigured' as const, reason: 'PROVIDER_NOT_CONFIGURED' as const };
// Production factory accepts no fixture/query/mode/key-presence switch.
export function unconfiguredProviders(): Providers {
  return {
    chat: { capability: unconfigured, async *stream() { throw new ProviderFailure('PROVIDER_NOT_CONFIGURED'); } },
    transcription: { capability: unconfigured, async transcribe() { throw new ProviderFailure('PROVIDER_NOT_CONFIGURED'); } },
    speech: { capability: unconfigured, async synthesize() { throw new ProviderFailure('PROVIDER_NOT_CONFIGURED'); } },
  };
}
export function requireAvailable(capability: Capabilities['chat']) {
  if (capability.state !== 'available') throw new ProviderFailure(capability.state === 'disabled' ? 'DISABLED' : 'PROVIDER_NOT_CONFIGURED');
}
export function failureCode(reason: unknown): ProviderFailure['code'] { return reason instanceof ProviderFailure ? reason.code : 'PROVIDER_ERROR'; }
export function abortable<T>(promise: Promise<T>, signal: AbortSignal): Promise<T> {
  return new Promise((resolve, reject) => {
    const abort = () => reject(signal.reason instanceof ProviderFailure ? signal.reason : new ProviderFailure('CANCELLED'));
    if (signal.aborted) { promise.catch(() => {}); abort(); return; }
    signal.addEventListener('abort', abort, { once: true });
    promise.then(resolve, reject).finally(() => signal.removeEventListener('abort', abort));
  });
}
export function timedCall(parent: AbortSignal, timeoutMs: number, maxOutputCharacters: number) {
  const controller = new AbortController();
  const abort = () => controller.abort(new ProviderFailure('CANCELLED'));
  parent.addEventListener('abort', abort, { once: true }); if (parent.aborted) abort();
  const timer = setTimeout(() => controller.abort(new ProviderFailure('PROVIDER_TIMEOUT')), timeoutMs);
  return { call: { signal: controller.signal, budget: { timeoutMs, maxOutputCharacters } },
    close: () => { clearTimeout(timer); parent.removeEventListener('abort', abort); controller.abort(new ProviderFailure('CANCELLED')); } };
}
