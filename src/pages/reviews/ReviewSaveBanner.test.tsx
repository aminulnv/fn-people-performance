import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { ReviewSaveBanner } from './ReviewSaveBanner'

afterEach(() => {
  cleanup()
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
