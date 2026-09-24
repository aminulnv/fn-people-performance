import { useMemo } from 'react'
import { Tooltip } from '@/components/ui'
import {
  RATING_GRID_BAND_ORDER,
  buildSelfManagerRatingGrid,
  formatTierGap,
  shortBandLabel,
  type RatingGridCell,
  type RatingGridPerson,
} from '@/lib/calibration/ratingGrid'
import type { PlatformEmployee } from '@/lib/employees/types'
import { GRADE_BAND_META } from '@/lib/reviews/labels'
import type { ReviewCycle, ReviewPacket } from '@/lib/reviews/types'
import { cx } from '@/lib/cx'
import { HintIcon } from '@/pages/reviews/HintIcon'

const RATING_GRID_HINT = (
  <ul className="pd-help-tip">
    <li>
      <strong>Dots</strong>
      People with both a self and a manager grade. Hover a dot to see who is in
      that cell.
    </li>
    <li>
      <strong>Diagonal</strong>
      Self and manager ratings match. The legend under the grid shows the gap.
    </li>
  </ul>
)

function cellKey(cell: Pick<RatingGridCell, 'selfGrade' | 'managerGrade'>): string {
  return `${cell.selfGrade}:${cell.managerGrade}`
}

/** Zone class for cell background tint (matches FN calibration dashboard). */
function zoneClass(tierDelta: number): string {
  if (tierDelta === 0) return 'diag'
  if (tierDelta === 1) return 'above1'
  if (tierDelta === -1) return 'below1'
  if (tierDelta <= -2) return 'below2'
  return 'above2'
}

function OutlierCard({ person }: { person: RatingGridPerson }) {
  const gapTone =
    person.tierDelta > 0
      ? 'mgr'
      : person.tierDelta < 0
        ? 'self'
        : 'aligned'
  return (
    <li className="pd-cal-grid__outlier">
      <span className="pd-cal-grid__outlier-name">{person.shortName}</span>
      <span className="pd-cal-grid__chips">
        <span className="pd-cal-grid__chip is-self">
          Self: {GRADE_BAND_META[person.selfGrade].label}
        </span>
        <span className="pd-cal-grid__chip is-mgr">
          Mgr: {GRADE_BAND_META[person.managerGrade].label}
        </span>
        <span className={cx('pd-cal-grid__chip', `is-gap-${gapTone}`)}>
          {formatTierGap(person.tierDelta)}
        </span>
      </span>
    </li>
  )
}

function CellPeopleTip({
  people,
  selfGrade,
  managerGrade,
}: {
  people: readonly RatingGridPerson[]
  selfGrade: (typeof RATING_GRID_BAND_ORDER)[number]
  managerGrade: (typeof RATING_GRID_BAND_ORDER)[number]
}) {
  const count = people.length
  return (
    <div className="pd-cal-grid__tip-card">
      <header className="pd-cal-grid__tip-head">
        <span className="pd-cal-grid__tip-title">
          {count} {count === 1 ? 'person' : 'people'}
        </span>
        <span className="pd-cal-grid__tip-meta">
          Self {shortBandLabel(selfGrade)} · Mgr {shortBandLabel(managerGrade)}
        </span>
      </header>
      <ul className="pd-cal-grid__tip-list">
        {people.map((person) => {
          const gapTone =
            person.tierDelta > 0
              ? 'mgr'
              : person.tierDelta < 0
                ? 'self'
                : 'aligned'
          return (
            <li key={person.employeeId} className="pd-cal-grid__tip-person">
              <span className="pd-cal-grid__tip-name">{person.fullName}</span>
              <span className="pd-cal-grid__chips">
                <span className="pd-cal-grid__chip is-self">
                  Self: {GRADE_BAND_META[person.selfGrade].label}
                </span>
                <span className="pd-cal-grid__chip is-mgr">
                  Mgr: {GRADE_BAND_META[person.managerGrade].label}
                </span>
                {person.tierDelta !== 0 ? (
                  <span className={cx('pd-cal-grid__chip', `is-gap-${gapTone}`)}>
                    {formatTierGap(person.tierDelta)}
                  </span>
                ) : null}
              </span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

function GridCell({
  selfGrade,
  managerGrade,
  people,
  tone,
  tierDelta,
}: {
  selfGrade: (typeof RATING_GRID_BAND_ORDER)[number]
  managerGrade: (typeof RATING_GRID_BAND_ORDER)[number]
  people: RatingGridPerson[]
  tone: RatingGridCell['tone']
  tierDelta: number
}) {
  const count = people.length
  const label = `${shortBandLabel(selfGrade)} self / ${shortBandLabel(managerGrade)} manager: ${count} ${count === 1 ? 'person' : 'people'}`
  const cell = (
    <span
      className={cx('pd-cal-grid__cell', `is-zone-${zoneClass(tierDelta)}`)}
      aria-label={label}
    >
      {count > 0 ? (
        <span className={cx('pd-cal-grid__dot', `is-${tone}`)}>
          {count > 1 ? count : null}
        </span>
      ) : null}
    </span>
  )

  if (count === 0) return cell

  return (
    <Tooltip
      content={
        <CellPeopleTip
          people={people}
          selfGrade={selfGrade}
          managerGrade={managerGrade}
        />
      }
      side="right"
      delayMs={0}
      portal
      interactive
      className="pd-cal-grid__tip"
    >
      {cell}
    </Tooltip>
  )
}

export function SelfManagerRatingGrid({
  cycle,
  employees,
  packets,
}: {
  cycle: Pick<ReviewCycle, 'groups'>
  employees: readonly PlatformEmployee[]
  packets: readonly ReviewPacket[]
}) {
  const model = useMemo(
    () =>
      buildSelfManagerRatingGrid({
        cycle,
        employees,
        packets,
      }),
    [cycle, employees, packets],
  )

  const yLabels = [...RATING_GRID_BAND_ORDER].reverse()

  const flatCells = useMemo(() => {
    const cells: Array<{
      selfGrade: (typeof RATING_GRID_BAND_ORDER)[number]
      managerGrade: (typeof RATING_GRID_BAND_ORDER)[number]
      people: RatingGridPerson[]
      tone: RatingGridCell['tone']
      tierDelta: number
    }> = []
    const cellByKey = new Map(
      model.cells.map((cell) => [cellKey(cell), cell] as const),
    )

    for (let row = 0; row < RATING_GRID_BAND_ORDER.length; row++) {
      const managerIndex = RATING_GRID_BAND_ORDER.length - 1 - row
      const managerGrade = RATING_GRID_BAND_ORDER[managerIndex]
      for (let selfIndex = 0; selfIndex < RATING_GRID_BAND_ORDER.length; selfIndex++) {
        const selfGrade = RATING_GRID_BAND_ORDER[selfIndex]
        const cell = cellByKey.get(`${selfGrade}:${managerGrade}`)
        cells.push({
          selfGrade,
          managerGrade,
          people: cell?.people ?? [],
          tone: cell?.tone ?? 'aligned',
          tierDelta: managerIndex - selfIndex,
        })
      }
    }
    return cells
  }, [model.cells])

  return (
    <section
      className="pd-cal-grid"
      aria-label="Self-rating vs manager rating grid"
    >
      <header className="pd-cal-grid__head">
        <h2 className="pd-cal-grid__title">
          <span className="pd-cal-grid__step" aria-hidden>
            6
          </span>
          Self-Rating vs Manager Rating Grid
          <HintIcon
            content={RATING_GRID_HINT}
            label="About self vs manager rating grid"
          />
        </h2>
        <p className="pd-cal-grid__sub">
          Diagonal = aligned · Hover any dot to view employees
        </p>
      </header>

      <div className="pd-cal-grid__panel">
        <div className="pd-cal-grid__main">
          <div className="pd-cal-grid__chart" role="group" aria-label="Rating matrix">
            <div className="pd-cal-grid__axis-y-wrap">
              <span className="pd-cal-grid__axis-y-label">Manager Rating</span>
            </div>
            <div className="pd-cal-grid__y-labels" aria-hidden>
              {yLabels.map((bandId) => (
                <span key={bandId} className="pd-cal-grid__y-lbl">
                  {shortBandLabel(bandId)}
                </span>
              ))}
            </div>
            <div className="pd-cal-grid__plot">
              <div className="pd-cal-grid__matrix">
                {flatCells.map((cell) => (
                  <GridCell key={cellKey(cell)} {...cell} />
                ))}
              </div>
              <div className="pd-cal-grid__x-labels" aria-hidden>
                {RATING_GRID_BAND_ORDER.map((bandId) => (
                  <span key={bandId} className="pd-cal-grid__x-lbl">
                    {shortBandLabel(bandId)}
                  </span>
                ))}
              </div>
              <span className="pd-cal-grid__axis-x-label">
                Employee Self-Rating
              </span>
            </div>
          </div>

          <ul className="pd-cal-grid__legend" aria-label="Dot legend">
            <li>
              <span className="pd-cal-grid__dot is-aligned" aria-hidden />
              Aligned
            </li>
            <li>
              <span className="pd-cal-grid__dot is-mgr_higher" aria-hidden />
              Mgr rated higher
            </li>
            <li>
              <span className="pd-cal-grid__dot is-amber_gap" aria-hidden />
              1 tier gap
            </li>
            <li>
              <span className="pd-cal-grid__dot is-red_gap" aria-hidden />
              2+ tier gap
            </li>
          </ul>
        </div>

        <aside className="pd-cal-grid__side">
          <ul className="pd-cal-grid__stats">
            <li className="pd-cal-grid__stat">
              <strong>{model.total}</strong>
              <span className="pd-cal-grid__stat-label">Total employees</span>
            </li>
            <li className="pd-cal-grid__stat">
              <strong className="is-red">{model.redFlagCount}</strong>
              <span className="pd-cal-grid__stat-label">
                Red flag (2+ tier gap)
              </span>
            </li>
            <li className="pd-cal-grid__stat">
              <strong className="is-amber">{model.amberCount}</strong>
              <span className="pd-cal-grid__stat-label">Amber (1 tier gap)</span>
            </li>
          </ul>

          <div className="pd-cal-grid__outliers">
            <h3 className="pd-cal-grid__outliers-title">Red Flag Outliers</h3>
            {model.redFlagOutliers.length === 0 ? (
              <p className="pd-cal-grid__empty">
                No 2+ tier gaps in this cycle yet.
              </p>
            ) : (
              <ul className="pd-cal-grid__outlier-list">
                {model.redFlagOutliers.map((person) => (
                  <OutlierCard key={person.employeeId} person={person} />
                ))}
              </ul>
            )}
          </div>
        </aside>
      </div>
    </section>
  )
}
