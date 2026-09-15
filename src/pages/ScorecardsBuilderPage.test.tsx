import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { resetScorecardFormsStoreForTests } from '@/lib/reviews/scorecardFormsStore'
import * as formsStore from '@/lib/reviews/scorecardFormsStore'
import ScorecardsBuilderPage from '@/pages/ScorecardsBuilderPage'

if (typeof HTMLDialogElement !== 'undefined') {
  HTMLDialogElement.prototype.showModal = function showModal() {
    this.setAttribute('open', '')
  }
  HTMLDialogElement.prototype.close = function close() {
    this.removeAttribute('open')
  }
}

afterEach(() => {
  cleanup()
  resetScorecardFormsStoreForTests()
  vi.restoreAllMocks()
})

describe('ScorecardsBuilderPage', () => {
  it('lists seeded form templates', async () => {
    render(
      <MemoryRouter initialEntries={['/scorecards-builder']}>
        <Routes>
          <Route path="/scorecards-builder" element={<ScorecardsBuilderPage />} />
        </Routes>
      </MemoryRouter>,
    )

    expect(
      await screen.findByRole('heading', { name: 'Scorecards Builder' }),
    ).toBeInTheDocument()
    expect(screen.getByText('Annual appraisal')).toBeInTheDocument()
    expect(screen.getByText('Q1 check-in')).toBeInTheDocument()
    expect(screen.getByText('Q2 check-in')).toBeInTheDocument()
    expect(screen.getByText('Q3 check-in')).toBeInTheDocument()
    expect(screen.getByText('Q4 progress')).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'New form' }),
    ).toBeInTheDocument()
  })

  it('offers templates when creating a new form', async () => {
    render(
      <MemoryRouter initialEntries={['/scorecards-builder']}>
        <Routes>
          <Route path="/scorecards-builder" element={<ScorecardsBuilderPage />} />
        </Routes>
      </MemoryRouter>,
    )

    expect(
      await screen.findByRole('button', { name: 'New form' }),
    ).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'New form' }))
    expect(screen.getByRole('menuitem', { name: 'Create form' })).toBeInTheDocument()
    expect(screen.getByRole('menuitem', { name: 'Annual appraisal' })).toBeInTheDocument()
    expect(screen.getByRole('menuitem', { name: 'Leadership review' })).toBeInTheDocument()
  })

  it('opens a form editor from the library', async () => {
    render(
      <MemoryRouter
        initialEntries={['/scorecards-builder/form-annual-appraisal']}
      >
        <Routes>
          <Route
            path="/scorecards-builder/:formId"
            element={<ScorecardsBuilderPage />}
          />
        </Routes>
      </MemoryRouter>,
    )

    expect(await screen.findByLabelText('Form name')).toHaveValue(
      'Annual appraisal',
    )
    expect(screen.getByRole('region', { name: 'Review form preview' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument()
  })

  it('requires typing delete before removing a form', async () => {
    const deleteSpy = vi
      .spyOn(formsStore, 'deleteScorecardForm')
      .mockResolvedValue(undefined)

    render(
      <MemoryRouter initialEntries={['/scorecards-builder/form-blank']}>
        <Routes>
          <Route
            path="/scorecards-builder/:formId"
            element={<ScorecardsBuilderPage />}
          />
        </Routes>
      </MemoryRouter>,
    )

    fireEvent.click(await screen.findByRole('button', { name: 'Delete form' }))
    expect(
      screen.getByRole('heading', { name: 'Delete this form?' }),
    ).toBeInTheDocument()

    const confirm = screen.getByRole('button', { name: 'Delete Form' })
    expect(confirm).toBeDisabled()

    fireEvent.click(confirm)
    expect(deleteSpy).not.toHaveBeenCalled()

    fireEvent.change(screen.getByLabelText('Type delete to confirm'), {
      target: { value: 'delete' },
    })
    expect(confirm).not.toBeDisabled()

    fireEvent.click(confirm)
    expect(deleteSpy).toHaveBeenCalledWith('form-blank', { usageCount: 0 })
  })
})
