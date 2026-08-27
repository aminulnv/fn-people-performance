import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import * as packetsApi from '@/lib/reviews/packetsApi'
import { PublishStageControls } from './PublishStageControls'

beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function showModal() {
    this.setAttribute('open', '')
  }
  HTMLDialogElement.prototype.close = function close() {
    this.removeAttribute('open')
  }
})

beforeEach(() => {
  vi.restoreAllMocks()
})

afterEach(() => {
  cleanup()
})

function renderControls(
  overrides: Partial<Parameters<typeof PublishStageControls>[0]> = {},
) {
  const onDateChange = vi.fn()
  render(
    <PublishStageControls
      cycleId="cycle-1"
      groupId="group-1"
      target="managers"
      date="2026-10-15T09:00:00.000Z"
      dateLabel="Managers visible from"
      releaseLabel="Release to managers now"
      onDateChange={onDateChange}
      {...overrides}
    />,
  )
  return { onDateChange }
}

describe('PublishStageControls', () => {
  it('asks before releasing the group to managers', async () => {
    const release = vi
      .spyOn(packetsApi, 'releaseReviewGroup')
      .mockResolvedValue([])

    renderControls()
    fireEvent.click(screen.getByRole('button', { name: 'Release to managers now' }))
    expect(release).not.toHaveBeenCalled()

    fireEvent.click(
      within(
        screen.getByRole('dialog', { name: 'Release to managers now?' }),
      ).getByRole('button', { name: 'Release now' }),
    )

    await waitFor(() => {
      expect(release).toHaveBeenCalledWith('cycle-1', 'group-1', 'managers')
    })
    const notice = await screen.findByRole('status')
    expect(notice).toHaveTextContent('Success!')
    expect(notice).toHaveTextContent('Released to managers.')
  })

  it('releases the group to employees after confirm', async () => {
    const release = vi
      .spyOn(packetsApi, 'releaseReviewGroup')
      .mockResolvedValue([])

    renderControls({
      target: 'employees',
      dateLabel: 'Employees visible from',
      releaseLabel: 'Release to employees now',
    })
    fireEvent.click(screen.getByRole('button', { name: 'Release to employees now' }))
    fireEvent.click(
      within(
        screen.getByRole('dialog', { name: 'Release to employees now?' }),
      ).getByRole('button', { name: 'Release now' }),
    )

    await waitFor(() => {
      expect(release).toHaveBeenCalledWith('cycle-1', 'group-1', 'employees')
    })
    expect(await screen.findByRole('status')).toHaveTextContent(
      'Released to employees.',
    )
  })

  it('shows the API error when release fails', async () => {
    vi.spyOn(packetsApi, 'releaseReviewGroup').mockRejectedValue(
      new Error('Cycle is still in calibration.'),
    )

    renderControls({
      target: 'employees',
      dateLabel: 'Employees visible from',
      releaseLabel: 'Release to employees now',
    })
    fireEvent.click(screen.getByRole('button', { name: 'Release to employees now' }))
    fireEvent.click(
      within(
        screen.getByRole('dialog', { name: 'Release to employees now?' }),
      ).getByRole('button', { name: 'Release now' }),
    )

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Cycle is still in calibration.',
    )
  })

  it('reports a date change without saving itself', () => {
    const release = vi.spyOn(packetsApi, 'releaseReviewGroup')
    const { onDateChange } = renderControls()

    fireEvent.change(screen.getByLabelText('Managers visible from'), {
      target: { value: '2026-10-20T09:00' },
    })

    expect(onDateChange).toHaveBeenCalled()
    expect(release).not.toHaveBeenCalled()
  })
})
