import React, { useLayoutEffect, useRef, useState } from 'react';
import { activeThread, Workspace, type WorkspaceState } from '../workspace';
export function History({ workspace, state }: { workspace: Workspace; state: WorkspaceState }) {
  const thread = activeThread(state), id = state[state.mode].activeId, key = `${state.mode}:${id}`;
  const region = useRef<HTMLElement>(null), following = useRef(true), previousKey = useRef(key), previousLast = useRef('');
  const anchor = useRef<{ height: number; top: number; first: string } | null>(null);
  const [newContent, setNewContent] = useState(false);
  const last = thread.messages.at(-1)?.id ?? '';
  useLayoutEffect(() => {
    const element = region.current; if (!element) return;
    if (previousKey.current !== key) { following.current = true; anchor.current = null; setNewContent(false); }
    if (anchor.current && thread.messages[0]?.id !== anchor.current.first) { element.scrollTop = anchor.current.top + element.scrollHeight - anchor.current.height; anchor.current = null; }
    else if (following.current) element.scrollTop = element.scrollHeight;
    else if (last !== previousLast.current) setNewContent(true);
    previousKey.current = key; previousLast.current = last;
  }, [key, thread.messages, last]);
  return <div className="history-wrap">
    <section className="conversation" ref={region} tabIndex={0} aria-label={`${state.mode === 'live' ? 'Live' : 'Demo'} conversation`} onScroll={() => { const el = region.current; if (el) { following.current = el.scrollHeight - el.scrollTop - el.clientHeight < 48; if (following.current) setNewContent(false); } }}>
      {thread.nextCursor && <button disabled={thread.loading} onClick={async () => { const el = region.current; if (el && id) { anchor.current = { height: el.scrollHeight, top: el.scrollTop, first: thread.messages[0]?.id ?? '' }; await workspace.loadThread(state.mode, id, true); anchor.current = null; } }}>Läs äldre historik</button>}
      {thread.loading && <p role="status">Läser historik…</p>}
      {!thread.messages.length && !thread.loading ? <div className="empty"><span className="empty-symbol">⌁</span><div><h2>Här börjar ditt samtal</h2><p>Skriv på svenska eller engelska. Prova ”Lägg till en uppgift att granska JARVIS”. AI är inte ansluten.</p></div></div> : thread.messages.map(message => <article key={message.id} className={message.role} data-message-id={message.id}><span>{message.kind === 'system_notice' ? 'SYSTEMMEDDELANDE' : message.kind === 'command_result' ? 'UPPGIFTSRESULTAT' : message.role === 'user' ? 'DU' : message.kind === 'legacy' ? 'TIDIGARE HISTORIK' : 'AI-SVAR'} · {message.mode.toUpperCase()}{message.delivery === 'interrupted' ? ' · AVBRUTET, DELVIS SPARAT' : ''}</span><p>{message.text}</p></article>)}
      {Object.values(state.operations).filter(op => op.conversationId === id && op.mode === state.mode && op.partial && op.status === 'pending').map(op => <article key={op.id} className="assistant"><span>DELVIS SVAR · PÅGÅR</span><p>{op.partial}</p></article>)}
    </section>
    {newContent && <button className="jump-latest" onClick={() => { if (region.current) region.current.scrollTop = region.current.scrollHeight; following.current = true; setNewContent(false); }}>Nytt innehåll · Hoppa till slutet</button>}
  </div>;
}
