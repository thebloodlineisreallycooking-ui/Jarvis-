export type ErrorKind = 'network' | 'session' | 'permission' | 'server' | 'request';
export class ApiError extends Error {
  constructor(message: string, readonly status: number | null, readonly kind: ErrorKind,
    readonly code?: string, readonly current?: unknown, readonly retryAfter?: number) {
    super(message); this.name = 'ApiError';
  }
}
export type Api = <T>(path: string, options?: RequestInit) => Promise<T>;
export async function responseError(response: Response): Promise<ApiError> {
  const body: unknown = await response.json().catch(() => null);
  const value = body && typeof body === 'object' ? body as Record<string, unknown> : {};
  const detail = typeof value.error === 'string' ? value.error : `Request failed (${response.status}).`;
  const kind: ErrorKind = response.status === 401 ? 'session' : response.status === 403 ? 'permission' : response.status >= 500 ? 'server' : 'request';
  const message = kind === 'session' ? 'Your session has ended. Sign in again.'
    : kind === 'permission' ? 'Access denied. Begäran nekades; sessionen är kvar.'
    : kind === 'server' ? 'Servern är tillfälligt otillgänglig. Försök igen.' : detail;
  const retry = Number(response.headers.get('Retry-After'));
  return new ApiError(message, response.status, kind, typeof value.code === 'string' ? value.code : undefined,
    value.current, Number.isFinite(retry) && retry > 0 ? retry : undefined);
}
// Bounded transport; no automatic replay of mutations. A timeout is an unknown
// write outcome, even if aborting the socket succeeds.
export const api: Api = async <T>(path: string, options?: RequestInit): Promise<T> => {
  const headers = new Headers(options?.headers);
  if (options?.body) headers.set('content-type', 'application/json');
  const controller = new AbortController();
  const abort = () => controller.abort();
  options?.signal?.addEventListener('abort', abort, { once: true });
  if (options?.signal?.aborted) abort();
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const timeout = new Promise<never>((_, reject) => { timer = setTimeout(() => { controller.abort(); reject(new ApiError('Begäran tog för lång tid. Resultatet kan vara sparat.', null, 'network', 'TIMEOUT')); }, 35000); });
    return await Promise.race([timeout, (async () => {
      let response: Response;
      try { response = await fetch(`/api${path}`, { ...options, signal: controller.signal, headers, credentials: 'same-origin', cache: 'no-store' }); }
      catch { throw new ApiError('Anslutningen bröts. Kontrollera nätverket.', null, 'network'); }
      if (!response.ok) throw await responseError(response);
      if (response.status === 204) return undefined as T;
      try { return await response.json() as T; }
      catch { throw new ApiError('Serverns svar kunde inte läsas. Kontrollera resultatet innan du försöker igen.', response.status, 'server'); }
    })()]);
  } finally { clearTimeout(timer); options?.signal?.removeEventListener('abort', abort); }
};
