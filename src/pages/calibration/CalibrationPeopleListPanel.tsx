import { ChevronRight } from 'lucide-react'
import { Avatar } from '@/components/ui'
import { cx } from '@/lib/cx'
import { formatGapLabel } from '@/lib/calibration/ratingTable'
import { GRADE_BAND_META } from '@/lib/reviews/labels'
import type { GradeBandId } from '@/lib/reviews/types'
import { HintIcon } from '@/pages/reviews/HintIcon'
import { SettingsSidePanel } from '@/pages/reviews/SettingsSidePanel'
import '@/styles/layout-reviews.css'

export type CalibrationListPerson = {
  employeeId: number
  fullName: string
  avatarUrl?: string
  metaLine: string
  finalGrade: GradeBandId | null
  /** Chip label for finalGrade. Defaults to "Final". Use "Manager" on the grid. */
  finalLabel?: string
  selfGrade: GradeBandId | null
  gapTiers: number | null
  detailChip?: string | null
}

function GradeChip({
  label,
  grade,
  tone = 'neutral',
}: {
  label: string
  grade: GradeBandId | null
  tone?: 'neutral' | 'self'
}) {
  if (!grade) return null
  return (
    <span
      className={cx(
        'pd-cal-people-panel__chip',
        tone === 'self' ? 'is-self' : `is-${grade}`,
      )}
      title={`${label}: ${GRADE_BAND_META[grade].label}`}
    >
      {label}: {GRADE_BAND_META[grade].label}
    </span>
  )
}

function GapChip({ gapTiers }: { gapTiers: number | null }) {
  if (gapTiers == null || Math.abs(gapTiers) < 2) return null
  return (
    <span
      className={cx(
        'pd-cal-people-panel__chip',
        gapTiers < 0 ? 'is-gap-self' : 'is-gap-mgr',
      )}
    >
      {formatGapLabel(gapTiers)}
    </span>
  )
}

export function CalibrationPeopleListPanel({
  title,
  subtitle,
  hint,
  people,
  onClose,
  onSelectPerson,
}: {
  title: string
  subtitle: string
  hint?: string
  people: readonly CalibrationListPerson[]
  onClose: () => void
  onSelectPerson: (employeeId: number) => void
}) {
  return (
    <SettingsSidePanel
      label={title}
      closeLabel="Close Employee List"
      defaultWidth={480}
      onClose={onClose}
      title={
        <div className="pd-cal-drawer__title-block">
          <h2 className="pd-settings-panel__title">
            {title}
            {hint ? (
              <HintIcon content={hint} label={`About ${title}`} />
            ) : null}
          </h2>
          <p className="pd-cal-drawer__title-meta">{subtitle}</p>
        </div>
      }
    >
      {people.length === 0 ? (
        <p className="pd-cal-people-panel__empty">
          No Matching People In This Cycle.
        </p>
      ) : (
        <ul className="pd-cal-people-panel__list">
          {people.map((person) => (
            <li key={person.employeeId}>
              <button
                type="button"
                className="pd-cal-people-panel__row"
                onClick={() => onSelectPerson(person.employeeId)}
              >
                <Avatar
                  name={person.fullName}
                  src={person.avatarUrl}
                  size="md"
                />
                <span className="pd-cal-people-panel__copy">
                  <span className="pd-cal-people-panel__name">
                    {person.fullName}
                  </span>
                  {person.metaLine ? (
                    <span className="pd-cal-people-panel__meta">
                      {person.metaLine}
                    </span>
                  ) : null}
                  <span className="pd-cal-people-panel__chips">
                    <GradeChip
                      label={person.finalLabel ?? 'Final'}
                      grade={person.finalGrade}
                    />
                    <GradeChip
                      label="Self"
                      grade={person.selfGrade}
                      tone="self"
                    />
                    <GapChip gapTiers={person.gapTiers} />
                    {person.detailChip ? (
                      <span className="pd-cal-people-panel__chip is-detail">
                        {person.detailChip}
                      </span>
                    ) : null}
                  </span>
                </span>
                <ChevronRight
                  className="pd-cal-people-panel__chevron"
                  size={18}
                  strokeWidth={2}
                  aria-hidden
                />
              </button>
            </li>
          ))}
        </ul>
      )}
    </SettingsSidePanel>
  )
}
