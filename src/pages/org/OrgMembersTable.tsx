import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Avatar, ResizableTable, type ResizableColumn } from '@/components/ui'
import { avatarStyle } from '@/lib/employees/avatar'
import type { PlatformEmployee } from '@/lib/employees/types'

type Column = 'team' | 'department'

export function OrgMembersTable({
  members,
  extraColumn,
}: {
  members: PlatformEmployee[]
  /** Show team column on department pages, department on team pages. */
  extraColumn?: Column
}) {
  const columns = useMemo<ResizableColumn[]>(() => {
    const next: ResizableColumn[] = [
      {
        id: 'person',
        label: (
          <span className="pd-people__th">
            Person
            <span className="pd-people__th-count">{members.length}</span>
          </span>
        ),
        name: 'Person',
        grow: true,
      },
      { id: 'role', label: 'Role' },
    ]
    if (extraColumn === 'team') next.push({ id: 'team', label: 'Team' })
    if (extraColumn === 'department') {
      next.push({ id: 'department', label: 'Department' })
    }
    next.push({ id: 'manager', label: 'Line manager' }, { id: 'email', label: 'Email' })
    return next
  }, [extraColumn, members.length])

  if (members.length === 0) {
    return <p className="pd-people__empty">No members in this unit yet.</p>
  }

  return (
    <div className="pd-people__table-wrap">
      <ResizableTable
        className="pd-people__table"
        storageKey={
          extraColumn
            ? `organisation-members-${extraColumn}-column-widths`
            : 'organisation-members-column-widths'
        }
        columns={columns}
      >
        <tbody>
          {members.map((member) => (
            <tr key={member.employeeId}>
              <td>
                <div className="pd-people__person">
                  <Avatar
                    name={member.fullName}
                    src={member.avatarUrl || undefined}
                    size="md"
                    className="pd-people__avatar"
                    style={avatarStyle(member.fullName)}
                  />
                  <Link
                    to={`/people/${member.employeeId}`}
                    className="pd-people__person-link"
                  >
                    {member.fullName}
                  </Link>
                </div>
              </td>
              <td>{member.jobTitle || '—'}</td>
              {extraColumn === 'team' ? (
                <td>{member.team || '—'}</td>
              ) : null}
              {extraColumn === 'department' ? (
                <td>{member.department || '—'}</td>
              ) : null}
              <td>
                {member.reportsToName ? (
                  <span className="pd-people__person-name">
                    {member.reportsToName}
                  </span>
                ) : (
                  '—'
                )}
              </td>
              <td>
                {member.email ? (
                  <a href={`mailto:${member.email}`} className="pd-org-detail__inline-link">
                    {member.email}
                  </a>
                ) : (
                  '—'
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </ResizableTable>
    </div>
  )
}
