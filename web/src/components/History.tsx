import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { activeThread, Workspace, type WorkspaceState } from '../workspace';
import { Icon } from './Icon';
export function History({ workspace, state, empty }: { workspace: Workspace; state: WorkspaceState; empty?: React.ReactNode }) {
  const thread = activeThread(state), id = state[state.mode].activeId, key = `${state.mode}:${id}`;
  const region = useRef<HTMLElement>(null), following = useRef(true), previousKey = useRef(key), previousLast = useRef('');
  const anchor = useRef<{ height: number; top: number; first: string; page: boolean } | null>(null);
  const [newContent, setNewContent] = useState(false);
  const last = thread.messages.at(-1)?.id ?? '';
  const partials = Object.values(state.operations).filter(op => op.conversationId === id && op.mode === state.mode && op.partial && op.status === 'pending');
  const partial = partials.map(op => op.partial).join('');
  const pageScroll = () => !!region.current && getComputedStyle(region.current).overflowY === 'visible';
  const metrics = () => pageScroll() ? { top: window.scrollY, height: document.documentElement.scrollHeight, viewport: window.innerHeight } : { top: region.current?.scrollTop ?? 0, height: region.current?.scrollHeight ?? 0, viewport: region.current?.clientHeight ?? 0 };
  const scroll = (top: number, page = pageScroll()) => { if (page) window.scrollTo({ top, behavior: 'instant' }); else if (region.current) region.current.scrollTop = top; };
  const track = () => { const m = metrics(); following.current = m.height - m.top - m.viewport < 120; if (following.current) setNewContent(false); };
  useEffect(() => { const listener = () => { if (pageScroll()) track(); }; window.addEventListener('scroll', listener, { passive: true }); return () => window.removeEventListener('scroll', listener); }, []);
  useLayoutEffect(() => {
    if (!region.current) return;
    if (previousKey.current !== key) { following.current = true; anchor.current = null; setNewContent(false); }
    if (anchor.current && thread.messages[0]?.id !== anchor.current.first) { const m = metrics(); scroll(anchor.current.top + m.height - anchor.current.height, anchor.current.page); anchor.current = null; }
    else if (following.current && (thread.messages.length || partial)) scroll(metrics().height);
    else if (last !== previousLast.current || partial) setNewContent(true);
    previousKey.current = key; previousLast.current = last;
  }, [key, thread.messages, last, partial]);
  return <div className={`history-wrap ${!thread.messages.length ? 'history-empty' : ''}`}>
    <section className="conversation" ref={region} tabIndex={thread.messages.length ? 0 : undefined} aria-label={`${state.mode === 'live' ? 'Live' : 'Demo'} conversation`} onScroll={() => { if (!pageScroll()) track(); }}>
      {thread.nextCursor && <div className="older-history"><button className="ghost" disabled={thread.loading} onClick={async () => { if (region.current && id) { const m = metrics(); anchor.current = { height: m.height, top: m.top, first: thread.messages[0]?.id ?? '', page: pageScroll() }; await workspace.loadThread(state.mode, id, true); anchor.current = null; } }}><Icon name="refresh" />Läs äldre historik</button></div>}
      {thread.loading && (thread.messages.length ? <p className="history-loading" role="status">Läser historik…</p> : <div className="history-skeleton" role="status"><span className="sr-only">Läser historik…</span><div /><div /><div /></div>)}
      {!thread.messages.length && !thread.loading ? empty ?? <div className="empty"><h2>Plats för dina tankar</h2><p>Skriv ett meddelande nedan. Det hör till det valda samtalet.</p></div> : thread.messages.map(message => <article key={message.id} className={`${message.role} message-${message.kind}`} data-message-id={message.id}><div className="message-meta"><span>{message.kind === 'system_notice' ? 'Systemnotis' : message.kind === 'command_result' ? <><Icon name="check" />Uppgiftsresultat</> : message.role === 'user' ? 'Du' : message.kind === 'legacy' ? 'Tidigare historik' : 'JARVIS'}</span><time dateTime={message.createdAt} title={new Date(message.createdAt).toLocaleString('sv-SE')}>{new Date(message.createdAt).toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' })}</time>{message.mode === 'demo' && <span className="mode-tag demo">Demo</span>}</div><p>{message.text}</p>{message.delivery === 'interrupted' && <p className="interrupted"><Icon name="alert" />Avbrutet · delvis sparat</p>}</article>)}
      {partials.map(op => <article key={op.id} className="assistant message-partial"><div className="message-meta"><span>JARVIS · delvis svar, pågår</span></div><p>{op.partial}</p></article>)}
    </section>
    {newContent && <button className="jump-latest" onClick={() => { scroll(metrics().height); following.current = true; setNewContent(false); }}>Nytt innehåll · Hoppa till slutet<Icon name="chevron" /></button>}
  </div>;
}
