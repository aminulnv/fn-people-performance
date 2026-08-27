import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { setTimeZoneForTests } from '@/lib/dates/timezone'
import { Input } from './Input'

afterEach(() => {
  cleanup()
  setTimeZoneForTests(null)
})

beforeEach(() => {
  setTimeZoneForTests('UTC')
})

describe('DateTimePicker', () => {
  it('lets the user pick a date and time, then apply the timestamp', () => {
    const onChange = vi.fn()
    render(
      <Input
        label="Opens"
        type="datetime"
        value="2027-09-21T09:00"
        onChange={onChange}
      />,
    )

    fireEvent.click(screen.getByLabelText('Opens'))
    expect(screen.getByRole('dialog', { name: 'Choose date and time' })).toBeInTheDocument()
    expect(screen.getByText('September 2027')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('option', { name: "10 o'clock" }))
    fireEvent.click(screen.getByRole('button', { name: 'Apply' }))

    expect(onChange).toHaveBeenCalled()
    expect(onChange.mock.calls.at(-1)?.[0].target.value).toBe(
      '2027-09-21T10:00:00.000Z',
    )
    expect(
      screen.queryByRole('dialog', { name: 'Choose date and time' }),
    ).not.toBeInTheDocument()
  })

  it('closes without changing the value when cancelled', () => {
    const onChange = vi.fn()
    render(
      <Input
        label="Closes"
        type="datetime"
        value="2027-09-21T10:00"
        onChange={onChange}
      />,
    )

    fireEvent.click(screen.getByLabelText('Closes'))
    fireEvent.click(screen.getByRole('option', { name: "11 o'clock" }))
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))

    expect(onChange).not.toHaveBeenCalled()
    expect(
      screen.queryByRole('dialog', { name: 'Choose date and time' }),
    ).not.toBeInTheDocument()
  })

  it('lets the user pick minutes and a period from the clock', () => {
    const onChange = vi.fn()
    render(
      <Input
        label="Opens"
        type="datetime"
        value="2027-09-21T09:00"
        onChange={onChange}
      />,
    )

    fireEvent.click(screen.getByLabelText('Opens'))
    fireEvent.focus(screen.getByLabelText('Minutes'))
    fireEvent.click(screen.getByRole('option', { name: '30 minutes' }))
    expect(screen.getByLabelText('Choose time, day')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'PM' }))
    expect(screen.getByLabelText('Choose time, night')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Apply' }))

    expect(onChange.mock.calls.at(-1)?.[0].target.value).toBe(
      '2027-09-21T21:30:00.000Z',
    )
  })

  it('lets the user type an hour and minute', () => {
    const onChange = vi.fn()
    render(
      <Input
        label="Opens"
        type="datetime"
        value="2027-09-21T09:00"
        onChange={onChange}
      />,
    )

    fireEvent.click(screen.getByLabelText('Opens'))
    fireEvent.change(screen.getByLabelText('Hours'), { target: { value: '10' } })
    fireEvent.change(screen.getByLabelText('Minutes'), { target: { value: '15' } })
    fireEvent.click(screen.getByRole('button', { name: 'Apply' }))

    expect(onChange.mock.calls.at(-1)?.[0].target.value).toBe(
      '2027-09-21T10:15:00.000Z',
    )
  })

  it('lets the user drag the clock needle to a new hour', () => {
    const onChange = vi.fn()
    render(
      <Input
        label="Opens"
        type="datetime"
        value="2027-09-21T09:00"
        onChange={onChange}
      />,
    )

    fireEvent.click(screen.getByLabelText('Opens'))
    const face = screen.getByRole('listbox', { name: 'Hour marks' })
    vi.spyOn(face, 'getBoundingClientRect').mockReturnValue({
      x: 0,
      y: 0,
      top: 0,
      left: 0,
      right: 100,
      bottom: 100,
      width: 100,
      height: 100,
      toJSON: () => ({}),
    })

    fireEvent.pointerDown(face, { clientX: 50, clientY: 0, button: 0 })
    fireEvent.pointerMove(face, { clientX: 100, clientY: 50 })
    fireEvent.pointerUp(face, { clientX: 100, clientY: 50 })
    fireEvent.click(screen.getByRole('button', { name: 'Apply' }))

    expect(onChange.mock.calls.at(-1)?.[0].target.value).toBe(
      '2027-09-21T03:00:00.000Z',
    )
  })

  it('disables days before the minimum date', () => {
    render(
      <Input
        label="Ends"
        type="datetime"
        min="2027-09-21T09:00"
        value="2027-09-25T17:00"
        onChange={() => {}}
      />,
    )

    fireEvent.click(screen.getByLabelText('Ends'))
    expect(screen.getByRole('button', { name: '20' })).toBeDisabled()
    expect(screen.getByRole('button', { name: '21' })).not.toBeDisabled()
  })

  it('does not apply a time before the minimum', () => {
    const onChange = vi.fn()
    render(
      <Input
        label="Ends"
        type="datetime"
        min="2027-09-21T10:00"
        value="2027-09-21T09:00"
        onChange={onChange}
      />,
    )

    fireEvent.click(screen.getByLabelText('Ends'))
    expect(screen.getByRole('button', { name: 'Apply' })).toBeDisabled()
    fireEvent.click(screen.getByRole('button', { name: 'Apply' }))
    expect(onChange).not.toHaveBeenCalled()
  })

  it('shows the same instant in Bangladesh first, then Malaysia, Sri Lanka, and Dubai', () => {
    render(
      <Input
        label="Opens"
        type="datetime"
        value="2026-08-25T06:30"
        onChange={() => {}}
      />,
    )

    fireEvent.click(screen.getByLabelText('Opens'))
    const zones = screen.getByRole('list', {
      name: 'Same time in other countries',
    })
    const names = within(zones)
      .getAllByRole('listitem')
      .map((item) => item.textContent ?? '')
    expect(names[0]).toContain('Bangladesh')
    expect(zones).toHaveTextContent('Malaysia')
    expect(zones).toHaveTextContent('Sri Lanka')
    expect(zones).toHaveTextContent('Dubai')
  })
})
