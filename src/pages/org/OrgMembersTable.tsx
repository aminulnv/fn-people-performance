import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Avatar, ResizableTable, type ResizableColumn } from '@/components/ui'
import { avatarStyle } from '@/lib/employees/avatar'
import { listEmployees } from '@/lib/employees/store'
import type { PlatformEmployee } from '@/lib/employees/types'

type ExtraColumn = 'team' | 'department'

export function OrgMembersTable({
  members,
  extraColumn,
  variant = 'default',
}: {
  members: PlatformEmployee[]
  /** Show team column on department pages, department on team pages. */
  extraColumn?: ExtraColumn
  /** Talent: Revolut-style people-in-role columns. */
  variant?: 'default' | 'talent'
}) {
  const directory = useMemo(() => listEmployees(), [members])
  const managersById = useMemo(() => {
    const next = new Map<number, PlatformEmployee>()
    for (const person of directory) next.set(person.employeeId, person)
    return next
  }, [directory])
  const managersByName = useMemo(() => {
    const next = new Map<string, PlatformEmployee>()
    for (const person of directory) next.set(person.fullName, person)
    return next
  }, [directory])

  const isTalent = variant === 'talent'

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
    ]
    if (isTalent) {
      next.push(
        { id: 'team', label: 'Team' },
        { id: 'seniority', label: 'Seniority' },
        { id: 'manager', label: 'LM' },
        { id: 'startDate', label: 'Start date' },
        { id: 'location', label: 'Location' },
        { id: 'status', label: 'Status' },
      )
      return next
    }
    next.push({ id: 'role', label: 'Role' })
    if (extraColumn === 'team') next.push({ id: 'team', label: 'Team' })
    if (extraColumn === 'department') {
      next.push({ id: 'department', label: 'Department' })
    }
    next.push(
      { id: 'manager', label: 'Line Manager' },
      { id: 'email', label: 'Email' },
    )
    return next
  }, [extraColumn, isTalent, members.length])

  if (members.length === 0) {
    return <p className="pd-people__empty">No members in this unit yet.</p>
  }

  return (
    <div className="pd-people__table-wrap">
      <ResizableTable
        className="pd-people__table"
        storageKey={
          isTalent
            ? 'organisation-role-talent-column-widths'
            : extraColumn
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
              {isTalent ? (
                <>
                  <td>{member.team || '-'}</td>
                  <td>{member.jobGrade || '-'}</td>
                  <td>
                    <ManagerCell
                      member={member}
                      managersById={managersById}
                      managersByName={managersByName}
                    />
                  </td>
                  <td>{member.startDate || '-'}</td>
                  <td>{member.site || '-'}</td>
                  <td>
                    <span
                      className={
                        member.isActive
                          ? 'pd-org-role__status pd-org-role__status--active'
                          : 'pd-org-role__status'
                      }
                    >
                      {member.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                </>
              ) : (
                <>
                  <td>{member.jobTitle || '-'}</td>
                  {extraColumn === 'team' ? <td>{member.team || '-'}</td> : null}
                  {extraColumn === 'department' ? (
                    <td>{member.department || '-'}</td>
                  ) : null}
                  <td>
                    <ManagerCell
                      member={member}
                      managersById={managersById}
                      managersByName={managersByName}
                    />
                  </td>
                  <td>
                    {member.email ? (
                      <a
                        href={`mailto:${member.email}`}
                        className="pd-org-detail__inline-link"
                      >
                        {member.email}
                      </a>
                    ) : (
                      '-'
                    )}
                  </td>
                </>
              )}
            </tr>
          ))}
        </tbody>
      </ResizableTable>
    </div>
  )
}

function ManagerCell({
  member,
  managersById,
  managersByName,
}: {
  member: PlatformEmployee
  managersById: Map<number, PlatformEmployee>
  managersByName: Map<string, PlatformEmployee>
}) {
  if (!member.reportsToName) return '-'
  return (
    <span className="pd-people__person">
      <Avatar
        name={member.reportsToName}
        src={
          (member.reportsToId
            ? managersById.get(member.reportsToId)
            : managersByName.get(member.reportsToName)
          )?.avatarUrl || undefined
        }
        size="sm"
        className="pd-people__avatar"
        style={avatarStyle(member.reportsToName)}
      />
      {member.reportsToId ? (
        <Link
          to={`/people/${member.reportsToId}`}
          className="pd-people__person-link"
        >
          {member.reportsToName}
        </Link>
      ) : (
        <span className="pd-people__person-name">{member.reportsToName}</span>
      )}
    </span>
  )
}
