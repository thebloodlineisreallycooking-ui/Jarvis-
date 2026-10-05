import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import type { Message, Mode, Task } from '../../shared/contracts';
import './styles.css';

async function api(path: string, options?: RequestInit) {
  const response = await fetch(`/api${path}`, {
    ...options,
    headers: { 'content-type': 'application/json', ...(options?.headers || {}) },
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error || `Request failed (${response.status})`);
  }
  return response.status === 204 ? null : response.json();
}

const navigation = [
  { id: 'command', icon: '⌂', label: 'Command Center', available: true },
  { id: 'voice', icon: '◉', label: 'Voice Focus', available: true },
  { id: 'agents', icon: '◇', label: 'Agents & Knowledge', available: true },
  { id: 'screen', icon: '▣', label: 'Screen', available: false },
  { id: 'workflows', icon: '⌁', label: 'Workflows', available: false },
  { id: 'memory', icon: '◎', label: 'Memory', available: false },
];

function Core({ mode }: { mode: Mode }) {
  return (
    <div className={`core ${mode}`} aria-label={`JARVIS core: ${mode} mode, idle`}>
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

  const signIn = async (onSuccess: () => void) => {
    setBusy(true);
    setError('');
    try {
      await api('/auth/login', { method: 'POST', body: JSON.stringify(form) });
      onSuccess();
    } catch (reason) {
      setError((reason as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return { form, setForm, error, busy, signIn };
}

function App() {
  const [authenticated, setAuthenticated] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState('Add a task to review JARVIS');
  const [mode, setMode] = useState<Mode>('live');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const login = useLoginState();
  const [view, setView] = useState<'command' | 'voice' | 'agents'>('command');

  const load = async () => {
    try {
      const [taskResult, messageResult] = await Promise.all([api('/tasks'), api('/messages')]);
      setTasks(taskResult.tasks);
      setMessages(messageResult.messages);
      setAuthenticated(true);
    } catch {
      setAuthenticated(false);
    } finally {
      setCheckingSession(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      const result = await api('/commands', {
        method: 'POST',
        body: JSON.stringify({ text, mode }),
      });
      if (result.persisted) await load();
      else {
        setMessages((current) => [...current, ...result.messages]);
        setTasks((current) => [result.task, ...current]);
      }
      setText('');
    } catch (reason) {
      setError((reason as Error).message);
    } finally {
      setBusy(false);
    }
  };

  if (checkingSession) return <main className="boot"><Core mode="live" /><span>INITIALIZING SECURE LINK</span></main>;

  if (!authenticated) {
    return (
      <main className="login">
        <div className="login-ambient" aria-hidden="true"><Core mode="live" /></div>
        <section className="login-card">
          <div className="login-mark"><span>J</span></div>
          <span className="eyebrow">PRIVATE SYSTEM / OWNER ACCESS</span>
          <h1>Welcome back.</h1>
          <p>Authenticate to enter your private command center.</p>
          <form onSubmit={(event) => { event.preventDefault(); void login.signIn(load); }}>
            <label>Username<input autoComplete="username" value={login.form.username} onChange={(event) => login.setForm({ ...login.form, username: event.target.value })} /></label>
            <label>Password<input type="password" autoComplete="current-password" value={login.form.password} onChange={(event) => login.setForm({ ...login.form, password: event.target.value })} /></label>
            {login.error && <p className="error" role="alert">{login.error}</p>}
            <button disabled={login.busy || !login.form.username || !login.form.password}>{login.busy ? 'Authenticating…' : 'Enter JARVIS'}<span>→</span></button>
          </form>
          <small><i /> Encrypted session · Account creation disabled</small>
        </section>
      </main>
    );
  }

  const liveTasks = tasks.filter((task) => task.mode === 'live');
  const viewTitle = view === 'command' ? 'Command Center' : view === 'voice' ? 'Voice Focus' : 'Agents & Knowledge';
  const viewSubtitle = view === 'command' ? 'What would you like to accomplish?' : view === 'voice' ? 'A focused conversation workspace.' : 'Your future intelligence workspace.';
  const conversation = (
    <section className="conversation" aria-live="polite">
      {messages.length === 0 ? <div className="empty"><span className="empty-symbol">⌁</span><div><h2>Awaiting your first command</h2><p>Try “Add a task to review JARVIS”. Swedish is supported too.</p></div></div> : messages.map((message) => <article key={message.id} className={message.role}><span>{message.role === 'assistant' ? 'JARVIS' : 'YOU'} · {message.mode.toUpperCase()}</span><p>{message.text}</p></article>)}
    </section>
  );
  const composer = (
    <>
      <form className="composer" onSubmit={submit}>
        <span className="prompt">›</span>
        <label className="sr-only" htmlFor="command">Command</label>
        <input id="command" value={text} onChange={(event) => setText(event.target.value)} placeholder="Type a command…" disabled={busy} />
        <div className="mode-switch" aria-label="Execution mode">
          <button type="button" className={mode === 'live' ? 'selected' : ''} onClick={() => setMode('live')}>Live</button>
          <button type="button" className={mode === 'demo' ? 'selected demo' : ''} onClick={() => setMode('demo')}>Demo</button>
        </div>
        <button className="send" aria-label="Send command" disabled={busy || !text.trim()}>{busy ? '···' : '↑'}</button>
      </form>
      <div className={`mode-notice ${mode}`}><i />{mode === 'live' ? 'LIVE · Commands are saved to your private SQLite workspace' : 'DEMO · Temporary preview — nothing will be saved'}</div>
      {error && <p className="error banner" role="alert">{error}</p>}
    </>
  );

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand"><div className="brand-mark">J</div><div>JARVIS<small>PERSONAL INTELLIGENCE</small></div></div>
        <nav aria-label="Primary">
          {navigation.map((item) => <button key={item.id} aria-label={item.label} data-view={item.id} className={view === item.id ? 'active' : ''} disabled={!item.available} aria-current={view === item.id ? 'page' : undefined} onClick={() => item.available && setView(item.id as typeof view)} title={!item.available ? `${item.label} — later phase` : item.label}><span className="nav-icon">{item.icon}</span><span className="nav-label">{item.label}</span>{!item.available && <em>Later</em>}</button>)}
        </nav>
        <div className="sidebar-footer"><span><i /> OWNER SESSION</span><button onClick={async () => { await api('/auth/logout', { method: 'POST' }); setAuthenticated(false); }}>Sign out</button></div>
      </aside>

      <main className={`canvas view-${view}`}>
        <header>
          <div><span className="eyebrow">JARVIS / {viewTitle.toUpperCase()}</span><h1>{viewTitle}</h1><p>{viewSubtitle}</p></div>
          <div className="system-pill"><i /><span>Authenticated<small>Private owner session</small></span></div>
        </header>

        {view === 'command' && <>
          <section className="core-stage">
            <div className="telemetry telemetry-left"><span>SESSION</span><strong>PRIVATE</strong><small>Owner authenticated</small></div>
            <Core mode={mode} />
            <div className="telemetry telemetry-right"><span>MODE</span><strong>{mode.toUpperCase()}</strong><small>{mode === 'live' ? 'Writes enabled' : 'No persistence'}</small></div>
            <div className="core-state"><span /><b>JARVIS</b> · READY</div>
          </section>
          {conversation}
          {composer}
        </>}

        {view === 'voice' && <section className="focus-layout">
          <div className="voice-visual">
            <Core mode={mode} />
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
          <section className="task-panel"><div className="panel-title"><div><span className="eyebrow">LOCAL WORKSPACE</span><h2>Persisted tasks</h2></div><strong>{liveTasks.length}</strong></div>{liveTasks.length === 0 ? <div className="task-empty">No Live tasks yet. Create one from Command Center or Voice Focus.</div> : <ul>{liveTasks.map((task) => <li key={task.id}><span>✓</span><div><b>{task.title}</b><small>Created {new Date(task.createdAt).toLocaleDateString()}</small></div><em>OPEN</em></li>)}</ul>}</section>
        </section>}
      </main>

      <aside className="context">
        <div className="context-heading"><span className="eyebrow">CURRENT CONTEXT</span><i /></div>
        <section className="metric-card"><div><span>OPEN TASKS</span><strong>{String(liveTasks.length).padStart(2, '0')}</strong></div><div className="mini-ring"><span>{liveTasks.length}</span></div><small>Loaded from your account</small></section>
        <section><h2>Available now</h2><ul><li><i className="ready" /><span>Task capture<b>Operational</b></span></li><li><i className="ready" /><span>Text conversation<b>Operational</b></span></li><li><i /><span>Voice input<b>Not configured</b></span></li><li><i /><span>Agents &amp; knowledge<b>Not connected</b></span></li></ul></section>
        <section className="activity"><h2>Actual app state</h2><div><span>VIEW</span><b>{viewTitle}</b></div><div><span>MODE</span><b>{mode}</b></div><div><span>MESSAGES</span><b>{messages.length}</b></div></section>
        <p className="notice"><i>i</i><span><b>Persistence boundary</b>Demo items disappear on refresh. Live items use SQLite; durability depends on the configured host storage.</span></p>
      </aside>
    </div>
  );
}

createRoot(document.getElementById('root')!).render(<React.StrictMode><App /></React.StrictMode>);
