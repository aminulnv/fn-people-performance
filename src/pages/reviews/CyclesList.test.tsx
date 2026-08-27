import { afterEach, beforeAll, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import {
  createReviewCycle,
  resetReviewsStoreForTests,
} from '@/lib/reviews/store'
import CycleDetailPage from '@/pages/CycleDetailPage'
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
  it('filters cycles from the Filters menu', () => {
    resetReviewsStoreForTests()

    render(
      <MemoryRouter initialEntries={['/cycles']}>
        <CyclesList />
      </MemoryRouter>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Filters' }))
    fireEvent.click(screen.getByRole('button', { name: 'Type' }))
    fireEvent.click(screen.getByRole('option', { name: 'Custom' }))

    expect(screen.getByText('0 shown')).toBeInTheDocument()
  })

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

  it('shows a success toast after adding a cycle', async () => {
    resetReviewsStoreForTests()

    render(
      <MemoryRouter initialEntries={['/cycles']}>
        <Routes>
          <Route path="/cycles" element={<CyclesList />} />
          <Route
            path="/cycles/:cycleId/:section"
            element={<CycleDetailPage />}
          />
        </Routes>
      </MemoryRouter>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Add Cycle' }))
    fireEvent.click(screen.getByRole('button', { name: 'Custom' }))
    fireEvent.change(screen.getByLabelText('Name'), {
      target: { value: 'New cycle' },
    })
    fireEvent.change(screen.getByLabelText('Starts'), {
      target: { value: '2026-08-01T09:00' },
    })
    fireEvent.change(screen.getByLabelText('Ends'), {
      target: { value: '2026-08-31T17:00' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Create cycle' }))

    const notice = await screen.findByRole('status')
    expect(notice).toHaveTextContent('Success!')
    expect(notice).toHaveTextContent('Cycle created.')
    expect(screen.getByRole('button', { name: 'Got It' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      'New cycle',
    )
  })

  it('nests included quarters under the annual and keeps unlinked cycles top-level', async () => {
    resetReviewsStoreForTests()
    await createReviewCycle({
      type: 'regular',
      periodKey: 'q1-2026',
    })
    await createReviewCycle({
      type: 'regular',
      periodKey: 'annual-2026',
    })
    await createReviewCycle({
      type: 'regular',
      periodKey: 'q1-2025',
    })

    render(
      <MemoryRouter initialEntries={['/cycles']}>
        <Routes>
          <Route path="/cycles" element={<CyclesList />} />
          <Route
            path="/cycles/:cycleId/:section"
            element={<p>Opened nested cycle</p>}
          />
        </Routes>
      </MemoryRouter>,
    )

    const collapse = screen.getByRole('button', {
      name: 'Collapse Annual 2026',
    })
    expect(collapse).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByRole('link', { name: /Q1 2026/ })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Q3 2026/ })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Q1 2025/ })).toBeInTheDocument()
    expect(
      document.querySelectorAll('.pd-reviews-cycles__branch'),
    ).toHaveLength(2)
    expect(
      document.querySelector('.pd-reviews-cycles__row--open'),
    ).toBeTruthy()
    expect(
      screen.queryByRole('button', { name: /Expand Q1 2025/ }),
    ).not.toBeInTheDocument()

    fireEvent.click(collapse)
    expect(
      screen.getByRole('button', { name: 'Expand Annual 2026' }),
    ).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByRole('link', { name: /Q1 2026/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /Q3 2026/ })).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Q1 2025/ })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Expand Annual 2026' }))
    fireEvent.click(screen.getByRole('link', { name: /Q1 2026/ }))
    expect(screen.getByText('Opened nested cycle')).toBeInTheDocument()
  })

  it('shows a date-based status for custom cycles and filters them by kind', async () => {
    resetReviewsStoreForTests()
    await createReviewCycle({
      type: 'custom',
      name: 'Leadership Mid Year',
      startDate: '2025-01-01',
      endDate: '2025-01-31',
    })

    render(
      <MemoryRouter initialEntries={['/cycles']}>
        <Routes>
          <Route path="/cycles" element={<CyclesList />} />
        </Routes>
      </MemoryRouter>,
    )

    const customRow = screen.getByRole('link', {
      name: /Leadership Mid Year/,
    }).closest('tr')
    expect(customRow).toHaveTextContent('Custom')
    expect(customRow).toHaveTextContent('Previous')
    expect(customRow).not.toHaveTextContent('Manual')

    fireEvent.click(screen.getByRole('button', { name: /Custom/ }))
    expect(
      screen.getByRole('link', { name: /Leadership Mid Year/ }),
    ).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /Q3 2026/ })).not.toBeInTheDocument()
  })
})
