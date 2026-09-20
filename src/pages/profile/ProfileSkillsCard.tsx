import { Link } from 'react-router-dom'
import { Sparkles } from 'lucide-react'
import { EmptyState } from '@/components/ui'
import { listEmployees } from '@/lib/employees/store'
import { roleDetailPath } from '@/lib/organisation/paths'
import { useEmployeeSkills } from '@/lib/skills/useSkills'

export function ProfileSkillsCard({
  employeeId,
  canEdit = false,
}: {
  employeeId: number
  canEdit?: boolean
}) {
  const assigned = useEmployeeSkills(employeeId)
  const employee = listEmployees().find((row) => row.employeeId === employeeId)
  const roleHref = employee?.roleId ? roleDetailPath(employee.roleId) : null

  return (
    <section className="pd-profile__card" aria-label="Skills">
      <header className="pd-profile__card-head">
        <h2 className="pd-profile__card-title">
          <Sparkles size={16} strokeWidth={1.75} aria-hidden />
          Skills
        </h2>
      </header>

      {assigned.length === 0 ? (
        <EmptyState
          className="pd-empty--inline"
          title={roleHref ? 'No skills on this role yet' : 'No role assigned'}
          description={
            roleHref
              ? 'Skills come from the role on this profile.'
              : canEdit
                ? 'Assign a role on this profile. Skills come from the role, not from the person.'
                : 'A role has not been assigned yet. Skills come from the role, not from the person.'
          }
          action={
            roleHref ? (
              <Link
                to={roleHref}
                className="pd-btn pd-btn--secondary pd-btn--sm pd-btn--pill"
              >
                Open role
              </Link>
            ) : canEdit ? (
              <Link
                to={`/people/${employeeId}/edit`}
                className="pd-btn pd-btn--secondary pd-btn--sm pd-btn--pill"
              >
                Assign a role
              </Link>
            ) : null
          }
        />
      ) : (
        <ul className="pd-profile__skill-list">
          {assigned.map((skill) => (
            <li key={skill.id} className="pd-profile__skill-chip">
              <span className="pd-profile__skill-chip-label">{skill.name}</span>
              {skill.expectedHint ? (
                <span className="pd-profile__skill-chip-meta">
                  {skill.expectedHint}
                </span>
              ) : skill.department ? (
                <span className="pd-profile__skill-chip-meta">
                  {skill.department}
                </span>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
