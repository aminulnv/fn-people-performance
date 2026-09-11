import { describe, expect, it } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { render, screen } from '@testing-library/react'
import { PageStatus, PageStatusLink } from './PageStatus'

describe('PageStatus', () => {
  it('renders a forbidden state with title, description, and action', () => {
    render(
      <MemoryRouter>
        <PageStatus
          variant="forbidden"
          description="You do not have permission to manage cycles."
          action={<PageStatusLink to="/" label="Back to home" />}
        />
      </MemoryRouter>,
    )

    expect(screen.getByRole('heading', { name: 'Access restricted' })).toBeInTheDocument()
    expect(
      screen.getByText(/do not have permission to manage cycles/i),
    ).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Back to home' })).toHaveAttribute(
      'href',
      '/',
    )
  })

  it('shows a page skeleton while loading', () => {
    const { container } = render(
      <PageStatus
        variant="loading"
        aria-label="My profile"
        description="Loading your profile…"
      />,
    )

    expect(
      screen.queryByRole('heading', { name: 'Loading…' }),
    ).not.toBeInTheDocument()
    expect(screen.queryByText('Loading your profile…')).not.toBeInTheDocument()
    expect(container.querySelector('.pd-page-status__spin')).toBeNull()
    expect(container.querySelector('.pd-page-skeleton')).not.toBeNull()
    expect(container.querySelector('.pd-page-skeleton')).toHaveAttribute(
      'aria-label',
      'My profile',
    )
    expect(container.querySelectorAll('.pd-skeleton').length).toBeGreaterThan(0)
  })
})
