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
          description="You do not have permission to manage performance cycles."
          action={<PageStatusLink to="/" label="Back to home" />}
        />
      </MemoryRouter>,
    )

    expect(screen.getByRole('heading', { name: 'Access restricted' })).toBeInTheDocument()
    expect(
      screen.getByText(/do not have permission to manage performance cycles/i),
    ).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Back to home' })).toHaveAttribute(
      'href',
      '/',
    )
  })
})
