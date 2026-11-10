import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { VoicePresentation } from '../components/VoicePresentation';
import '../styles.css';

const states = {
  unconfigured: { title: 'Röst ej ansluten', description: 'Din tanke kan börja med text. Skriv nedan och fortsätt i ditt eget tempo.', detail: 'Mikrofon och uppspelning är avstängda', core: 'idle' },
  permission: { title: 'Tillåt mikrofonen', description: 'Här skulle du välja om JARVIS får använda din mikrofon.', detail: 'Ingen behörighet begärs i prototypen', core: 'idle' },
  recording: { title: 'Lyssnar på dig', description: 'En lugn, synlig markering under en framtida inspelning.', detail: 'Simulerat tillstånd · Ingen inspelning', core: 'loading' },
  transcribing: { title: 'Gör tal till text', description: 'Din formulering visas här före nästa steg.', detail: 'Simulerat tillstånd · Ingen transkribering', core: 'loading' },
  responding: { title: 'Formar ett svar', description: 'Svaret skulle växa fram i samtalet bredvid.', detail: 'Simulerat tillstånd · Inget AI-anrop', core: 'loading' },
  speaking: { title: 'Läser upp svaret', description: 'Texten finns kvar att läsa i din egen takt.', detail: 'Simulerat tillstånd · Inget ljud spelas', core: 'loading' },
  stopped: { title: 'Pausat här', description: 'Du skulle kunna fortsätta med text när du är redo.', detail: 'Simulerat stopp · Ingen ljudsession', core: 'idle' },
  failed: { title: 'Rösten kunde inte fortsätta', description: 'Din text finns kvar. Du skulle kunna försöka igen senare.', detail: 'Simulerat fel · Ingen ljudsession', core: 'error' },
} as const;
type VoiceFixtureState = keyof typeof states;

function VoiceStates() {
  const [state, setState] = useState<VoiceFixtureState>('unconfigured');
  useEffect(() => {
    const visibility = () => { document.documentElement.dataset.documentHidden = String(document.hidden); };
    visibility(); document.addEventListener('visibilitychange', visibility);
    return () => document.removeEventListener('visibilitychange', visibility);
  }, []);
  return <main className="fixture-page"><span className="eyebrow">Endast utveckling · Ingår inte i produktionsbygget</span><h1>Röstens visuella tillstånd</h1><p>Inga behörigheter, inspelningar, provideranrop eller ljud. Välj ett tillstånd för att granska formen.</p><label>Prototyptillstånd<select value={state} onChange={event => setState(event.target.value as VoiceFixtureState)}>{(['unconfigured', 'permission', 'recording', 'transcribing', 'responding', 'speaking', 'stopped', 'failed'] as const).map(value => <option key={value}>{value}</option>)}</select></label><VoicePresentation preview={{ ...states[state], failed: state === 'failed' }} /></main>;
}
if (import.meta.env.DEV) createRoot(document.getElementById('root')!).render(<VoiceStates />);
