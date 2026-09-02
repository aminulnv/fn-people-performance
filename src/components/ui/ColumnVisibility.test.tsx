import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ColumnVisibility } from './ColumnVisibility'

afterEach(() => {
  cleanup()
})

describe('ColumnVisibility', () => {
  it('toggles optional columns and keeps required ones fixed', () => {
    const onChange = vi.fn()
    render(
      <ColumnVisibility
        columns={[
          { id: 'employee', label: 'Employee', required: true },
          { id: 'role', label: 'Role' },
          { id: 'team', label: 'Team' },
        ]}
        visibleIds={['employee', 'role', 'team']}
        onChange={onChange}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Columns' }))
    expect(screen.getByRole('option', { name: 'Employee' })).toBeDisabled()

    fireEvent.click(screen.getByRole('option', { name: 'Role' }))
    expect(onChange).toHaveBeenCalledWith(['employee', 'team'])
  })

  it('shows a hidden count and can reset to defaults', () => {
    const onChange = vi.fn()
    render(
      <ColumnVisibility
        columns={[
          { id: 'employee', label: 'Employee', required: true },
          { id: 'role', label: 'Role' },
          { id: 'team', label: 'Team' },
        ]}
        visibleIds={['employee', 'team']}
        onChange={onChange}
        defaultVisibleIds={['employee', 'role', 'team']}
      />,
    )

    expect(
      screen.getByRole('button', { name: 'Columns, 1 hidden' }),
    ).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Columns, 1 hidden' }))
    fireEvent.click(screen.getByRole('button', { name: 'Reset Columns' }))
    expect(onChange).toHaveBeenCalledWith(['employee', 'role', 'team'])
  })
})
