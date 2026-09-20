import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Navigate, Route, Routes } from 'react-router-dom'
import { resetValuesStoreForTests } from '@/lib/values/store'
import { ValuesLibrary } from './ValuesLibrary'

const authState = vi.hoisted(() => ({
  permissions: ['platform.write_all'] as string[],
}))

vi.mock('@/lib/useAuth', () => ({
  useAuth: () => ({
    status: 'authenticated',
    user: { permissions: authState.permissions },
    session: null,
    signInWithGoogle: async () => {},
    signInWithEmailPassword: async () => {},
    signOut: async () => {},
  }),
}))

afterEach(() => {
  cleanup()
  resetValuesStoreForTests()
})

beforeEach(() => {
  authState.permissions = ['platform.write_all']
  resetValuesStoreForTests()
})

function renderValues(path = '/reviews/values') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/reviews/values/new" element={<ValuesLibrary />} />
        <Route path="/reviews/values/:valueId/edit" element={<ValuesLibrary />} />
        <Route
          path="/reviews/values/:valueId"
          element={<Navigate to="edit" replace />}
        />
        <Route path="/reviews/values" element={<ValuesLibrary />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('ValuesLibrary', () => {
  it('lists the seven company cultural values', () => {
    renderValues()
    expect(screen.getByRole('link', { name: /Create new value/ })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Values' })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: /^Value Name/ })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: /^Description/ })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: /^Status/ })).toBeInTheDocument()
    expect(screen.getByText('Move Fast, Chase Excellence')).toBeInTheDocument()
    expect(screen.getByText('Product First')).toBeInTheDocument()
    expect(
      screen.getByText(/We're all about excellence/),
    ).toBeInTheDocument()
  })

  it('opens edit from a value direct link', async () => {
    renderValues('/reviews/values/move-fast')
    expect(
      await screen.findByRole('dialog', { name: 'Edit value' }),
    ).toBeInTheDocument()
    expect(screen.getByLabelText('Title')).toHaveValue(
      'Move Fast, Chase Excellence',
    )
  })

  it('opens edit from a table row click', async () => {
    renderValues()
    fireEvent.click(screen.getByText('Product First'))
    expect(
      await screen.findByRole('dialog', { name: 'Edit value' }),
    ).toBeInTheDocument()
    expect(screen.getByLabelText('Title')).toHaveValue('Product First')
  })

  it('creates a value in the right panel', async () => {
    renderValues('/reviews/values/new')
    expect(screen.getByRole('dialog', { name: 'Create value' })).toBeInTheDocument()
    fireEvent.change(screen.getByPlaceholderText(/Move Fast/), {
      target: { value: 'Customer Obsession' },
    })
    fireEvent.change(screen.getByPlaceholderText(/day to day/), {
      target: { value: 'Put the customer first.' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Create value' }))
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })
    expect(screen.getByText('Customer Obsession')).toBeInTheDocument()
  })

  it('edits a value in the right panel', async () => {
    renderValues('/reviews/values/product-first/edit')
    expect(screen.getByRole('dialog', { name: 'Edit value' })).toBeInTheDocument()
    expect(screen.getByLabelText('Title')).toHaveValue('Product First')
    const description = screen.getByLabelText('Description')
    fireEvent.change(description, {
      target: { value: 'Updated product obsession.' },
    })
    expect(description).toHaveValue('Updated product obsession.')
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }))
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })
    expect(screen.getByText('Updated product obsession.')).toBeInTheDocument()
  })

  it('hides value editing when the user cannot write', () => {
    authState.permissions = []
    renderValues()
    expect(
      screen.queryByRole('link', { name: /Create new value/i }),
    ).not.toBeInTheDocument()
    fireEvent.click(screen.getByText('Product First'))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})
