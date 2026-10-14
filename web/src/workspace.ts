import type { CommandResponse, Message, Mode, Task } from '../../shared/contracts';
import { api, ApiError, type Api, type ErrorKind } from './api';

type Content = { tasks: Task[]; messages: Message[] };
type Operation = 'load' | 'command' | 'logout';
type WorkspaceError = { message: string; kind: ErrorKind; status: number | null; operation: Operation };
export type WorkspaceState = {
  session: 'checking' | 'authenticated' | 'signed-out' | 'unavailable';
  live: Content;
  demo: Content;
  drafts: Record<Mode, string>;
  mode: Mode;
  busy: Operation | null;
  pendingMode: Mode | null;
  error: WorkspaceError | null;
  notice: string;
};
const freshState = (): WorkspaceState => ({
  session: 'checking', live: { tasks: [], messages: [] }, demo: { tasks: [], messages: [] },
  drafts: { live: '', demo: '' }, mode: 'live', busy: null, pendingMode: null, error: null, notice: '',
});

// In-memory session state only. The generation guard also works when a transport
// ignores AbortSignal or the server has already completed a request.
export class Workspace {
  private state = freshState();
  private listeners = new Set<() => void>();
  private generation = 0;
  private controller: AbortController | null = null;
  constructor(private request: Api = api) {}

  getSnapshot = () => this.state;
  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; };
  private update(patch: Partial<WorkspaceState>) {
    this.state = { ...this.state, ...patch };
    this.listeners.forEach(listener => listener());
  }
  cancelPending = () => {
    this.generation++;
    this.controller?.abort();
    this.controller = null;
  };
  private begin(operation: Operation) {
    this.cancelPending();
    this.controller = new AbortController();
    this.update({ busy: operation, error: null, pendingMode: operation === 'command' ? this.state.mode : null });
    return { generation: this.generation, signal: this.controller.signal };
  }
  private endSession(expired = false) {
    this.cancelPending();
    this.update({ ...freshState(), session: 'signed-out', notice: expired ? 'Your session has ended. Sign in again.' : '' });
  }
  private fail(reason: unknown, operation: Operation) {
    if (reason instanceof ApiError && reason.status === 401) { this.endSession(true); return; }
    const error = reason instanceof ApiError ? reason : new ApiError('Connection failed. Please try again.', null, 'network');
    const message = operation === 'logout' ? `Sign out was not confirmed. ${error.message}`
      : operation === 'command' && (error.kind === 'network' || error.kind === 'server')
        ? `${error.message} The command may have been received. Refresh Live data before sending it again.` : error.message;
    this.update({ error: { message, kind: error.kind, status: error.status, operation } });
  }
  setMode = (mode: Mode) => { if (this.state.session === 'authenticated') this.update({ mode }); };
  setDraft = (text: string) => {
    if (this.state.session === 'authenticated' && !this.state.busy) this.update({ drafts: { ...this.state.drafts, [this.state.mode]: text } });
  };
  loginSucceeded = async () => {
    this.cancelPending();
    this.update({ ...freshState(), session: 'authenticated' });
    await this.load();
  };
  load = async () => {
    if (this.state.busy === 'command' || this.state.busy === 'logout') return;
    const { generation, signal } = this.begin('load');
    // Clear immediately on a confirmed 401, even if the other endpoint hangs.
    // allSettled still lets us distinguish non-session failures without losing
    // either rejection or discarding previously loaded content.
    const get = <T>(path: string) => this.request<T>(path, { signal }).catch(reason => {
      if (generation === this.generation && reason instanceof ApiError && reason.status === 401) this.endSession(true);
      throw reason;
    });
    const results = await Promise.allSettled([
      get<{ tasks: Task[] }>('/tasks'),
      get<{ messages: Message[] }>('/messages'),
    ]);
    if (generation !== this.generation) return;
    const failures = results.filter(result => result.status === 'rejected');
    const [tasks, messages] = results;
    if (tasks.status === 'fulfilled' && messages.status === 'fulfilled') {
      this.update({ session: 'authenticated', live: { tasks: tasks.value.tasks, messages: messages.value.messages }, notice: '' });
    } else {
      if (this.state.session !== 'authenticated') this.update({ session: 'unavailable' });
      this.fail(failures[0]?.reason, 'load');
    }
    if (generation === this.generation) this.update({ busy: null });
  };
  submit = async () => {
    const mode = this.state.mode;
    const text = this.state.drafts[mode];
    if (this.state.session !== 'authenticated' || this.state.busy || !text.trim()) return;
    const { generation, signal } = this.begin('command');
    try {
      const result = await this.request<CommandResponse>('/commands', { method: 'POST', body: JSON.stringify({ text, mode }), signal });
      if (generation !== this.generation) return;
      if (result.persisted !== (mode === 'live') || result.task.mode !== mode || result.messages.some(message => message.mode !== mode)) {
        throw new ApiError('The server returned a mismatched execution mode. Refresh Live data before retrying.', 200, 'server');
      }
      const current = this.state[mode];
      const tasks = mode === 'live' ? [result.task, ...current.tasks.filter(task => task.id !== result.task.id)] : [result.task, ...current.tasks];
      this.update({ [mode]: { tasks, messages: [...current.messages, ...result.messages] }, drafts: { ...this.state.drafts, [mode]: '' } });
    } catch (reason) {
      if (generation === this.generation) this.fail(reason, 'command');
    } finally {
      if (generation === this.generation) this.update({ busy: null, pendingMode: null });
    }
  };
  logout = async () => {
    if (this.state.session !== 'authenticated' || this.state.busy === 'logout') return;
    // Invalidates earlier loads/commands before sending the logout request.
    const { generation, signal } = this.begin('logout');
    try {
      await this.request('/auth/logout', { method: 'POST', signal });
      if (generation === this.generation) this.endSession();
    } catch (reason) {
      if (generation === this.generation) this.fail(reason, 'logout');
    } finally {
      if (generation === this.generation) this.update({ busy: null });
    }
  };
}

export function workspaceStatus(state: WorkspaceState) {
  if (state.busy === 'logout') return 'SIGNING OUT';
  if (state.busy === 'load') return 'LOADING';
  if (state.busy === 'command') return state.pendingMode === 'live' ? 'SAVING LIVE' : 'RUNNING DEMO';
  if (state.error) return state.error.kind === 'permission' ? 'ACCESS DENIED' : 'ERROR';
  return 'READY';
}
