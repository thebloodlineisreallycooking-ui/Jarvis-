import React, { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { createRoot } from 'react-dom/client';
import type { Mode } from '../../shared/contracts';
import './styles.css';
import { Conversations } from './components/Conversations';
import { Tasks } from './components/Tasks';
import { History } from './components/History';
import { api, ApiError } from './api';
import { Workspace, workspaceStatus, activeThread } from './workspace';

const navigation = [
  { id: 'command', icon: '⌂', label: 'Command Center', available: true },
  { id: 'voice', icon: '◉', label: 'Voice Focus', available: true },
  { id: 'agents', icon: '◇', label: 'Agents & Knowledge', available: true },
  { id: 'screen', icon: '▣', label: 'Screen', available: false },
  { id: 'workflows', icon: '⌁', label: 'Workflows', available: false },
  { id: 'memory', icon: '◎', label: 'Memory', available: false },
];

function Core({ mode, status = 'IDLE' }: { mode: Mode; status?: string }) {
  return (
    <div className={`core ${mode}`} role="img" aria-label={`JARVIS core: ${mode} mode, ${status.toLowerCase()}`}>
      <div className="halo halo-outer" />
      <div className="halo halo-ticks" />
      <div className="halo halo-inner" />
      <div className="axis axis-x" />
      <div className="axis axis-y" />
      <div className="core-orb">
        <div className="energy energy-one" />
        <div className="energy energy-two" />
        <span>J</span>
      </div>
      <span className="node node-one" />
      <span className="node node-two" />
      <span className="node node-three" />
    </div>
  );
}

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
      if (!controller.signal.aborted) setError(reason instanceof ApiError && reason.status === 401 ? 'Username or password is incorrect.' : (reason as Error).message);
    } finally {
      pending.current = null;
      if (!controller.signal.aborted) setBusy(false);
    }
  };

  return { form, setForm, error, busy, signIn };
}

function Login({ onSuccess, notice }: { onSuccess: () => void; notice: string }) {
  const login = useLoginState();
    return (
      <main className="login">
        <div className="login-ambient" aria-hidden="true"><Core mode="live" /></div>
        <section className="login-card">
          <div className="login-mark"><span>J</span></div>
          <span className="eyebrow">PRIVATE SYSTEM / OWNER ACCESS</span>
          <h1>Welcome back.</h1>
          <p>Authenticate to enter your private command center.</p>
          {notice && <p role="status">{notice}</p>}
          <form onSubmit={(event) => { event.preventDefault(); void login.signIn(onSuccess); }}>
            <label>Username<input autoComplete="username" value={login.form.username} onChange={(event) => login.setForm({ ...login.form, username: event.target.value })} /></label>
            <label>Password<input type="password" autoComplete="current-password" value={login.form.password} onChange={(event) => login.setForm({ ...login.form, password: event.target.value })} /></label>
            {login.error && <p className="error" role="alert">{login.error}</p>}
            <button disabled={login.busy || !login.form.username || !login.form.password}>{login.busy ? 'Authenticating…' : 'Enter JARVIS'}<span>→</span></button>
          </form>
          <small><i /> Private owner access · Account creation disabled</small>
        </section>
      </main>
    );
  }


function App() {
  const [workspace] = useState(() => new Workspace());
  const state = useSyncExternalStore(workspace.subscribe, workspace.getSnapshot);
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
  if (state.session === 'checking' || state.session === 'unavailable') return <main className="boot"><Core mode="live" status={busy ? 'LOADING' : 'ERROR'} /><section className="boot-status" aria-live="polite"><h1>{busy ? 'Checking your session…' : 'Unable to load JARVIS'}</h1>{state.error && <p className="error" role="alert">{state.error.message}</p>}{!busy && <button onClick={() => void workspace.load()}>Try again</button>}</section></main>;
  if (state.session === 'signed-out') return <Login onSuccess={() => void workspace.loginSucceeded()} notice={state.notice} />;
  const viewTitle = view === 'command' ? 'Command Center' : view === 'voice' ? 'Voice Focus' : 'Agents & Knowledge';
  const composer = <>
    <form className="composer" onSubmit={event => { event.preventDefault(); void workspace.submit(); }}>
      <span className="prompt">›</span><label className="sr-only" htmlFor="command">Command</label>
      <textarea id="command" rows={2} value={thread.draft} onChange={event => workspace.setDraft(event.target.value)} placeholder="Skriv ett meddelande eller en uppgift…" disabled={!active || active.status === 'archived'} />
      <div className="mode-switch" role="group" aria-label="Execution mode">{(['live', 'demo'] as const).map(value => <button key={value} type="button" className={mode === value ? `selected ${value}` : ''} aria-pressed={mode === value} onClick={() => workspace.setMode(value)}>{value === 'live' ? 'Live' : 'Demo'}</button>)}</div>
      <button className="send" aria-label="Send command" disabled={busy || !thread.draft.trim() || thread.draft.trim().length > 2000 || !active || active.status === 'archived'}>{busy ? '···' : '↑'}</button>
    </form>
    <div className={`mode-notice ${mode}`}><i />{mode === 'live' ? 'LIVE · Uppgifter och samtal sparas på ditt privata konto' : 'DEMO · Bara i minnet; försvinner vid omladdning'} · {thread.draft.trim().length}/2000</div>
  </>;
  const unresolved = Object.values(state.operations).filter(op => op.status === 'unknown' || op.status === 'pending');
  return <div className="shell">
    <aside className="sidebar"><div className="brand"><div className="brand-mark">J</div><div>JARVIS<small>PERSONAL INTELLIGENCE</small></div></div><nav aria-label="Primary">{navigation.filter(item => item.available).map(item => <button key={item.id} aria-label={item.label} data-view={item.id} className={view === item.id ? 'active' : ''} aria-current={view === item.id ? 'page' : undefined} onClick={() => setView(item.id as typeof view)}><span className="nav-icon">{item.icon}</span><span className="nav-label">{item.label}</span></button>)}</nav><div className="sidebar-footer"><span>OWNER SESSION</span></div></aside>
    <main className={`canvas view-${view}`}>
      <header><div><span className="eyebrow">JARVIS / {viewTitle.toUpperCase()}</span><h1>{viewTitle}</h1><p>Dina uppgifter, dina samtal.</p></div><div className="session-controls"><button aria-expanded={showTasks} onClick={() => setShowTasks(!showTasks)}>{showTasks ? 'Dölj uppgifter' : 'Visa uppgifter'}</button><button disabled={state.busy === 'logout'} onClick={() => void workspace.logout()}>{state.busy === 'logout' ? 'Signing out…' : 'Sign out'}</button></div></header>
      <div className="request-state" role="status" aria-live="polite">{(state.pendingMode ?? mode).toUpperCase()} · {status}</div>
      {state.error && <section className="error-panel" role="alert"><p>{state.error.message}</p>{state.error.current && <p>Aktuell titel: {state.error.current.title}. Läs in aktuell version innan du ändrar igen.</p>}{state.error.operation === 'logout' ? <button disabled={busy} onClick={() => void workspace.logout()}>Try signing out again</button> : <button disabled={busy} onClick={() => void workspace.load()}>Läs in aktuella data</button>}</section>}
      {state.notice && <p role="status">{state.notice}</p>}
      {unresolved.map(op => <section className="operation-panel" key={op.id} aria-label="Operationsstatus"><p><b>{op.label}</b> · {state[op.mode].conversations.find(c => c.id === op.conversationId)?.title ?? 'Ursprungligt samtal'} · {op.status === 'pending' ? 'Pågår' : 'Resultat okänt — kan vara sparat'}</p>{op.status === 'pending' && op.path === '/chat/stream' && <button onClick={() => workspace.stopOperation(op.id)}>Stoppa mottagning</button>}{op.status === 'unknown' && <><button disabled={busy} onClick={() => void workspace.retry(op.id)}>Försök samma operation igen</button>{!op.path.startsWith('/conversations') && <button disabled={busy} onClick={() => void workspace.checkOperation(op.id)}>Kontrollera sparat resultat</button>}</>}</section>)}
      <Conversations workspace={workspace} state={state} />
      {showTasks && <Tasks workspace={workspace} state={state} />}
      {view === 'command' && <><section className="core-stage"><Core mode={mode} status={status} /><div className="core-state"><b>JARVIS</b> · {status}</div></section><History workspace={workspace} state={state} />{composer}</>}
      {view === 'voice' && <section className="focus-layout"><div className="voice-visual"><Core mode={mode} status={status} /><div className="voice-status"><span className="eyebrow">VOICE INPUT</span><strong>Röst ej ansluten</strong><p>Mikrofon, transkription och talsyntes är avstängda. Fortsätt samtalet med text.</p></div></div><div className="focus-conversation"><History workspace={workspace} state={state} />{composer}</div></section>}
      {view === 'agents' && <section className="agents-layout"><div className="agent-intro"><span className="eyebrow">PRIVATE WORKSPACE</span><h2>Agents &amp; Knowledge</h2><p>Inga agenter eller kunskapskällor är anslutna. AI: {state.capabilities.chat.state === 'available' ? 'Tillgänglig via servern' : 'Ej ansluten'}.</p></div>{!showTasks && <Tasks workspace={workspace} state={state} />}<p>Fortsätt skriva i Command Center eller Voice Focus. Ditt utkast finns kvar.</p></section>}
    </main>
    <aside className="context"><span className="eyebrow">AKTUELLT LÄGE</span><section><h2>Uppgifter och samtal</h2><p>Live sparas på ditt konto. Demo och utkast finns bara i minnet.</p><p>{state.live.counts.open} öppna · {state.live.counts.completed} slutförda uppgifter i aktuellt sökresultat</p></section><section><h2>Förmågor</h2><p>AI: {state.capabilities.chat.state === 'available' ? 'Tillgänglig' : 'Ej ansluten'}</p><p>Röst ej ansluten</p></section></aside>
  </div>;
}
createRoot(document.getElementById('root')!).render(<React.StrictMode><App /></React.StrictMode>);
