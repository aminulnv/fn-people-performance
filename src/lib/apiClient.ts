import { getAccessToken } from '@/lib/authApi'

export class ApiError extends Error {
  readonly status: number
  readonly body: unknown

  constructor(message: string, status: number, body: unknown = null) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.body = body
  }
}

export type ApiRequestOptions = Omit<RequestInit, 'body'> & {
  body?: unknown
  /** Absolute override; defaults to `VITE_API_BASE_URL` + path. */
  baseUrl?: string
  /** Skip attaching the session Bearer token. */
  skipAuth?: boolean
}

/** Resolve a platform API path against `VITE_API_BASE_URL` (empty = same origin). */
export function resolveApiUrl(path: string, baseUrl?: string): string {
  if (/^https?:\/\//i.test(path)) return path
  const base =
    baseUrl ??
    (typeof import.meta !== 'undefined'
      ? (import.meta.env.VITE_API_BASE_URL as string | undefined)
      : undefined) ??
    ''
  if (!base) return path
  return `${base.replace(/\/$/, '')}/${path.replace(/^\//, '')}`
}

/**
 * Typed fetch wrapper for backend routes.
 * Sends cookies (`credentials: 'include'`) and, when present, a Bearer token
 * from the auth session. Throws `ApiError` on non-2xx responses.
 */
export async function apiFetch<T>(
  path: string,
  options: ApiRequestOptions = {},
): Promise<T> {
  const { body, baseUrl, headers, skipAuth, credentials, ...rest } = options
  const token = skipAuth ? null : getAccessToken()

  const response = await fetch(resolveApiUrl(path, baseUrl), {
    credentials: credentials ?? 'include',
    ...rest,
    headers: {
      Accept: 'application/json',
      ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  })

  const text = await response.text()
  let parsed: unknown = null
  if (text) {
    try {
      parsed = JSON.parse(text) as unknown
    } catch {
      parsed = text
    }
  }

  if (!response.ok) {
    const serverMessage =
      parsed &&
      typeof parsed === 'object' &&
      parsed !== null &&
      'error' in parsed &&
      typeof (parsed as { error?: unknown }).error === 'string'
        ? (parsed as { error: string }).error
        : null
    throw new ApiError(
      serverMessage ?? `Request failed (${response.status})`,
      response.status,
      parsed,
    )
  }

  return parsed as T
}
