import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Input } from './Input'

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
})
