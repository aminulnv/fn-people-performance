import { useMemo, useState } from 'react'
import { Modal } from '@/components/ui'
import type { CalibrationIndicator } from '@/lib/calibration/indicators'
import type { PlatformEmployee } from '@/lib/employees/types'
import { cx } from '@/lib/cx'
import { HintIcon } from '@/pages/reviews/HintIcon'

function peopleLabel(count: number): string {
  return `${count} ${count === 1 ? 'person' : 'people'}`
}

export function CalibrationIndicators({
  indicators,
  employees,
}: {
  indicators: readonly CalibrationIndicator[]
  employees: readonly PlatformEmployee[]
}) {
  const [activeId, setActiveId] = useState<CalibrationIndicator['id'] | null>(
    null,
  )
  const employeeById = useMemo(
    () => new Map(employees.map((employee) => [employee.employeeId, employee])),
    [employees],
  )
  const active = indicators.find((row) => row.id === activeId) ?? null
  const activePeople = active
    ? active.employeeIds
        .map((employeeId) => employeeById.get(employeeId))
        .filter((employee): employee is PlatformEmployee => Boolean(employee))
    : []

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
        <p className="pd-cal-ind__copy">
          Click any card to view employee list · Includes Q1–Q4 vs annual rating
          divergence
        </p>
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

      <Modal
        open={active != null}
        onClose={() => setActiveId(null)}
        title={active?.title ?? 'Indicator'}
        titleHint={active?.definition}
        titleHintLabel={active ? `About ${active.title}` : 'About indicator'}
        description={
          active
            ? `${peopleLabel(active.count)} match this indicator.`
            : undefined
        }
      >
        {activePeople.length === 0 ? (
          <p className="pd-cal-ind__empty">No matching people in this cycle.</p>
        ) : (
          <ul className="pd-cal-ind__people">
            {activePeople.map((employee) => (
              <li key={employee.employeeId}>
                <span className="pd-cal-ind__person-name">
                  {employee.fullName}
                </span>
                <span className="pd-cal-ind__person-meta">
                  {[employee.jobTitle, employee.department]
                    .filter(Boolean)
                    .join(' · ')}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Modal>
    </section>
  )
}
