import { afterEach, beforeAll, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import {
  createReviewCycle,
  resetReviewsStoreForTests,
} from '@/lib/reviews/store'
import { CyclesList } from './reviews/CyclesList'
import CycleDetailPage from './CycleDetailPage'

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

describe('CycleDetailPage', () => {
  it('shows a success toast after creating a test cycle', async () => {
    const cycle = await createReviewCycle({
      type: 'custom',
      name: 'Source',
      startDate: '2026-08-27',
      endDate: '2026-08-27',
    })

    render(
      <MemoryRouter initialEntries={[`/cycles/${cycle.id}/settings`]}>
        <Routes>
          <Route
            path="/cycles/:cycleId/:section"
            element={<CycleDetailPage />}
          />
        </Routes>
      </MemoryRouter>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'More cycle actions' }))
    fireEvent.click(screen.getByRole('menuitem', { name: 'Create Test Cycle' }))

    const notice = await screen.findByRole('status')
    expect(notice).toHaveTextContent('Success!')
    expect(notice).toHaveTextContent('Test cycle created.')
    expect(screen.getByRole('button', { name: 'Got It' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      'Source (Test)',
    )
  })

  it('shows a success toast after deleting a cycle', async () => {
    const cycle = await createReviewCycle({
      type: 'custom',
      name: 'To remove',
      startDate: '2026-08-27',
      endDate: '2026-08-27',
    })

    render(
      <MemoryRouter initialEntries={[`/cycles/${cycle.id}/settings`]}>
        <Routes>
          <Route path="/cycles" element={<CyclesList />} />
          <Route
            path="/cycles/:cycleId/:section"
            element={<CycleDetailPage />}
          />
        </Routes>
      </MemoryRouter>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'More cycle actions' }))
    fireEvent.click(screen.getByRole('menuitem', { name: 'Delete Cycle' }))
    fireEvent.click(screen.getByRole('button', { name: 'Delete Cycle' }))

    const notice = await screen.findByRole('status')
    expect(notice).toHaveTextContent('Success!')
    expect(notice).toHaveTextContent('Cycle deleted.')
    expect(screen.getByRole('button', { name: 'Got It' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'To remove' })).not.toBeInTheDocument()
  })
})
