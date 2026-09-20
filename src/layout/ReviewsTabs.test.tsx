import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { ReviewsTabs } from './ReviewsTabs'

const { authState } = vi.hoisted(() => ({
  authState: {
    permissions: [] as string[],
  },
}))

vi.mock('@/lib/useAuth', () => ({
  useAuth: () => ({ user: { permissions: authState.permissions } }),
}))

afterEach(() => {
  cleanup()
  authState.permissions = []
})

describe('ReviewsTabs', () => {
  it('hides Scorecards Library without write access', () => {
    render(
      <MemoryRouter>
        <ReviewsTabs />
      </MemoryRouter>,
    )
    expect(screen.getByRole('link', { name: 'Scorecards' })).toBeInTheDocument()
    expect(
      screen.queryByRole('link', { name: 'Scorecards Library' }),
    ).not.toBeInTheDocument()
  })

  it('shows Scorecards Library when the person can edit forms', () => {
    authState.permissions = ['platform.write_all']
    render(
      <MemoryRouter>
        <ReviewsTabs />
      </MemoryRouter>,
    )
    expect(
      screen.getByRole('link', { name: 'Scorecards Library' }),
    ).toBeInTheDocument()
  })
})
