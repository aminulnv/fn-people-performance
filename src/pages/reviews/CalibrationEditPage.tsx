import { useEffect, useMemo, useRef, useState, type MutableRefObject } from 'react'
import { ClipboardList, Star } from 'lucide-react'
import { updateCycleGroup } from '@/lib/reviews/store'
import { GRADE_BAND_META, GRADE_BAND_ORDER } from '@/lib/reviews/labels'
import { CALIBRATION_STAGE_ORDER } from '@/lib/reviews/reviewStages'
import type {
  CycleGroup,
  CycleStagesConfig,
  GradeBandId,
  ReviewCycle,
  ReviewStageId,
} from '@/lib/reviews/types'
import { CountStepperField } from './CountStepperField'
import { EditPageShell } from './EditPageShell'
import { ReviewStageList } from './ReviewStageList'

type CalibrationEditPageProps = {
  cycle: ReviewCycle
  group: CycleGroup
  onClose: () => void
  embedded?: boolean
  onSuccess?: (message: string) => void
  onDirtyChange?: (dirty: boolean) => void
  saveRef?: MutableRefObject<(() => Promise<boolean>) | null>
  /** Shared with Reviews so stage dates stay one source of truth. */
  stagesConfig: CycleStagesConfig
  setStageEnabled: (id: ReviewStageId, enabled: boolean) => void
  setStageDate: (
    id: ReviewStageId,
    field: 'start' | 'end',
    date: string,
  ) => void
}

function calibrationStagesDirty(
  draft: CycleStagesConfig,
  saved: CycleStagesConfig,
): boolean {
  for (const id of CALIBRATION_STAGE_ORDER) {
    const left = draft.reviewStages?.find((stage) => stage.id === id)
    const right = saved.reviewStages?.find((stage) => stage.id === id)
    if (JSON.stringify(left ?? null) !== JSON.stringify(right ?? null)) {
      return true
    }
  }
  return false
}

export function CalibrationEditPage({
  cycle,
  group,
  onClose,
  embedded = false,
  onSuccess,
  onDirtyChange,
  saveRef,
  stagesConfig,
  setStageEnabled,
  setStageDate,
}: CalibrationEditPageProps) {
  const [bands, setBands] = useState(group.calibration.gradeDistribution)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const total = GRADE_BAND_ORDER.reduce((sum, id) => sum + (bands[id] ?? 0), 0)
  const saved = group.calibration.gradeDistribution
  const bandsDirty = GRADE_BAND_ORDER.some(
    (id) => (bands[id] ?? 0) !== (saved[id] ?? 0),
  )
  const stagesDirty = useMemo(
    () => calibrationStagesDirty(stagesConfig, group.stagesConfig),
    [stagesConfig, group.stagesConfig],
  )
  const dirty = bandsDirty || stagesDirty
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
      stagesConfig,
    })
      .then(() => {
        onSuccess?.('Calibration settings saved.')
        if (!embedded) onClose()
        return true
      })
      .catch((err: unknown) => {
        setError(
          err instanceof Error ? err.message : 'Could not save calibration.',
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
      description="When calibration runs, and the expected grade mix for this group."
      onBack={onClose}
      onSave={save}
      saving={saving}
      error={mismatch ?? error}
      embedded={embedded}
      actionsPlacement="top"
    >
      <div className="pd-settings-stack">
        <section className="pd-settings-stack__block pd-settings-stack__block--flush">
          <div className="pd-settings-stack__block-head">
            <h3 className="pd-settings-stack__eyebrow">
              <ClipboardList size={15} strokeWidth={1.75} aria-hidden />
              Calibration window
            </h3>
          </div>
          <ReviewStageList
            cycle={cycle}
            groupId={group.id}
            stageIds={CALIBRATION_STAGE_ORDER}
            stagesConfig={stagesConfig}
            moduleEnabled
            setStageEnabled={setStageEnabled}
            setStageDate={setStageDate}
          />
        </section>

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
