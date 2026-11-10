import { z } from 'zod';
export const audioLimits = { bytes: 4 * 1024 * 1024, durationMs: 60000, speechText: 4000 } as const;
export const languageSchema = z.enum(['sv', 'en']);
// Candidate interchange formats. This does not assert provider or Safari support.
export const audioMetadataSchema = z.object({
  mime: z.enum(['audio/wav', 'audio/webm', 'audio/mp4']), format: z.enum(['wav', 'webm', 'mp4']),
  bytes: z.number().int().positive().max(audioLimits.bytes), durationMs: z.number().positive().max(audioLimits.durationMs),
  language: languageSchema, sampleRate: z.number().int().min(8000).max(48000).optional(), channels: z.union([z.literal(1), z.literal(2)]).optional(),
}).strict().refine(data => data.mime === `audio/${data.format}`, 'MIME and format must agree');
export type AudioMetadata = z.infer<typeof audioMetadataSchema>;
export type VoicePhase = 'idle' | 'permission' | 'recording' | 'transcribing' | 'text_ready' | 'submitting' | 'synthesizing' | 'playback_ready' | 'playing' | 'stopped' | 'error';
export type VoiceState = { phase: VoicePhase; run: number; reason: string | null };
export type VoiceEvent = { type: 'start'; configured: boolean } | { type: 'stop' | 'background' | 'locked' } |
  { type: 'granted' | 'denied' | 'recorded' | 'transcribed' | 'submitted' | 'request_speech' | 'synthesized' | 'play' | 'ended' | 'network_error' | 'autoplay_blocked'; run: number };
export const initialVoiceState = (): VoiceState => ({ phase: 'idle', run: 0, reason: null });
// Pure transition model only. No media device, upload, playback or browser TTS.
export function voiceTransition(state: VoiceState, event: VoiceEvent): VoiceState {
  if (event.type === 'start') {
    if (!['idle', 'stopped', 'error'].includes(state.phase)) return state; // double press
    return event.configured ? { phase: 'permission', run: state.run + 1, reason: null } : { phase: 'error', run: state.run + 1, reason: 'PROVIDER_NOT_CONFIGURED' };
  }
  if (event.type === 'stop' || event.type === 'background' || event.type === 'locked') return { phase: 'stopped', run: state.run + 1, reason: event.type.toUpperCase() };
  if (!('run' in event) || event.run !== state.run) return state;
  if (event.type === 'denied' && state.phase === 'permission') return { ...state, phase: 'error', reason: 'PERMISSION_DENIED' };
  if (event.type === 'network_error') return ['idle', 'stopped', 'error'].includes(state.phase) ? state : { ...state, phase: 'error', reason: 'NETWORK_ERROR' };
  if (event.type === 'autoplay_blocked' && ['playback_ready', 'playing'].includes(state.phase)) return { ...state, phase: 'playback_ready', reason: 'USER_PLAY_REQUIRED' };
  const transitions: Partial<Record<VoicePhase, Partial<Record<VoiceEvent['type'], VoicePhase>>>> = {
    permission: { granted: 'recording' }, recording: { recorded: 'transcribing' }, transcribing: { transcribed: 'text_ready' },
    text_ready: { submitted: 'submitting' }, submitting: { request_speech: 'synthesizing', ended: 'idle' },
    synthesizing: { synthesized: 'playback_ready' }, playback_ready: { play: 'playing' }, playing: { ended: 'idle' },
  };
  const phase = transitions[state.phase]?.[event.type]; return phase ? { ...state, phase, reason: null } : state;
}
