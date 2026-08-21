import { describe, expect, it, vi, afterEach } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { FocusSafeTextField } from './FocusSafeTextField'

afterEach(() => {
  cleanup()
})

describe('FocusSafeTextField', () => {
  it('keeps typed text while focused when the stored value resets externally', () => {
    const onChange = vi.fn()
    const { rerender } = render(
      <FocusSafeTextField
        value=""
        onChange={onChange}
        inputKey="field-1"
        placeholder="Metric name"
      />,
    )

    const input = screen.getByLabelText('Metric name')
    fireEvent.focus(input)
    fireEvent.change(input, { target: { value: 'ABCD' } })

    rerender(
      <FocusSafeTextField
        value=""
        onChange={onChange}
        inputKey="field-1"
        placeholder="Metric name"
      />,
    )

    expect(input).toHaveValue('ABCD')
  })

  it('resets when switching to another field key', () => {
    const onChange = vi.fn()
    const { rerender } = render(
      <FocusSafeTextField
        key="field-1"
        value="Metric 1"
        onChange={onChange}
        inputKey="field-1"
        placeholder="Metric name"
      />,
    )

    rerender(
      <FocusSafeTextField
        key="field-2"
        value="Metric 2"
        onChange={onChange}
        inputKey="field-2"
        placeholder="Metric name"
      />,
    )

    expect(screen.getByLabelText('Metric name')).toHaveValue('Metric 2')
  })

  it('keeps checklist item text while focused during external reset', () => {
    const onChange = vi.fn()
    const { rerender } = render(
      <FocusSafeTextField
        value=""
        onChange={onChange}
        inputKey="todo-1"
        placeholder="Untitled task"
        ariaLabel="Task"
      />,
    )

    const input = screen.getByLabelText('Task')
    fireEvent.focus(input)
    fireEvent.change(input, { target: { value: 'Ship the feature' } })

    rerender(
      <FocusSafeTextField
        value=""
        onChange={onChange}
        inputKey="todo-1"
        placeholder="Untitled task"
        ariaLabel="Task"
      />,
    )

    expect(input).toHaveValue('Ship the feature')
  })
})
