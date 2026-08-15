import { afterEach, describe, expect, it } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, render } from '@testing-library/react'
import { Target } from 'lucide-react'
import { AuthProvider } from '@/lib/AuthProvider'
import { AppLayout } from './AppLayout'

afterEach(cleanup)

function renderShell() {
  render(
    <QueryClientProvider client={new QueryClient()}>
      <AuthProvider>
        <MemoryRouter initialEntries={['/goals']}>
          <Routes>
            <Route
              path="/"
              element={
                <AppLayout
                  navItems={[{ path: '/goals', label: 'Goals', icon: Target }]}
                  brand={{ name: 'FN', icon: Target }}
                />
              }
            >
              <Route path="goals" element={<p>Page content</p>} />
            </Route>
          </Routes>
        </MemoryRouter>
      </AuthProvider>
    </QueryClientProvider>,
  )
}

describe('app shell scrolling', () => {
  it('scrolls page content in a region of its own', () => {
    renderShell()

    const scroll = document.querySelector('.pd-app-scroll')
    expect(scroll?.contains(document.querySelector('main'))).toBe(true)
  })

  it('keeps the top bar outside the scroll region so page chrome cannot overlap it', () => {
    renderShell()

    const scroll = document.querySelector('.pd-app-scroll')
    expect(scroll?.contains(document.querySelector('.pd-topbar'))).toBe(false)
  })
})
