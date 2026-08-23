import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import {
  collectCellsByColumn,
  distributeAutoWidths,
  ResizableTable,
  type ResizableColumn,
} from './ResizableTable'

const columns: ResizableColumn[] = [
  { id: 'name', label: 'Name' },
  { id: 'team', label: 'Team' },
]

const STORAGE_KEY = 'resizable-table-test:v4'

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
  it('auto-fits columns until someone resizes one', () => {
    renderTable()

    expect(document.querySelector('table')).not.toHaveClass(
      'pd-table-resize--sized',
    )
    expect(document.querySelector('table')).toHaveClass(
      'pd-table-resize--laid-out',
    )
    expect(handleFor('Name')).toHaveAttribute('aria-valuenow')
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

describe('collectCellsByColumn', () => {
  it('keeps rowspan owner cells on the owner column and skips full-width spacers', () => {
    document.body.innerHTML = `
      <table>
        <thead>
          <tr>
            <th>Owner</th>
            <th>Goals</th>
            <th>Weight</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td rowspan="2">Ada</td>
            <td>Ship reviews</td>
            <td>40%</td>
          </tr>
          <tr>
            <td>Coach the team</td>
            <td>60%</td>
          </tr>
          <tr class="pd-people__virtual-pad">
            <td colspan="3"></td>
          </tr>
        </tbody>
      </table>
    `
    const table = document.querySelector('table')
    if (!table) throw new Error('expected table')

    const grouped = collectCellsByColumn(table, 3)
    expect(grouped[0].map((cell) => cell.textContent)).toEqual(['Owner', 'Ada'])
    expect(grouped[1].map((cell) => cell.textContent)).toEqual([
      'Goals',
      'Ship reviews',
      'Coach the team',
    ])
    expect(grouped[2].map((cell) => cell.textContent)).toEqual([
      'Weight',
      '40%',
      '60%',
    ])
  })
})

describe('distributeAutoWidths', () => {
  const layoutColumns: ResizableColumn[] = [
    { id: 'name', label: 'Name', grow: true },
    { id: 'status', label: 'Status' },
  ]

  it('gives leftover width only to the grow column', () => {
    const layout = distributeAutoWidths(
      layoutColumns,
      { name: 120, status: 80 },
      400,
    )

    expect(layout.widths.status).toBe(80)
    expect(layout.widths.name).toBe(320)
    expect(layout.tableWidth).toBe(400)
    expect(layout.overflows).toBe(false)
  })

  it('does not stretch columns when none are marked to grow', () => {
    const layout = distributeAutoWidths(
      [
        { id: 'name', label: 'Name' },
        { id: 'status', label: 'Status' },
      ],
      { name: 120, status: 80 },
      400,
    )

    expect(layout.widths).toEqual({ name: 120, status: 80 })
    expect(layout.tableWidth).toBe(200)
    expect(layout.overflows).toBe(false)
  })
})
