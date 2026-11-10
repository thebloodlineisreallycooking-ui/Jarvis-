import React, { useRef, useState } from 'react';
import { Workspace, type WorkspaceState } from '../workspace';
import { Dialog } from './Dialog';
import { Icon } from './Icon';
export function Conversations({ workspace, state }: { workspace: Workspace; state: WorkspaceState }) {
  const content = state[state.mode], current = content.conversations.find(c => c.id === content.activeId);
  const [dialog, setDialog] = useState<'list' | 'menu' | 'new' | 'rename' | null>(null), [title, setTitle] = useState('');
  const trigger = useRef<HTMLButtonElement>(null);
  const edit = (kind: 'new' | 'rename') => { setTitle(kind === 'new' ? '' : current?.title ?? ''); setDialog(kind); };
  return <section className="thread-controls" aria-label="Samtalsval">
    <button ref={trigger} className="conversation-trigger ghost" aria-label={`Välj samtal: ${current?.title ?? 'Inget valt'}`} aria-haspopup="dialog" onClick={() => setDialog('list')}><Icon name="command" /><span><small>{current?.status === 'archived' ? 'Arkiverat samtal' : 'Aktivt samtal'}</small><b>{current?.title ?? 'Välj ett samtal'}</b></span><Icon name="chevron" /></button>
    <div className="thread-actions"><button className="icon-button ghost" aria-label="Nytt samtal" title="Nytt samtal" disabled={!!state.busy} onClick={() => edit('new')}><Icon name="plus" /></button><button className="icon-button ghost" aria-label="Samtalsalternativ" aria-haspopup="dialog" disabled={!current} onClick={() => setDialog('menu')}><Icon name="more" /></button></div>
    {current?.status === 'archived' && <p className="archive-notice" role="status">Samtalet är arkiverat. <button className="ghost" disabled={!!state.busy} onClick={() => void workspace.patchConversation(current.id, { status: 'open' })}>Återöppna samtal</button></p>}
    {dialog && <Dialog className="conversation-sheet" title={dialog === 'list' ? 'Dina samtal' : dialog === 'menu' ? 'Samtalsalternativ' : dialog === 'new' ? 'Nytt samtal' : 'Byt samtalsnamn'} onClose={() => setDialog(null)}>
      {dialog === 'list' ? <><p className="sheet-description">{state.mode === 'live' ? 'Privata samtal på ditt konto.' : 'Demo · Samtal som bara finns i minnet.'}</p><ul className="conversation-list">{content.conversations.map(c => {
        const latest = content.threads[c.id]?.messages.at(-1)?.createdAt;
        const activity = latest && latest > c.updatedAt ? latest : c.updatedAt;
        return <li key={c.id}><button aria-current={c.id === content.activeId ? 'true' : undefined} onClick={() => { void workspace.selectConversation(c.id); setDialog(null); }}><Icon name={c.status === 'archived' ? 'archive' : 'command'} /><span><b>{c.title}</b><small>{c.status === 'archived' ? 'Arkiverat · ' : ''}<time dateTime={activity} title="Senaste kända aktivitet">{new Date(activity).toLocaleString('sv-SE', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</time></small></span>{c.id === content.activeId && <Icon name="check" />}</button></li>;
      })}</ul>{state.mode === 'live' && content.conversationCursor && <button onClick={() => void workspace.loadMoreConversations()}>Fler samtal</button>}<div className="dialog-actions"><button className="primary" disabled={!!state.busy} onClick={() => edit('new')}><Icon name="plus" />Nytt samtal</button></div></> : dialog === 'menu' ? <div className="action-list"><p className="sheet-description">{current?.title}</p><button disabled={!!state.busy} onClick={() => edit('rename')}><Icon name="edit" />Byt namn</button><button disabled={!!state.busy} onClick={() => { if (current) void workspace.patchConversation(current.id, { status: current.status === 'open' ? 'archived' : 'open' }); setDialog(null); }}><Icon name="archive" />{current?.status === 'archived' ? 'Återöppna samtal' : 'Arkivera samtal'}</button></div> : <form onSubmit={event => { event.preventDefault(); if (dialog === 'new') void workspace.createConversation(title); else if (current) void workspace.patchConversation(current.id, { title }); setDialog(null); }}>
        <label>Samtalsnamn<input autoFocus value={title} onChange={event => setTitle(event.target.value)} aria-describedby="conversation-title-help" aria-invalid={title.trim().length > 100} /></label><p id="conversation-title-help">1–100 tecken · {title.trim().length}/100</p><div className="dialog-actions"><button type="button" onClick={() => setDialog(null)}>Avbryt</button><button className="primary" disabled={!title.trim() || title.trim().length > 100}>Spara samtal</button></div>
      </form>}
    </Dialog>}
  </section>;
}
