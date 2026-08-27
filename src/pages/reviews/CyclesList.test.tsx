import { afterEach, beforeAll, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import {
  createCycleGroup,
  createReviewCycle,
  getReviewCycle,
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

function createDataTransfer() {
  const store: Record<string, string> = {}
  return {
    dropEffect: 'none',
    effectAllowed: 'uninitialized',
    files: [] as unknown as FileList,
    items: [] as unknown as DataTransferItemList,
    types: [] as string[],
    setData(type: string, value: string) {
      store[type] = value
    },
    getData(type: string) {
      return store[type] ?? ''
    },
    clearData() {
      for (const key of Object.keys(store)) delete store[key]
    },
    setDragImage() {},
  } as DataTransfer
}

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

    fireEvent.click(screen.getByText('Quarterly'))
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

    fireEvent.click(screen.getByRole('button', { name: 'Create Cycle' }))

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
    fireEvent.click(screen.getByRole('button', { name: 'Create Cycle' }))

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

  it('includes a dragged cycle when dropped on an annual', async () => {
    resetReviewsStoreForTests()
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
        </Routes>
      </MemoryRouter>,
    )

    const source = screen.getByRole('link', { name: /Q1 2025/ }).closest('tr')
    const annual = screen.getByRole('link', { name: /Annual 2026/ }).closest('tr')
    if (!source || !annual) throw new Error('Expected cycle rows')

    const dataTransfer = createDataTransfer()
    fireEvent.dragStart(source, { dataTransfer })
    fireEvent.dragOver(annual, { dataTransfer })
    fireEvent.drop(annual, { dataTransfer })
    fireEvent.dragEnd(source, { dataTransfer })

    await waitFor(() => {
      expect(
        getReviewCycle('annual-2026')?.sourceLinks?.map(
          (link) => link.sourceCycleId,
        ),
      ).toContain('q1-2025')
    })
    expect(
      document.querySelectorAll('.pd-reviews-cycles__branch'),
    ).toHaveLength(2)
    expect(screen.getByRole('status')).toHaveTextContent(
      'Q1 2025 included in Annual 2026.',
    )
  })

  it('removes a nested cycle when dragged out of the annual', async () => {
    resetReviewsStoreForTests()
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
        </Routes>
      </MemoryRouter>,
    )

    const nested = screen.getByRole('link', { name: /Q3 2026/ }).closest('tr')
    const outside = screen.getByRole('link', { name: /Q1 2025/ }).closest('tr')
    if (!nested || !outside) throw new Error('Expected cycle rows')

    const dataTransfer = createDataTransfer()
    fireEvent.dragStart(nested, { dataTransfer })
    fireEvent.dragOver(outside, { dataTransfer })
    fireEvent.drop(outside, { dataTransfer })
    fireEvent.dragEnd(nested, { dataTransfer })

    await waitFor(() => {
      expect(
        getReviewCycle('annual-2026')?.sourceLinks?.map(
          (link) => link.sourceCycleId,
        ),
      ).not.toContain('q3-2026')
    })
    expect(
      document.querySelectorAll('.pd-reviews-cycles__branch'),
    ).toHaveLength(0)
    expect(screen.getByRole('status')).toHaveTextContent(
      'Q3 2026 removed from Annual 2026.',
    )
  })

  it('shows people, groups, and module flags for each cycle', async () => {
    resetReviewsStoreForTests()
    await createCycleGroup('q3-2026', { name: 'Everyone', memberIds: [1, 2] })
    await createCycleGroup('q3-2026', { name: 'Leads', memberIds: [2, 3] })
    await createReviewCycle({
      type: 'regular',
      periodKey: 'annual-2026',
    })

    render(
      <MemoryRouter initialEntries={['/cycles']}>
        <Routes>
          <Route path="/cycles" element={<CyclesList />} />
        </Routes>
      </MemoryRouter>,
    )

    expect(screen.getByRole('columnheader', { name: /People/ })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: /Groups/ })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: /Goals/ })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: /Reviews/ })).toBeInTheDocument()
    expect(
      screen.getByRole('columnheader', { name: /Calibration/ }),
    ).toBeInTheDocument()

    const quarter = screen.getByRole('link', { name: /Q3 2026/ }).closest('tr')
    const annual = screen.getByRole('link', { name: /Annual 2026/ }).closest('tr')
    if (!quarter || !annual) throw new Error('Expected cycle rows')

    const quarterCells = within(quarter).getAllByRole('cell')
    expect(quarterCells[1]).toHaveTextContent('Quarterly')
    expect(quarterCells[7].textContent).toMatch(
      /\d{2}-[A-Z][a-z]{2}-\d{4} – \d{2}-[A-Z][a-z]{2}-\d{4}/,
    )
    expect(quarterCells[7]).not.toHaveTextContent('AM')
    expect(quarterCells[7]).not.toHaveTextContent('PM')
    expect(quarterCells[2]).toHaveTextContent('3')
    expect(quarterCells[3]).toHaveTextContent('2')
    expect(quarterCells[4]).toHaveTextContent('On')
    expect(quarterCells[5]).toHaveTextContent('On')
    expect(quarterCells[6]).toHaveTextContent('Off')

    const annualCells = within(annual).getAllByRole('cell')
    expect(annualCells[1]).toHaveTextContent('Annual')
    expect(annualCells[2]).toHaveTextContent('0')
    expect(annualCells[3]).toHaveTextContent('0')
    expect(annualCells[4]).toHaveTextContent('Off')
    expect(annualCells[5]).toHaveTextContent('On')
    expect(annualCells[6]).toHaveTextContent('On')
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
