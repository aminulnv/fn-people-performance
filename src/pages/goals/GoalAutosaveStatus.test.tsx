import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { GoalAutosaveStatus } from './GoalAutosaveStatus'

afterEach(cleanup)

describe('GoalAutosaveStatus', () => {
  it('reassures that autosave is on before any edit', () => {
    render(<GoalAutosaveStatus state="idle" />)
    expect(screen.getByText('Auto-save on')).toBeInTheDocument()
  })

  it('announces saving while an edit is pending', () => {
    render(<GoalAutosaveStatus state="saving" />)
    expect(screen.getByRole('status')).toHaveTextContent('Saving…')
  })

  it('announces saved once the edit lands', () => {
    render(<GoalAutosaveStatus state="saved" />)
    expect(screen.getByRole('status')).toHaveTextContent('Saved')
  })
})
