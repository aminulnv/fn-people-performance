import { useMemo, useState } from 'react'
import { CalendarRange, Link2 } from 'lucide-react'
import { Field, Input, ListboxSelect } from '@/components/ui'
import { isEndBeforeStart } from '@/lib/dates/timestamp'
import { toUtcIso } from '@/lib/dates/timezone'
import { listPerformanceYears } from '@/lib/reviews/periods'
import {
  cyclePurposeOf,
  inferYearKey,
  listLinkableSourceCycles,
  sourceLinksFromIds,
} from '@/lib/reviews/purpose'
import { updateReviewCycle } from '@/lib/reviews/store'
import type { ReviewCycle } from '@/lib/reviews/types'
import { useReviewsSnapshot } from '@/lib/reviews/useReviews'
import { EditPageShell } from './EditPageShell'
import { SourceCyclePicker } from './SourceCyclePicker'

type CycleDetailsEditPageProps = {
  cycle: ReviewCycle
  onClose: () => void
  embedded?: boolean
  onSuccess?: (message: string) => void
}

export function CycleDetailsEditPage({
  cycle,
  onClose,
  embedded = false,
  onSuccess,
}: CycleDetailsEditPageProps) {
  const { cycles } = useReviewsSnapshot()
  const [name, setName] = useState(cycle.name)
  const [yearKey, setYearKey] = useState(
    cycle.yearKey ?? inferYearKey(cycle.periodKey, cycle.startDate) ?? '',
  )
  const [startDate, setStartDate] = useState(toUtcIso(cycle.startDate) || cycle.startDate)
  const [endDate, setEndDate] = useState(toUtcIso(cycle.endDate) || cycle.endDate)
  const [sourceIds, setSourceIds] = useState(
    (cycle.sourceLinks ?? []).map((link) => link.sourceCycleId),
  )
  const [error, setError] = useState<string | null>(null)
  const showPerformanceYear = cyclePurposeOf(cycle) !== 'quarterly_checkin'

  const yearOptions = useMemo(
    () =>
      listPerformanceYears([
        yearKey,
        cycle.yearKey,
        ...cycles.map((item) => item.yearKey),
      ]).map((year) => ({ value: year, label: year })),
    [cycle.yearKey, cycles, yearKey],
  )
  const linkable = useMemo(
    () =>
      listLinkableSourceCycles(cycles, {
        excludeId: cycle.id,
        yearKey: yearKey || undefined,
      }),
    [cycles, cycle.id, yearKey],
  )

  const save = () => {
    setError(null)
    if (!toUtcIso(startDate) || !toUtcIso(endDate)) {
      setError('Start and end timestamps are required.')
      return
    }
    if (isEndBeforeStart(startDate, endDate)) {
      setError('Cycle must end on or after its start date.')
      return
    }
    try {
      void updateReviewCycle(cycle.id, {
        name,
        ...(showPerformanceYear ? { yearKey: yearKey || undefined } : {}),
        startDate: toUtcIso(startDate) || startDate,
        endDate: toUtcIso(endDate) || endDate,
        sourceLinks: sourceLinksFromIds(sourceIds),
      }).catch(() => {})
      onSuccess?.('Settings saved.')
      if (!embedded) onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save settings.')
    }
  }

  return (
    <EditPageShell
      title="Cycle Details"
      onBack={onClose}
      onSave={save}
      error={error}
      embedded={embedded}
      actionsPlacement="bottom"
    >
      <div className="pd-reviews-edit__body pd-reviews-edit__body--stacked">
        <section className="pd-reviews-edit-card">
          <header className="pd-reviews-edit-card__head">
            <CalendarRange size={16} strokeWidth={1.75} aria-hidden />
            <h3 className="pd-reviews-edit-card__title">Name and dates</h3>
          </header>
          <Input
            label="Cycle name"
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
          {showPerformanceYear ? (
            <Field label="Performance year" htmlFor="cycle-performance-year">
              <ListboxSelect
                id="cycle-performance-year"
                aria-label="Performance year"
                allowEmpty={false}
                value={yearKey}
                onValueChange={setYearKey}
                options={yearOptions}
              />
            </Field>
          ) : null}
          <div className="pd-reviews-modal__dates">
            <Input
              label="Starts"
              type="datetime"
              value={startDate}
              max={endDate || undefined}
              onChange={(event) => setStartDate(event.target.value)}
            />
            <Input
              label="Ends"
              type="datetime"
              value={endDate}
              min={startDate || undefined}
              error={
                isEndBeforeStart(startDate, endDate)
                  ? 'Must end on or after the start date.'
                  : undefined
              }
              onChange={(event) => setEndDate(event.target.value)}
            />
          </div>
        </section>

        {cyclePurposeOf(cycle) === 'annual_appraisal' ? (
          <section className="pd-reviews-edit-card">
            <header className="pd-reviews-edit-card__head">
              <Link2 size={16} strokeWidth={1.75} aria-hidden />
              <h3 className="pd-reviews-edit-card__title">Included cycles</h3>
            </header>
            <p className="pd-reviews-flow__hint">
              The annual Goals score is the average of the cycles you include.
              Quarterly check-ins and custom cycles can both count.
            </p>
            <SourceCyclePicker
              cycles={linkable}
              selectedIds={sourceIds}
              onChange={setSourceIds}
              emptyLabel="No quarterly or custom cycles to include yet."
            />
          </section>
        ) : null}
      </div>
    </EditPageShell>
  )
}
