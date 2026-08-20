import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { locationWithHash, useUrlHashTab } from './urlHash'

afterEach(cleanup)

function LocationReadout() {
  const location = useLocation()
  return (
    <p>
      {`${location.pathname}${location.search}${location.hash}`}
    </p>
  )
}

function HashTabs() {
  const [tab, setTab] = useUrlHashTab({
    defaultTab: 'mine',
    tabFromHash: (hash) => (hash.includes('reports') ? 'reports' : hash.includes('my-goals') ? 'mine' : null),
    hashFromTab: (next) => (next === 'reports' ? 'my-reports' : 'my-goals'),
  })
  return (
    <div>
      <p>tab:{tab}</p>
      <button type="button" onClick={() => setTab('reports')}>
        Reports
      </button>
      <LocationReadout />
    </div>
  )
}

describe('useUrlHashTab', () => {
  it('keeps query params when filling in the default hash', () => {
    render(
      <MemoryRouter initialEntries={['/goals?person=754&goal=g1']}>
        <Routes>
          <Route path="/goals" element={<HashTabs />} />
        </Routes>
      </MemoryRouter>,
    )

    expect(screen.getByText('/goals?person=754&goal=g1#my-goals')).toBeInTheDocument()
  })

  it('keeps query params when switching tabs', async () => {
    render(
      <MemoryRouter initialEntries={['/goals?person=754&goal=g1#my-goals']}>
        <Routes>
          <Route path="/goals" element={<HashTabs />} />
        </Routes>
      </MemoryRouter>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Reports' }))
    await waitFor(() => {
      expect(
        screen.getByText('/goals?person=754&goal=g1#my-reports'),
      ).toBeInTheDocument()
    })
  })
})

describe('locationWithHash', () => {
  it('keeps path and search while replacing the hash', () => {
    expect(
      locationWithHash(
        { pathname: '/goals', search: '?person=1&goal=g1' },
        'my-goals',
      ),
    ).toEqual({
      pathname: '/goals',
      search: '?person=1&goal=g1',
      hash: '#my-goals',
    })
  })
})
