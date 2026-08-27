import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { ReviewSaveBanner } from './ReviewSaveBanner'

afterEach(() => {
  cleanup()
  vi.useRealTimers()
  document.querySelector('.pd-settings-panel')?.remove()
})

describe('ReviewSaveBanner', () => {
  it('shows a success toast with a Got It action', () => {
    const onDismiss = vi.fn()
    render(
      <ReviewSaveBanner
        notice={{
          variant: 'success',
          message: 'Draft saved.',
          shownAt: 1,
        }}
        onDismiss={onDismiss}
      />,
    )

    expect(screen.getByRole('status')).toHaveTextContent('Success!')
    expect(screen.getByRole('status')).toHaveTextContent('Draft saved.')
    fireEvent.click(screen.getByRole('button', { name: 'Got It' }))
    expect(onDismiss).toHaveBeenCalled()
  })

  it('lifts the toast above a settings panel so it stays visible', () => {
    const panel = document.createElement('div')
    panel.className = 'pd-settings-panel'
    document.body.append(panel)

    render(
      <ReviewSaveBanner
        notice={{
          variant: 'success',
          message: 'Settings saved.',
          shownAt: 3,
        }}
        onDismiss={() => {}}
      />,
    )

    const notice = screen.getByRole('status')
    expect(notice).toHaveClass('pd-review-packet__banner--overlay')
    expect(notice.closest('.pd-review-packet__banners')?.parentElement).toBe(
      document.body,
    )
  })

  it('stacks a new toast above an existing one until the older toast leaves', () => {
    vi.useFakeTimers()
    const onDismiss = vi.fn()
    const { rerender } = render(
      <ReviewSaveBanner
        notice={{
          variant: 'success',
          message: 'First saved.',
          shownAt: 1,
        }}
        onDismiss={onDismiss}
      />,
    )

    act(() => {
      vi.advanceTimersByTime(500)
    })

    rerender(
      <ReviewSaveBanner
        notice={{
          variant: 'success',
          message: 'Second saved.',
          shownAt: 2,
        }}
        onDismiss={onDismiss}
      />,
    )

    const notices = screen.getAllByRole('status')
    expect(notices).toHaveLength(2)
    expect(notices[0]).toHaveTextContent('First saved.')
    expect(notices[1]).toHaveTextContent('Second saved.')

    act(() => {
      vi.advanceTimersByTime(1500)
    })

    expect(screen.getAllByRole('status')).toHaveLength(1)
    expect(screen.getByRole('status')).toHaveTextContent('Second saved.')
    expect(onDismiss).not.toHaveBeenCalled()

    act(() => {
      vi.advanceTimersByTime(2000)
    })

    expect(screen.queryByRole('status')).not.toBeInTheDocument()
    expect(onDismiss).toHaveBeenCalledTimes(1)
    vi.useRealTimers()
  })

  it('shows an error toast with a Try again action', () => {
    const onDismiss = vi.fn()
    render(
      <ReviewSaveBanner
        notice={{
          variant: 'error',
          message: 'Could not save this review.',
          shownAt: 2,
        }}
        onDismiss={onDismiss}
      />,
    )

    expect(screen.getByRole('status')).toHaveTextContent('Error')
    expect(screen.getByRole('status')).toHaveTextContent(
      'Could not save this review.',
    )
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }))
    expect(onDismiss).toHaveBeenCalled()
  })
})
