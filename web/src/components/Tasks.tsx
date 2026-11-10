import React, { useEffect, useId, useState, useRef } from 'react';
import type { Task } from '../../../shared/contracts';
import { Workspace, type WorkspaceState } from '../workspace';
import { Dialog } from './Dialog';
import { Icon } from './Icon';
import { Recovery } from './Recovery';

export function Tasks({ workspace, state }: { workspace: Workspace; state: WorkspaceState }) {
  const newTaskButton = useRef<HTMLButtonElement>(null), helpId = useId();
  const [dialog, setDialog] = useState<{ kind: 'menu' | 'create' | 'edit' | 'delete'; task?: Task } | null>(null);
  const [title, setTitle] = useState(''), [search, setSearch] = useState(state.search), [reading, setReading] = useState(false);
  const [confirmed, setConfirmed] = useState<number | null>(null);
  const content = state[state.mode], previous = useRef(content.tasks);
  useEffect(() => {
    const completed = content.tasks.find(task => task.status === 'completed' && previous.current.some(before => before.id === task.id && before.mode === task.mode && before.status === 'open'));
    setConfirmed(completed?.id ?? null); previous.current = content.tasks;
  }, [content.tasks]);
  const demoMatches = content.tasks.filter(t => t.title.toLocaleLowerCase().includes(state.search.toLocaleLowerCase()));
  const tasks = state.mode === 'demo' ? demoMatches.filter(t => state.filter === 'all' || t.status === state.filter) : content.tasks;
  const counts = state.mode === 'demo' ? { all: demoMatches.length, open: demoMatches.filter(t => t.status === 'open').length, completed: demoMatches.filter(t => t.status === 'completed').length } : content.counts;
  const disabled = state.busy !== null || !content.activeId || content.conversations.find(c => c.id === content.activeId)?.status !== 'open';
  const filterTasks = async (filter: WorkspaceState['filter']) => { setReading(true); try { await workspace.setTaskFilter(filter, search); } finally { setReading(false); } };
  const operations = Object.values(state.operations).filter(op => op.mode === state.mode && (op.status === 'pending' || op.status === 'unknown'));
  return <section className="task-panel" aria-label="Uppgifter">
    <div className="panel-title"><div><span className={`eyebrow mode-${state.mode}`}>{state.mode === 'demo' ? 'Demo · Bara i minnet' : 'Sparat på ditt konto'}</span><h2>Dina uppgifter</h2></div><button ref={newTaskButton} disabled={disabled} onClick={() => { setTitle(''); setDialog({ kind: 'create' }); }}><Icon name="plus" />Ny uppgift</button></div>
    <form className="task-search" onSubmit={event => { event.preventDefault(); void filterTasks(state.filter); }}><label>Sök uppgifter<input type="search" value={search} maxLength={200} onChange={event => setSearch(event.target.value)} /></label><button disabled={reading}><Icon name="search" /><span>Sök</span></button></form>
    <div className="task-filters" role="group" aria-label="Filtrera uppgifter">{(['open', 'completed', 'all'] as const).map(filter => <button key={filter} disabled={reading} aria-pressed={state.filter === filter} onClick={() => void filterTasks(filter)}>{filter === 'open' ? 'Öppna' : filter === 'completed' ? 'Slutförda' : 'Alla'} <span>{counts[filter]}</span></button>)}</div>
    <Recovery workspace={workspace} state={state} />
    {reading && <p className="task-reading" role="status">Läser uppgifter…</p>}
    {!tasks.length ? reading || state.busy === 'load' ? <div className="task-skeleton" aria-hidden="true"><div /><div /><div /></div> : <div className="task-empty"><Icon name="tasks" /><h3>{state.search ? 'Ingen träff den här gången' : state.filter === 'completed' ? 'Inget slutfört ännu' : 'Lite mer utrymme framåt'}</h3><p>{state.search ? 'Prova ett annat ord eller rensa sökningen.' : state.filter === 'completed' ? 'Klarmarkerade uppgifter samlas här.' : 'Lägg till en uppgift när nästa steg blir tydligt.'}</p>{state.search && <button className="ghost" onClick={() => { setSearch(''); void workspace.setTaskFilter(state.filter, ''); }}>Rensa sökningen</button>}</div> : <ul>{tasks.map(task => {
      const operation = operations.find(op => op.path === `/tasks/${task.id}`);
      return <li key={task.id} className={`task-row ${task.status} ${confirmed === task.id ? 'just-confirmed' : ''}`} aria-busy={operation?.status === 'pending'} onAnimationEnd={() => setConfirmed(null)}>
        <button className="task-check icon-button ghost" role="checkbox" aria-checked={task.status === 'completed'} disabled={disabled || !!operation} aria-label={`${task.status === 'open' ? 'Slutför' : 'Återöppna'} ${task.title}`} onClick={() => void workspace.mutateTask(task, { status: task.status === 'open' ? 'completed' : 'open' })}><span>{task.status === 'completed' && <Icon name="check" />}</span></button>
        <div className="task-copy"><b>{task.title}</b><small>{operation ? operation.status === 'pending' ? 'Sparar ändringen…' : 'Resultat okänt · Kontrollera ovan' : task.status === 'completed' ? 'Slutförd' : 'Öppen'} · <time dateTime={task.updatedAt}>{new Date(task.updatedAt).toLocaleDateString('sv-SE')}</time></small></div>
        <button className="icon-button ghost" disabled={disabled || !!operation} aria-label={`Alternativ för ${task.title}`} aria-haspopup="dialog" onClick={() => setDialog({ kind: 'menu', task })}><Icon name="more" /></button>
      </li>;
    })}</ul>}
    {state.mode === 'live' && content.nextTaskCursor && <button className="ghost" disabled={reading} onClick={async () => { setReading(true); try { await workspace.refreshTasks(true); } finally { setReading(false); } }}>Visa fler uppgifter</button>}
    {dialog && <Dialog title={dialog.kind === 'menu' ? 'Uppgiftsalternativ' : dialog.kind === 'delete' ? 'Radera uppgift?' : dialog.kind === 'edit' ? 'Redigera uppgift' : 'Ny uppgift'} onClose={() => setDialog(null)}>
      {dialog.kind === 'menu' ? <div className="action-list"><p className="sheet-description">{dialog.task?.title}</p><button onClick={() => { setTitle(dialog.task!.title); setDialog({ kind: 'edit', task: dialog.task! }); }}><Icon name="edit" />Redigera uppgift</button><button className="danger" onClick={() => setDialog({ kind: 'delete', task: dialog.task! })}><Icon name="trash" />Radera uppgift</button></div> : dialog.kind === 'delete' ? <><p>Vill du radera <strong>{dialog.task?.title}</strong>? Samtalshistoriken finns kvar.</p><div className="dialog-actions"><button autoFocus onClick={() => setDialog(null)}>Behåll uppgiften</button><button className="danger" onClick={() => { if (dialog.task) void workspace.mutateTask(dialog.task, 'delete').then(() => newTaskButton.current?.focus({ preventScroll: true })); setDialog(null); }}>Radera uppgiften</button></div></> : <form onSubmit={event => { event.preventDefault(); if (dialog.kind === 'edit' && dialog.task) void workspace.mutateTask(dialog.task, { title }); else void workspace.createTask(title); setDialog(null); }}>
        <label>Titel<input autoFocus value={title} aria-describedby={helpId} aria-invalid={title.trim().length > 200} onChange={event => setTitle(event.target.value)} /></label><p id={helpId}>1–200 tecken · {title.trim().length}/200</p><div className="dialog-actions"><button type="button" onClick={() => setDialog(null)}>Avbryt</button><button className="primary" disabled={!title.trim() || title.trim().length > 200}>Spara uppgift</button></div>
      </form>}
    </Dialog>}
  </section>;
}
