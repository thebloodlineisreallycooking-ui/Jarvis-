import React, { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { createRoot } from 'react-dom/client';
import type { Mode } from '../../shared/contracts';
import './styles.css';
import { api, ApiError } from './api';
import { Workspace, workspaceStatus } from './workspace';

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
  const { mode } = state;
  const busy = state.busy !== null;
  const text = state.drafts[mode];
  const { tasks, messages } = state[mode];
  const liveTasks = state.live.tasks;
  const status = workspaceStatus(state);
  const [view, setView] = useState<'command' | 'voice' | 'agents'>('command');
  const conversationRef = useRef<HTMLElement>(null);

  useEffect(() => { void workspace.load(); return workspace.cancelPending; }, [workspace]);
  useEffect(() => {
    const visibility = () => { document.documentElement.dataset.documentHidden = String(document.hidden); };
    visibility();
    document.addEventListener('visibilitychange', visibility);
    return () => { document.removeEventListener('visibilitychange', visibility); delete document.documentElement.dataset.documentHidden; };
  }, []);
  useEffect(() => { if (state.session === 'signed-out') setView('command'); }, [state.session]);
  useEffect(() => {
    const region = conversationRef.current;
    if (region) region.scrollTop = region.scrollHeight;
  }, [messages.length, mode, view]);

  if (state.session === 'checking' || state.session === 'unavailable') return (
    <main className="boot">
      <Core mode="live" status={busy ? 'LOADING' : 'ERROR'} />
      <section className="boot-status" aria-live="polite">
        <h1>{busy ? 'Checking your session…' : 'Unable to load JARVIS'}</h1>
        {state.error && <p className="error" role="alert">{state.error.message}</p>}
        {!busy && <button onClick={() => void workspace.load()}>Try again</button>}
      </section>
    </main>
  );
  if (state.session === 'signed-out') return <Login onSuccess={() => void workspace.loginSucceeded()} notice={state.notice} />;
  const viewTitle = view === 'command' ? 'Command Center' : view === 'voice' ? 'Voice Focus' : 'Agents & Knowledge';
  const viewSubtitle = view === 'command' ? 'What would you like to accomplish?' : view === 'voice' ? 'A focused conversation workspace.' : 'Your future intelligence workspace.';
  const conversation = (
    <section className="conversation" ref={conversationRef} tabIndex={0} aria-label={`${mode === 'live' ? 'Live' : 'Demo'} conversation`} aria-live="polite">
      {messages.length === 0 ? <div className="empty"><span className="empty-symbol">⌁</span><div><h2>Awaiting your first command</h2><p>Try “Add a task to review JARVIS”. Swedish is supported too.</p></div></div> : messages.map((message) => <article key={message.id} className={message.role}><span>{message.role === 'assistant' ? 'JARVIS' : 'YOU'} · {message.mode.toUpperCase()}</span><p>{message.text}</p></article>)}
    </section>
  );
  const composer = (
    <>
      <form className="composer" onSubmit={(event) => { event.preventDefault(); void workspace.submit(); }}>
        <span className="prompt">›</span>
        <label className="sr-only" htmlFor="command">Command</label>
        <input id="command" value={text} onChange={(event) => workspace.setDraft(event.target.value)} placeholder="Add a task to…" maxLength={300} disabled={busy} />
        <div className="mode-switch" role="group" aria-label="Execution mode">
          <button type="button" className={mode === 'live' ? 'selected' : ''} aria-pressed={mode === 'live'} onClick={() => workspace.setMode('live')}>Live</button>
          <button type="button" className={mode === 'demo' ? 'selected demo' : ''} aria-pressed={mode === 'demo'} onClick={() => workspace.setMode('demo')}>Demo</button>
        </div>
        <button className="send" aria-label="Send command" disabled={busy || !text.trim()}>{busy ? '···' : '↑'}</button>
      </form>
      <div className={`mode-notice ${mode}`}><i />{mode === 'live' ? 'LIVE · Tasks and messages are saved to your private account' : 'DEMO · Temporary preview — nothing will be saved'}</div>
    </>
  );

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand"><div className="brand-mark">J</div><div>JARVIS<small>PERSONAL INTELLIGENCE</small></div></div>
        <nav aria-label="Primary">
          {navigation.map((item) => <button key={item.id} aria-label={item.label} data-view={item.id} className={view === item.id ? 'active' : ''} disabled={!item.available} aria-current={view === item.id ? 'page' : undefined} onClick={() => item.available && setView(item.id as typeof view)} title={!item.available ? `${item.label} — later phase` : item.label}><span className="nav-icon">{item.icon}</span><span className="nav-label">{item.label}</span>{!item.available && <em>Later</em>}</button>)}
        </nav>
        <div className="sidebar-footer"><span><i /> OWNER SESSION</span></div>
      </aside>

      <main className={`canvas view-${view}`}>
        <header>
          <div><span className="eyebrow">JARVIS / {viewTitle.toUpperCase()}</span><h1>{viewTitle}</h1><p>{viewSubtitle}</p></div>
          <div className="session-controls"><div className="system-pill"><i /><span>Authenticated<small>Private owner session</small></span></div><button disabled={state.busy === 'logout'} onClick={() => void workspace.logout()}>{state.busy === 'logout' ? 'Signing out…' : 'Sign out'}</button></div>
        </header>
        <div className="request-state" role="status" aria-live="polite">{(state.pendingMode ?? mode).toUpperCase()} · {status}</div>
        {state.error && <section className="error-panel" role="alert">
          <p>{state.error.message}</p>
          {state.error.operation === 'logout'
            ? <button disabled={busy} onClick={() => void workspace.logout()}>Try signing out again</button>
            : state.error.kind === 'request'
              ? <button onClick={() => { setView('command'); requestAnimationFrame(() => document.getElementById('command')?.focus()); }}>Edit command</button>
              : <button disabled={busy} onClick={() => void workspace.load()}>Retry loading Live data</button>}
        </section>}

        {view === 'command' && <>
          <section className="core-stage">
            <div className="telemetry telemetry-left"><span>SESSION</span><strong>PRIVATE</strong><small>Owner authenticated</small></div>
            <Core mode={mode} status={status} />
            <div className="telemetry telemetry-right"><span>MODE</span><strong>{mode.toUpperCase()}</strong><small>{mode === 'live' ? 'Writes enabled' : 'No persistence'}</small></div>
            <div className="core-state"><span /><b>JARVIS</b> · {status}</div>
          </section>
          {conversation}
          {composer}
        </>}

        {view === 'voice' && <section className="focus-layout">
          <div className="voice-visual">
            <Core mode={mode} status={status} />
            <div className="voice-status"><span className="eyebrow">VOICE INPUT</span><strong>Not configured</strong><p>No microphone or speech provider is connected. Continue the same conversation with text below.</p></div>
          </div>
          <div className="focus-conversation">{conversation}{composer}</div>
        </section>}

        {view === 'agents' && <section className="agents-layout">
          <div className="agent-intro"><span className="eyebrow">PRIVATE WORKSPACE</span><h2>Agents &amp; Knowledge</h2><p>This view is ready for future connections, but no AI provider, agent, or knowledge source is configured.</p></div>
          <div className="empty-grid">
            <article><span className="empty-icon">◇</span><div><h3>No agents connected</h3><p>Provider-backed agents will appear here after a later, explicit integration step.</p></div><button disabled>Connect provider · Later</button></article>
            <article><span className="empty-icon">▤</span><div><h3>No knowledge sources</h3><p>No files, drives, memory stores, or external data sources are connected.</p></div><button disabled>Add source · Later</button></article>
          </div>
          <section className="task-panel"><div className="panel-title"><div><span className="eyebrow">LOCAL WORKSPACE</span><h2>{mode === 'live' ? 'Persisted tasks · Live' : 'Temporary tasks · Demo'}</h2></div><strong>{tasks.length}</strong></div>{tasks.length === 0 ? <div className="task-empty">No {mode === 'live' ? 'Live' : 'Demo'} tasks yet. Create one from Command Center or Voice Focus.</div> : <ul>{tasks.map((task, index) => <li key={`${mode}-${task.id}-${index}`}><span>○</span><div><b>{task.title}</b><small>Created {new Date(task.createdAt).toLocaleDateString()}</small></div><em>{task.status.toUpperCase()}</em></li>)}</ul>}</section>
        </section>}
      </main>

      <aside className="context">
        <div className="context-heading"><span className="eyebrow">CURRENT CONTEXT</span><i /></div>
        <section className="metric-card"><div><span>PERSISTED LIVE TASKS</span><strong>{String(liveTasks.length).padStart(2, '0')}</strong></div><div className="mini-ring"><span>{liveTasks.length}</span></div><small>Loaded from your account</small></section>
        <section><h2>Available now</h2><ul><li><i className="ready" /><span>Task capture<b>{busy ? status : state.error ? 'Check app status' : 'Available'}</b></span></li><li><i className="ready" /><span>Text conversation<b>{busy ? status : state.error ? 'Check app status' : 'Available'}</b></span></li><li><i /><span>Voice input<b>Not configured</b></span></li><li><i /><span>Agents &amp; knowledge<b>Not connected</b></span></li></ul></section>
        <section className="activity"><h2>Actual app state</h2><div><span>VIEW</span><b>{viewTitle}</b></div><div><span>MODE</span><b>{mode}</b></div><div><span>MESSAGES</span><b>{messages.length}</b></div></section>
        <p className="notice"><i>i</i><span><b>Persistence boundary</b>Demo items disappear on refresh. Live items use SQLite; durability depends on the configured host storage.</span></p>
      </aside>
    </div>
  );
}

createRoot(document.getElementById('root')!).render(<React.StrictMode><App /></React.StrictMode>);
