import { memo, useLayoutEffect, useMemo, useRef } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { Avatar, ResizableTable, type ResizableColumn } from '@/components/ui'
import { avatarStyle } from '@/lib/employees/avatar'
import type { PlatformEmployee } from '@/lib/employees/types'
const PEOPLE_COLUMNS: ResizableColumn[] = [
  { id: 'employee-id', label: 'ID' },
  { id: 'name', label: 'Name', grow: true },
  { id: 'job-title', label: 'Job title' },
  { id: 'department', label: 'Department' },
  { id: 'team', label: 'Team' },
  { id: 'reports-to', label: 'Reports to' },
  { id: 'status', label: 'Status' },
]

const COLUMN_COUNT = PEOPLE_COLUMNS.length
const VIRTUALIZE_AFTER = 24
const OVERSCAN = 8

const PersonCell = memo(function PersonCell({
  name,
  email,
  size = 'md',
  onSelect,
  avatarUrl,
}: {
  name: string
  email?: string
  size?: 'sm' | 'md'
  onSelect?: () => void
  avatarUrl?: string
}) {
  const style = useMemo(() => avatarStyle(name), [name])
  const label = onSelect ? (
    <button
      type="button"
      className="pd-people__person-link"
      onClick={(event) => {
        event.stopPropagation()
        onSelect()
      }}
    >
      {name}
    </button>
  ) : (
    <span className="pd-people__person-name">{name}</span>
  )

  return (
    <div
      className={[
        'pd-people__person',
        email ? 'pd-people__person--stacked' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <Avatar
        name={name}
        src={avatarUrl || undefined}
        size={size}
        className="pd-people__avatar"
        style={style}
      />
      {email ? (
        <span className="pd-people__person-identity">
          {label}
          <span className="pd-people__person-email">{email}</span>
        </span>
      ) : (
        label
      )}
    </div>
  )
})

const DirectoryRow = memo(function DirectoryRow({
  employee,
  manager,
  isSelected,
  onSelect,
}: {
  employee: PlatformEmployee
  manager: PlatformEmployee | undefined
  isSelected: boolean
  onSelect: (employeeId: number) => void
}) {
  const openProfile = () => onSelect(employee.employeeId)

  return (
    <tr
      className={['pd-people__row-link', isSelected ? 'is-selected' : '']
        .filter(Boolean)
        .join(' ')}
      tabIndex={0}
      aria-selected={isSelected}
      onClick={(event) => {
        const target = event.target as HTMLElement
        if (target.closest('a, button')) return
        openProfile()
      }}
      onKeyDown={(event) => {
        if (event.key !== 'Enter' && event.key !== ' ') return
        event.preventDefault()
        openProfile()
      }}
    >
      <td className="pd-people__id">{employee.employeeId}</td>
      <td className="pd-people__name-cell">
        <PersonCell
          name={employee.fullName}
          email={employee.email || undefined}
          avatarUrl={employee.avatarUrl}
          onSelect={openProfile}
        />
      </td>
      <td>{employee.jobTitle || '—'}</td>
      <td>{employee.department || '—'}</td>
      <td>{employee.team || '—'}</td>
      <td>
        {employee.reportsToName ? (
          <PersonCell
            name={employee.reportsToName}
            size="sm"
            avatarUrl={manager?.avatarUrl}
            onSelect={
              manager ? () => onSelect(manager.employeeId) : undefined
            }
          />
        ) : (
          '—'
        )}
      </td>
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
  selectedEmployeeId,
  onSelectEmployee,
}: {
  employees: PlatformEmployee[]
  employeesById: ReadonlyMap<number, PlatformEmployee>
  employeesByName: ReadonlyMap<string, PlatformEmployee>
  selectedEmployeeId?: number | null
  onSelectEmployee: (employeeId: number) => void
}) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const shouldVirtualize = employees.length >= VIRTUALIZE_AFTER
  const estimateSize = 40

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
    <div ref={scrollRef} className="pd-people__table-wrap">
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
              isSelected={selectedEmployeeId === employee.employeeId}
              onSelect={onSelectEmployee}
            />
          ))}
          <SpacerRow height={paddingBottom} />
        </tbody>
      </ResizableTable>
    </div>
  )
}
