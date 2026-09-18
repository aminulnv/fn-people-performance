import { useMemo, useState } from 'react'
import { Modal } from '@/components/ui'
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
      People with both a self and a manager grade. Click a cell to list them.
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

function zoneClass(
  selfIndex: number,
  managerIndex: number,
): 'aligned' | 'mgr_higher' | 'self_higher' {
  if (selfIndex === managerIndex) return 'aligned'
  return managerIndex > selfIndex ? 'mgr_higher' : 'self_higher'
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

export function SelfManagerRatingGrid({
  cycle,
  employees,
  packets,
}: {
  cycle: Pick<ReviewCycle, 'groups'>
  employees: readonly PlatformEmployee[]
  packets: readonly ReviewPacket[]
}) {
  const [activeKey, setActiveKey] = useState<string | null>(null)

  const model = useMemo(
    () =>
      buildSelfManagerRatingGrid({
        cycle,
        employees,
        packets,
      }),
    [cycle, employees, packets],
  )

  const activeCell =
    model.cells.find((cell) => cellKey(cell) === activeKey) ?? null

  const yLabels = [...RATING_GRID_BAND_ORDER].reverse()

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
      </header>

      <div className="pd-cal-grid__panel">
        <div className="pd-cal-grid__main">
          <div className="pd-cal-grid__chart" role="group" aria-label="Rating matrix">
            <span className="pd-cal-grid__axis-y-label">Manager rating</span>
            <div className="pd-cal-grid__y-labels" aria-hidden>
              {yLabels.map((bandId) => (
                <span key={bandId}>{shortBandLabel(bandId)}</span>
              ))}
            </div>
            <div className="pd-cal-grid__matrix">
              {yLabels.map((managerGrade, rowIndex) => {
                const managerIndex = RATING_GRID_BAND_ORDER.length - 1 - rowIndex
                return (
                  <div key={managerGrade} className="pd-cal-grid__matrix-row">
                    {RATING_GRID_BAND_ORDER.map((selfGrade, selfIndex) => {
                      const cell = model.cells.find(
                        (item) =>
                          item.selfGrade === selfGrade &&
                          item.managerGrade === managerGrade,
                      )
                      const people = cell?.people ?? []
                      const count = people.length
                      const tone = cell?.tone ?? 'aligned'
                      const zone = zoneClass(selfIndex, managerIndex)
                      const label = `${shortBandLabel(selfGrade)} self / ${shortBandLabel(managerGrade)} manager: ${count} ${count === 1 ? 'person' : 'people'}`
                      return (
                        <button
                          key={selfGrade}
                          type="button"
                          className={cx(
                            'pd-cal-grid__cell',
                            `is-zone-${zone}`,
                            activeKey === cellKey({ selfGrade, managerGrade }) &&
                              'is-active',
                          )}
                          aria-label={label}
                          onClick={() =>
                            setActiveKey(
                              cellKey({ selfGrade, managerGrade }),
                            )
                          }
                        >
                          {count > 0 ? (
                            <span
                              className={cx(
                                'pd-cal-grid__dot',
                                `is-${tone}`,
                                count > 1 && 'has-count',
                              )}
                            >
                              {count > 1 ? count : null}
                            </span>
                          ) : null}
                        </button>
                      )
                    })}
                  </div>
                )
              })}
            </div>
            <div className="pd-cal-grid__x-labels" aria-hidden>
              {RATING_GRID_BAND_ORDER.map((bandId) => (
                <span key={bandId}>{shortBandLabel(bandId)}</span>
              ))}
            </div>
            <span className="pd-cal-grid__axis-x-label">
              Employee self-rating
            </span>
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
              <span className="pd-cal-grid__stat-label">Total employees</span>
              <strong>{model.total}</strong>
            </li>
            <li className="pd-cal-grid__stat">
              <span className="pd-cal-grid__stat-label">Red flag (2+ tier gap)</span>
              <strong className="is-red">{model.redFlagCount}</strong>
            </li>
            <li className="pd-cal-grid__stat">
              <span className="pd-cal-grid__stat-label">Amber (1 tier gap)</span>
              <strong className="is-amber">{model.amberCount}</strong>
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

      <Modal
        open={activeCell != null}
        onClose={() => setActiveKey(null)}
        title={
          activeCell
            ? `Self ${GRADE_BAND_META[activeCell.selfGrade].label} · Mgr ${GRADE_BAND_META[activeCell.managerGrade].label}`
            : 'Cell'
        }
        description={
          activeCell
            ? `${activeCell.people.length} ${activeCell.people.length === 1 ? 'person' : 'people'} in this cell.`
            : undefined
        }
      >
        {activeCell && activeCell.people.length === 0 ? (
          <p className="pd-cal-grid__empty">No people in this cell.</p>
        ) : (
          <ul className="pd-cal-grid__people">
            {activeCell?.people.map((person) => (
              <li key={person.employeeId}>
                <strong>{person.fullName}</strong>
                <span>
                  Self {GRADE_BAND_META[person.selfGrade].label} · Mgr{' '}
                  {GRADE_BAND_META[person.managerGrade].label}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Modal>
    </section>
  )
}
