import { z } from 'zod';
import { capabilitiesSchema, commandResponseSchema, conversationPageSchema, conversationSchema, historyPageSchema,
  taskPageSchema, taskSchema, titleSchema, conversationTitleSchema, parseTask, limits,
  type CommandResponse, type Conversation, type Message, type Mode, type Task, type Capabilities, type HistoryPage } from '../../shared/contracts';
import { streamChat, type StreamRequest } from './stream';
import { api, ApiError, type Api, type ErrorKind } from './api';

type Busy = 'load' | 'command' | 'mutation' | 'logout';
export type Thread = { messages: Message[]; draft: string; nextCursor: string | null; loaded: boolean; loading: boolean };
export type Content = { tasks: Task[]; counts: { open: number; completed: number; all: number }; nextTaskCursor: string | null;
  conversations: Conversation[]; conversationCursor: string | null; activeId: string | null; threads: Record<string, Thread> };
export type ClientOperation = { id: string; conversationId: string; mode: Mode; path: string; method: string; payload: Record<string, unknown>;
  status: CommandResponse['status']; label: string; text?: string; partial?: string };
type WorkspaceError = { message: string; kind: ErrorKind; status: number | null; operation: Busy; current?: Task };
const unconfigured: Capabilities = { chat: { state: 'unconfigured', reason: 'PROVIDER_NOT_CONFIGURED' }, transcription: { state: 'unconfigured', reason: 'PROVIDER_NOT_CONFIGURED' }, speech: { state: 'unconfigured', reason: 'PROVIDER_NOT_CONFIGURED' } };
export type WorkspaceState = {
  session: 'checking' | 'authenticated' | 'signed-out' | 'unavailable'; live: Content; demo: Content; mode: Mode;
  busy: Busy | null; pendingMode: Mode | null; error: WorkspaceError | null; notice: string;
  operations: Record<string, ClientOperation>; capabilities: Capabilities;
  filter: 'all' | 'open' | 'completed'; search: string;
};
const blankThread = (): Thread => ({ messages: [], draft: '', nextCursor: null, loaded: false, loading: false });
const blankContent = (): Content => ({ tasks: [], counts: { open: 0, completed: 0, all: 0 }, nextTaskCursor: null, conversations: [], conversationCursor: null, activeId: null, threads: {} });
const freshState = (): WorkspaceState => ({ session: 'checking', live: blankContent(), demo: blankContent(), mode: 'live', busy: null, pendingMode: null, error: null, notice: '', operations: {}, capabilities: unconfigured, filter: 'all', search: '' });
export const activeThread = (state: WorkspaceState): Thread => state[state.mode].threads[state[state.mode].activeId ?? ''] ?? blankThread();
function mergeMessages(before: Message[], incoming: Message[]) {
  const map = new Map(before.map(message => [message.id, message])); incoming.forEach(message => map.set(message.id, message));
  return [...map.values()].sort((a, b) => a.sequence - b.sequence);
}
export class Workspace {
  private state = freshState();
  private listeners = new Set<() => void>();
  private generation = 0;
  private controllers = new Set<AbortController>();
  private epochs = new Map<string, number>();
  private demoId = 0;
  private streamControllers = new Map<string, AbortController>();
  constructor(private request: Api = api, private stream: StreamRequest = streamChat) {}
  getSnapshot = () => this.state;
  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; };
  private update(patch: Partial<WorkspaceState>) { this.state = { ...this.state, ...patch }; this.listeners.forEach(listener => listener()); }
  private content(mode: Mode, patch: Partial<Content>) { this.update({ [mode]: { ...this.state[mode], ...patch } }); }
  private thread(mode: Mode, id: string, patch: Partial<Thread>) { this.content(mode, { threads: { ...this.state[mode].threads, [id]: { ...(this.state[mode].threads[id] ?? blankThread()), ...patch } } }); }
  private operation(operation: ClientOperation) { this.update({ operations: { ...this.state.operations, [operation.id]: operation } }); }
  cancelPending = () => { this.generation++; this.controllers.forEach(c => c.abort()); this.controllers.clear(); this.streamControllers.clear(); this.epochs.clear(); };
  private endSession(expired = false) { this.cancelPending(); this.update({ ...freshState(), session: 'signed-out', notice: expired ? 'Your session has ended. Sign in again.' : '' }); }
  private fail(reason: unknown, operation: Busy) {
    if (reason instanceof ApiError && reason.status === 401) { this.endSession(true); return; }
    const error = reason instanceof ApiError ? reason : new ApiError('Svaret kunde inte valideras. Läs in aktuella data igen.', null, 'server');
    const current = taskSchema.safeParse(error.current);
    this.update({ error: { message: operation === 'logout' ? `Sign out was not confirmed. ${error.message}` : error.message,
      status: error.status, kind: error.kind, operation, ...(current.success ? { current: current.data } : {}) } });
  }
  private async read<T>(schema: z.ZodType<T>, path: string, generation: number, options?: RequestInit): Promise<T> {
    const controller = new AbortController(); this.controllers.add(controller);
    try {
      const raw = await this.request<unknown>(path, { ...options, signal: controller.signal });
      const parsed = schema.safeParse(raw);
      if (!parsed.success) throw new ApiError('Serverns svar matchar inte kontraktet.', 200, 'server', 'INVALID_RESPONSE');
      return parsed.data;
    } catch (reason) {
      if (generation === this.generation && reason instanceof ApiError && reason.status === 401) this.endSession(true);
      throw reason;
    } finally { this.controllers.delete(controller); }
  }
  private epoch(key: string) { const value = (this.epochs.get(key) ?? 0) + 1; this.epochs.set(key, value); return value; }
  private current(generation: number, key: string, epoch: number) { return generation === this.generation && this.epochs.get(key) === epoch; }
  setMode = (mode: Mode) => {
    if (this.state.session !== 'authenticated') return;
    if (mode === 'demo' && !this.state.demo.activeId) this.newDemoConversation('Demo-samtal');
    this.update({ mode });
  };
  setDraft = (text: string) => {
    const { mode } = this.state, id = this.state[mode].activeId;
    if (id && this.state.session === 'authenticated') this.thread(mode, id, { draft: text });
  };
  loginSucceeded = async () => { this.cancelPending(); this.update({ ...freshState(), session: 'authenticated' }); await this.load(); };
  load = async () => {
    if (this.state.busy && this.state.busy !== 'load') return;
    const generation = this.generation, epoch = this.epoch('load');
    this.update({ busy: 'load', error: null });
    const results = await Promise.allSettled([
      this.read(conversationPageSchema, '/conversations', generation),
      this.loadTasks(),
      this.read(capabilitiesSchema, '/capabilities', generation),
    ]);
    if (!this.current(generation, 'load', epoch)) return;
    const [conversations, tasks, capabilities] = results;
    if (conversations.status === 'fulfilled' && tasks.status === 'fulfilled' && capabilities.status === 'fulfilled') {
      let list = conversations.value.conversations;
      if (list.some(c => c.mode !== 'live')) { this.fail(new ApiError('Samtalslistan har fel läge.', 200, 'server'), 'load'); if (this.state.session !== 'authenticated') this.update({ session: 'unavailable' }); this.update({ busy: null }); return; }
      const selected = this.state.live.activeId;
      const activeId = selected && (list.some(c => c.id === selected) || this.state.live.conversations.some(c => c.id === selected)) ? selected : list.find(c => c.status === 'open')?.id ?? list[0]?.id ?? null;
      if (activeId && !list.some(c => c.id === activeId)) {
        try {
          const current = await this.read(z.object({ conversation: conversationSchema }), `/conversations/${activeId}`, generation);
          if (current.conversation.id !== activeId || current.conversation.mode !== 'live') throw new ApiError('Fel samtal i serversvaret.', 200, 'server');
          list = [...list, current.conversation];
        } catch (reason) {
          if (this.current(generation, 'load', epoch)) { this.fail(reason, 'load'); this.update({ busy: null }); }
          return;
        }
        if (!this.current(generation, 'load', epoch)) return;
      }
      this.content('live', { conversations: list, conversationCursor: conversations.value.nextCursor, activeId });
      this.update({ session: 'authenticated', capabilities: capabilities.value, notice: '' });
      if (activeId) await this.loadThread('live', activeId, false);
    } else {
      if (this.state.session !== 'authenticated') this.update({ session: 'unavailable' });
      const failure = results.find(result => result.status === 'rejected');
      if (failure?.status === 'rejected') this.fail(failure.reason, 'load');
    }
    if (this.current(generation, 'load', epoch)) this.update({ busy: null });
  };
  loadTasks = async (more = false) => {
    const generation = this.generation, epoch = this.epoch('tasks');
    const query = new URLSearchParams({ status: this.state.filter, search: this.state.search });
    if (more && this.state.live.nextTaskCursor) query.set('cursor', this.state.live.nextTaskCursor);
    const result = await this.read(taskPageSchema, `/tasks?${query}`, generation);
    if (!this.current(generation, 'tasks', epoch)) return;
    if (result.tasks.some(task => task.mode !== 'live')) throw new ApiError('Uppgiftslistan har fel läge.', 200, 'server');
    this.content('live', { tasks: more ? [...this.state.live.tasks, ...result.tasks.filter(task => !this.state.live.tasks.some(old => old.id === task.id))] : result.tasks, counts: result.counts, nextTaskCursor: result.nextCursor });
  };
  refreshTasks = async (more = false) => { const generation = this.generation; try { await this.loadTasks(more); } catch (reason) { if (generation === this.generation) this.fail(reason, 'load'); } };
  setTaskFilter = async (filter: WorkspaceState['filter'], search: string) => { this.update({ filter, search }); if (this.state.mode === 'live') await this.refreshTasks(); };
  loadMoreConversations = async () => {
    const cursor = this.state.live.conversationCursor, generation = this.generation;
    if (!cursor) return;
    const epoch = this.epoch('conversations');
    try {
      const page = await this.read(conversationPageSchema, `/conversations?cursor=${encodeURIComponent(cursor)}`, generation);
      if (page.conversations.some(c => c.mode !== 'live')) throw new ApiError('Samtalslistan har fel läge.', 200, 'server');
      if (this.current(generation, 'conversations', epoch)) this.content('live', { conversations: [...this.state.live.conversations, ...page.conversations.filter(c => !this.state.live.conversations.some(old => old.id === c.id))], conversationCursor: page.nextCursor });
    } catch (reason) { if (generation === this.generation) this.fail(reason, 'load'); }
  };
  selectConversation = async (id: string) => {
    const mode = this.state.mode;
    if (!this.state[mode].conversations.some(c => c.id === id)) return;
    this.content(mode, { activeId: id });
    if (mode === 'live' && !this.state.live.threads[id]?.loaded) await this.loadThread(mode, id, false);
  };
  loadThread = async (mode: Mode, id: string, older = false) => {
    if (mode !== 'live') return;
    const previous = this.state.live.threads[id] ?? blankThread();
    if (older && !previous.nextCursor) return;
    const generation = this.generation, key = `thread:${id}`, epoch = this.epoch(key);
    this.thread(mode, id, { loading: true });
    try {
      const page = await this.read(historyPageSchema, `/conversations/${id}/messages${older ? `?cursor=${encodeURIComponent(previous.nextCursor!)}` : ''}`, generation);
      if (!this.current(generation, key, epoch)) return;
      if (page.messages.some(m => m.mode !== mode || m.conversationId !== id)) throw new ApiError('Historiken tillhör ett annat samtal.', 200, 'server');
      this.thread(mode, id, { messages: mergeMessages(this.state.live.threads[id]?.messages ?? [], page.messages), nextCursor: page.nextCursor, loaded: true });
    } catch (reason) { if (this.current(generation, key, epoch)) this.fail(reason, 'load'); }
    finally { if (this.current(generation, key, epoch)) this.thread(mode, id, { loading: false }); }
  };
  private newDemoConversation(title: string) {
    const now = new Date().toISOString(), id = `demo-${crypto.randomUUID()}`;
    const conversation: Conversation = { id, title, mode: 'demo', status: 'open', version: 1, createdAt: now, updatedAt: now };
    this.content('demo', { conversations: [conversation, ...this.state.demo.conversations], activeId: id, threads: { ...this.state.demo.threads, [id]: { ...blankThread(), loaded: true } } });
  }
  createConversation = async (title: string) => {
    if (this.state.session !== 'authenticated' || this.state.busy) return;
    const parsed = conversationTitleSchema.safeParse(title); if (!parsed.success) { this.fail(new ApiError('Samtalsnamnet måste vara 1–100 tecken.', 400, 'request'), 'mutation'); return; }
    if (this.state.mode === 'demo') { this.newDemoConversation(parsed.data); return; }
    const id = crypto.randomUUID();
    await this.run({ id, conversationId: id, mode: 'live', path: '/conversations', method: 'POST', payload: { requestId: id, title: parsed.data }, label: 'Skapa samtal', status: 'pending' });
  };
  patchConversation = async (id: string, patch: { title?: string; status?: Conversation['status'] }) => {
    const mode = this.state.mode, current = this.state[mode].conversations.find(c => c.id === id);
    if (!current || this.state.busy) return;
    if (patch.title !== undefined && !conversationTitleSchema.safeParse(patch.title).success) { this.fail(new ApiError('Samtalsnamnet måste vara 1–100 tecken.', 400, 'request'), 'mutation'); return; }
    if (mode === 'demo') { this.content(mode, { conversations: this.state[mode].conversations.map(c => c.id === id ? { ...c, ...patch, title: patch.title?.trim() ?? c.title, version: c.version + 1, updatedAt: new Date().toISOString() } : c) }); return; }
    const requestId = crypto.randomUUID();
    await this.run({ id: requestId, conversationId: id, mode, path: `/conversations/${id}`, method: 'PATCH', payload: { requestId, version: current.version, ...patch }, label: 'Ändra samtal', status: 'pending' });
  };
  submit = async () => {
    const mode = this.state.mode, id = this.state[mode].activeId, text = activeThread(this.state).draft.trim();
    if (this.state.session !== 'authenticated' || !id || this.state.busy || !text || this.state[mode].conversations.find(c => c.id === id)?.status !== 'open') return;
    if (Object.values(this.state.operations).some(op => op.mode === mode && op.conversationId === id && op.text === text && op.status === 'unknown')) { this.update({ notice: 'Kontrollera eller försök samma okända operation igen.' }); return; }
    if (text.length > limits.text) { this.fail(new ApiError('Texten får vara högst 2 000 tecken.', 400, 'request'), 'command'); return; }
    let title: string | null;
    try { title = parseTask(text); } catch { this.fail(new ApiError('Uppgiftens titel måste vara 1–200 tecken.', 400, 'request'), 'command'); return; }
    if (mode === 'demo') { this.demoCommand(id, text, title); return; }
    const requestId = crypto.randomUUID();
    await this.run({ id: requestId, conversationId: id, mode, path: this.state.capabilities.chat.state === 'available' && !title ? '/chat/stream' : '/commands', method: 'POST', payload: { requestId, conversationId: id, mode, text }, text, label: 'Skicka text', status: 'pending' });
  };
  private demoCommand(id: string, text: string, title: string | null) {
    const now = new Date().toISOString(), requestId = crypto.randomUUID();
    const task: Task | null = title ? { id: --this.demoId, title, status: 'open', version: 1, createdAt: now, updatedAt: now, completedAt: null, mode: 'demo' } : null;
    const previous = this.state.demo.threads[id] ?? blankThread();
    const sequence = previous.messages.at(-1)?.sequence ?? 0;
    const base = { conversationId: id, operationId: requestId, mode: 'demo' as const, createdAt: now, delivery: 'complete' as const };
    const messages: Message[] = [{ ...base, id: crypto.randomUUID(), sequence: sequence + 1, role: 'user', kind: 'user_input', text },
      { ...base, id: crypto.randomUUID(), sequence: sequence + 2, role: 'assistant', kind: task ? 'command_result' : 'system_notice', text: task ? `Task added: ${task.title} (Demo only — not saved)` : 'Demo · AI är inte ansluten. Texten finns bara i denna session.' }];
    if (task) this.content('demo', { tasks: [task, ...this.state.demo.tasks] });
    this.thread('demo', id, { messages: [...previous.messages, ...messages], draft: '' });
    this.update({ error: null });
  }
  createTask = async (title: string) => {
    const parsed = titleSchema.safeParse(title), mode = this.state.mode, conversationId = this.state[mode].activeId;
    if (!parsed.success) { this.fail(new ApiError('Titeln måste vara 1–200 tecken.', 400, 'request'), 'mutation'); return; }
    if (!conversationId || this.state.busy || this.state.session !== 'authenticated') return;
    if (mode === 'demo') {
      const now = new Date().toISOString();
      this.content('demo', { tasks: [{ id: --this.demoId, title: parsed.data, status: 'open', version: 1, createdAt: now, updatedAt: now, completedAt: null, mode }, ...this.state.demo.tasks] }); return;
    }
    const id = crypto.randomUUID();
    await this.run({ id, conversationId, mode, path: '/tasks', method: 'POST', payload: { requestId: id, conversationId, mode, title: parsed.data }, label: 'Skapa uppgift', status: 'pending' });
  };
  mutateTask = async (task: Task, patch: { title?: string; status?: Task['status'] } | 'delete') => {
    const mode = this.state.mode, conversationId = this.state[mode].activeId;
    if (this.state.session !== 'authenticated' || !conversationId || this.state.busy || task.mode !== mode) return;
    if (patch !== 'delete' && patch.title !== undefined && !titleSchema.safeParse(patch.title).success) { this.fail(new ApiError('Titeln måste vara 1–200 tecken.', 400, 'request'), 'mutation'); return; }
    if (mode === 'demo') {
      this.content(mode, { tasks: patch === 'delete' ? this.state.demo.tasks.filter(t => t.id !== task.id) : this.state.demo.tasks.map(t => t.id === task.id ? { ...t, ...patch, title: patch.title?.trim() ?? t.title, version: t.version + 1, updatedAt: new Date().toISOString(), completedAt: (patch.status ?? t.status) === 'completed' ? t.completedAt ?? new Date().toISOString() : null } : t) }); return;
    }
    const id = crypto.randomUUID();
    await this.run({ id, conversationId, mode, path: `/tasks/${task.id}`, method: patch === 'delete' ? 'DELETE' : 'PATCH', payload: { requestId: id, conversationId, mode, version: task.version, ...(patch === 'delete' ? {} : patch) }, label: patch === 'delete' ? `Radera: ${task.title}` : `Ändra: ${task.title}`, status: 'pending' });
  };
  retry = async (id: string) => {
    const operation = this.state.operations[id];
    if (!operation || operation.status !== 'unknown' || this.state.busy || this.state.session !== 'authenticated') return;
    await this.run(operation);
  };
  checkOperation = async (id: string) => {
    const operation = this.state.operations[id];
    if (!operation || this.state.busy || !['/commands', '/chat/stream'].includes(operation.path) && !operation.path.startsWith('/tasks')) return;
    const generation = this.generation;
    this.update({ busy: 'load', error: null });
    try {
      const result = await this.read(commandResponseSchema, `/operations/${id}`, generation);
      if (generation !== this.generation) return;
      this.applyResult(operation, result);
      await this.refreshTasks();
    } catch (reason) { if (generation === this.generation) this.fail(reason, 'load'); }
    finally { if (generation === this.generation) this.update({ busy: null }); }
  };
  private applyResult(operation: ClientOperation, result: CommandResponse) {
    if (result.task && result.task.mode !== operation.mode || result.requestId !== operation.id || result.conversationId !== operation.conversationId || !result.persisted || result.messages.some(m => m.mode !== operation.mode || m.conversationId !== operation.conversationId || m.operationId !== operation.id)) throw new ApiError('Svaret tillhör en annan operation.', 200, 'server');
    const thread = this.state[operation.mode].threads[operation.conversationId] ?? blankThread();
    this.thread(operation.mode, operation.conversationId, { messages: mergeMessages(thread.messages, result.messages),
      draft: result.status === 'succeeded' && thread.draft.trim() === operation.text ? '' : thread.draft });
    this.operation({ ...operation, status: result.status, partial: '' });
    if (result.status === 'failed' || result.status === 'cancelled' || result.status === 'unknown') this.update({ notice: `Operationen är ${result.status === 'failed' ? 'misslyckad' : result.status === 'cancelled' ? 'avbruten' : 'okänd efter omstart'}. Eventuell deltext visas som avbruten. Ingen automatisk omgenerering sker.` });
  }
  stopOperation = (id: string) => { this.streamControllers.get(id)?.abort(); };
  private run = async (operation: ClientOperation) => {
    if (this.state.busy || this.state.session !== 'authenticated') return;
    const generation = this.generation, activeAtStart = this.state.live.activeId;
    this.operation({ ...operation, status: 'pending' }); this.update({ busy: operation.text ? 'command' : 'mutation', pendingMode: operation.mode, error: null });
    try {
      if (operation.path.startsWith('/conversations')) {
        const result = await this.read(z.object({ conversation: conversationSchema }), operation.path, generation, { method: operation.method, body: JSON.stringify(operation.payload) });
        if (generation !== this.generation) return;
        if (result.conversation.id !== operation.conversationId || result.conversation.mode !== 'live') throw new ApiError('Fel samtal i serversvaret.', 200, 'server');
        this.operation({ ...operation, status: 'succeeded' });
        try {
          const current = await this.read(z.object({ conversation: conversationSchema }), `/conversations/${result.conversation.id}`, generation);
          if (generation !== this.generation) return;
          if (current.conversation.id !== operation.conversationId || current.conversation.mode !== 'live') throw new ApiError('Fel samtal i serversvaret.', 200, 'server');
          this.content('live', { conversations: [current.conversation, ...this.state.live.conversations.filter(c => c.id !== current.conversation.id)], activeId: operation.method === 'POST' && this.state.live.activeId === activeAtStart ? current.conversation.id : this.state.live.activeId });
        } catch (reason) { if (generation === this.generation) this.fail(reason, 'load'); }
      } else {
        let result: CommandResponse;
        if (operation.path === '/chat/stream') {
          const controller = new AbortController(); this.controllers.add(controller); this.streamControllers.set(operation.id, controller);
          try {
            const payload = { requestId: operation.id, conversationId: operation.conversationId, mode: 'live' as const, text: operation.text! };
            result = await this.stream(payload, { signal: controller.signal, onEvent: event => {
              if (generation !== this.generation || event.operationId !== operation.id || event.conversationId !== operation.conversationId) return;
              const current = this.state.operations[operation.id];
              if (current?.status === 'pending' && event.type === 'delta') this.operation({ ...current, partial: (current.partial ?? '') + event.text });
            } });
          } finally { this.controllers.delete(controller); this.streamControllers.delete(operation.id); }
        } else result = await this.read(commandResponseSchema, operation.path, generation, { method: operation.method, body: JSON.stringify(operation.payload) });
        if (generation !== this.generation) return;
        this.applyResult(operation, result);
        // A replay is a historical receipt, not the current task. Always read
        // current tasks separately, including after edits/deletes by another tab.
        await this.refreshTasks();
      }
    } catch (reason) {
      if (generation === this.generation) {
        const definite = reason instanceof ApiError && (reason.kind === 'request' || reason.kind === 'permission') && reason.code !== 'OPERATION_PENDING';
        this.operation({ ...operation, status: definite ? 'failed' : 'unknown' });
        this.fail(reason, operation.text ? 'command' : 'mutation');
      }
    } finally { if (generation === this.generation) this.update({ busy: null, pendingMode: null }); }
  };
  logout = async () => {
    if (this.state.session !== 'authenticated' || this.state.busy === 'logout') return;
    this.cancelPending();
    for (const operation of Object.values(this.state.operations)) if (operation.status === 'pending') this.operation({ ...operation, status: 'unknown' });
    const generation = this.generation;
    this.update({ busy: 'logout', error: null });
    try { await this.read(z.undefined(), '/auth/logout', generation, { method: 'POST' }); if (generation === this.generation) this.endSession(); }
    catch (reason) { if (generation === this.generation) this.fail(reason, 'logout'); }
    finally { if (generation === this.generation) this.update({ busy: null, pendingMode: null }); }
  };
}
export function workspaceStatus(state: WorkspaceState) {
  if (state.busy === 'logout') return 'SIGNING OUT';
  if (state.busy === 'load') return 'LOADING';
  if (state.busy === 'command' && Object.values(state.operations).some(op => op.status === 'pending' && op.path === '/chat/stream')) return 'TEXT GENERERAS';
  if (state.busy === 'command' || state.busy === 'mutation') return 'SAVING LIVE';
  if (state.error) return state.error.kind === 'permission' ? 'ACCESS DENIED' : 'ERROR';
  return state.mode === 'demo' ? 'DEMO · LOCAL' : state.capabilities.chat.state === 'available' ? 'TEXT & TASKS · AI TILLGÄNGLIG' : 'TEXT & TASKS · AI EJ ANSLUTEN';
}
