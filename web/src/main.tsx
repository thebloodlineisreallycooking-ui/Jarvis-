import React, { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { createRoot } from 'react-dom/client';
import { Core } from './components/Core';
import { Icon, type IconName } from './components/Icon';
import './styles.css';
import { Conversations } from './components/Conversations';
import { Dialog } from './components/Dialog';
import { Composer } from './components/Composer';
import { Recovery } from './components/Recovery';
import { Tasks } from './components/Tasks';
import { Capabilities } from './components/Capabilities';
import { VoicePresentation } from './components/VoicePresentation';
import { History } from './components/History';
import { api, ApiError } from './api';
import { Workspace, workspaceStatus, activeThread } from './workspace';

const navigation = [
  { id: 'command', icon: 'command', label: 'Command Center', shortLabel: 'Samtal' },
  { id: 'voice', icon: 'voice', label: 'Voice Focus', shortLabel: 'Röst' },
  { id: 'agents', icon: 'agents', label: 'Agents & Knowledge', shortLabel: 'Verktyg' },
] as const;

function useLoginState() {
  const [form, setForm] = useState({ username: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const pending = useRef<AbortController | null>(null);
  useEffect(() => () => pending.current?.abort(), []);

  const signIn = async (onSuccess: () => void) => {
    if (pending.current) return;
    const controller = new AbortController();
    pending.current = controller;
    setBusy(true);
    setError('');
    try {
      await api('/auth/login', { method: 'POST', body: JSON.stringify(form), signal: controller.signal });
      if (!controller.signal.aborted) onSuccess();
    } catch (reason) {
      if (!controller.signal.aborted) setError(reason instanceof ApiError && reason.status === 401 ? 'Användarnamn eller lösenord stämmer inte.' : (reason as Error).message);
    } finally {
      pending.current = null;
      if (!controller.signal.aborted) setBusy(false);
    }
  };

  return { form, setForm, error, busy, signIn };
}

function Login({ onSuccess, notice }: { onSuccess: () => void; notice: string }) {
  const login = useLoginState();
  return <main className="login"><section className="login-card">
    <Core mode="live" state={login.busy ? 'loading' : login.error ? 'error' : 'idle'} />
    <span className="eyebrow">JARVIS · Din privata arbetsyta</span><h1>Välkommen tillbaka.</h1><p>Plats för dina tankar och nästa steg.</p>
    {notice && <p className="inline-notice" role="status">{notice === 'Your session has ended. Sign in again.' ? 'Din session har avslutats. Logga in igen.' : notice}</p>}
    <form onSubmit={event => { event.preventDefault(); void login.signIn(onSuccess); }}>
      <label>Användarnamn<input name="username" autoComplete="username" autoCapitalize="none" spellCheck={false} value={login.form.username} onChange={event => login.setForm({ ...login.form, username: event.target.value })} required /></label>
      <label>Lösenord<input name="password" type="password" autoComplete="current-password" value={login.form.password} onChange={event => login.setForm({ ...login.form, password: event.target.value })} required /></label>
      {login.error && <p className="error" role="alert">{login.error}</p>}
      <button disabled={login.busy || !login.form.username || !login.form.password}>{login.busy ? 'Öppnar din arbetsyta…' : 'Öppna JARVIS'}<Icon name="chevron" /></button>
    </form><small><Icon name="lock" />Privat konto · Registrering är stängd</small>
  </section></main>;
}


function App() {
  const [workspace] = useState(() => new Workspace());
  const state = useSyncExternalStore(workspace.subscribe, workspace.getSnapshot);
  const authenticatedInPage = useRef(false);
  if (state.session === 'authenticated') authenticatedInPage.current = true;
  const { mode } = state, content = state[mode], thread = activeThread(state);
  const busy = state.busy !== null, status = workspaceStatus(state);
  const [view, setView] = useState<'command' | 'voice' | 'agents'>('command');
  const [showTasks, setShowTasks] = useState(false);
  const active = content.conversations.find(c => c.id === content.activeId);
  useEffect(() => { void workspace.load(); return workspace.cancelPending; }, [workspace]);
  useEffect(() => {
    const visibility = () => { document.documentElement.dataset.documentHidden = String(document.hidden); };
    visibility(); document.addEventListener('visibilitychange', visibility);
    return () => { document.removeEventListener('visibilitychange', visibility); delete document.documentElement.dataset.documentHidden; };
  }, []);
  useEffect(() => { if (state.session === 'signed-out') { setView('command'); setShowTasks(false); } }, [state.session]);
  if (state.session === 'checking' || state.session === 'unavailable') return <main className="boot"><Core mode="live" state={busy ? 'loading' : 'error'} /><section className="boot-status" aria-live="polite"><span className="eyebrow">JARVIS · Privat arbetsyta</span><h1>{busy ? 'Öppnar din arbetsyta' : 'Kunde inte öppna JARVIS'}</h1>{state.error && <p className="error" role="alert">{state.error.message}</p>}{busy ? <p>Laddar din session och dina samtal…</p> : <button onClick={() => void workspace.load()}><Icon name="refresh" />Försök igen</button>}</section></main>;
  if (state.session === 'signed-out') return <Login onSuccess={() => void workspace.loginSucceeded()} notice={authenticatedInPage.current ? state.notice : ''} />;
  const viewTitle = navigation.find(item => item.id === view)!.label;
  const idle = mode === 'demo' ? 'Demo · Bara i minnet' : state.capabilities.chat.state === 'available' ? 'AI tillgänglig' : 'AI ej ansluten';
  const activity = state.busy === 'load' ? 'Laddar' : state.busy === 'logout' ? 'Loggar ut' : state.busy ? status === 'TEXT GENERERAS' ? 'Text genereras' : 'Sparar' : state.error ? 'Behöver din uppmärksamhet' : idle;
  const openTasks = mode === 'demo' ? content.tasks.filter(t => t.status === 'open').length : content.counts.open;
  const navigate = (next: typeof view) => { setView(next); window.scrollTo({ top: 0, behavior: 'instant' }); };
  const example = (text: string) => { workspace.setDraft(text); const field = document.getElementById('command'); field?.focus({ preventScroll: true }); field?.scrollIntoView({ block: 'nearest' }); };
  const welcome = <section className="welcome"><Core mode={mode} status={status} /><span className="eyebrow">En sak i taget</span><h2>Vad vill du få gjort?</h2><p>Samla en tanke. Sätt nästa steg.</p><div className="examples" aria-label="Exempel som fyller i utkast"><button disabled={!active || active.status === 'archived'} onClick={() => example('Lägg till en uppgift att planera veckan')}><Icon name="plus" /><span>Planera veckan<small>Skapa en uppgift</small></span><Icon name="chevron" /></button><button disabled={!active || active.status === 'archived'} onClick={() => example('Add a task to review my notes')}><Icon name="plus" /><span>Review my notes<small>Try a command in English</small></span><Icon name="chevron" /></button></div></section>;
  return <div className={`shell mode-${mode}`}>
    <a className="skip-link" href="#main-content">Hoppa till innehållet</a>
    <aside className="sidebar"><div className="brand"><div className="brand-mark">J</div><div>JARVIS<small>Din privata arbetsyta</small></div></div><nav aria-label="Primary">{navigation.map(item => <button key={item.id} aria-label={item.label} data-view={item.id} className={view === item.id ? 'active' : ''} aria-current={view === item.id ? 'page' : undefined} onClick={() => navigate(item.id)}><Icon name={item.icon as IconName} /><span className="nav-label"><span className="nav-label-full">{item.label}</span><span className="nav-label-short">{item.shortLabel}</span></span></button>)}</nav><div className="sidebar-footer"><span className="status-label"><Icon name="lock" />Privat session</span><p>{mode === 'demo' ? 'Demo · Tillfälligt innehåll' : 'Live · Sparas på ditt konto'}</p></div></aside>
    <main id="main-content" tabIndex={-1} className={`canvas view-${view}`}>
      <header className="app-header"><div><span className="eyebrow">JARVIS <span className={`mode-tag ${mode}`}>/ {mode === 'demo' ? 'Demo' : 'Privat'}</span></span><h1>{viewTitle}</h1></div><div className="session-controls"><button className="ghost icon-button" aria-label="Visa uppgifter" aria-haspopup="dialog" onClick={() => setShowTasks(true)}><Icon name="tasks" /></button><button className="ghost icon-button" aria-label="Logga ut" title="Logga ut" disabled={state.busy === 'logout'} onClick={() => void workspace.logout()}><Icon name="logout" /></button></div></header>
      <div className="workspace-heading"><Conversations workspace={workspace} state={state} /><div className="request-state" role="status" data-status={status} aria-live="polite"><span className={`mode-tag ${mode}`}>{(state.pendingMode ?? mode) === 'demo' ? 'Demo' : 'Live'}</span><span className="status-dot" />{activity}</div></div>
      {view === 'command' && <div className={`chat-workspace ${!thread.messages.length ? 'is-empty' : 'has-messages'}`}>{!!thread.messages.length && <div className="compact-signature"><Core compact mode={mode} status={status} /><span>Tankar, uppgifter och nästa steg.</span></div>}<History workspace={workspace} state={state} empty={welcome} /><Recovery workspace={workspace} state={state} /><Composer workspace={workspace} state={state} /></div>}
      {view === 'voice' && <section className="focus-layout"><VoicePresentation mode={mode} /><div className="focus-conversation"><span className="eyebrow">Fortsätt med text</span><History workspace={workspace} state={state} empty={<></>} /><Recovery workspace={workspace} state={state} /><Composer workspace={workspace} state={state} /></div></section>}
      {view === 'agents' && <section className="agents-layout"><div className="agent-intro"><span className="eyebrow">Dina verktyg</span><h2>En grund att bygga vidare på.</h2><p>Se vad du kan använda nu och vad som väntar längre fram.</p></div><Capabilities state={state} /><Tasks workspace={workspace} state={state} /><button className="ghost" onClick={() => navigate('command')}><Icon name="arrowLeft" />Tillbaka till samtalet</button></section>}
      {showTasks && <Dialog className="task-sheet" title="Dina uppgifter" onClose={() => setShowTasks(false)}><Tasks workspace={workspace} state={state} /></Dialog>}
    </main>
    <aside className="context"><span className="eyebrow">Din överblick</span><section><div className="context-title"><Icon name="tasks" /><h2>Uppgifter</h2></div><p className="context-count"><strong>{openTasks}</strong> öppna{state.search ? ' i sökningen' : ''}</p>{content.tasks.filter(task => task.status === 'open').slice(0, 3).map(task => <p className="context-task" key={task.id}><span />{task.title}</p>)}{!openTasks && <p>Lite mer utrymme för det som kommer härnäst.</p>}<button className="ghost" onClick={() => setShowTasks(true)}>Hantera uppgifter<Icon name="chevron" /></button></section><section><div className="context-title"><Icon name="shield" /><h2>Privat arbetsyta</h2></div><p>{mode === 'demo' ? 'Demo sparas bara i minnet och försvinner vid omladdning.' : 'Samtal och uppgifter sparas på ditt konto. Utkast finns bara i den här sessionen.'}</p></section><section><span className="status-label"><span className="status-dot" />{idle}</span><p className="context-footnote">Röst ej ansluten</p><button className="ghost" onClick={() => navigate('agents')}>Visa förmågor<Icon name="chevron" /></button></section></aside>
  </div>;
}
createRoot(document.getElementById('root')!).render(<React.StrictMode><App /></React.StrictMode>);
