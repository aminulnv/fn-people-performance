import { afterEach, describe, expect, it, vi } from 'vitest'
import { installTableScrollbarReveal } from './tableScrollbarReveal'

afterEach(() => {
  vi.useRealTimers()
})

describe('installTableScrollbarReveal', () => {
  it('reveals native scrollbars while scrolling', () => {
    vi.useFakeTimers()

    const container = document.createElement('div')
    container.className = 'pd-people__table-wrap'
    document.body.appendChild(container)

    const teardown = installTableScrollbarReveal()
    container.dispatchEvent(new Event('scroll', { bubbles: false }))

    expect(container.classList.contains('is-scrolling')).toBe(true)

    vi.advanceTimersByTime(900)
    expect(container.classList.contains('is-scrolling')).toBe(false)

    teardown()
    container.remove()
  })

  it('reveals the goal window scrollbar while scrolling', () => {
    vi.useFakeTimers()

    const container = document.createElement('div')
    container.className = 'pd-goals-drawer__body'
    document.body.appendChild(container)

    const teardown = installTableScrollbarReveal()
    container.dispatchEvent(new Event('scroll', { bubbles: false }))

    expect(container.classList.contains('is-scrolling')).toBe(true)

    vi.advanceTimersByTime(900)
    expect(container.classList.contains('is-scrolling')).toBe(false)

    teardown()
    container.remove()
  })
})
