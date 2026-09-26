import type { CSSProperties } from 'react'
import {
  ArrowUpRight,
  CheckCircle2,
  Scale,
  Star,
  Target,
  Users,
  type LucideIcon,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import type {
  HomeOrientation,
  HomeRhythmPhaseId,
} from '@/lib/home/homeOrientation'

const PHASE_ICONS: Record<HomeRhythmPhaseId, LucideIcon> = {
  goals: Target,
  reviews: Star,
  calibrate: Scale,
  done: CheckCircle2,
}

type HomeOrientationPanelProps = {
  orientation: HomeOrientation
  personName: string
  /** When the person has no action banners, emphasise the clear state. */
  isClear: boolean
}

function firstName(fullName: string): string {
  const part = fullName.trim().split(/\s+/)[0]
  return part || fullName
}

function greetingForNow(now = new Date()): string {
  const hour = now.getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

function milestoneChip(daysRemaining: number): string {
  if (daysRemaining < 0) return 'Past'
  if (daysRemaining === 0) return 'Today'
  if (daysRemaining === 1) return '1 day'
  return `${daysRemaining} days`
}

export function HomeOrientationPanel({
  orientation,
  personName,
  isClear,
}: HomeOrientationPanelProps) {
  const { teamAttention, nextMilestone } = orientation
  const name = firstName(personName)

  return (
    <section
      className="pd-home-orientation"
      aria-label={`${orientation.cycleLabel} cycle overview`}
    >
      <div className="pd-home-orientation__hero">
        <p className="pd-home-orientation__greeting">
          {greetingForNow()}, <span>{name}</span>
        </p>
        <div className="pd-home-orientation__cycle-row">
          <span className="pd-home-orientation__cycle-pill">
            {orientation.cycleLabel}
          </span>
          <span className="pd-home-orientation__cycle-phase">
            {orientation.activePhaseLabel}
          </span>
        </div>
        <h2 className="pd-home-orientation__title">
          {orientation.activePhaseHint}
        </h2>
      </div>

      <div className="pd-home-orientation__rail-wrap">
        <div
          className="pd-home-orientation__rail-track"
          aria-hidden
          style={
            {
              '--pd-home-rhythm-progress': String(orientation.rhythmProgress),
            } as CSSProperties
          }
        />
        <ol className="pd-home-orientation__phases" aria-label="Cycle phases">
          {orientation.phases.map((phase) => {
            const Icon = PHASE_ICONS[phase.id]
            return (
              <li
                key={phase.id}
                className={`pd-home-orientation__phase is-${phase.progress}`}
                aria-current={phase.progress === 'active' ? 'step' : undefined}
              >
                <span className="pd-home-orientation__phase-dot" aria-hidden>
                  <Icon size={12} strokeWidth={2.25} />
                </span>
                <span className="pd-home-orientation__phase-label">
                  {phase.label}
                </span>
              </li>
            )
          })}
        </ol>
      </div>

      <div className="pd-home-orientation__cards">
        {nextMilestone ? (
          <Link
            to={nextMilestone.href}
            className="pd-home-orientation__card pd-home-orientation__card--milestone"
            aria-label={`${nextMilestone.label}, ${nextMilestone.dateLabel}, ${nextMilestone.relativeLabel}`}
          >
            <div className="pd-home-orientation__card-top">
              <span className="pd-home-orientation__card-label">
                Next milestone
              </span>
              <span className="pd-home-orientation__chip">
                {milestoneChip(nextMilestone.daysRemaining)}
              </span>
            </div>
            <span className="pd-home-orientation__card-title">
              {nextMilestone.label}
            </span>
            <span className="pd-home-orientation__card-meta">
              {nextMilestone.dateLabel}
              <span className="pd-home-orientation__card-dot" aria-hidden>
                ·
              </span>
              {nextMilestone.relativeLabel}
            </span>
            <span className="pd-home-orientation__card-go" aria-hidden>
              <ArrowUpRight size={16} strokeWidth={2} />
            </span>
          </Link>
        ) : null}

        {teamAttention ? (
          <Link
            to={teamAttention.href}
            className="pd-home-orientation__card pd-home-orientation__card--team"
            aria-label={`${teamAttention.goalsPending} team goals need attention`}
          >
            <div className="pd-home-orientation__card-top">
              <span className="pd-home-orientation__card-label">
                Team attention
              </span>
              <span className="pd-home-orientation__count" aria-hidden>
                <Users size={13} strokeWidth={2} />
                {teamAttention.goalsPending}
              </span>
            </div>
            <span className="pd-home-orientation__card-title">
              {teamAttention.goalsPending === 1
                ? '1 goal waiting on you'
                : `${teamAttention.goalsPending} goals waiting on you`}
            </span>
            <span className="pd-home-orientation__card-meta">
              Review My Reports
            </span>
            <span className="pd-home-orientation__card-go" aria-hidden>
              <ArrowUpRight size={16} strokeWidth={2} />
            </span>
          </Link>
        ) : null}
      </div>

      {isClear ? (
        <p className="pd-home-orientation__clear">
          <span className="pd-home-orientation__clear-mark" aria-hidden />
          {orientation.clearCopy}
        </p>
      ) : null}
    </section>
  )
}
