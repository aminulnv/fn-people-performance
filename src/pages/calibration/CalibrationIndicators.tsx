import { useMemo, useState } from 'react'
import { officialGrade } from '@/lib/analytics/dashboard'
import {
  gradeTierDelta,
  type CalibrationIndicator,
} from '@/lib/calibration/indicators'
import type { RatingTableRow } from '@/lib/calibration/ratingTable'
import type { PlatformEmployee } from '@/lib/employees/types'
import { GRADE_BAND_META } from '@/lib/reviews/labels'
import type { ReviewPacket } from '@/lib/reviews/types'
import { cx } from '@/lib/cx'
import {
  CalibrationPeopleListPanel,
  type CalibrationListPerson,
} from '@/pages/calibration/CalibrationPeopleListPanel'
import { HintIcon } from '@/pages/reviews/HintIcon'

function peopleLabel(count: number): string {
  return `${count} ${count === 1 ? 'person' : 'people'}`
}

function listMetaLine(employee: PlatformEmployee): string {
  return [employee.department, employee.site, employee.jobGrade]
    .map((value) => value.trim())
    .filter(Boolean)
    .join(' · ')
}

function detailChipFor(
  indicatorId: CalibrationIndicator['id'],
  row: RatingTableRow | undefined,
): string | null {
  if (indicatorId !== 'annual_vs_quarterly' || !row) return null
  if (!row.quarterAverageGrade || !row.annualGrade) return null
  return `Q avg: ${GRADE_BAND_META[row.quarterAverageGrade].label} · Annual: ${GRADE_BAND_META[row.annualGrade].label}`
}

function toListPerson(
  employee: PlatformEmployee,
  packet: ReviewPacket | undefined,
  row: RatingTableRow | undefined,
  indicatorId: CalibrationIndicator['id'],
): CalibrationListPerson {
  const finalGrade = row?.annualGrade ?? officialGrade(packet) ?? null
  const selfGrade = row?.selfGrade ?? packet?.selfOverallGrade ?? null
  const gapTiers =
    row?.gapTiers ?? gradeTierDelta(selfGrade, finalGrade)
  return {
    employeeId: employee.employeeId,
    fullName: employee.fullName,
    avatarUrl: employee.avatarUrl || undefined,
    metaLine: listMetaLine(employee),
    finalGrade,
    selfGrade,
    gapTiers,
    detailChip: detailChipFor(indicatorId, row),
  }
}

export function CalibrationIndicators({
  indicators,
  employees,
  packets,
  rows,
  onSelectEmployee,
}: {
  indicators: readonly CalibrationIndicator[]
  employees: readonly PlatformEmployee[]
  packets: readonly ReviewPacket[]
  rows: readonly RatingTableRow[]
  onSelectEmployee: (employeeId: number) => void
}) {
  const [activeId, setActiveId] = useState<CalibrationIndicator['id'] | null>(
    null,
  )
  const employeeById = useMemo(
    () => new Map(employees.map((employee) => [employee.employeeId, employee])),
    [employees],
  )
  const packetById = useMemo(
    () => new Map(packets.map((packet) => [packet.employeeId, packet])),
    [packets],
  )
  const rowById = useMemo(
    () => new Map(rows.map((row) => [row.employeeId, row])),
    [rows],
  )
  const active = indicators.find((row) => row.id === activeId) ?? null
  const activePeople = useMemo(() => {
    if (!active) return []
    return active.employeeIds
      .map((employeeId) => employeeById.get(employeeId))
      .filter((employee): employee is PlatformEmployee => Boolean(employee))
      .map((employee) =>
        toListPerson(
          employee,
          packetById.get(employee.employeeId),
          rowById.get(employee.employeeId),
          active.id,
        ),
      )
  }, [active, employeeById, packetById, rowById])

  return (
    <section className="pd-cal-ind" aria-label="Calibration indicators">
      <header className="pd-cal-ind__head">
        <h2 className="pd-cal-ind__title">
          <span className="pd-cal-ind__step" aria-hidden>
            2
          </span>
          Calibration Indicators
          <HintIcon
            content="Click a card to see who matches. Hover an info icon for the rule."
            label="About calibration indicators"
          />
        </h2>
      </header>

      <ul className="pd-cal-ind__grid">
        {indicators.map((indicator) => (
          <li
            key={indicator.id}
            className={cx(
              'pd-cal-ind__card',
              `is-${indicator.tone}`,
              activeId === indicator.id && 'is-active',
            )}
          >
            <button
              type="button"
              className="pd-cal-ind__card-open"
              onClick={() => setActiveId(indicator.id)}
              aria-label={`${indicator.title}: ${peopleLabel(indicator.count)}. View employee list.`}
            />
            <span className="pd-cal-ind__card-body">
              <span className="pd-cal-ind__card-title">
                <span>{indicator.title}</span>
                <HintIcon
                  content={indicator.definition}
                  label={`About ${indicator.title}`}
                />
              </span>
              <strong className="pd-cal-ind__card-value">
                {indicator.count}
              </strong>
            </span>
          </li>
        ))}
      </ul>

      {active ? (
        <CalibrationPeopleListPanel
          title={active.title}
          subtitle={`${peopleLabel(active.count)} match this indicator.`}
          hint={active.definition}
          people={activePeople}
          onClose={() => setActiveId(null)}
          onSelectPerson={(employeeId) => {
            setActiveId(null)
            onSelectEmployee(employeeId)
          }}
        />
      ) : null}
    </section>
  )
}
