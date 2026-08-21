import { useEffect, useMemo, useState } from 'react'
import { Button, Modal, Select } from '@/components/ui'
import { listAnnualPeriods, listQuarterPeriods } from '@/lib/reviews/periods'
import { PURPOSE_HINT, PURPOSE_LABEL } from '@/lib/reviews/purpose'
import { createReviewCycle } from '@/lib/reviews/store'
import type { CyclePurpose, ReviewCycle } from '@/lib/reviews/types'

type AddReviewCycleModalProps = {
  open: boolean
  onClose: () => void
  onCreated: (cycle: ReviewCycle) => void
  existingPeriodKeys: Set<string>
}

export function AddReviewCycleModal({
  open,
  onClose,
  onCreated,
  existingPeriodKeys,
}: AddReviewCycleModalProps) {
  const quarters = useMemo(() => listQuarterPeriods(), [])
  const annuals = useMemo(() => listAnnualPeriods(), [])
  const availableQuarters = quarters.filter((item) => !existingPeriodKeys.has(item.key))
  const availableAnnuals = annuals.filter((item) => !existingPeriodKeys.has(item.key))

  const [purpose, setPurpose] = useState<CyclePurpose>('quarterly_checkin')
  const [periodKey, setPeriodKey] = useState('')
  const [adhocName, setAdhocName] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setPurpose('quarterly_checkin')
    setPeriodKey(availableQuarters[0]?.key ?? '')
    setAdhocName('')
    setStartDate('')
    setEndDate('')
    setError(null)
  }, [open, availableQuarters])

  useEffect(() => {
    if (purpose === 'quarterly_checkin') {
      setPeriodKey(availableQuarters[0]?.key ?? '')
    }
    if (purpose === 'annual_appraisal') {
      setPeriodKey(availableAnnuals[0]?.key ?? '')
    }
  }, [purpose, availableAnnuals, availableQuarters])

  const handleConfirm = async () => {
    try {
      setError(null)
      const cycle =
        purpose === 'custom'
          ? await createReviewCycle({
              type: 'ad-hoc',
              purpose: 'custom',
              name: adhocName || 'Custom cycle',
              startDate: startDate || undefined,
              endDate: endDate || startDate || undefined,
            })
          : await createReviewCycle({
              type: 'regular',
              purpose,
              periodKey,
            })
      onCreated(cycle)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create cycle.')
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Add cycle"
      description="Pick the kind of cycle first. You can turn stages on or off after it is created."
      className="pd-reviews-modal"
      actions={
        <>
          <Button variant="secondary" pill onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" pill onClick={() => void handleConfirm()}>
            Create cycle
          </Button>
        </>
      }
    >
      <fieldset className="pd-reviews-type-picker">
        <legend className="pd-sr-only">What kind of cycle</legend>
        {(['quarterly_checkin', 'annual_appraisal', 'custom'] as const).map((id) => (
          <label
            key={id}
            className={[
              'pd-reviews-type-option',
              purpose === id ? 'is-selected' : '',
            ]
              .filter(Boolean)
              .join(' ')}
          >
            <input
              type="radio"
              name="cycle-purpose"
              value={id}
              checked={purpose === id}
              onChange={() => setPurpose(id)}
            />
            <span className="pd-reviews-type-option__radio" aria-hidden />
            <span className="pd-reviews-type-option__text">
              <span className="pd-reviews-type-option__title">
                {PURPOSE_LABEL[id]}
              </span>
              <span className="pd-reviews-type-option__desc">
                {PURPOSE_HINT[id]}
              </span>
            </span>
          </label>
        ))}
      </fieldset>

      {purpose === 'quarterly_checkin' ? (
        <Select
          label="Quarter"
          hint="One quarter. Manager check-in is on; annual stages stay off."
          value={periodKey}
          onChange={(event) => setPeriodKey(event.target.value)}
          options={availableQuarters.map((period) => ({
            value: period.key,
            label: period.label,
          }))}
        />
      ) : null}

      {purpose === 'annual_appraisal' ? (
        <Select
          label="Appraisal year"
          hint="The window opens in January of the following year. Linked quarters can be chosen in cycle details."
          value={periodKey}
          onChange={(event) => setPeriodKey(event.target.value)}
          options={availableAnnuals.map((period) => ({
            value: period.key,
            label: period.label,
          }))}
        />
      ) : null}

      {purpose === 'custom' ? (
        <div className="pd-reviews-modal__adhoc">
          <label className="pd-field">
            <span className="pd-field__label">Cycle name</span>
            <input
              className="pd-field__control"
              value={adhocName}
              onChange={(event) => setAdhocName(event.target.value)}
              placeholder="e.g. Leadership mid-year"
            />
          </label>
          <div className="pd-reviews-modal__dates">
            <label className="pd-field">
              <span className="pd-field__label">Starts</span>
              <input
                type="date"
                className="pd-field__control"
                value={startDate}
                onChange={(event) => setStartDate(event.target.value)}
              />
            </label>
            <label className="pd-field">
              <span className="pd-field__label">Ends</span>
              <input
                type="date"
                className="pd-field__control"
                value={endDate}
                onChange={(event) => setEndDate(event.target.value)}
              />
            </label>
          </div>
        </div>
      ) : null}

      {error ? (
        <p className="pd-reviews-modal__error" role="alert">
          {error}
        </p>
      ) : null}
    </Modal>
  )
}
