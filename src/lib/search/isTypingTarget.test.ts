import { describe, expect, it } from 'vitest'
import { isTypingTarget } from './isTypingTarget'

describe('isTypingTarget', () => {
  it('treats text inputs and textareas as typing targets', () => {
    const input = document.createElement('input')
    input.type = 'search'
    const textarea = document.createElement('textarea')
    expect(isTypingTarget(input)).toBe(true)
    expect(isTypingTarget(textarea)).toBe(true)
  })

  it('lets slash open search from buttons and checkboxes', () => {
    const button = document.createElement('button')
    const checkbox = document.createElement('input')
    checkbox.type = 'checkbox'
    expect(isTypingTarget(button)).toBe(false)
    expect(isTypingTarget(checkbox)).toBe(false)
  })
})
