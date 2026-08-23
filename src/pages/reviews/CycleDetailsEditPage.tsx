import { useMemo, useState } from 'react'
import { CalendarRange, Link2 } from 'lucide-react'
import { Input, Select } from '@/components/ui'
import {
  PURPOSE_HINT,
  PURPOSE_LABEL,
  listLinkableSourceCycles,
  sourceLinksFromIds,
} from '@/lib/reviews/purpose'
import { applyCycleModules, presetCycleModules } from '@/lib/reviews/reviewStages'
import { updateCycleGroup, updateReviewCycle } from '@/lib/reviews/store'
import type { CyclePurpose, ReviewCycle } from '@/lib/reviews/types'
import { useReviewsSnapshot } from '@/lib/reviews/useReviews'
import { EditPageShell } from './EditPageShell'
import { SourceCyclePicker } from './SourceCyclePicker'

type CycleDetailsEditPageProps = {
  cycle: ReviewCycle
  onClose: () => void
  embedded?: boolean
}

export function CycleDetailsEditPage({
  cycle,
  onClose,
  embedded = false,
}: CycleDetailsEditPageProps) {
  const { cycles } = useReviewsSnapshot()
  const originalPurpose = cycle.purpose ?? 'quarterly_checkin'
  const [name, setName] = useState(cycle.name)
  const [purpose, setPurpose] = useState<CyclePurpose>(originalPurpose)
  const [yearKey, setYearKey] = useState(cycle.yearKey ?? '')
  const [startDate, setStartDate] = useState(cycle.startDate)
  const [endDate, setEndDate] = useState(cycle.endDate)
  const [sourceIds, setSourceIds] = useState(
    (cycle.sourceLinks ?? []).map((link) => link.sourceCycleId),
  )
  const [error, setError] = useState<string | null>(null)

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
    const purposeChanged = purpose !== originalPurpose
    const nextModules = purposeChanged
      ? presetCycleModules(purpose, cycle.periodKey)
      : null
    try {
      void updateReviewCycle(cycle.id, {
        name,
        purpose,
        yearKey: yearKey || undefined,
        startDate,
        endDate,
        sourceLinks: sourceLinksFromIds(sourceIds),
        ...(nextModules
          ? {
              stagesConfig: applyCycleModules(
                cycle.stagesConfig,
                nextModules,
                purpose,
                cycle.periodKey,
              ),
            }
          : {}),
      })
        .then(() => {
          if (!nextModules) return
          return Promise.all(
            (cycle.groups ?? []).map((group) =>
              updateCycleGroup(cycle.id, group.id, {
                stagesConfig: applyCycleModules(
                  group.stagesConfig,
                  nextModules,
                  purpose,
                  cycle.periodKey,
                ),
              }),
            ),
          )
        })
        .catch(() => {})
      if (!embedded) onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save settings.')
    }
  }

  return (
    <EditPageShell
      title="Cycle details"
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
          <p className="pd-reviews-flow__hint">{PURPOSE_HINT[purpose]}</p>
          <Input
            label="Cycle name"
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
          <Select
            label="Kind"
            value={purpose}
            onChange={(event) =>
              setPurpose(event.target.value as CyclePurpose)
            }
            options={(
              ['quarterly_checkin', 'annual_appraisal', 'custom'] as const
            ).map((id) => ({
              value: id,
              label: PURPOSE_LABEL[id],
            }))}
          />
          <Input
            label="Performance year"
            value={yearKey}
            onChange={(event) => setYearKey(event.target.value)}
            placeholder="2026"
          />
          <div className="pd-reviews-modal__dates">
            <Input
              label="Starts"
              type="date"
              value={startDate}
              onChange={(event) => setStartDate(event.target.value)}
            />
            <Input
              label="Ends"
              type="date"
              value={endDate}
              onChange={(event) => setEndDate(event.target.value)}
            />
          </div>
        </section>

        {purpose === 'annual_appraisal' ? (
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
