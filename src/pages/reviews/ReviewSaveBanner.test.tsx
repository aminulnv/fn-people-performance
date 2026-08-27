import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { ReviewSaveBanner } from './ReviewSaveBanner'

afterEach(() => {
  cleanup()
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
    expect(notice.parentElement).toBe(document.body)
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
