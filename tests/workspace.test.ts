import { afterEach, describe, expect, it, vi } from 'vitest';
import { api, ApiError, type Api } from '../web/src/api';
import { Workspace, workspaceStatus } from '../web/src/workspace';
import type { CommandResponse, Mode, Task } from '../shared/contracts';

const liveTask: Task = { id: 1, title: 'Private Live task', status: 'open', createdAt: '2026-10-13', mode: 'live' };
function result(mode: Mode, title = 'Private result'): CommandResponse {
  return { persisted: mode === 'live', task: { ...liveTask, id: mode === 'demo' ? 0 : 2, title, mode }, messages: [
    { id: `${mode}-user`, role: 'user', text: `Add a task to ${title}`, mode, createdAt: '2026-10-13' },
    { id: `${mode}-reply`, role: 'assistant', text: `Task added: ${title}`, mode, createdAt: '2026-10-13' },
  ] };
}
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
function setup() {
  const request = vi.fn(async (path: string, options?: RequestInit): Promise<unknown> => {
    if (path === '/tasks') return { tasks: [liveTask] };
    if (path === '/messages') return { messages: result('live').messages };
    if (path === '/commands') return result(JSON.parse(options?.body as string).mode);
    return undefined;
  });
  const workspace = new Workspace(request as Api);
  return { workspace, request };
}
async function populate() {
  const fixture = setup();
  await fixture.workspace.load();
  fixture.workspace.setMode('demo');
  fixture.workspace.setDraft('Add a task to demo');
  await fixture.workspace.submit();
  fixture.workspace.setDraft('Unsent private demo draft');
  fixture.workspace.setMode('live');
  fixture.workspace.setDraft('Unsent private Live draft');
  return fixture;
}
function expectCleared(workspace: Workspace) {
  const state = workspace.getSnapshot();
  expect(state.session).toBe('signed-out');
  expect(state.live).toEqual({ tasks: [], messages: [] });
  expect(state.demo).toEqual({ tasks: [], messages: [] });
  expect(state.drafts).toEqual({ live: '', demo: '' });
  expect(state.error).toBeNull();
  expect(state.pendingMode).toBeNull();
  expect(state.busy).toBeNull();
}

afterEach(() => { vi.unstubAllGlobals(); });

describe('Structured API errors', () => {
  it.each([[401, 'session'], [403, 'permission'], [503, 'server'], [422, 'request']] as const)('preserves HTTP %i and its meaning', async (status, kind) => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ error: 'Detail' }), { status })));
    await expect(api('/tasks')).rejects.toMatchObject({ name: 'ApiError', status, kind });
  });
  it('distinguishes network errors and supports empty successful logout responses', async () => {
    const fetch = vi.fn().mockRejectedValueOnce(new TypeError('Failed to fetch')).mockResolvedValueOnce(new Response(null, { status: 204 }));
    vi.stubGlobal('fetch', fetch);
    await expect(api('/tasks')).rejects.toMatchObject({ status: null, kind: 'network' });
    await expect(api('/auth/logout', { method: 'POST' })).resolves.toBeUndefined();
  });
});

describe('Session and execution boundaries', () => {
  it('shows initial failures with retry instead of a false sign-in screen', async () => {
    const { workspace, request } = setup();
    request.mockRejectedValueOnce(new ApiError('offline', null, 'network'));
    const load = workspace.load();
    expect(workspaceStatus(workspace.getSnapshot())).toBe('LOADING');
    await load;
    expect(workspace.getSnapshot().session).toBe('unavailable');
    expect(workspaceStatus(workspace.getSnapshot())).toBe('ERROR');
    await workspace.load();
    expect(workspace.getSnapshot().session).toBe('authenticated');
    expect(workspaceStatus(workspace.getSnapshot())).toBe('READY');
  });
  it.each([new ApiError('offline', null, 'network'), new ApiError('unavailable', 503, 'server'), new ApiError('denied', 403, 'permission')])('retains session, loaded content and drafts on $kind errors', async error => {
    const { workspace, request } = await populate();
    const before = workspace.getSnapshot();
    request.mockRejectedValueOnce(error);
    await workspace.load();
    const after = workspace.getSnapshot();
    expect(after.session).toBe('authenticated');
    expect(after.live).toEqual(before.live);
    expect(after.demo).toEqual(before.demo);
    expect(after.drafts).toEqual(before.drafts);
    expect(after.error).toMatchObject({ kind: error.kind, status: error.status });
    expect(workspaceStatus(after)).toBe(error.status === 403 ? 'ACCESS DENIED' : 'ERROR');
  });
  it('prioritizes a confirmed 401 over a simultaneous 503', async () => {
    const { workspace, request } = await populate();
    request.mockRejectedValueOnce(new ApiError('down', 503, 'server')).mockRejectedValueOnce(new ApiError('ended', 401, 'session'));
    await workspace.load();
    expectCleared(workspace);
  });
  it('clears a confirmed 401 immediately while the other endpoint is still pending', async () => {
    const { workspace, request } = await populate();
    const stalled = deferred<{ messages: CommandResponse['messages'] }>();
    request.mockRejectedValueOnce(new ApiError('ended', 401, 'session')).mockImplementationOnce(() => stalled.promise);
    const loading = workspace.load();
    await Promise.resolve();
    expectCleared(workspace);
    stalled.resolve({ messages: result('live').messages });
    await loading;
    expectCleared(workspace);
  });
  it('keeps a successful login when its initial content fetch fails', async () => {
    const { workspace, request } = setup();
    request.mockRejectedValueOnce(new ApiError('down', 503, 'server'));
    await workspace.loginSucceeded();
    expect(workspace.getSnapshot().session).toBe('authenticated');
    expect(workspace.getSnapshot().error?.operation).toBe('load');
  });
  it('separates Live/Demo messages, tasks and drafts across mode changes and refreshes', async () => {
    const { workspace, request } = await populate();
    expect(workspace.getSnapshot().live.tasks).toEqual([liveTask]);
    expect(workspace.getSnapshot().live.messages.every(message => message.mode === 'live')).toBe(true);
    expect(workspace.getSnapshot().demo.tasks).toHaveLength(1);
    expect(workspace.getSnapshot().demo.messages.every(message => message.mode === 'demo')).toBe(true);
    workspace.setMode('demo');
    expect(workspace.getSnapshot().drafts.demo).toBe('Unsent private demo draft');
    await workspace.load();
    expect(workspace.getSnapshot().demo.tasks).toHaveLength(1);
    const reloaded = new Workspace(request as Api);
    await reloaded.load();
    expect(reloaded.getSnapshot().demo).toEqual({ tasks: [], messages: [] });
    expect(reloaded.getSnapshot().drafts).toEqual({ live: '', demo: '' });
  });
  it.each(['live', 'demo'] as const)('attaches a delayed %s response to its original mode and exposes busy status', async mode => {
    const { workspace, request } = setup();
    await workspace.load();
    workspace.setMode(mode);
    workspace.setDraft('Add a task to delayed');
    const response = deferred<CommandResponse>();
    request.mockImplementationOnce(() => response.promise);
    const pending = workspace.submit();
    expect(workspaceStatus(workspace.getSnapshot())).toBe(mode === 'live' ? 'SAVING LIVE' : 'RUNNING DEMO');
    workspace.setMode(mode === 'live' ? 'demo' : 'live');
    const calls = request.mock.calls.length;
    await workspace.submit();
    await workspace.load();
    expect(request.mock.calls).toHaveLength(calls);
    response.resolve(result(mode));
    await pending;
    expect(workspace.getSnapshot()[mode].tasks[0]?.title).toBe('Private result');
    expect(workspace.getSnapshot().demo.tasks).toHaveLength(mode === 'demo' ? 1 : 0);
    expect(workspaceStatus(workspace.getSnapshot())).toBe('READY');
  });
  it('shows command errors and retains drafts without silently resending a POST', async () => {
    const { workspace, request } = await populate();
    request.mockRejectedValueOnce(new ApiError('offline', null, 'network'));
    await workspace.submit();
    expect(workspaceStatus(workspace.getSnapshot())).toBe('ERROR');
    expect(workspace.getSnapshot().error?.message).toContain('may have been received');
    expect(workspace.getSnapshot().drafts.live).toBe('Unsent private Live draft');
    expect(request.mock.calls.filter(([path]) => path === '/commands')).toHaveLength(2);
  });
  it('clears all session data after successful logout', async () => {
    const { workspace } = await populate();
    await workspace.logout();
    expectCleared(workspace);
  });
  it.each(['command', 'logout'] as const)('clears all session data on a %s 401', async operation => {
    const { workspace, request } = await populate();
    request.mockRejectedValueOnce(new ApiError('ended', 401, 'session'));
    await (operation === 'command' ? workspace.submit() : workspace.logout());
    expectCleared(workspace);
  });
  it('reports a failed logout, retains content and allows retry', async () => {
    const { workspace, request } = await populate();
    const before = workspace.getSnapshot();
    request.mockRejectedValueOnce(new ApiError('offline', null, 'network'));
    await workspace.logout();
    expect(workspace.getSnapshot().session).toBe('authenticated');
    expect(workspace.getSnapshot().live).toEqual(before.live);
    expect(workspace.getSnapshot().demo).toEqual(before.demo);
    expect(workspace.getSnapshot().drafts).toEqual(before.drafts);
    expect(workspace.getSnapshot().error?.message).toContain('Sign out was not confirmed');
    await workspace.logout();
    expectCleared(workspace);
  });
  it.each(['resolve', 'reject'] as const)('ignores a late command %s after logout, even when abort is ignored', async finish => {
    const { workspace, request } = await populate();
    const response = deferred<CommandResponse>();
    request.mockImplementationOnce(() => response.promise);
    const pending = workspace.submit();
    await workspace.logout();
    expectCleared(workspace);
    if (finish === 'resolve') response.resolve(result('live'));
    else response.reject(new ApiError('old private error', 403, 'permission'));
    await pending;
    expectCleared(workspace);
  });
  it('ignores old loads after logout and a new login', async () => {
    const { workspace, request } = await populate();
    const tasks = deferred<{ tasks: Task[] }>();
    const messages = deferred<{ messages: CommandResponse['messages'] }>();
    request.mockImplementationOnce(() => tasks.promise).mockImplementationOnce(() => messages.promise);
    const pending = workspace.load();
    await workspace.logout();
    await workspace.loginSucceeded();
    tasks.resolve({ tasks: [{ ...liveTask, title: 'Stale account data' }] });
    messages.reject(new ApiError('Old session expired', 401, 'session'));
    await pending;
    expect(workspace.getSnapshot().session).toBe('authenticated');
    expect(workspace.getSnapshot().live.tasks).toEqual([liveTask]);
  });
});
