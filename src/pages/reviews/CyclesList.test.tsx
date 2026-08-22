import { afterEach, beforeAll, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { resetReviewsStoreForTests } from '@/lib/reviews/store'
import { CyclesList } from './CyclesList'

beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function showModal() {
    this.setAttribute('open', '')
  }
  HTMLDialogElement.prototype.close = function close() {
    this.removeAttribute('open')
  }
})

afterEach(() => {
  cleanup()
  document.body.style.overflow = ''
  resetReviewsStoreForTests()
})

describe('CyclesList', () => {
  it('opens a cycle when the row is clicked outside the name', () => {
    resetReviewsStoreForTests()

    render(
      <MemoryRouter initialEntries={['/cycles']}>
        <Routes>
          <Route path="/cycles" element={<CyclesList />} />
          <Route
            path="/cycles/:cycleId/:section"
            element={<p>Opened cycle</p>}
          />
        </Routes>
      </MemoryRouter>,
    )

    fireEvent.click(screen.getByText('Scheduled'))
    expect(screen.getByText('Opened cycle')).toBeInTheDocument()
  })

  it('creates an annual cycle from Add Cycle without resetting the selection', async () => {
    resetReviewsStoreForTests()

    render(
      <MemoryRouter initialEntries={['/cycles']}>
        <Routes>
          <Route path="/cycles" element={<CyclesList />} />
          <Route
            path="/cycles/:cycleId/:section"
            element={<p>Opened annual settings</p>}
          />
        </Routes>
      </MemoryRouter>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Add Cycle' }))
    fireEvent.click(screen.getByRole('button', { name: 'Annual' }))
    expect(screen.getByRole('button', { name: 'Annual' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    expect(screen.getByLabelText('Year')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Create cycle' }))

    expect(await screen.findByText('Opened annual settings')).toBeInTheDocument()
  })
})
