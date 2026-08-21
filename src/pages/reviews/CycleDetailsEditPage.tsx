import { useMemo, useState } from 'react'
import { CalendarRange, Link2 } from 'lucide-react'
import { Input, Select } from '@/components/ui'
import { PURPOSE_HINT, PURPOSE_LABEL } from '@/lib/reviews/purpose'
import { updateReviewCycle } from '@/lib/reviews/store'
import type { CyclePurpose, ReviewCycle } from '@/lib/reviews/types'
import { useReviewsSnapshot } from '@/lib/reviews/useReviews'
import { EditPageShell } from './EditPageShell'

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
  const [name, setName] = useState(cycle.name)
  const [purpose, setPurpose] = useState<CyclePurpose>(
    cycle.purpose ?? 'quarterly_checkin',
  )
  const [yearKey, setYearKey] = useState(cycle.yearKey ?? '')
  const [startDate, setStartDate] = useState(cycle.startDate)
  const [endDate, setEndDate] = useState(cycle.endDate)
  const [sourceIds, setSourceIds] = useState(
    (cycle.sourceLinks ?? []).map((link) => link.sourceCycleId),
  )
  const [error, setError] = useState<string | null>(null)

  const linkable = useMemo(
    () =>
      cycles.filter(
        (item) =>
          item.id !== cycle.id &&
          item.purpose === 'quarterly_checkin' &&
          (!yearKey || item.yearKey === yearKey),
      ),
    [cycles, cycle.id, yearKey],
  )

  const save = () => {
    setError(null)
    try {
      void updateReviewCycle(cycle.id, {
        name,
        purpose,
        yearKey: yearKey || undefined,
        startDate,
        endDate,
        sourceLinks: sourceIds.map((sourceCycleId) => ({
          sourceCycleId,
          weightPercent: Math.round(100 / Math.max(sourceIds.length, 1)),
          excluded: false,
        })),
      }).catch(() => {})
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
            <h3 className="pd-reviews-edit-card__title">What this cycle is</h3>
          </header>
          <p className="pd-reviews-flow__hint">{PURPOSE_HINT[purpose]}</p>
          <Input
            label="Cycle name"
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
          <Select
            label="Purpose"
            value={purpose}
            onChange={(event) => setPurpose(event.target.value as CyclePurpose)}
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
              <h3 className="pd-reviews-edit-card__title">Linked quarters</h3>
            </header>
            <p className="pd-reviews-flow__hint">
              The annual Goals score is the average of these quarters. Turn a
              quarter off in the list if it should not count.
            </p>
            {linkable.length === 0 ? (
              <p className="pd-reviews-flow__hint">
                No quarterly cycles for this year yet.
              </p>
            ) : (
              <ul className="pd-reviews-link-list">
                {linkable.map((item) => {
                  const checked = sourceIds.includes(item.id)
                  return (
                    <li key={item.id}>
                      <label className="pd-reviews-link-list__row">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => {
                            setSourceIds((current) =>
                              checked
                                ? current.filter((id) => id !== item.id)
                                : [...current, item.id],
                            )
                          }}
                        />
                        <span>{item.name}</span>
                      </label>
                    </li>
                  )
                })}
              </ul>
            )}
          </section>
        ) : null}
      </div>
    </EditPageShell>
  )
}
