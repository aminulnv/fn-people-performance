import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { ResizableTable, type ResizableColumn } from './ResizableTable'

const columns: ResizableColumn[] = [
  { id: 'name', label: 'Name' },
  { id: 'team', label: 'Team' },
]

const STORAGE_KEY = 'resizable-table-test:v2'

function renderTable() {
  return render(
    <ResizableTable
      className="directory-table"
      storageKey="resizable-table-test"
      columns={columns}
    >
      <tbody>
        <tr>
          <td>Ada</td>
          <td>Platform</td>
        </tr>
      </tbody>
    </ResizableTable>,
  )
}

function handleFor(columnName: string) {
  return screen.getByRole('separator', { name: `Resize ${columnName} column` })
}

afterEach(() => {
  cleanup()
  window.localStorage.clear()
})

describe('ResizableTable', () => {
  it('lets the browser size columns until someone resizes one', () => {
    renderTable()

    expect(handleFor('Name')).not.toHaveAttribute('aria-valuenow')
    expect(document.querySelector('table')).not.toHaveClass(
      'pd-table-resize--sized',
    )
  })

  it('changes a column width with the keyboard and persists it', () => {
    const view = renderTable()

    fireEvent.keyDown(handleFor('Name'), { key: 'ArrowRight' })

    const width = handleFor('Name').getAttribute('aria-valuenow')
    expect(width).not.toBeNull()
    expect(window.localStorage.getItem(STORAGE_KEY)).toContain(
      `"name":${width}`,
    )

    view.unmount()
    renderTable()

    expect(handleFor('Name')).toHaveAttribute('aria-valuenow', width as string)
  })

  it('fits one column to its content on double click and leaves the rest', () => {
    renderTable()

    fireEvent.keyDown(handleFor('Name'), { key: 'ArrowRight' })
    fireEvent.keyDown(handleFor('Team'), { key: 'ArrowRight' })
    const nameWidth = handleFor('Name').getAttribute('aria-valuenow')
    const widenedTeam = Number(handleFor('Team').getAttribute('aria-valuenow'))

    fireEvent.doubleClick(handleFor('Team'))

    expect(
      Number(handleFor('Team').getAttribute('aria-valuenow')),
    ).toBeLessThan(widenedTeam)
    expect(handleFor('Name')).toHaveAttribute(
      'aria-valuenow',
      nameWidth as string,
    )
  })
})
