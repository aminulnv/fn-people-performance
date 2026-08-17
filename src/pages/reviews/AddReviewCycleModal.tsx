import { useEffect, useMemo, useState } from 'react'
import { Button, Modal, Select } from '@/components/ui'
import { listSelectablePeriods } from '@/lib/reviews/periods'
import { createReviewCycle } from '@/lib/reviews/store'
import type { ReviewCycle, ReviewCycleType } from '@/lib/reviews/types'

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
  const periods = useMemo(() => listSelectablePeriods(), [])
  const availablePeriods = useMemo(
    () => periods.filter((p) => !existingPeriodKeys.has(p.key)),
    [existingPeriodKeys, periods],
  )

  const [type, setType] = useState<ReviewCycleType>('regular')
  const [periodKey, setPeriodKey] = useState('')
  const [adhocName, setAdhocName] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setType('regular')
    setPeriodKey(availablePeriods[0]?.key ?? '')
    setAdhocName('')
    setStartDate('')
    setEndDate('')
    setError(null)
  }, [open, availablePeriods])

  const handleClose = () => {
    onClose()
  }

  const handleConfirm = async () => {
    try {
      setError(null)
      const cycle =
        type === 'regular'
          ? await createReviewCycle({ type: 'regular', periodKey })
          : await createReviewCycle({
              type: 'ad-hoc',
              name: adhocName || 'Ad-hoc cycle',
              startDate: startDate || undefined,
              endDate: endDate || startDate || undefined,
            })
      onCreated(cycle)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create cycle.')
    }
  }

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Add Performance Cycle"
      description="Create a performance cycle for goals and performance reviews."
      className="pd-reviews-modal"
      actions={
        <>
          <Button variant="secondary" pill onClick={handleClose}>
            Cancel
          </Button>
          <Button variant="primary" pill onClick={handleConfirm}>
            Confirm
          </Button>
        </>
      }
    >
      <fieldset className="pd-reviews-type-picker">
        <legend className="pd-sr-only">Cycle type</legend>
        <label
          className={[
            'pd-reviews-type-option',
            type === 'regular' ? 'is-selected' : '',
          ]
            .filter(Boolean)
            .join(' ')}
        >
          <input
            type="radio"
            name="cycle-type"
            value="regular"
            checked={type === 'regular'}
            onChange={() => setType('regular')}
          />
          <span className="pd-reviews-type-option__radio" aria-hidden />
          <span className="pd-reviews-type-option__text">
            <span className="pd-reviews-type-option__title">Regular cycle</span>
            <span className="pd-reviews-type-option__desc">
              Create a standard performance cycle using fixed dates for goals
              and performance reviews.
            </span>
          </span>
        </label>

        <label
          className={[
            'pd-reviews-type-option',
            type === 'ad-hoc' ? 'is-selected' : '',
          ]
            .filter(Boolean)
            .join(' ')}
        >
          <input
            type="radio"
            name="cycle-type"
            value="ad-hoc"
            checked={type === 'ad-hoc'}
            onChange={() => setType('ad-hoc')}
          />
          <span className="pd-reviews-type-option__radio" aria-hidden />
          <span className="pd-reviews-type-option__text">
            <span className="pd-reviews-type-option__title">Ad-hoc cycle</span>
            <span className="pd-reviews-type-option__desc">
              Set up a custom performance cycle with manual dates, ideal for
              special cases like testing features or unique assessments.
            </span>
          </span>
        </label>
      </fieldset>

      {type === 'regular' ? (
        <div className="pd-reviews-modal__field">
          <Select
            label="Select Cycle"
            hint="Choose the period for this performance cycle."
            value={periodKey}
            onChange={(e) => setPeriodKey(e.target.value)}
            options={availablePeriods.map((period) => ({
              value: period.key,
              label: `Cycle: ${period.label}`,
            }))}
          />
        </div>
      ) : (
        <div className="pd-reviews-modal__adhoc">
          <label className="pd-field">
            <span className="pd-field__label">Cycle name</span>
            <input
              className="pd-field__control"
              value={adhocName}
              onChange={(e) => setAdhocName(e.target.value)}
              placeholder="e.g. Mid-year special review"
            />
          </label>
          <div className="pd-reviews-modal__dates">
            <label className="pd-field">
              <span className="pd-field__label">Start date</span>
              <input
                type="date"
                className="pd-field__control"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </label>
            <label className="pd-field">
              <span className="pd-field__label">End date</span>
              <input
                type="date"
                className="pd-field__control"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </label>
          </div>
        </div>
      )}

      {error ? (
        <p className="pd-reviews-modal__error" role="alert">
          {error}
        </p>
      ) : null}
    </Modal>
  )
}
