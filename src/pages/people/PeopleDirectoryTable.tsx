import { memo, useLayoutEffect, useMemo, useRef } from 'react'
import { Link } from 'react-router-dom'
import { ArrowUpDown } from 'lucide-react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { Avatar, ResizableTable, type ResizableColumn } from '@/components/ui'
import { avatarStyle } from '@/lib/employees/avatar'
import type { PlatformEmployee } from '@/lib/employees/types'
import { tableDensityWrapClass } from '@/components/TableDensityToggle'
import type { TableDensity } from '@/pages/people/prefs'

const PEOPLE_COLUMNS: ResizableColumn[] = [
  {
    id: 'employee-id',
    label: (
      <span className="pd-people__th">
        Employee ID
        <ArrowUpDown size={13} strokeWidth={1.75} aria-hidden />
      </span>
    ),
    name: 'Employee ID',
  },
  { id: 'name', label: 'Name', grow: true },
  { id: 'email', label: 'Email' },
  { id: 'start-date', label: 'Start date' },
  { id: 'job-title', label: 'Job title' },
  { id: 'department', label: 'Department' },
  { id: 'team', label: 'Team' },
  { id: 'division', label: 'Division' },
  { id: 'reports-to', label: 'Reports to' },
  { id: 'department-head', label: 'Department head' },
  { id: 'hrbp', label: 'HRBP' },
  { id: 'job-grade', label: 'Job Grade' },
  { id: 'status', label: 'Status' },
]

const COLUMN_COUNT = PEOPLE_COLUMNS.length
const VIRTUALIZE_AFTER = 24
const OVERSCAN = 8

const PersonCell = memo(function PersonCell({
  name,
  size = 'md',
  to,
  avatarUrl,
}: {
  name: string
  size?: 'sm' | 'md'
  to?: string
  avatarUrl?: string
}) {
  const style = useMemo(() => avatarStyle(name), [name])
  const label = to ? (
    <Link to={to} className="pd-people__person-link">
      {name}
    </Link>
  ) : (
    <span className="pd-people__person-name">{name}</span>
  )

  return (
    <div className="pd-people__person">
      <Avatar
        name={name}
        src={avatarUrl || undefined}
        size={size}
        className="pd-people__avatar"
        style={style}
      />
      {label}
    </div>
  )
})

const DirectoryRow = memo(function DirectoryRow({
  employee,
  manager,
}: {
  employee: PlatformEmployee
  manager: PlatformEmployee | undefined
}) {
  return (
    <tr>
      <td className="pd-people__id">{employee.employeeId}</td>
      <td>
        <PersonCell
          name={employee.fullName}
          avatarUrl={employee.avatarUrl}
          to={`/people/${employee.employeeId}`}
        />
      </td>
      <td>{employee.email || '—'}</td>
      <td>{employee.startDate || '—'}</td>
      <td>{employee.jobTitle || '—'}</td>
      <td>{employee.department || '—'}</td>
      <td>{employee.team || '—'}</td>
      <td>{employee.division || '—'}</td>
      <td>
        {employee.reportsToName ? (
          <PersonCell
            name={employee.reportsToName}
            size="sm"
            avatarUrl={manager?.avatarUrl}
            to={manager ? `/people/${manager.employeeId}` : undefined}
          />
        ) : (
          '—'
        )}
      </td>
      <td>{employee.departmentHeadName || '—'}</td>
      <td>{employee.hrbpName || '—'}</td>
      <td>{employee.jobGrade || '—'}</td>
      <td>
        <span
          className={[
            'pd-people__status',
            employee.isActive
              ? 'pd-people__status--active'
              : 'pd-people__status--inactive',
          ].join(' ')}
        >
          {employee.isActive ? 'Active' : 'Inactive'}
        </span>
      </td>
    </tr>
  )
})

function resolveManager(
  employee: PlatformEmployee,
  employeesById: ReadonlyMap<number, PlatformEmployee>,
  employeesByName: ReadonlyMap<string, PlatformEmployee>,
): PlatformEmployee | undefined {
  if (employee.reportsToId != null) {
    const byId = employeesById.get(employee.reportsToId)
    if (byId) return byId
  }
  const name = employee.reportsToName.trim().toLocaleLowerCase()
  return name ? employeesByName.get(name) : undefined
}

function SpacerRow({ height }: { height: number }) {
  if (height <= 0) return null
  return (
    <tr className="pd-people__virtual-pad" aria-hidden>
      <td colSpan={COLUMN_COUNT} style={{ height }} />
    </tr>
  )
}

export function PeopleDirectoryTable({
  employees,
  employeesById,
  employeesByName,
  tableDensity,
}: {
  employees: PlatformEmployee[]
  employeesById: ReadonlyMap<number, PlatformEmployee>
  employeesByName: ReadonlyMap<string, PlatformEmployee>
  tableDensity: TableDensity
}) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const shouldVirtualize = employees.length >= VIRTUALIZE_AFTER
  const estimateSize = tableDensity === 'condensed' ? 36 : 52

  const virtualizer = useVirtualizer({
    count: shouldVirtualize ? employees.length : 0,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => estimateSize,
    overscan: OVERSCAN,
  })

  useLayoutEffect(() => {
    if (!shouldVirtualize) return
    virtualizer.measure()
  }, [estimateSize, shouldVirtualize, virtualizer])

  const virtualRows = shouldVirtualize ? virtualizer.getVirtualItems() : null
  const paddingTop = virtualRows?.[0]?.start ?? 0
  const lastVirtualRow = virtualRows?.[virtualRows.length - 1]
  const paddingBottom = virtualRows
    ? virtualizer.getTotalSize() - (lastVirtualRow?.end ?? 0)
    : 0

  const visible =
    virtualRows && virtualRows.length > 0
      ? virtualRows.map((row) => employees[row.index]).filter(Boolean)
      : employees.slice(
          0,
          shouldVirtualize ? VIRTUALIZE_AFTER : employees.length,
        )

  return (
    <div ref={scrollRef} className={tableDensityWrapClass(tableDensity)}>
      <ResizableTable
        className="pd-people__table"
        storageKey="people-directory-column-widths"
        columns={PEOPLE_COLUMNS}
        fitKey={visible.length > 0 ? employees.length : 'empty'}
      >
        <tbody>
          <SpacerRow height={paddingTop} />
          {visible.map((employee) => (
            <DirectoryRow
              key={employee.employeeId}
              employee={employee}
              manager={resolveManager(employee, employeesById, employeesByName)}
            />
          ))}
          <SpacerRow height={paddingBottom} />
        </tbody>
      </ResizableTable>
    </div>
  )
}
