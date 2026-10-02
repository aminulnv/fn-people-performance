import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { Archive, ArrowLeft, Pencil, Sparkles } from 'lucide-react'
import {
  Badge,
  PageSkeleton,
  PageStatus,
  PageStatusLink,
  SegmentedControl,
} from '@/components/ui'
import { hasSystemPermission } from '@/lib/accessControl/types'
import { useAuth } from '@/lib/useAuth'
import {
  organisationTabPath,
  skillEditPath,
} from '@/lib/organisation/paths'
import { expectedLevelLabel } from '@/lib/roles/labels'
import { archiveSkill } from '@/lib/skills/store'
import {
  SKILL_MASTERY_LEVELS,
  type SkillMasteryLevel,
  type SkillStatus,
} from '@/lib/skills/types'
import { useSkill, useSkillRoleUsage } from '@/lib/skills/useSkills'
import { SkillRolesMatrix } from '@/pages/reviews/SkillRolesMatrix'
import '@/styles/layout-people.css'
import '@/styles/layout-organisation.css'
import '@/styles/layout-reviews.css'

type SkillTabId = 'overview' | 'roles'

const TAB_OPTIONS: Array<{ id: SkillTabId; label: string }> = [
  { id: 'overview', label: 'Overview' },
  { id: 'roles', label: 'Roles' },
]

function parseTab(raw: string | null): SkillTabId {
  return raw === 'roles' ? 'roles' : 'overview'
}

function statusLabel(status: SkillStatus): string {
  return status === 'inactive' ? 'Inactive' : 'Active'
}

function statusVariant(status: SkillStatus): 'draft' | 'completed' {
  return status === 'inactive' ? 'draft' : 'completed'
}

export default function SkillDetailPage() {
  const { skillId: rawId = '' } = useParams()
  const skillId = decodeURIComponent(rawId)
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { skill, ready } = useSkill(skillId)
  const roleUsage = useSkillRoleUsage()
  const canEdit = hasSystemPermission(user?.permissions, 'platform.write_all')
  const tab = parseTab(searchParams.get('tab'))
  const [actionError, setActionError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const roleCount = (roleUsage[skillId] ?? []).length

  const tabOptions = useMemo(
    () =>
      TAB_OPTIONS.map((option) => {
        if (option.id === 'roles') {
          return {
            ...option,
            label: (
              <span className="pd-org-role__tab-label">
                Roles
                {roleCount > 0 ? (
                  <span className="pd-org-role__tab-badge">{roleCount}</span>
                ) : null}
              </span>
            ),
          }
        }
        return option
      }),
    [roleCount],
  )

  async function onArchive() {
    if (!skill || busy) return
    setBusy(true)
    setActionError(null)
    try {
      await archiveSkill(skill.id)
      navigate(organisationTabPath('skills'))
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : 'Could not archive skill.',
      )
      setBusy(false)
    }
  }

  if (!ready) {
    return (
      <PageSkeleton
        pageClassName="pd-people pd-org pd-org-detail"
        aria-label="Skill"
      />
    )
  }

  if (!skill) {
    return (
      <PageStatus
        variant="not-found"
        pageClassName="pd-people pd-org pd-org-detail"
        aria-label="Skill not found"
        title="Skill not found"
        description="This skill may have been archived or the link is outdated."
        action={
          <PageStatusLink
            to={organisationTabPath('skills')}
            label="Back to Organisation"
          />
        }
      />
    )
  }

  return (
    <div
      className="pd-page pd-people pd-org pd-org-detail"
      aria-label={skill.name}
    >
      <div className="pd-org-detail__crumbs">
        <Link
          to={organisationTabPath('skills')}
          className="pd-org-detail__back"
        >
          <ArrowLeft size={16} strokeWidth={1.75} aria-hidden />
          Organisation
        </Link>
      </div>

      <section className="pd-org-detail__hero">
        <div className="pd-org-detail__hero-main">
          <span className="pd-org-detail__hero-icon" aria-hidden>
            <Sparkles size={28} strokeWidth={1.75} />
          </span>
          <div className="pd-org-detail__hero-text">
            <p className="pd-org-detail__eyebrow">Skill</p>
            <div className="pd-org-detail__title-row">
              <h1 className="pd-org-detail__title">{skill.name}</h1>
              <Badge variant={statusVariant(skill.status)}>
                {statusLabel(skill.status)}
              </Badge>
            </div>
          </div>
        </div>
        {canEdit ? (
          <div className="pd-org-detail__hero-actions">
            <button
              type="button"
              className="pd-people__ghost-btn"
              disabled={busy}
              onClick={() => {
                void onArchive()
              }}
            >
              <Archive size={16} strokeWidth={1.75} aria-hidden />
              Archive
            </button>
            <Link
              to={skillEditPath(skill.id)}
              className="pd-people__ghost-btn pd-people__ghost-btn--outline"
            >
              <Pencil size={16} strokeWidth={1.75} aria-hidden />
              Edit
            </Link>
          </div>
        ) : null}
      </section>

      {actionError ? (
        <p className="pd-people__message pd-people__message--error" role="alert">
          {actionError}
        </p>
      ) : null}

      <SegmentedControl
        className="pd-org-role__tabs"
        buttonClassName="pd-org-role__tab"
        options={tabOptions}
        value={tab}
        onChange={(next) => {
          const params = new URLSearchParams(searchParams)
          if (next === 'overview') params.delete('tab')
          else params.set('tab', next)
          setSearchParams(params, { replace: true })
        }}
        aria-label="Skill sections"
      />

      {tab === 'overview' ? (
        <div className="pd-skill-detail__overview">
          <section
            className="pd-profile__card pd-skill-mastery-preview"
            aria-label="Skill mastery"
          >
            <header className="pd-profile__card-head pd-skill-mastery-preview__head">
              <div className="pd-skill-mastery-preview__head-copy">
                <h2 className="pd-profile__card-title">Skill mastery</h2>
                <p className="pd-skill-mastery-preview__hint">
                  What each level of expertise looks like for this skill.
                </p>
              </div>
              {canEdit ? (
                <Link
                  to={skillEditPath(skill.id)}
                  className="pd-profile__icon-action"
                  aria-label="Edit skill mastery"
                  title="Edit"
                >
                  <Pencil size={14} strokeWidth={1.75} aria-hidden />
                </Link>
              ) : null}
            </header>
            <ul className="pd-skill-mastery-preview__list">
              {SKILL_MASTERY_LEVELS.map((level) => (
                <MasteryPreviewRow
                  key={level}
                  level={level}
                  text={skill.mastery[level]?.trim() ?? ''}
                />
              ))}
            </ul>
          </section>
        </div>
      ) : null}

      {tab === 'roles' ? (
        <SkillRolesMatrix skillId={skill.id} skillName={skill.name} />
      ) : null}
    </div>
  )
}

function MasteryPreviewRow({
  level,
  text,
}: {
  level: SkillMasteryLevel
  text: string
}) {
  return (
    <li className="pd-skill-mastery-preview__row">
      <span
        className={[
          'pd-org-role-matrix__level',
          `pd-org-role-matrix__level--${level}`,
          'pd-skill-mastery-preview__level',
        ].join(' ')}
      >
        {expectedLevelLabel(level)}
      </span>
      <p
        className={[
          'pd-skill-mastery-preview__text',
          text ? '' : 'pd-skill-mastery-preview__text--empty',
        ]
          .filter(Boolean)
          .join(' ')}
      >
        {text || 'No description yet.'}
      </p>
    </li>
  )
}
