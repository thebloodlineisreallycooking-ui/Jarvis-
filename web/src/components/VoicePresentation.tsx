import React from 'react';
import type { Mode } from '../../../shared/contracts';
import { Core, type CoreState } from './Core';
import { Icon } from './Icon';

export type VoicePreview = { title: string; description: string; detail: string; core: CoreState; failed?: boolean };
// Preview content lives only in the development fixture entry point.
export function VoicePresentation({ mode = 'live', preview }: { mode?: Mode; preview?: VoicePreview }) {
  const value = preview ?? { title: 'Röst ej ansluten', description: 'Din tanke kan börja med text. Skriv nedan och fortsätt i ditt eget tempo.', detail: 'Mikrofon och uppspelning är avstängda', core: 'idle' };
  return <div className="voice-visual" data-voice-state={preview ? 'prototype' : 'unconfigured'}>{preview && <p className="prototype-label">Designprototyp · Ingen ljudfunktion</p>}<Core mode={mode} state={value.core} /><div className="voice-status"><span className="eyebrow">Ett lugnare tempo</span><h2>{value.title}</h2><p>{value.description}</p><span className="voice-unavailable"><Icon name={preview?.failed ? 'alert' : 'microphone'} />{value.detail}</span></div></div>;
}
