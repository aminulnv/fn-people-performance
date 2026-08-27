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
      dateLabel="Publish to managers from"
      releaseLabel="Publish to Managers First Now"
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
    fireEvent.click(screen.getByRole('button', { name: 'Publish to Managers First Now' }))
    expect(release).not.toHaveBeenCalled()

    fireEvent.click(
      within(
        screen.getByRole('dialog', { name: 'Publish to Managers First Now?' }),
      ).getByRole('button', { name: 'Publish Now' }),
    )

    await waitFor(() => {
      expect(release).toHaveBeenCalledWith('cycle-1', 'group-1', 'managers')
    })
    const notice = await screen.findByRole('status')
    expect(notice).toHaveTextContent('Success!')
    expect(notice).toHaveTextContent('Final grades are now visible to managers.')
  })

  it('releases the group to employees after confirm', async () => {
    const release = vi
      .spyOn(packetsApi, 'releaseReviewGroup')
      .mockResolvedValue([])

    renderControls({
      target: 'employees',
      dateLabel: 'Publish to everyone from',
      releaseLabel: 'Publish to Everyone Now',
    })
    fireEvent.click(screen.getByRole('button', { name: 'Publish to Everyone Now' }))
    fireEvent.click(
      within(
        screen.getByRole('dialog', { name: 'Publish to Everyone Now?' }),
      ).getByRole('button', { name: 'Publish Now' }),
    )

    await waitFor(() => {
      expect(release).toHaveBeenCalledWith('cycle-1', 'group-1', 'employees')
    })
    expect(await screen.findByRole('status')).toHaveTextContent(
      'Review published.',
    )
  })

  it('shows the API error when release fails', async () => {
    vi.spyOn(packetsApi, 'releaseReviewGroup').mockRejectedValue(
      new Error('Cycle is still in calibration.'),
    )

    renderControls({
      target: 'employees',
      dateLabel: 'Publish to everyone from',
      releaseLabel: 'Publish to Everyone Now',
    })
    fireEvent.click(screen.getByRole('button', { name: 'Publish to Everyone Now' }))
    fireEvent.click(
      within(
        screen.getByRole('dialog', { name: 'Publish to Everyone Now?' }),
      ).getByRole('button', { name: 'Publish Now' }),
    )

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Cycle is still in calibration.',
    )
  })

  it('reports a date change without saving itself', () => {
    const release = vi.spyOn(packetsApi, 'releaseReviewGroup')
    const { onDateChange } = renderControls()

    fireEvent.change(screen.getByLabelText('Publish to managers from'), {
      target: { value: '2026-10-20T09:00' },
    })

    expect(onDateChange).toHaveBeenCalled()
    expect(release).not.toHaveBeenCalled()
  })
})
