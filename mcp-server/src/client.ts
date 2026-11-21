/**
 * Thin client for the Wazelo Developer API (X-API-Key auth).
 * Unwraps the `{ success, data }` envelope and turns API errors into
 * readable messages the model can act on.
 */

export class WazeloApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

type Query = Record<string, string | number | undefined>;

export class WazeloClient {
  private readonly baseUrl: string;

  constructor(
    baseUrl: string,
    private readonly apiKey: string,
  ) {
    this.baseUrl = baseUrl.replace(/\/+$/, '');
  }

  get<T = unknown>(path: string, query?: Query): Promise<T> {
    return this.request<T>('GET', path, undefined, query);
  }

  post<T = unknown>(path: string, body: unknown, headers?: Record<string, string>): Promise<T> {
    return this.request<T>('POST', path, body, undefined, headers);
  }

  put<T = unknown>(path: string, body: unknown): Promise<T> {
    return this.request<T>('PUT', path, body);
  }

  delete<T = unknown>(path: string): Promise<T> {
    return this.request<T>('DELETE', path);
  }

  private async request<T>(
    method: string,
    path: string,
    body?: unknown,
    query?: Query,
    headers?: Record<string, string>,
  ): Promise<T> {
    const url = new URL(`${this.baseUrl}/developer${path}`);
    for (const [k, v] of Object.entries(query ?? {})) {
      if (v !== undefined && v !== '') url.searchParams.set(k, String(v));
    }

    let res: Response;
    try {
      res = await fetch(url, {
        method,
        headers: {
          'X-API-Key': this.apiKey,
          Accept: 'application/json',
          ...(body !== undefined && { 'Content-Type': 'application/json' }),
          ...headers,
        },
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: AbortSignal.timeout(30_000),
      });
    } catch (err) {
      throw new WazeloApiError(0, `Could not reach Wazelo at ${this.baseUrl}: ${(err as Error).message}`);
    }

    const text = await res.text();
    let json: any = undefined;
    try {
      json = text ? JSON.parse(text) : undefined;
    } catch {
      // non-JSON body (proxy error page etc.)
    }

    if (!res.ok) {
      const raw = json?.message ?? json?.error ?? text ?? res.statusText;
      const message = Array.isArray(raw) ? raw.join('; ') : String(raw);
      throw new WazeloApiError(res.status, `${res.status} ${hint(res.status)}${message}`.trim());
    }

    return (json && typeof json === 'object' && 'data' in json ? json.data : json) as T;
  }
}

function hint(status: number): string {
  switch (status) {
    case 401:
      return '(API key missing, invalid or expired) ';
    case 403:
      return '(key lacks a scope, API not on the plan, or a usage limit was reached) ';
    case 404:
      return '(not found) ';
    case 429:
      return '(rate limited, wait and retry) ';
    default:
      return '';
  }
}
