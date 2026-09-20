import { useEffect, useRef, useState, type MutableRefObject } from 'react'
import { Star } from 'lucide-react'
import { updateCycleGroup } from '@/lib/reviews/store'
import { GRADE_BAND_META, GRADE_BAND_ORDER } from '@/lib/reviews/labels'
import type { CycleGroup, GradeBandId, ReviewCycle } from '@/lib/reviews/types'
import { CountStepperField } from './CountStepperField'
import { EditPageShell } from './EditPageShell'

type CalibrationEditPageProps = {
  cycle: ReviewCycle
  group: CycleGroup
  onClose: () => void
  embedded?: boolean
  onSuccess?: (message: string) => void
  onDirtyChange?: (dirty: boolean) => void
  saveRef?: MutableRefObject<(() => Promise<boolean>) | null>
}

export function CalibrationEditPage({
  cycle,
  group,
  onClose,
  embedded = false,
  onSuccess,
  onDirtyChange,
  saveRef,
}: CalibrationEditPageProps) {
  const [bands, setBands] = useState(group.calibration.gradeDistribution)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const total = GRADE_BAND_ORDER.reduce((sum, id) => sum + (bands[id] ?? 0), 0)
  const saved = group.calibration.gradeDistribution
  const dirty = GRADE_BAND_ORDER.some((id) => (bands[id] ?? 0) !== (saved[id] ?? 0))
  const mismatch =
    total === 100 ? null : 'The expected shares must add up to 100%.'

  useEffect(() => {
    onDirtyChange?.(dirty)
    return () => onDirtyChange?.(false)
  }, [dirty, onDirtyChange])

  const setBand = (id: GradeBandId, next: number) => {
    setError(null)
    setBands((current) => ({
      ...current,
      [id]: Math.min(100, Math.max(0, next)),
    }))
  }

  const save = () => {
    if (saving || mismatch) return Promise.resolve(false)
    setError(null)
    setSaving(true)
    return updateCycleGroup(cycle.id, group.id, {
      calibration: { gradeDistribution: { ...bands } },
    })
      .then(() => {
        onSuccess?.('Calibration guideline saved.')
        if (!embedded) onClose()
        return true
      })
      .catch((err: unknown) => {
        setError(
          err instanceof Error ? err.message : 'Could not save the guideline.',
        )
        return false
      })
      .finally(() => setSaving(false))
  }
  const saveLatest = useRef(save)
  saveLatest.current = save

  useEffect(() => {
    if (!saveRef) return
    saveRef.current = () => saveLatest.current()
    return () => {
      saveRef.current = null
    }
  }, [saveRef])

  return (
    <EditPageShell
      title={`${group.name} · Calibration`}
      onBack={onClose}
      onSave={save}
      saving={saving}
      error={mismatch ?? error}
      embedded={embedded}
      actionsPlacement="top"
    >
      <div className="pd-settings-stack">
        <section className="pd-settings-stack__block">
          <div className="pd-settings-stack__block-head">
            <h3 className="pd-settings-stack__eyebrow">
              <Star size={15} strokeWidth={1.75} aria-hidden />
              Expected grade mix
            </h3>
            <p className="pd-settings-stack__meta">{total}%</p>
          </div>
          <ul className="pd-reviews-distribution" aria-label="Expected grade mix">
            {GRADE_BAND_ORDER.map((id) => (
              <li key={id} className="pd-reviews-distribution__row">
                <CountStepperField
                  label={GRADE_BAND_META[id].label}
                  value={bands[id] ?? 0}
                  min={0}
                  max={100}
                  onChange={(next) => setBand(id, next ?? 0)}
                />
              </li>
            ))}
          </ul>
        </section>
      </div>
    </EditPageShell>
  )
}
