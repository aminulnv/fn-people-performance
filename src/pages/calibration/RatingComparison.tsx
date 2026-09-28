import { useEffect, useMemo, useState } from 'react'
import { Users } from 'lucide-react'
import { CycleSelect, SegmentedControl } from '@/components/ui'
import {
  COMPARISON_VIEWS,
  buildRatingComparisonGroups,
  buildRatingComparisonModel,
  type RatingComparisonTone,
  type RatingComparisonViewId,
} from '@/lib/calibration/ratingComparison'
import type { PlatformEmployee } from '@/lib/employees/types'
import { GRADE_BAND_META } from '@/lib/reviews/labels'
import type { ReviewCycle, ReviewPacket } from '@/lib/reviews/types'
import { cx } from '@/lib/cx'
import { HintIcon } from '@/pages/reviews/HintIcon'

const SCORE_TICKS = [1, 2, 3, 4, 5] as const

const COMPARISON_HINT = (
  <ul className="pd-help-tip">
    <li>
      <strong>Bars</strong>
      Mean Official Grade On A 1–5 Scale. Both Sides Show The Numeric Score.
    </li>
    <li>
      <strong>Reference Line</strong>
      Baseline Average, Labeled With Its Exact Score.
    </li>
    <li>
      <strong>Delta</strong>
      Signed Difference Vs The Baseline. Within ±0.3 Is Near Parity.
    </li>
  </ul>
)

function formatDelta(delta: number): string {
  const rounded = Math.round(delta * 100) / 100
  return `${rounded > 0 ? '+' : ''}${rounded.toFixed(2)}`
}

function ScoreCallout({
  label,
  score,
  band,
  count,
  tone,
  muted,
}: {
  label: string
  score: number
  band: string
  count: number | null
  tone?: RatingComparisonTone
  muted?: boolean
}) {
  return (
    <div
      className={cx(
        'pd-cal-cmp__callout',
        muted && 'is-muted',
        tone && `is-${tone}`,
      )}
    >
      <span className="pd-cal-cmp__callout-label">{label}</span>
      <span className="pd-cal-cmp__callout-score">{score.toFixed(2)}</span>
      <span className="pd-cal-cmp__callout-band">{band}</span>
      {count != null ? (
        <span className="pd-cal-cmp__callout-n">
          <Users size={11} strokeWidth={2.25} aria-hidden />
          {count}
        </span>
      ) : null}
    </div>
  )
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
    { id: 'all', label: allLabel },
    ...groups.map((group) => ({ id: group.id, label: group.label })),
  ]
  const baselineOptions = [
    { id: 'avg', label: 'Average Of Above' },
    ...groups.map((group) => ({ id: group.id, label: group.label })),
  ]

  const primaryRow = model.rows[0] ?? null
  const showSummary =
    model.baselineScore != null &&
    (model.isPairwise || (scopeId !== 'all' && primaryRow != null))
  const showBaselineMarker =
    !model.isPairwise &&
    model.baselineLinePercent != null &&
    model.baselineScore != null

  return (
    <section className="pd-cal-cmp" aria-label="Rating Comparison">
      <header className="pd-cal-cmp__head">
        <h2 className="pd-cal-cmp__title">
          <span className="pd-cal-cmp__step" aria-hidden>
            4
          </span>
          Rating Comparison
          <HintIcon content={COMPARISON_HINT} label="About Rating Comparison" />
        </h2>
      </header>

      <div className="pd-cal-cmp__panel">
        <div className="pd-cal-cmp__filters">
          <span className="pd-cal-cmp__filter-label">View By:</span>
          <SegmentedControl
            options={[...COMPARISON_VIEWS]}
            value={view}
            onChange={setView}
            aria-label="Comparison View"
          />
          <span className="pd-cal-cmp__sep" aria-hidden />
          <span className="pd-cal-cmp__filter-label">Compare:</span>
          <CycleSelect
            label="Compare Group"
            options={scopeOptions}
            value={scopeId}
            onChange={setScopeId}
            searchPlaceholder="Search Groups"
            noResultsText="No Groups Match"
          />
          <span className="pd-cal-cmp__vs">Vs</span>
          <CycleSelect
            label="Baseline"
            options={baselineOptions}
            value={baselineId}
            onChange={setBaselineId}
            searchPlaceholder="Search Baseline"
            noResultsText="No Baselines Match"
          />
        </div>

        {model.rows.length === 0 ? (
          <p className="pd-cal-cmp__empty">
            No Graded Groups In This Cycle Yet. Bars Appear Once People Have An
            Official Grade.
          </p>
        ) : (
          <>
            {showSummary && primaryRow && model.baselineScore != null ? (
              <div className="pd-cal-cmp__summary" aria-label="Score Summary">
                <ScoreCallout
                  label={primaryRow.label}
                  score={primaryRow.averageScore}
                  band={GRADE_BAND_META[primaryRow.averageBand].label}
                  count={primaryRow.count}
                  tone={primaryRow.tone}
                />
                <div
                  className={cx(
                    'pd-cal-cmp__delta-pill',
                    `is-${primaryRow.tone}`,
                  )}
                >
                  <span className="pd-cal-cmp__delta-pill-value">
                    {primaryRow.tone === 'on'
                      ? '≈'
                      : formatDelta(primaryRow.delta)}
                  </span>
                  <span className="pd-cal-cmp__delta-pill-caption">
                    {primaryRow.tone === 'on' ? 'Near' : 'Delta'}
                  </span>
                </div>
                <ScoreCallout
                  label={model.baselineLabel}
                  score={model.baselineScore}
                  band={
                    model.baselineBand
                      ? GRADE_BAND_META[model.baselineBand].label
                      : 'Baseline'
                  }
                  count={model.baselineCount}
                  muted
                />
              </div>
            ) : null}

            <div
              className={cx(
                'pd-cal-cmp__chart',
                showSummary && 'has-summary',
              )}
            >
              <ul className="pd-cal-cmp__rows">
                {showBaselineMarker ? (
                  <li className="pd-cal-cmp__marker-row" aria-hidden>
                    <span />
                    <div className="pd-cal-cmp__marker-track">
                      <div
                        className="pd-cal-cmp__baseline-tag"
                        style={{ left: `${model.baselineLinePercent}%` }}
                      >
                        <span className="pd-cal-cmp__baseline-tag-value">
                          {model.baselineScore!.toFixed(2)}
                        </span>
                        <span className="pd-cal-cmp__baseline-tag-label">
                          {model.baselineLabel}
                        </span>
                      </div>
                    </div>
                    <span />
                    <span />
                    <span />
                  </li>
                ) : null}
                {model.series.map((bar) => {
                  const rowDelta =
                    bar.role === 'subject'
                      ? model.rows.find((row) => row.id === bar.id)
                      : null
                  return (
                    <li
                      key={`${bar.role}-${bar.id}`}
                      className={cx(
                        'pd-cal-cmp__row',
                        bar.role === 'baseline' && 'is-baseline',
                      )}
                    >
                      <span className="pd-cal-cmp__name">{bar.label}</span>
                      <div className="pd-cal-cmp__track">
                        <span
                          className={cx(
                            'pd-cal-cmp__bar',
                            `is-${bar.tone}`,
                            bar.role === 'baseline' && 'is-baseline-bar',
                          )}
                          style={{ width: `${bar.barPercent}%` }}
                        />
                        {showBaselineMarker ? (
                          <span
                            className="pd-cal-cmp__line"
                            style={{
                              left: `${model.baselineLinePercent}%`,
                            }}
                            aria-hidden
                          />
                        ) : null}
                      </div>
                      <span className="pd-cal-cmp__score">
                        <span className="pd-cal-cmp__score-num">
                          {bar.averageScore.toFixed(2)}
                        </span>
                        <span className="pd-cal-cmp__score-band">
                          {GRADE_BAND_META[bar.averageBand].label}
                        </span>
                      </span>
                      {rowDelta && !showSummary ? (
                        <span
                          className={cx(
                            'pd-cal-cmp__delta',
                            `is-${rowDelta.tone}`,
                          )}
                          title={`Vs ${model.baselineLabel}`}
                        >
                          {rowDelta.tone === 'on'
                            ? '≈ 0'
                            : formatDelta(rowDelta.delta)}
                        </span>
                      ) : (
                        <span
                          className="pd-cal-cmp__delta is-spacer"
                          aria-hidden
                        >
                          {'\u00a0'}
                        </span>
                      )}
                      <span
                        className="pd-cal-cmp__people"
                        aria-label={`${bar.count} ${bar.count === 1 ? 'Person' : 'People'}`}
                      >
                        <Users size={11} strokeWidth={2.25} aria-hidden />
                        {bar.count}
                      </span>
                    </li>
                  )
                })}

                <li className="pd-cal-cmp__axis" aria-hidden>
                  <span />
                  <div className="pd-cal-cmp__axis-track">
                    {SCORE_TICKS.map((tick) => (
                      <span
                        key={tick}
                        className="pd-cal-cmp__tick"
                        style={{ left: `${(tick / 5) * 100}%` }}
                      >
                        {tick}
                      </span>
                    ))}
                  </div>
                  <span />
                  <span />
                  <span />
                </li>
              </ul>
            </div>

            <p className="pd-cal-cmp__guide">
              {model.isPairwise ? (
                <>Bars Show Each Group’s Mean Official Grade On A 1–5 Scale.</>
              ) : (
                <>
                  <span className="pd-cal-cmp__guide-mark" aria-hidden />
                  Reference Line = {model.baselineLabel}
                  {model.baselineScore != null
                    ? ` (${model.baselineScore.toFixed(2)})`
                    : ''}
                </>
              )}
            </p>
          </>
        )}
      </div>
    </section>
  )
}
