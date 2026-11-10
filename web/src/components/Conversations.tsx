import React, { useState } from 'react';
import { Workspace, type WorkspaceState } from '../workspace';
import { Dialog } from './Dialog';
export function Conversations({ workspace, state }: { workspace: Workspace; state: WorkspaceState }) {
  const content = state[state.mode], current = content.conversations.find(c => c.id === content.activeId);
  const [dialog, setDialog] = useState<'new' | 'rename' | null>(null), [title, setTitle] = useState('');
  return <section className="thread-controls" aria-label="Samtalsval">
    <label>Samtal<select value={content.activeId ?? ''} onChange={event => void workspace.selectConversation(event.target.value)}>
      {!content.activeId && <option value="">Välj eller skapa ett samtal</option>}
      {content.conversations.map(c => <option key={c.id} value={c.id}>{c.title}{c.status === 'archived' ? ' · Arkiverat' : ''}</option>)}
    </select></label>
    <div className="thread-actions"><button disabled={!!state.busy} onClick={() => { setTitle(''); setDialog('new'); }}>Nytt samtal</button>
      <button disabled={!current || !!state.busy} onClick={() => { setTitle(current?.title ?? ''); setDialog('rename'); }}>Byt namn</button>
      <button disabled={!current || !!state.busy} onClick={() => { if (current) void workspace.patchConversation(current.id, { status: current.status === 'open' ? 'archived' : 'open' }); }}>{current?.status === 'archived' ? 'Återöppna samtal' : 'Arkivera samtal'}</button>
      {state.mode === 'live' && content.conversationCursor && <button onClick={() => void workspace.loadMoreConversations()}>Fler samtal</button>}
    </div>
    {current?.status === 'archived' && <p role="status">Samtalet är arkiverat. Historik och utkast finns kvar; återöppna för att skriva.</p>}
    {dialog && <Dialog title={dialog === 'new' ? 'Nytt samtal' : 'Byt samtalsnamn'} onClose={() => setDialog(null)}><form onSubmit={event => { event.preventDefault(); if (dialog === 'new') void workspace.createConversation(title); else if (current) void workspace.patchConversation(current.id, { title }); setDialog(null); }}>
      <label>Samtalsnamn<input autoFocus value={title} onChange={event => setTitle(event.target.value)} /></label><p>1–100 tecken</p>
      <div className="dialog-actions"><button type="button" onClick={() => setDialog(null)}>Avbryt</button><button disabled={!title.trim() || title.trim().length > 100}>Spara samtal</button></div>
    </form></Dialog>}
  </section>;
}
