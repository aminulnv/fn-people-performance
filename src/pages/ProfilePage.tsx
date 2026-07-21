import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Avatar } from '@/components/ui/Avatar'
import { EmptyState } from '@/components/ui/EmptyState'
import { PageSection } from '@/components/ui/PageSection'
import { PageError, PageLoading } from '@/components/ui/PageState'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { fetchProfile } from '@/lib/people/api'
import {
  EMPLOYMENT_STATUS_LABEL,
  GOAL_STATUS_LABEL,
  RATING_LABEL,
  formatShortDate,
  goalStatusTone,
} from '@/lib/people/format'
import { useAuth } from '@/lib/useAuth'
import { queryKeys } from '@/lib/queryClient'
import '@/styles/layout-pages.css'

export default function ProfilePage() {
  const { user } = useAuth()
  const userId = user?.id ?? 'demo'

  const { data, isLoading, isError } = useQuery({
    queryKey: queryKeys.profile(userId),
    queryFn: () => fetchProfile(userId),
  })

  if (isLoading) return <PageLoading label="Loading profile" />
  if (isError || !data) return <PageError />

  const { person, manager, reports, goals } = data
  const openGoals = goals.filter((g) => g.status !== 'completed')

  return (
    <div className="pd-page pd-stack" aria-label="My Profile">
      <section className="pd-section">
        <div className="pd-profile-hero">
          <Avatar name={person.name} hue={person.avatarHue} size="lg" />
          <div className="pd-profile-hero__copy">
            <h2 className="pd-profile-hero__name">{person.name}</h2>
            <p className="pd-profile-hero__title">
              {person.title} · {person.department}
            </p>
            <div className="pd-profile-hero__chips">
              <StatusBadge
                label={EMPLOYMENT_STATUS_LABEL[person.status]}
                tone={person.status === 'active' ? 'success' : 'info'}
              />
              {person.rating ? (
                <StatusBadge
                  label={`${person.rating} · ${RATING_LABEL[person.rating]}`}
                  tone="info"
                />
              ) : (
                <StatusBadge label="Rating pending" tone="warning" />
              )}
            </div>
          </div>
        </div>
      </section>

      <div className="pd-split">
        <PageSection title="About" hint="Directory details">
          <dl className="pd-dl">
            <dt>Email</dt>
            <dd>{person.email}</dd>
            <dt>Location</dt>
            <dd>{person.location}</dd>
            <dt>Started</dt>
            <dd>{formatShortDate(person.startDate)}</dd>
            <dt>Last check-in</dt>
            <dd>{formatShortDate(person.lastCheckInAt)}</dd>
            <dt>Manager</dt>
            <dd>{manager?.name ?? '—'}</dd>
          </dl>
        </PageSection>

        <PageSection
          title="Direct reports"
          hint={
            reports.length === 0
              ? 'No direct reports'
              : `${reports.length} people`
          }
          action={
            reports.length > 0 ? (
              <Link
                to="/people"
                className="pd-btn pd-btn-secondary"
                style={{ padding: '0.35rem 0.7rem', fontSize: '0.75rem' }}
              >
                Directory
              </Link>
            ) : null
          }
        >
          {reports.length === 0 ? (
            <EmptyState title="Individual contributor" detail="No reports yet." />
          ) : (
            <div className="pd-inline-people">
              {reports.map((report) => (
                <div key={report.id} className="pd-inline-person">
                  <Avatar
                    name={report.name}
                    hue={report.avatarHue}
                    size="sm"
                  />
                  <div className="pd-person-cell__text">
                    <span className="pd-person-cell__name">{report.name}</span>
                    <span className="pd-person-cell__meta">
                      {report.title}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </PageSection>
      </div>

      <PageSection
        title="My goals"
        hint={`${openGoals.length} open · ${goals.length} total`}
        action={
          <Link
            to="/goals"
            className="pd-btn pd-btn-secondary"
            style={{ padding: '0.35rem 0.7rem', fontSize: '0.75rem' }}
          >
            All goals
          </Link>
        }
      >
        {goals.length === 0 ? (
          <EmptyState title="No goals assigned" />
        ) : (
          <ul className="pd-goal-list">
            {goals.map((goal) => (
              <li key={goal.id} className="pd-goal-card">
                <div className="pd-goal-card__main">
                  <div className="pd-goal-card__top">
                    <h3 className="pd-goal-card__title">{goal.title}</h3>
                    <StatusBadge
                      label={GOAL_STATUS_LABEL[goal.status]}
                      tone={goalStatusTone(goal.status)}
                    />
                  </div>
                  <p className="pd-goal-card__desc">{goal.description}</p>
                  <div className="pd-goal-card__meta">
                    <span>Due {formatShortDate(goal.dueDate)}</span>
                  </div>
                </div>
                <div className="pd-goal-card__side">
                  <ProgressBar value={goal.progress} label={goal.title} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </PageSection>
    </div>
  )
}
