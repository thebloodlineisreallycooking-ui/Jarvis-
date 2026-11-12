import { afterEach, describe, expect, it, vi } from 'vitest';
import { randomUUID } from 'node:crypto';
import { api, ApiError, type Api } from '../web/src/api';
import { Workspace, activeThread, workspaceStatus } from '../web/src/workspace';
import type { CommandResponse, Task, Conversation } from '../shared/contracts';

const conversation: Conversation = { id: randomUUID(), title: 'First', status: 'open', version: 1, mode: 'live', createdAt: '2026-11-10', updatedAt: '2026-11-10' };
const second: Conversation = { ...conversation, id: randomUUID(), title: 'Second' };
const liveTask: Task = { id: 1, title: 'Private Live task', status: 'open', version: 1, createdAt: '2026-11-10', updatedAt: '2026-11-10', completedAt: null, mode: 'live' };
function result(payload: Record<string, unknown>, title = 'Private result'): CommandResponse {
  const requestId = payload.requestId as string, conversationId = payload.conversationId as string;
  return { requestId, conversationId, status: 'succeeded', persisted: true, task: { ...liveTask, id: 2, title }, deletedTaskId: null, code: null, messages: [
    { id: `${requestId}-user`, sequence: 1, conversationId, operationId: requestId, kind: 'user_input', delivery: 'complete', role: 'user', text: payload.text as string, mode: 'live', createdAt: '2026-11-10' },
    { id: `${requestId}-reply`, sequence: 2, conversationId, operationId: requestId, kind: 'command_result', delivery: 'complete', role: 'assistant', text: `Task added: ${title}`, mode: 'live', createdAt: '2026-11-10' },
  ] };
}
function deferred<T>() { let resolve!: (value: T) => void, reject!: (reason: unknown) => void; const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; }); return { promise, resolve, reject }; }
function setup() {
  const request = vi.fn(async (path: string, options?: RequestInit): Promise<unknown> => {
    if (path.startsWith('/tasks?')) return { tasks: [liveTask], counts: { open: 1, completed: 0, all: 1 }, nextCursor: null };
    if (path === '/conversations') return { conversations: [conversation, second], nextCursor: null };
    if (path.includes('/messages')) return { messages: [], nextCursor: null };
    if (path === '/capabilities') return Object.fromEntries(['chat', 'transcription', 'speech'].map(key => [key, { state: 'unconfigured', reason: 'PROVIDER_NOT_CONFIGURED' }]));
    if (path === '/commands') return result(JSON.parse(options?.body as string));
    return undefined;
  });
  return { workspace: new Workspace(request as Api), request };
}
async function populate() {
  const fixture = setup(); await fixture.workspace.load(); fixture.workspace.setMode('demo'); fixture.workspace.setDraft('Add a task to demo'); await fixture.workspace.submit();
  fixture.workspace.setDraft('Unsent private demo draft'); fixture.workspace.setMode('live'); fixture.workspace.setDraft('Unsent private Live draft'); return fixture;
}
function expectCleared(workspace: Workspace) {
  const state = workspace.getSnapshot(); expect(state.session).toBe('signed-out');
  for (const mode of ['live', 'demo'] as const) { expect(state[mode].tasks).toEqual([]); expect(state[mode].threads).toEqual({}); expect(state[mode].conversations).toEqual([]); }
  expect(state.operations).toEqual({}); expect(state.error).toBeNull(); expect(state.pendingMode).toBeNull(); expect(state.busy).toBeNull();
}
afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });

describe('Structured API errors', () => {
  it.each([[401, 'session'], [403, 'permission'], [503, 'server'], [422, 'request']] as const)('preserves HTTP %i and its meaning', async (status, kind) => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ error: 'Detail' }), { status })));
    await expect(api('/tasks')).rejects.toMatchObject({ name: 'ApiError', status, kind });
  });
  it('distinguishes network errors and empty logout responses', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValueOnce(new TypeError('Failed to fetch')).mockResolvedValueOnce(new Response(null, { status: 204 })));
    await expect(api('/tasks')).rejects.toMatchObject({ status: null, kind: 'network' }); await expect(api('/auth/logout', { method: 'POST' })).resolves.toBeUndefined();
  });
  it('bounds a hung request even when transport ignores abort, without replaying', async () => {
    vi.useFakeTimers(); const fetch = vi.fn(() => new Promise<Response>(() => {})); vi.stubGlobal('fetch', fetch);
    const pending = expect(api('/commands', { method: 'POST', body: '{}' })).rejects.toMatchObject({ code: 'TIMEOUT', kind: 'network' });
    await vi.advanceTimersByTimeAsync(35000); await pending; expect(fetch).toHaveBeenCalledTimes(1);
  });
});
describe('Session and execution boundaries', () => {
  it('shows initial failures with retry instead of false sign-in and never claims AI ready', async () => {
    const { workspace, request } = setup(); request.mockRejectedValueOnce(new ApiError('offline', null, 'network'));
    const load = workspace.load(); expect(workspaceStatus(workspace.getSnapshot())).toBe('LOADING'); await load;
    expect(workspace.getSnapshot().session).toBe('unavailable'); expect(workspaceStatus(workspace.getSnapshot())).toBe('ERROR');
    await workspace.load(); expect(workspace.getSnapshot().session).toBe('authenticated'); expect(workspaceStatus(workspace.getSnapshot())).toContain('AI EJ ANSLUTEN');
  });
  it.each([new ApiError('offline', null, 'network'), new ApiError('unavailable', 503, 'server'), new ApiError('denied', 403, 'permission')])('retains session/content/drafts on $kind errors', async error => {
    const { workspace, request } = await populate(), before = workspace.getSnapshot(); request.mockRejectedValueOnce(error); await workspace.load(); const after = workspace.getSnapshot();
    expect(after.session).toBe('authenticated'); expect(after.live).toEqual(before.live); expect(after.demo).toEqual(before.demo); expect(after.error).toMatchObject({ kind: error.kind, status: error.status });
    expect(workspaceStatus(after)).toBe(error.status === 403 ? 'ACCESS DENIED' : 'ERROR');
  });
  it('prioritizes confirmed 401 over simultaneous 503 and clears while another request hangs', async () => {
    const { workspace, request } = await populate(), stalled = deferred<unknown>();
    request.mockRejectedValueOnce(new ApiError('down', 503, 'server')).mockRejectedValueOnce(new ApiError('ended', 401, 'session')).mockImplementationOnce(() => stalled.promise);
    const pending = workspace.load(); await vi.waitFor(() => expectCleared(workspace)); stalled.resolve({}); await pending; expectCleared(workspace);
  });
  it('keeps successful login when initial content fetch fails', async () => {
    const { workspace, request } = setup(); request.mockRejectedValueOnce(new ApiError('down', 503, 'server')); await workspace.loginSucceeded();
    expect(workspace.getSnapshot().session).toBe('authenticated'); expect(workspace.getSnapshot().error?.operation).toBe('load');
  });
  it('holds per-thread/mode drafts in memory and gives Demo a complete local lifecycle with unique IDs', async () => {
    const { workspace, request } = await populate(); const calls = request.mock.calls.length;
    workspace.setMode('demo'); const demoId = workspace.getSnapshot().demo.activeId!; expect(activeThread(workspace.getSnapshot()).draft).toBe('Unsent private demo draft');
    await workspace.createTask('Second demo'); let task = workspace.getSnapshot().demo.tasks[0]!; expect(task.id).toBeLessThan(0);
    expect(new Set(workspace.getSnapshot().demo.tasks.map(t => t.id)).size).toBe(2);
    await workspace.mutateTask(task, { title: 'Edited', status: 'completed' }); task = workspace.getSnapshot().demo.tasks[0]!;
    expect(task).toMatchObject({ title: 'Edited', status: 'completed' }); expect(task.completedAt).toBeTruthy();
    await workspace.mutateTask(task, { status: 'open' }); task = workspace.getSnapshot().demo.tasks[0]!; expect(task.completedAt).toBeNull();
    await workspace.mutateTask(task, 'delete'); expect(workspace.getSnapshot().demo.tasks).toHaveLength(1);
    await workspace.createConversation('Demo second'); workspace.setDraft('second draft'); await workspace.selectConversation(demoId);
    expect(activeThread(workspace.getSnapshot()).draft).toBe('Unsent private demo draft'); expect(request.mock.calls).toHaveLength(calls);
    workspace.setMode('live'); expect(activeThread(workspace.getSnapshot()).draft).toBe('Unsent private Live draft'); await workspace.selectConversation(second.id); workspace.setDraft('other thread');
    await workspace.selectConversation(conversation.id); expect(activeThread(workspace.getSnapshot()).draft).toBe('Unsent private Live draft');
    const fresh = new Workspace(request as Api); await fresh.load(); expect(fresh.getSnapshot().demo.tasks).toEqual([]); expect(activeThread(fresh.getSnapshot()).draft).toBe('');
  });
  it('attaches delayed command to its original thread/mode and keeps newly typed drafts', async () => {
    const { workspace, request } = setup(); await workspace.load(); workspace.setDraft('Add a task to delayed'); const response = deferred<CommandResponse>(); let payload: Record<string, unknown> = {};
    request.mockImplementationOnce((_path, opts) => { payload = JSON.parse(opts?.body as string); return response.promise; });
    const pending = workspace.submit(); expect(workspaceStatus(workspace.getSnapshot())).toBe('SAVING LIVE');
    workspace.setDraft('next unsent draft'); await workspace.selectConversation(second.id); workspace.setDraft('second draft'); workspace.setMode('demo'); await workspace.submit(); await workspace.load();
    response.resolve(result(payload)); await pending;
    expect(workspace.getSnapshot().live.threads[conversation.id]!.messages).toHaveLength(2);
    expect(workspace.getSnapshot().live.threads[conversation.id]!.draft).toBe('next unsent draft'); expect(workspace.getSnapshot().live.threads[second.id]!.messages).toEqual([]);
    expect(workspace.getSnapshot().demo.tasks).toEqual([]);
  });
  it('retains unknown outcome and retries with identical payload/ID; next intentional command uses a new ID', async () => {
    const { workspace, request } = setup(); await workspace.load(); workspace.setDraft('Add a task to repeated');
    request.mockRejectedValueOnce(new ApiError('lost after commit', null, 'network')); await workspace.submit();
    const op = Object.values(workspace.getSnapshot().operations)[0]!; expect(op.status).toBe('unknown'); expect(activeThread(workspace.getSnapshot()).draft).toBe('Add a task to repeated');
    await workspace.retry(op.id); expect(workspace.getSnapshot().operations[op.id]!.status).toBe('succeeded');
    const commands = request.mock.calls.filter(([path]) => path === '/commands'); expect(commands[0]![1]!.body).toBe(commands[1]![1]!.body);
    expect(activeThread(workspace.getSnapshot()).messages).toHaveLength(2); expect(workspace.getSnapshot().live.tasks).toEqual([liveTask]); // current read, not old receipt
    workspace.setDraft('Add a task to repeated'); await workspace.submit(); const ids = Object.keys(workspace.getSnapshot().operations); expect(ids).toHaveLength(2); expect(ids[0]).not.toBe(ids[1]);
  });
  it('treats a mismatched response as unknown and never mixes threads or modes', async () => {
    const { workspace, request } = setup(); await workspace.load(); workspace.setDraft('Add a task to wrong');
    request.mockImplementationOnce((_path, opts) => result({ ...JSON.parse(opts?.body as string), conversationId: second.id }) as never); await workspace.submit();
    expect(activeThread(workspace.getSnapshot()).messages).toEqual([]); expect(Object.values(workspace.getSnapshot().operations)[0]!.status).toBe('unknown');
  });
  it('rejects a Demo task list at the Live boundary and preserves prior state', async () => {
    const { workspace, request } = await populate(), before = workspace.getSnapshot().live;
    const implementation = request.getMockImplementation()!;
    request.mockImplementation(async (path, options) => path.startsWith('/tasks?') ? { tasks: [{ ...liveTask, id: -1, mode: 'demo' }], counts: { open: 1, completed: 0, all: 1 }, nextCursor: null } : implementation(path, options));
    await workspace.load(); expect(workspace.getSnapshot().live).toEqual(before); expect(workspace.getSnapshot().error?.kind).toBe('server');
  });
  it('rejects mismatched conversation snapshots during refresh and after a valid mutation receipt', async () => {
    const { workspace, request } = await populate(), before = workspace.getSnapshot().live;
    const implementation = request.getMockImplementation()!;
    request.mockImplementation(async (path, options) => {
      if (path === '/conversations') return { conversations: [second], nextCursor: null };
      if (path === `/conversations/${conversation.id}`) return { conversation: options?.method === 'PATCH' ? conversation : second };
      return implementation(path, options);
    });
    await workspace.load(); expect(workspace.getSnapshot().live).toEqual(before); expect(workspace.getSnapshot().error?.kind).toBe('server');
    await workspace.patchConversation(conversation.id, { title: 'Changed' });
    expect(workspace.getSnapshot().live).toEqual(before); expect(workspace.getSnapshot().error?.kind).toBe('server');
    expect(Object.values(workspace.getSnapshot().operations)[0]?.status).toBe('succeeded');
  });
  it('clears all private state on confirmed logout', async () => { const { workspace } = await populate(); await workspace.logout(); expectCleared(workspace); });
  it.each(['command', 'logout'] as const)('clears all private state on %s 401', async operation => {
    const { workspace, request } = await populate(); request.mockRejectedValueOnce(new ApiError('ended', 401, 'session')); await (operation === 'command' ? workspace.submit() : workspace.logout()); expectCleared(workspace);
  });
  it('reports failed logout as unconfirmed and allows retry', async () => {
    const { workspace, request } = await populate(), before = workspace.getSnapshot(); request.mockRejectedValueOnce(new ApiError('offline', null, 'network')); await workspace.logout();
    expect(workspace.getSnapshot().session).toBe('authenticated'); expect(workspace.getSnapshot().live).toEqual(before.live); expect(workspace.getSnapshot().demo).toEqual(before.demo);
    expect(workspace.getSnapshot().error?.message).toContain('Sign out was not confirmed'); await workspace.logout(); expectCleared(workspace);
  });
  it.each(['resolve', 'reject'] as const)('ignores late command %s after logout even if abort is ignored', async finish => {
    const { workspace, request } = await populate(), response = deferred<CommandResponse>(); let payload = {};
    request.mockImplementationOnce((_path, opts) => { payload = JSON.parse(opts?.body as string); return response.promise; }); const pending = workspace.submit(); await workspace.logout(); expectCleared(workspace);
    if (finish === 'resolve') response.resolve(result(payload)); else response.reject(new ApiError('old private error', 403, 'permission')); await pending; expectCleared(workspace);
  });
  it('ignores old loads after logout and new login', async () => {
    const { workspace, request } = await populate(), first = deferred<unknown>(), other = deferred<unknown>();
    request.mockImplementationOnce(() => first.promise).mockImplementationOnce(() => other.promise); const loading = workspace.load(); await workspace.logout(); await workspace.loginSucceeded();
    first.reject(new ApiError('Old session expired', 401, 'session')); other.resolve({ tasks: [{ ...liveTask, title: 'stale' }], counts: { open: 1, all: 1, completed: 0 }, nextCursor: null });
    await loading; expect(workspace.getSnapshot().session).toBe('authenticated'); expect(workspace.getSnapshot().live.tasks).toEqual([liveTask]);
  });
  it('shows partial stream in its originating thread and ignores late events after logout', async () => {
    const { request } = setup();
    const base = request.getMockImplementation()!;
    request.mockImplementation(async (path, options) => path === '/capabilities' ? { chat: { state: 'available', reason: 'READY' }, transcription: { state: 'unconfigured', reason: 'PROVIDER_NOT_CONFIGURED' }, speech: { state: 'unconfigured', reason: 'PROVIDER_NOT_CONFIGURED' } } : base(path, options));
    const final = deferred<CommandResponse>(); let emit!: (event: import('../shared/stream').StreamEvent) => void; let payload!: { requestId: string; conversationId: string; mode: 'live'; text: string };
    const workspace = new Workspace(request as Api, async (data, options) => { payload = data; emit = options.onEvent; return final.promise; });
    await workspace.load(); workspace.setDraft('Ordinary provider text'); const pending = workspace.submit();
    emit({ type: 'delta', operationId: payload.requestId, conversationId: payload.conversationId, index: 2, text: 'partial' });
    expect(workspace.getSnapshot().operations[payload.requestId]!.partial).toBe('partial');
    await workspace.selectConversation(second.id); workspace.setMode('demo'); expect(activeThread(workspace.getSnapshot()).messages).toEqual([]);
    await workspace.logout(); expectCleared(workspace);
    emit({ type: 'delta', operationId: payload.requestId, conversationId: payload.conversationId, index: 3, text: 'late secret' });
    final.resolve(result(payload)); await pending; expectCleared(workspace);
  });

});
