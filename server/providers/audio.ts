import { z } from 'zod';
import { audioLimits, audioMetadataSchema, languageSchema, type AudioMetadata } from '../../shared/audio.js';
import { limits } from '../../shared/contracts.js';
import { abortable, ProviderFailure, requireAvailable, timedCall, type Providers } from './contracts.js';
export function validateAudio(bytes: unknown, metadata: unknown): { bytes: Uint8Array; metadata: AudioMetadata } {
  const parsed = audioMetadataSchema.safeParse(metadata);
  if (!parsed.success || !(bytes instanceof Uint8Array) || bytes.byteLength !== parsed.data.bytes) throw new ProviderFailure('INVALID_PROVIDER_OUTPUT');
  const format = parsed.data.format;
  const ascii = (start: number, end: number) => String.fromCharCode(...bytes.subarray(start, end));
  const signature = format === 'wav' ? ascii(0, 4) === 'RIFF' && ascii(8, 12) === 'WAVE'
    : format === 'webm' ? [0x1a, 0x45, 0xdf, 0xa3].every((value, index) => bytes[index] === value)
    : ascii(4, 8) === 'ftyp';
  if (!signature) throw new ProviderFailure('INVALID_PROVIDER_OUTPUT');
  // A signature and declared duration are not a decoder. Real adapters must
  // verify actual format/duration with official provider limits before upload.
  return { bytes, metadata: parsed.data };
}
export async function transcribeAudio(providers: Providers, audio: { bytes: unknown; metadata: unknown }, signal: AbortSignal, timeoutMs: number = limits.providerTimeoutMs) {
  requireAvailable(providers.transcription.capability);
  const validated = validateAudio(audio.bytes, audio.metadata), timed = timedCall(signal, timeoutMs, limits.text);
  try {
    if (timed.call.signal.aborted) throw timed.call.signal.reason;
    const output: unknown = await abortable(providers.transcription.transcribe(validated, timed.call), timed.call.signal);
    const parsed = z.object({ text: z.string().trim().min(1).max(limits.text), language: languageSchema }).strict().safeParse(output);
    if (!parsed.success) throw new ProviderFailure('INVALID_PROVIDER_OUTPUT');
    return parsed.data;
  } finally { timed.close(); }
}
export async function synthesizeSpeech(providers: Providers, input: unknown, signal: AbortSignal, timeoutMs: number = limits.providerTimeoutMs) {
  requireAvailable(providers.speech.capability);
  const parsed = z.object({ text: z.string().trim().min(1).max(audioLimits.speechText), language: languageSchema }).strict().safeParse(input);
  if (!parsed.success) throw new ProviderFailure('BUDGET_EXCEEDED');
  const timed = timedCall(signal, timeoutMs, audioLimits.speechText);
  try {
    if (timed.call.signal.aborted) throw timed.call.signal.reason;
    const output = await abortable(providers.speech.synthesize(parsed.data, timed.call), timed.call.signal);
    const audio = validateAudio(output.bytes, output.metadata);
    if (audio.metadata.language !== parsed.data.language) throw new ProviderFailure('INVALID_PROVIDER_OUTPUT');
    return audio;
  } finally { timed.close(); }
}
