import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { setTimeZoneForTests } from '@/lib/dates/timezone'
import { Input } from './Input'

beforeEach(() => {
  setTimeZoneForTests('UTC')
})

afterEach(() => {
  cleanup()
  setTimeZoneForTests(null)
})

describe('Input date fields', () => {
  it('shows a committed date as DD-MMM-YYYY', () => {
    render(<Input label="Starts" type="date" value="2027-03-05" onChange={() => {}} />)

    expect(screen.getByLabelText('Starts')).toHaveValue('2027-03-05')
    expect(screen.getByText('05-Mar-2027')).toBeInTheDocument()
  })

  it('shows a format hint when the date is empty', () => {
    render(<Input label="Ends" type="date" value="" onChange={() => {}} />)

    expect(screen.getByLabelText('Ends')).toHaveValue('')
    expect(screen.getByText('DD-MMM-YYYY')).toBeInTheDocument()
  })

  it('keeps a notched label associated with the date field', () => {
    render(
      <Input
        label="Starts"
        type="date"
        labelPlacement="notch"
        value="2026-08-24"
        onChange={() => {}}
      />,
    )

    expect(screen.getByLabelText('Starts')).toHaveValue('2026-08-24')
  })

  it('shows a timestamp as a date and time label', () => {
    render(
      <Input
        label="Opens"
        type="datetime"
        value="2027-09-21T10:00"
        onChange={() => {}}
      />,
    )

    expect(screen.getByLabelText('Opens')).toHaveValue('2027-09-21T10:00')
    expect(screen.getByText('21-Sep-2027, 10:00 AM')).toBeInTheDocument()
  })
})
