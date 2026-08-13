import { Link } from 'react-router-dom'
import { Avatar } from '@/components/ui'
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
  if (members.length === 0) {
    return <p className="pd-people__empty">No members in this unit yet.</p>
  }

  return (
    <div className="pd-people__table-wrap">
      <table className="pd-people__table">
        <thead>
          <tr>
            <th>
              <span className="pd-people__th">
                Person
                <span className="pd-people__th-count">{members.length}</span>
              </span>
            </th>
            <th>Role</th>
            {extraColumn === 'team' ? <th>Team</th> : null}
            {extraColumn === 'department' ? <th>Department</th> : null}
            <th>Line manager</th>
            <th>Email</th>
          </tr>
        </thead>
        <tbody>
          {members.map((member) => (
            <tr key={member.employeeId}>
              <td>
                <div className="pd-people__person">
                  <Avatar
                    name={member.fullName}
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
      </table>
    </div>
  )
}
