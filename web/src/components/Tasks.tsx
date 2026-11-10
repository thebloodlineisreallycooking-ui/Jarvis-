import React, { useState } from 'react';
import type { Task } from '../../../shared/contracts';
import { Workspace, type WorkspaceState } from '../workspace';
import { Dialog } from './Dialog';
export function Tasks({ workspace, state }: { workspace: Workspace; state: WorkspaceState }) {
  const [dialog, setDialog] = useState<{ kind: 'create' | 'edit' | 'delete'; task?: Task } | null>(null);
  const [title, setTitle] = useState(''), [search, setSearch] = useState(state.search);
  const content = state[state.mode];
  const demoMatches = content.tasks.filter(t => t.title.toLocaleLowerCase().includes(state.search.toLocaleLowerCase()));
  const tasks = state.mode === 'demo' ? demoMatches.filter(t => state.filter === 'all' || t.status === state.filter) : content.tasks;
  const counts = state.mode === 'demo' ? { all: demoMatches.length, open: demoMatches.filter(t => t.status === 'open').length, completed: demoMatches.filter(t => t.status === 'completed').length } : content.counts;
  const disabled = state.busy !== null || !content.activeId || content.conversations.find(c => c.id === content.activeId)?.status !== 'open';
  return <section className="task-panel" aria-label="Uppgifter">
    <div className="panel-title"><div><span className="eyebrow">{state.mode.toUpperCase()} · UPPGIFTER</span><h2>Dina uppgifter</h2></div><button disabled={disabled} onClick={() => { setTitle(''); setDialog({ kind: 'create' }); }}>Ny uppgift</button></div>
    <form className="task-search" onSubmit={event => { event.preventDefault(); void workspace.setTaskFilter(state.filter, search); }}>
      <label>Sök uppgifter<input value={search} maxLength={200} onChange={event => setSearch(event.target.value)} /></label><button>Sök</button>
    </form>
    <div className="task-filters" role="group" aria-label="Filtrera uppgifter">
      {(['open', 'completed', 'all'] as const).map(filter => <button key={filter} aria-pressed={state.filter === filter} onClick={() => void workspace.setTaskFilter(filter, search)}>{filter === 'open' ? 'Öppna' : filter === 'completed' ? 'Slutförda' : 'Alla'} ({counts[filter]})</button>)}
    </div>
    {!tasks.length ? <p className="task-empty">Inga uppgifter matchar. Skapa en uppgift eller ändra filtret.</p> : <ul>{tasks.map(task => <li key={task.id}>
      <div><b>{task.title}</b><small>{task.status === 'completed' ? 'Slutförd' : 'Öppen'} · {new Date(task.createdAt).toLocaleDateString('sv-SE')}</small></div>
      <div className="task-actions">
        <button disabled={disabled} aria-label={`${task.status === 'open' ? 'Slutför' : 'Återöppna'} ${task.title}`} onClick={() => void workspace.mutateTask(task, { status: task.status === 'open' ? 'completed' : 'open' })}>{task.status === 'open' ? 'Slutför' : 'Återöppna'}</button>
        <button disabled={disabled} aria-label={`Redigera ${task.title}`} onClick={() => { setTitle(task.title); setDialog({ kind: 'edit', task }); }}>Redigera</button>
        <button disabled={disabled} aria-label={`Radera ${task.title}`} onClick={() => setDialog({ kind: 'delete', task })}>Radera</button>
      </div>
    </li>)}</ul>}
    {state.mode === 'live' && content.nextTaskCursor && <button onClick={() => void workspace.refreshTasks(true)}>Visa fler uppgifter</button>}
    {dialog && <Dialog title={dialog.kind === 'delete' ? 'Radera uppgift?' : dialog.kind === 'edit' ? 'Redigera uppgift' : 'Ny uppgift'} onClose={() => setDialog(null)}>
      {dialog.kind === 'delete' ? <><p>Vill du radera <strong>{dialog.task?.title}</strong>? Samtalshistoriken finns kvar.</p><div className="dialog-actions"><button autoFocus onClick={() => setDialog(null)}>Behåll uppgiften</button><button className="danger" onClick={() => { if (dialog.task) void workspace.mutateTask(dialog.task, 'delete'); setDialog(null); }}>Radera uppgiften</button></div></> :
        <form onSubmit={event => { event.preventDefault(); if (dialog.kind === 'edit' && dialog.task) void workspace.mutateTask(dialog.task, { title }); else void workspace.createTask(title); setDialog(null); }}>
          <label>Titel<input autoFocus value={title} onChange={event => setTitle(event.target.value)} /></label><p>1–200 tecken. {title.trim().length}/200</p>
          <div className="dialog-actions"><button type="button" onClick={() => setDialog(null)}>Avbryt</button><button disabled={!title.trim() || title.trim().length > 200}>Spara uppgift</button></div>
        </form>}
    </Dialog>}
  </section>;
}
