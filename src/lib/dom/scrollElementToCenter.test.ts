import { describe, expect, it, vi } from 'vitest'
import { scrollElementToCenter } from './scrollElementToCenter'

function setDimension(
  element: HTMLElement,
  property: 'clientWidth' | 'clientHeight' | 'scrollWidth' | 'scrollHeight',
  value: number,
) {
  Object.defineProperty(element, property, { configurable: true, value })
}

describe('scrollElementToCenter', () => {
  it('scrolls only the owning container to the target center', () => {
    const container = document.createElement('div')
    const target = document.createElement('div')
    container.append(target)

    setDimension(container, 'clientWidth', 400)
    setDimension(container, 'clientHeight', 300)
    setDimension(container, 'scrollWidth', 1_200)
    setDimension(container, 'scrollHeight', 900)
    container.scrollLeft = 100
    container.scrollTop = 50
    container.getBoundingClientRect = () =>
      ({ left: 20, top: 30, width: 400, height: 300 }) as DOMRect
    target.getBoundingClientRect = () =>
      ({ left: 470, top: 380, width: 100, height: 60 }) as DOMRect
    const scrollTo = vi.fn()
    container.scrollTo = scrollTo

    expect(scrollElementToCenter(container, target)).toBe(true)
    expect(scrollTo).toHaveBeenCalledWith({
      left: 400,
      top: 280,
      behavior: 'smooth',
    })
  })

  it('does not scroll when the target belongs to another container', () => {
    const container = document.createElement('div')
    const target = document.createElement('div')
    const scrollTo = vi.fn()
    container.scrollTo = scrollTo

    expect(scrollElementToCenter(container, target)).toBe(false)
    expect(scrollTo).not.toHaveBeenCalled()
  })
})
