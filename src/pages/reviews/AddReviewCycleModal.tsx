import { useEffect, useMemo, useState } from 'react'
import { Input, SegmentedControl, Select } from '@/components/ui'
import { isEndBeforeStart } from '@/lib/dates/timestamp'
import { toUtcIso } from '@/lib/dates/timezone'
import {
  findPeriod,
  formatDateRange,
  listAnnualPeriods,
  listQuarterPeriods,
} from '@/lib/reviews/periods'
import {
  inferYearKey,
  listLinkableSourceCycles,
  sourceLinksFromIds,
  suggestedSourceLinks,
} from '@/lib/reviews/purpose'
import { presetCycleModules } from '@/lib/reviews/reviewStages'
import { createReviewCycle } from '@/lib/reviews/store'
import type { CycleModules, CyclePurpose, ReviewCycle } from '@/lib/reviews/types'
import { CycleModulesFields } from './CycleModulesFields'
import { SettingsSidePanel } from './SettingsSidePanel'
import { SourceCyclePicker } from './SourceCyclePicker'

type AddReviewCycleModalProps = {
  open: boolean
  onClose: () => void
  onCreated: (cycle: ReviewCycle) => void
  existingPeriodKeys: Set<string>
  cycles?: ReviewCycle[]
}

const KIND_OPTIONS = [
  { id: 'quarterly_checkin' as const, label: 'Quarterly' },
  { id: 'annual_appraisal' as const, label: 'Annual' },
  { id: 'custom' as const, label: 'Custom' },
]

function firstKey(
  options: Array<{ key: string }>,
  current: string,
): string {
  if (options.some((option) => option.key === current)) return current
  return options[0]?.key ?? ''
}

export function AddReviewCycleModal({
  open,
  onClose,
  onCreated,
  existingPeriodKeys,
  cycles = [],
}: AddReviewCycleModalProps) {
  const quarters = useMemo(() => listQuarterPeriods(), [])
  const annuals = useMemo(() => listAnnualPeriods(), [])
  const availableQuarters = useMemo(
    () => quarters.filter((item) => !existingPeriodKeys.has(item.key)),
    [existingPeriodKeys, quarters],
  )
  const availableAnnuals = useMemo(
    () => annuals.filter((item) => !existingPeriodKeys.has(item.key)),
    [annuals, existingPeriodKeys],
  )

  const [kind, setKind] = useState<CyclePurpose>('quarterly_checkin')
  const [periodKey, setPeriodKey] = useState('')
  const [modules, setModules] = useState<CycleModules>(() =>
    presetCycleModules('quarterly_checkin'),
  )
  const [sourceIds, setSourceIds] = useState<string[]>([])
  const [customName, setCustomName] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const yearKey = inferYearKey(periodKey)
  const selectedPeriod = periodKey ? findPeriod(periodKey) : undefined
  const linkableCycles = useMemo(
    () => listLinkableSourceCycles(cycles, { yearKey }),
    [cycles, yearKey],
  )

  const applySuggestedSources = (nextPeriodKey: string) => {
    const nextYear = inferYearKey(nextPeriodKey)
    setSourceIds(
      nextYear
        ? suggestedSourceLinks(nextYear, cycles).map((link) => link.sourceCycleId)
        : [],
    )
  }

  useEffect(() => {
    if (!open) return
    const initialPeriod = availableQuarters[0]?.key ?? ''
    setKind('quarterly_checkin')
    setPeriodKey(initialPeriod)
    setModules(presetCycleModules('quarterly_checkin', initialPeriod || undefined))
    setSourceIds([])
    setCustomName('')
    setStartDate('')
    setEndDate('')
    setError(null)
    setSaving(false)
    // Reset only when the panel opens — not when period lists recompute.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const handleKindChange = (next: CyclePurpose) => {
    setKind(next)
    setError(null)
    if (next === 'quarterly_checkin') {
      const nextPeriod = firstKey(availableQuarters, periodKey)
      setPeriodKey(nextPeriod)
      setModules(presetCycleModules(next, nextPeriod || undefined))
      setSourceIds([])
    } else if (next === 'annual_appraisal') {
      const nextPeriod = firstKey(availableAnnuals, periodKey)
      setPeriodKey(nextPeriod)
      setModules(presetCycleModules(next, nextPeriod || undefined))
      applySuggestedSources(nextPeriod)
    } else {
      setModules(presetCycleModules(next))
    }
  }

  const handleConfirm = async () => {
    if (saving) return
    try {
      setError(null)
      if (kind !== 'custom' && !periodKey) {
        setError(
          kind === 'annual_appraisal'
            ? 'Every appraisal year in the picker already exists.'
            : 'Select a quarter before creating the cycle.',
        )
        return
      }
      if (kind === 'custom') {
        if (!toUtcIso(startDate) || !toUtcIso(endDate)) {
          setError('Start and end timestamps are required.')
          return
        }
        if (isEndBeforeStart(startDate, endDate)) {
          setError('Cycle must end on or after its start date.')
          return
        }
      }
      setSaving(true)
      const cycle =
        kind === 'custom'
          ? await createReviewCycle({
              type: 'custom',
              name: customName || 'Custom cycle',
              startDate: toUtcIso(startDate),
              endDate: toUtcIso(endDate),
              modules,
            })
          : await createReviewCycle({
              type: 'regular',
              periodKey,
              modules,
              sourceLinks:
                kind === 'annual_appraisal'
                  ? sourceLinksFromIds(sourceIds)
                  : undefined,
            })
      onCreated(cycle)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create cycle.')
    } finally {
      setSaving(false)
    }
  }

  if (!open) return null

  const periodOptions =
    kind === 'annual_appraisal' ? availableAnnuals : availableQuarters
  const canCreate = kind === 'custom' || periodOptions.length > 0

  return (
    <SettingsSidePanel
      label="Add Cycle"
      closeLabel="Close Add Cycle"
      onClose={onClose}
    >
      <div className="pd-reviews-create">
        <div className="pd-field">
          <span className="pd-field__label">Kind</span>
          <SegmentedControl
            className="pd-reviews-create__kind"
            aria-label="Kind"
            options={KIND_OPTIONS}
            value={kind}
            onChange={handleKindChange}
          />
        </div>

        {kind === 'quarterly_checkin' || kind === 'annual_appraisal' ? (
          periodOptions.length === 0 ? (
            <p className="pd-reviews-create__status" role="status">
              {kind === 'annual_appraisal'
                ? 'Those years already have an annual cycle.'
                : 'Those quarters already have a cycle.'}
            </p>
          ) : (
            <Select
              label={kind === 'annual_appraisal' ? 'Year' : 'Quarter'}
              value={periodKey}
              onChange={(event) => {
                const next = event.target.value
                setPeriodKey(next)
                setModules(presetCycleModules(kind, next))
                if (kind === 'annual_appraisal') applySuggestedSources(next)
              }}
              options={periodOptions.map((period) => ({
                value: period.key,
                label: period.label,
              }))}
            />
          )
        ) : (
          <div className="pd-reviews-create__custom">
            <Input
              label="Name"
              value={customName}
              onChange={(event) => setCustomName(event.target.value)}
              placeholder="e.g. Leadership mid-year"
            />
            <div className="pd-reviews-create__dates">
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
          </div>
        )}

        <section className="pd-reviews-create__modules" aria-labelledby="add-cycle-modules">
          <h3 className="pd-field__label" id="add-cycle-modules">
            This Cycle Includes
          </h3>
          <CycleModulesFields modules={modules} onChange={setModules} />
        </section>

        {kind === 'annual_appraisal' && selectedPeriod ? (
          <p className="pd-field__hint">
            Window {formatDateRange(selectedPeriod.startDate, selectedPeriod.endDate)}
          </p>
        ) : null}

        {kind === 'annual_appraisal' ? (
          <section className="pd-reviews-create__include" aria-labelledby="add-cycle-include">
            <h3 className="pd-field__label" id="add-cycle-include">
              Include
            </h3>
            <SourceCyclePicker
              cycles={linkableCycles}
              selectedIds={sourceIds}
              onChange={setSourceIds}
              emptyLabel="No other cycles to include yet."
            />
          </section>
        ) : null}

        {error ? (
          <p className="pd-reviews-create__error" role="alert">
            {error}
          </p>
        ) : null}

        <div className="pd-reviews-create__footer">
          <button
            type="button"
            className="pd-people__ghost-btn"
            onClick={onClose}
            disabled={saving}
          >
            Cancel
          </button>
          <button
            type="button"
            className="pd-people__ghost-btn pd-people__ghost-btn--primary"
            onClick={() => void handleConfirm()}
            disabled={saving || !canCreate}
            aria-busy={saving || undefined}
          >
            Create Cycle
          </button>
        </div>
      </div>
    </SettingsSidePanel>
  )
}
