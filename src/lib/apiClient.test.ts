import { afterEach, describe, expect, it, vi } from 'vitest'
import { ApiError, apiFetch } from '@/lib/apiClient'
import { DEMO_USER, clearSession, writeSession } from '@/lib/authApi'

afterEach(() => {
  vi.unstubAllGlobals()
  clearSession()
})

describe('apiFetch', () => {
  it('returns parsed JSON on success', async () => {
    const fetchMock = vi.fn(async () =>
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    )
    vi.stubGlobal('fetch', fetchMock)

    await expect(apiFetch<{ ok: boolean }>('/health')).resolves.toEqual({
      ok: true,
    })
    expect(fetchMock).toHaveBeenCalledWith(
      '/health',
      expect.objectContaining({ credentials: 'include' }),
    )
  })

  it('attaches Bearer token from the auth session', async () => {
    writeSession({
      user: DEMO_USER,
      signedInAt: '2026-01-01T00:00:00.000Z',
      accessToken: 'test-token',
    })

    const fetchMock = vi.fn(async () =>
      new Response(JSON.stringify({ ok: true }), { status: 200 }),
    )
    vi.stubGlobal('fetch', fetchMock)

    await apiFetch('/secure')

    expect(fetchMock).toHaveBeenCalledWith(
      '/secure',
      expect.objectContaining({
        credentials: 'include',
        headers: expect.objectContaining({
          Authorization: 'Bearer test-token',
        }),
      }),
    )
  })

  it('skips Authorization when skipAuth is set', async () => {
    writeSession({
      user: DEMO_USER,
      signedInAt: '2026-01-01T00:00:00.000Z',
      accessToken: 'test-token',
    })

    const fetchMock = vi.fn(async () =>
      new Response(JSON.stringify({ ok: true }), { status: 200 }),
    )
    vi.stubGlobal('fetch', fetchMock)

    await apiFetch('/public', { skipAuth: true })

    expect(fetchMock).toHaveBeenCalledWith(
      '/public',
      expect.objectContaining({
        credentials: 'include',
        headers: expect.not.objectContaining({
          Authorization: 'Bearer test-token',
        }),
      }),
    )
  })

  it('throws ApiError on non-2xx', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        new Response(JSON.stringify({ message: 'nope' }), {
          status: 403,
          headers: { 'Content-Type': 'application/json' },
        }),
      ),
    )

    await expect(apiFetch('/secure')).rejects.toBeInstanceOf(ApiError)
    await expect(apiFetch('/secure')).rejects.toMatchObject({
      status: 403,
      body: { message: 'nope' },
    })
  })
})
