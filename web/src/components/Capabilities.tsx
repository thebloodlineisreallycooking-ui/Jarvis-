import React from 'react';
import type { WorkspaceState } from '../workspace';
import { Icon, type IconName } from './Icon';

export function Capabilities({ state }: { state: WorkspaceState }) {
  const providerLabel = (value: WorkspaceState['capabilities']['chat']) => value.state === 'available' ? 'Tillgänglig' : value.state === 'disabled' ? 'Avstängd' : 'Ej ansluten';
  const rows: { title: string; description: string; status: string; icon: IconName; ready?: boolean }[] = [
    { title: 'Uppgifter och samtal', description: state.mode === 'demo' ? 'Prova flödet i Demo. Innehållet finns bara i minnet.' : 'Skriv, organisera och spara på ditt privata konto.', status: state.mode === 'demo' ? 'Demo' : 'Tillgängligt', icon: 'tasks', ready: state.mode === 'live' },
    { title: 'AI-samtal', description: 'Textbaserade svar när en AI-tjänst är ansluten.', status: providerLabel(state.capabilities.chat), icon: 'command', ready: state.capabilities.chat.state === 'available' },
    { title: 'Röst till text', description: 'Röstgränssnittet är ännu inte aktiverat.', status: state.capabilities.transcription.state === 'available' ? 'Tjänst redo · UI avstängt' : providerLabel(state.capabilities.transcription), icon: 'microphone' },
    { title: 'Uppläsning', description: 'Uppspelning är ännu inte aktiverad.', status: state.capabilities.speech.state === 'available' ? 'Tjänst redo · UI avstängt' : providerLabel(state.capabilities.speech), icon: 'voice' },
    { title: 'Agenter och kunskapskällor', description: 'En framtida plats för anslutna verktyg och eget material.', status: 'Planerat', icon: 'agents' },
  ];
  return <section className="capabilities" aria-label="Förmågor"><h2>Det här finns i din arbetsyta</h2><ul>{rows.map(row => <li key={row.title}><Icon name={row.icon} /><div><h3>{row.title}</h3><p>{row.description}</p></div><span className={`capability-status ${row.ready ? 'ready' : ''}`}>{row.ready && <Icon name="check" />}{row.status}</span></li>)}</ul></section>;
}
