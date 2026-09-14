import { useEffect, useMemo, useState } from 'react'
import { ListboxSelect, SegmentedControl } from '@/components/ui'
import {
  COMPARISON_VIEWS,
  RATING_COMPARISON_INFO,
  buildRatingComparisonGroups,
  buildRatingComparisonModel,
  ratingBandCaption,
  type RatingComparisonViewId,
} from '@/lib/calibration/ratingComparison'
import type { PlatformEmployee } from '@/lib/employees/types'
import type { ReviewCycle, ReviewPacket } from '@/lib/reviews/types'
import { cx } from '@/lib/cx'
import { HintIcon } from '@/pages/reviews/HintIcon'

function formatDelta(delta: number): string {
  const rounded = Math.round(delta * 100) / 100
  return `${rounded > 0 ? '+' : ''}${rounded.toFixed(2)}`
}

function deltaCopy(tone: 'on' | 'above' | 'below', delta: number, baselineLabel: string) {
  if (tone === 'on') return `≈ On par with ${baselineLabel}`
  if (tone === 'above') return `↑ ${formatDelta(delta)} vs ${baselineLabel}`
  return `↓ ${formatDelta(delta)} vs ${baselineLabel}`
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
          <HintIcon
            content={RATING_COMPARISON_INFO}
            label="About rating comparison"
          />
        </h2>
        <p className="pd-cal-cmp__copy">
          Compare departments or teams against each other · Use the filters
          below to build your view
        </p>
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
                  >
                    <span className="pd-cal-cmp__bar-label">
                      {row.averageScore.toFixed(2)} ·{' '}
                      {ratingBandCaption(row.averageBand)}
                    </span>
                  </span>
                </div>
                <span
                  className={cx('pd-cal-cmp__delta', `is-${row.tone}`)}
                >
                  {deltaCopy(row.tone, row.delta, model.baselineLabel)}
                </span>
                <span className="pd-cal-cmp__pax">{row.count} pax</span>
              </li>
            ))}
          </ul>
        )}

        <p className="pd-cal-cmp__footnote">
          <span className="pd-cal-cmp__footnote-line" aria-hidden />
          Vertical line = average rating of selected comparison group
        </p>
      </div>
    </section>
  )
}
