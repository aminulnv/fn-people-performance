import { useEffect, useMemo, useState } from 'react'
import { Users } from 'lucide-react'
import { ListboxSelect, SegmentedControl } from '@/components/ui'
import {
  COMPARISON_VIEWS,
  buildRatingComparisonGroups,
  buildRatingComparisonModel,
  ratingBandCaption,
  type RatingComparisonViewId,
} from '@/lib/calibration/ratingComparison'
import type { PlatformEmployee } from '@/lib/employees/types'
import type { ReviewCycle, ReviewPacket } from '@/lib/reviews/types'
import { cx } from '@/lib/cx'
import { HintIcon } from '@/pages/reviews/HintIcon'

const COMPARISON_HINT = (
  <ul className="pd-help-tip">
    <li>
      <strong>Bars</strong>
      Each group’s mean official grade, on a 1–5 scale.
    </li>
    <li>
      <strong>Vertical line</strong>
      Average of the comparison group you selected.
    </li>
    <li>
      <strong>Color</strong>
      On par is within ±0.25 of that line. Below is red, above is blue.
    </li>
    <li>
      <strong>Delta</strong>
      Difference vs the baseline (hover for baseline name).
    </li>
  </ul>
)

function formatDelta(delta: number): string {
  const rounded = Math.round(delta * 100) / 100
  return `${rounded > 0 ? '+' : ''}${rounded.toFixed(2)}`
}

function deltaCopy(tone: 'on' | 'above' | 'below', delta: number) {
  if (tone === 'on') return '≈ On par'
  if (tone === 'above') return `↑ ${formatDelta(delta)}`
  return `↓ ${formatDelta(delta)}`
}

export function RatingComparison({
  cycle,
  employees,
  packets,
}: {
  cycle: Pick<ReviewCycle, 'groups'>
  employees: readonly PlatformEmployee[]
  packets: readonly ReviewPacket[]
}) {
  const [view, setView] = useState<RatingComparisonViewId>('department')
  const [scopeId, setScopeId] = useState('all')
  const [baselineId, setBaselineId] = useState('avg')

  const groups = useMemo(
    () =>
      buildRatingComparisonGroups({
        cycle,
        employees,
        packets,
        view,
      }),
    [cycle, employees, packets, view],
  )

  useEffect(() => {
    setScopeId('all')
    setBaselineId('avg')
  }, [view])

  useEffect(() => {
    if (scopeId !== 'all' && !groups.some((group) => group.id === scopeId)) {
      setScopeId('all')
    }
    if (
      baselineId !== 'avg' &&
      !groups.some((group) => group.id === baselineId)
    ) {
      setBaselineId('avg')
    }
  }, [baselineId, groups, scopeId])

  const model = useMemo(
    () =>
      buildRatingComparisonModel({
        groups,
        scopeId,
        baselineId,
      }),
    [baselineId, groups, scopeId],
  )

  const allLabel = view === 'department' ? 'All Departments' : 'All Teams'
  const scopeOptions = [
    { value: 'all', label: allLabel },
    ...groups.map((group) => ({ value: group.id, label: group.label })),
  ]
  const baselineOptions = [
    { value: 'avg', label: 'Average of Group A' },
    ...groups.map((group) => ({ value: group.id, label: group.label })),
  ]

  return (
    <section className="pd-cal-cmp" aria-label="Rating comparison">
      <header className="pd-cal-cmp__head">
        <h2 className="pd-cal-cmp__title">
          <span className="pd-cal-cmp__step" aria-hidden>
            4
          </span>
          Rating Comparison
          <HintIcon content={COMPARISON_HINT} label="About rating comparison" />
        </h2>
      </header>

      <div className="pd-cal-cmp__panel">
        <div className="pd-cal-cmp__filters">
          <label className="pd-cal-cmp__filter">
            <span className="pd-cal-cmp__filter-label">View by</span>
            <SegmentedControl
              options={[...COMPARISON_VIEWS]}
              value={view}
              onChange={setView}
              aria-label="Comparison view"
            />
          </label>
          <div className="pd-cal-cmp__filter pd-cal-cmp__filter--compare">
            <span className="pd-cal-cmp__filter-label">Compare</span>
            <div className="pd-cal-cmp__compare">
              <ListboxSelect
                value={scopeId}
                onValueChange={setScopeId}
                options={scopeOptions}
                allowEmpty={false}
                aria-label="Comparison group A"
              />
              <span className="pd-cal-cmp__vs">vs</span>
              <ListboxSelect
                value={baselineId}
                onValueChange={setBaselineId}
                options={baselineOptions}
                allowEmpty={false}
                aria-label="Comparison baseline"
              />
            </div>
          </div>
        </div>

        {model.rows.length === 0 ? (
          <p className="pd-cal-cmp__empty">
            No graded groups in this cycle yet. Bars appear once people have an
            official grade.
          </p>
        ) : (
          <ul className="pd-cal-cmp__rows">
            {model.rows.map((row) => (
              <li key={row.id} className="pd-cal-cmp__row">
                <span className="pd-cal-cmp__name">{row.label}</span>
                <div className="pd-cal-cmp__track">
                  {model.baselineLinePercent != null ? (
                    <span
                      className="pd-cal-cmp__line"
                      style={{ left: `${model.baselineLinePercent}%` }}
                      aria-hidden
                    />
                  ) : null}
                  <span
                    className={cx('pd-cal-cmp__bar', `is-${row.tone}`)}
                    style={{ width: `${row.barPercent}%` }}
                    aria-hidden
                  />
                </div>
                <span className="pd-cal-cmp__score">
                  <strong>{row.averageScore.toFixed(2)}</strong>
                  <span>{ratingBandCaption(row.averageBand)}</span>
                </span>
                <span
                  className={cx('pd-cal-cmp__delta', `is-${row.tone}`)}
                  title={`vs ${model.baselineLabel}`}
                >
                  {deltaCopy(row.tone, row.delta)}
                </span>
                <span
                  className="pd-cal-cmp__people"
                  aria-label={`${row.count} ${row.count === 1 ? 'person' : 'people'}`}
                >
                  <Users size={11} strokeWidth={2.25} aria-hidden />
                  {row.count}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  )
}
