import { afterEach, describe, expect, it, vi } from 'vitest'

const clarityInit = vi.fn()

vi.mock('@microsoft/clarity', () => ({
  default: { init: clarityInit },
}))

describe('initClarity', () => {
  afterEach(() => {
    vi.resetModules()
    clarityInit.mockClear()
  })

  it('initializes when a project id is configured', async () => {
    vi.stubEnv('MODE', 'development')
    vi.stubEnv('VITE_CLARITY_PROJECT_ID', 'test-project-id')

    const { initClarity } = await import('./clarity')
    initClarity()
    initClarity()

    expect(clarityInit).toHaveBeenCalledTimes(1)
    expect(clarityInit).toHaveBeenCalledWith('test-project-id')
  })

  it('skips initialization without a project id', async () => {
    vi.stubEnv('MODE', 'development')
    vi.stubEnv('VITE_CLARITY_PROJECT_ID', '')

    const { initClarity } = await import('./clarity')
    initClarity()

    expect(clarityInit).not.toHaveBeenCalled()
  })

  it('skips initialization in test mode', async () => {
    vi.stubEnv('MODE', 'test')
    vi.stubEnv('VITE_CLARITY_PROJECT_ID', 'test-project-id')

    const { initClarity } = await import('./clarity')
    initClarity()

    expect(clarityInit).not.toHaveBeenCalled()
  })
})
