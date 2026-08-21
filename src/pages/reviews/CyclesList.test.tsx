import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { resetReviewsStoreForTests } from '@/lib/reviews/store'
import { CyclesList } from './CyclesList'

afterEach(() => {
  cleanup()
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
})
