import React, { useLayoutEffect, useRef } from 'react';
import { activeThread, type Workspace, type WorkspaceState } from '../workspace';
import { isSubmitShortcut } from '../composer-input';
import { Icon } from './Icon';

export function Composer({ workspace, state }: { workspace: Workspace; state: WorkspaceState }) {
  const thread = activeThread(state), content = state[state.mode];
  const current = content.conversations.find(c => c.id === content.activeId);
  const input = useRef<HTMLTextAreaElement>(null), composing = useRef(false);
  const length = thread.draft.trim().length;
  const disabled = !current || current.status === 'archived';
  const sendDisabled = disabled || !!state.busy || !length || length > 2000;
  useLayoutEffect(() => {
    const element = input.current; if (!element) return;
    const fit = () => { element.style.height = '0px'; const height = element.scrollHeight; element.style.height = `${Math.min(192, Math.max(56, height))}px`; element.style.overflowY = height > 192 ? 'auto' : 'hidden'; };
    fit(); let width = element.clientWidth;
    const observer = new ResizeObserver(() => { if (element.clientWidth !== width) { width = element.clientWidth; fit(); } });
    observer.observe(element); return () => observer.disconnect();
  }, [thread.draft, content.activeId, state.mode]);
  return <div className="composer-dock">
    <form className={`composer ${state.mode}`} aria-label="Skriv ett meddelande" onSubmit={event => { event.preventDefault(); if (!sendDisabled && !composing.current) void workspace.submit(); }}>
      <label className="sr-only" htmlFor="command">Command</label>
      <textarea ref={input} id="command" rows={2} value={thread.draft} onChange={event => workspace.setDraft(event.target.value)} placeholder={disabled ? 'Återöppna samtalet för att skriva' : 'Skriv en tanke eller lägg till en uppgift…'} disabled={disabled} aria-invalid={length > 2000} aria-describedby="composer-help" onCompositionStart={() => { composing.current = true; }} onCompositionEnd={() => { composing.current = false; }} onKeyDown={event => { if (isSubmitShortcut(event.nativeEvent, composing.current)) { event.preventDefault(); if (!sendDisabled) void workspace.submit(); } }} />
      <div className="composer-toolbar"><div className="mode-switch" role="group" aria-label="Execution mode">{(['live', 'demo'] as const).map(mode => <button key={mode} type="button" className={state.mode === mode ? `selected ${mode}` : ''} aria-pressed={state.mode === mode} onClick={() => workspace.setMode(mode)}>{mode === 'live' ? <Icon name="lock" /> : <span className="demo-dot" />}{mode === 'live' ? 'Live' : 'Demo'}</button>)}</div><span className="keyboard-hint">Ctrl/⌘ + Enter</span><button className="send" aria-label="Send command" disabled={sendDisabled}><Icon name={state.busy ? 'more' : 'arrow'} /></button></div>
    </form>
    <div id="composer-help" className={`mode-notice ${state.mode}`}><span>{state.mode === 'live' ? 'Privat på ditt konto' : 'Demo · Bara i minnet'}</span><span className={length > 2000 ? 'error' : ''}>{length > 2000 ? 'Högst 2 000 tecken · ' : ''}{length}/2000</span></div>
  </div>;
}
