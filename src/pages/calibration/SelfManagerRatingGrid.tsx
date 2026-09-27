import { useMemo, useState } from 'react'
import { Avatar, Tooltip } from '@/components/ui'
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
import {
  CalibrationPeopleListPanel,
  type CalibrationListPerson,
} from '@/pages/calibration/CalibrationPeopleListPanel'
import { HintIcon } from '@/pages/reviews/HintIcon'

const RATING_GRID_HINT = (
  <ul className="pd-help-tip">
    <li>
      <strong>Dots</strong>
      People with both a self and a manager grade. Click a cell to open the list
      (or the person when there is only one).
    </li>
    <li>
      <strong>Diagonal</strong>
      Self and manager ratings match (aligned). Legend and stats use the same
      four gap categories.
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

function toListPerson(
  person: RatingGridPerson,
  employee: PlatformEmployee | undefined,
): CalibrationListPerson {
  return {
    employeeId: person.employeeId,
    fullName: person.fullName,
    avatarUrl: employee?.avatarUrl || undefined,
    metaLine: [employee?.department, employee?.site, employee?.jobGrade]
      .map((value) => value?.trim())
      .filter(Boolean)
      .join(' · '),
    finalGrade: person.managerGrade,
    finalLabel: 'Manager',
    selfGrade: person.selfGrade,
    gapTiers: person.tierDelta,
  }
}

function OutlierTable({
  people,
  employeeById,
  onSelect,
}: {
  people: readonly RatingGridPerson[]
  employeeById: ReadonlyMap<number, PlatformEmployee>
  onSelect: (employeeId: number) => void
}) {
  return (
    <div className="pd-cal-grid__outlier-wrap">
      <table className="pd-cal-grid__outlier-table">
        <thead>
          <tr>
            <th scope="col">Name</th>
            <th scope="col">Self</th>
            <th scope="col">Manager</th>
            <th scope="col">Gap</th>
          </tr>
        </thead>
        <tbody>
          {people.map((person) => {
            const gapTone =
              person.tierDelta > 0
                ? 'mgr'
                : person.tierDelta < 0
                  ? 'self'
                  : 'aligned'
            const avatarUrl = employeeById.get(person.employeeId)?.avatarUrl
            return (
              <tr
                key={person.employeeId}
                className="pd-cal-grid__outlier-row"
                onClick={() => onSelect(person.employeeId)}
              >
                <th scope="row">
                  <button
                    type="button"
                    className="pd-cal-grid__outlier-person"
                    onClick={(event) => {
                      event.stopPropagation()
                      onSelect(person.employeeId)
                    }}
                  >
                    <Avatar
                      name={person.fullName}
                      src={avatarUrl || undefined}
                      size="sm"
                    />
                    <span className="pd-cal-grid__outlier-name">
                      {person.fullName}
                    </span>
                  </button>
                </th>
                <td>
                  <span
                    className={cx(
                      'pd-cal-heat__avg',
                      'pd-cal-grid__grade-chip',
                      `is-${person.selfGrade}`,
                    )}
                  >
                    {GRADE_BAND_META[person.selfGrade].label}
                  </span>
                </td>
                <td>
                  <span
                    className={cx(
                      'pd-cal-heat__avg',
                      'pd-cal-grid__grade-chip',
                      `is-${person.managerGrade}`,
                    )}
                  >
                    {GRADE_BAND_META[person.managerGrade].label}
                  </span>
                </td>
                <td>
                  <span
                    className={cx(
                      'pd-cal-grid__outlier-gap',
                      `is-gap-${gapTone}`,
                    )}
                  >
                    {formatTierGap(person.tierDelta)}
                  </span>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
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
          Self {shortBandLabel(selfGrade)} · Manager {shortBandLabel(managerGrade)}
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
                  Manager: {GRADE_BAND_META[person.managerGrade].label}
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
      <p className="pd-cal-grid__tip-hint">Click to open</p>
    </div>
  )
}

function GridCell({
  selfGrade,
  managerGrade,
  people,
  tone,
  tierDelta,
  onOpen,
}: {
  selfGrade: (typeof RATING_GRID_BAND_ORDER)[number]
  managerGrade: (typeof RATING_GRID_BAND_ORDER)[number]
  people: RatingGridPerson[]
  tone: RatingGridCell['tone']
  tierDelta: number
  onOpen: (people: readonly RatingGridPerson[]) => void
}) {
  const count = people.length
  const label = `${shortBandLabel(selfGrade)} self / ${shortBandLabel(managerGrade)} manager: ${count} ${count === 1 ? 'person' : 'people'}`
  const cell = (
    <button
      type="button"
      className={cx(
        'pd-cal-grid__cell',
        `is-zone-${zoneClass(tierDelta)}`,
        count === 0 && 'is-empty',
        count > 0 && 'is-clickable',
      )}
      aria-label={label}
      disabled={count === 0}
      onClick={() => {
        if (count === 0) return
        onOpen(people)
      }}
    >
      {count > 0 ? (
        <span className={cx('pd-cal-grid__dot', `is-${tone}`)}>
          {count}
        </span>
      ) : null}
    </button>
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

type CellListState = {
  title: string
  subtitle: string
  people: CalibrationListPerson[]
}

export function SelfManagerRatingGrid({
  cycle,
  employees,
  packets,
  onSelectEmployee,
}: {
  cycle: Pick<ReviewCycle, 'groups'>
  employees: readonly PlatformEmployee[]
  packets: readonly ReviewPacket[]
  onSelectEmployee: (employeeId: number) => void
}) {
  const [cellList, setCellList] = useState<CellListState | null>(null)
  const employeeById = useMemo(
    () => new Map(employees.map((employee) => [employee.employeeId, employee])),
    [employees],
  )
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

  function openCellPeople(people: readonly RatingGridPerson[]) {
    if (people.length === 0) return
    if (people.length === 1) {
      onSelectEmployee(people[0].employeeId)
      return
    }
    const first = people[0]
    setCellList({
      title: 'Self vs Manager',
      subtitle: `Self: ${GRADE_BAND_META[first.selfGrade].label} · Manager: ${GRADE_BAND_META[first.managerGrade].label}`,
      people: people.map((person) =>
        toListPerson(person, employeeById.get(person.employeeId)),
      ),
    })
  }

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
            <div className="pd-cal-grid__axis-y-wrap">
              <span className="pd-cal-grid__axis-y-label">Manager Rating</span>
            </div>
            <div className="pd-cal-grid__y-labels" aria-hidden>
              {yLabels.map((bandId) => (
                <span
                  key={bandId}
                  className="pd-cal-grid__y-lbl"
                >
                  {GRADE_BAND_META[bandId].label}
                </span>
              ))}
            </div>
            <div className="pd-cal-grid__plot">
              <div className="pd-cal-grid__matrix">
                {flatCells.map((cell) => (
                  <GridCell
                    key={cellKey(cell)}
                    {...cell}
                    onOpen={openCellPeople}
                  />
                ))}
              </div>
              <div className="pd-cal-grid__x-labels" aria-hidden>
                {RATING_GRID_BAND_ORDER.map((bandId) => (
                  <span
                    key={bandId}
                    className="pd-cal-grid__x-lbl"
                  >
                    {GRADE_BAND_META[bandId].label}
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
              Manager Rated Higher
            </li>
            <li>
              <span className="pd-cal-grid__dot is-amber_gap" aria-hidden />
              Self Rated Higher
            </li>
            <li>
              <span className="pd-cal-grid__dot is-red_gap" aria-hidden />
              2+ Tier Gap
            </li>
          </ul>
        </div>

        <div className="pd-cal-grid__outliers">
          <h3 className="pd-cal-grid__outliers-title">
            Red Flag Outliers
            {model.redFlagOutliers.length > 0 ? (
              <span className="pd-cal-grid__outliers-count">
                {model.redFlagOutliers.length}
              </span>
            ) : null}
          </h3>
          {model.redFlagOutliers.length === 0 ? (
            <p className="pd-cal-grid__empty">
              No 2+ Tier Gaps In This Cycle Yet.
            </p>
          ) : (
            <OutlierTable
              people={model.redFlagOutliers}
              employeeById={employeeById}
              onSelect={onSelectEmployee}
            />
          )}
        </div>

        <aside className="pd-cal-grid__side" aria-label="Summary stats">
          <ul className="pd-cal-grid__stats">
            <li className="pd-cal-grid__stat">
              <strong>{model.total}</strong>
              <span className="pd-cal-grid__stat-label">Total</span>
            </li>
            <li className="pd-cal-grid__stat">
              <strong className="is-aligned">{model.alignedCount}</strong>
              <span className="pd-cal-grid__stat-label">Aligned</span>
            </li>
            <li className="pd-cal-grid__stat">
              <strong className="is-mgr">{model.mgrHigherCount}</strong>
              <span className="pd-cal-grid__stat-label">Manager Rated Higher</span>
            </li>
            <li className="pd-cal-grid__stat">
              <strong className="is-amber">{model.selfHigherCount}</strong>
              <span className="pd-cal-grid__stat-label">Self Rated Higher</span>
            </li>
            <li className="pd-cal-grid__stat">
              <strong className="is-red">{model.redFlagCount}</strong>
              <span className="pd-cal-grid__stat-label">
                Red Flag (2+ Tier Gap)
              </span>
            </li>
          </ul>
        </aside>
      </div>

      {cellList ? (
        <CalibrationPeopleListPanel
          title={cellList.title}
          subtitle={cellList.subtitle}
          people={cellList.people}
          onClose={() => setCellList(null)}
          onSelectPerson={(employeeId) => {
            setCellList(null)
            onSelectEmployee(employeeId)
          }}
        />
      ) : null}
    </section>
  )
}
