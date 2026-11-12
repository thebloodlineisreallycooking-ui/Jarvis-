export type ErrorKind = 'network' | 'session' | 'permission' | 'server' | 'request';

export class ApiError extends Error {
  constructor(message: string, readonly status: number | null, readonly kind: ErrorKind) {
    super(message);
    this.name = 'ApiError';
  }
}

export type Api = <T>(path: string, options?: RequestInit) => Promise<T>;

export const api: Api = async <T>(path: string, options?: RequestInit): Promise<T> => {
  const headers = new Headers(options?.headers);
  if (options?.body) headers.set('content-type', 'application/json');
  let response: Response;
  try {
    response = await fetch(`/api${path}`, { ...options, headers, credentials: 'same-origin' });
  } catch (reason) {
    if (options?.signal?.aborted) throw reason;
    throw new ApiError('Connection failed. Check your connection and try again.', null, 'network');
  }
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    const detail = typeof body?.error === 'string' ? body.error : `Request failed (${response.status}).`;
    const kind: ErrorKind = response.status === 401 ? 'session' : response.status === 403 ? 'permission' : response.status >= 500 ? 'server' : 'request';
    const message = kind === 'session' ? 'Your session has ended. Sign in again.'
      : kind === 'permission' ? 'Access denied. Your account does not have permission for this request.'
      : kind === 'server' ? 'The server is temporarily unavailable. Please try again.' : detail;
    throw new ApiError(message, response.status, kind);
  }
  if (response.status === 204) return undefined as T;
  try { return await response.json() as T; }
  catch { throw new ApiError('The server returned an unreadable response. Please try again.', response.status, 'server'); }
};
