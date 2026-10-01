import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import {
  PageSkeleton,
  PageStatus,
  PageStatusLink,
} from '@/components/ui'
import { hasSystemPermission } from '@/lib/accessControl/types'
import { useAuth } from '@/lib/useAuth'
import { skillDetailPath, skillsLibraryPath } from '@/lib/organisation/paths'
import { useSkill } from '@/lib/skills/useSkills'
import { SkillFormFields } from '@/pages/reviews/SkillFormEditor'
import '@/styles/layout-people.css'
import '@/styles/layout-organisation.css'
import '@/styles/layout-reviews.css'

export default function EditSkillPage() {
  const { skillId: rawId = '' } = useParams()
  const skillId = decodeURIComponent(rawId)
  const navigate = useNavigate()
  const { user } = useAuth()
  const canWrite = hasSystemPermission(user?.permissions, 'platform.write_all')
  const { skill, ready } = useSkill(skillId)

  if (!canWrite) {
    return (
      <PageStatus
        variant="forbidden"
        pageClassName="pd-people pd-org"
        aria-label="Access denied"
        description="You do not have permission to edit skills."
        action={
          <PageStatusLink
            to={skill ? skillDetailPath(skill.id) : skillsLibraryPath()}
            label="Back"
          />
        }
      />
    )
  }

  if (!ready) {
    return (
      <PageSkeleton
        pageClassName="pd-people pd-org"
        aria-label="Edit skill"
      />
    )
  }

  if (!skill) {
    return (
      <PageStatus
        variant="not-found"
        pageClassName="pd-people pd-org"
        aria-label="Skill not found"
        title="Skill not found"
        description="This skill may have been archived or the link is outdated."
        action={
          <PageStatusLink to={skillsLibraryPath()} label="Back to Organisation" />
        }
      />
    )
  }

  return (
    <div
      className="pd-page pd-people pd-people--form pd-org"
      aria-label={`Edit ${skill.name} skill`}
    >
      <div className="pd-people__form-layout">
        <div className="pd-people__form-toolbar">
          <Link
            to={skillDetailPath(skill.id)}
            className="pd-people__back pd-people__back--toolbar"
          >
            <ArrowLeft size={16} strokeWidth={2} aria-hidden />
            Back to skill
          </Link>
        </div>

        <section className="pd-people__form-card">
          <header className="pd-org-detail__hero-text">
            <p className="pd-org-detail__eyebrow">General info</p>
            <h1 className="pd-org-detail__title">Edit {skill.name}</h1>
            <p className="pd-org-detail__meta">
              Name, mastery rubric, and approval status. Roles that use this
              skill are managed on the skill page.
            </p>
          </header>

          <SkillFormFields
            key={skill.id}
            mode="edit"
            existing={skill}
            onCancel={() => navigate(skillDetailPath(skill.id))}
            onSaved={(saved) =>
              navigate(skillDetailPath(saved.id), { replace: true })
            }
          />
        </section>
      </div>
    </div>
  )
}
