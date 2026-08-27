import { useEffect, useMemo, useState, type Dispatch, type SetStateAction } from 'react'
import { ArrowRight, CalendarRange, LayoutGrid, Star, Target } from 'lucide-react'
import { Switch } from '@/components/ui'
import { parseDateTime } from '@/lib/dates/timestamp'
import { normalizeCycleSettings } from '@/lib/reviews/demoData'
import { cyclePurposeOf } from '@/lib/reviews/purpose'
import {
  enabledReviewStages,
  isCalibrationStage,
  isPublishStage,
  isRequiredReviewStage,
  REVIEW_ONLY_STAGE_ORDER,
  REVIEW_STAGE_LABEL,
  syncLegacyStageWindows,
  withRequiredReviewStages,
} from '@/lib/reviews/reviewStages'
import { pillarWeightTotal } from '@/lib/reviews/reviewPolicy'
import { updateCycleGroup } from '@/lib/reviews/store'
import type {
  CycleGroup,
  CycleStagesConfig,
  ReviewCycle,
  ReviewPolicy,
  ReviewStageId,
} from '@/lib/reviews/types'
import { CycleModuleField, ModuleSettingsLock } from './CycleModulesFields'
import { EditPageShell } from './EditPageShell'
import { HintIcon } from './HintIcon'
import { reviewFormSummary } from './ReviewFormSheet'
import { ReviewStageList, stageSectionId } from './ReviewStageList'

type ReviewSettingsEditPageProps = {
  cycle: ReviewCycle
  group: CycleGroup
  onClose: () => void
  embedded?: boolean
  draft?: ReviewSettingsDraft
  enabled?: boolean
  onEnabledChange?: (enabled: boolean) => void
  onSuccess?: (message: string) => void
}

export type ReviewSettingsDraft = {
  settings: ReturnType<typeof normalizeCycleSettings>
  stagesConfig: CycleStagesConfig
  policy: ReviewPolicy
  error: string | null
  setSettings: Dispatch<
    SetStateAction<ReturnType<typeof normalizeCycleSettings>>
  >
  setStageEnabled: (id: ReviewStageId, enabled: boolean) => void
  setStageDate: (
    id: ReviewStageId,
    field: 'start' | 'end',
    date: string,
  ) => void
  replaceStagesConfig: (next: CycleStagesConfig) => void
  patchPolicy: (partial: Partial<ReviewPolicy>) => void
  save: () => boolean
  saving: boolean
}

export function useReviewSettingsDraft(
  cycle: ReviewCycle,
  group: CycleGroup,
  onClose: () => void,
  embedded = false,
): ReviewSettingsDraft {
  const [settings, setSettings] = useState(() =>
    normalizeCycleSettings(group.settings, cyclePurposeOf(cycle)),
  )
  const [stagesConfig, setStagesConfig] = useState<CycleStagesConfig>(() =>
    withRequiredReviewStages(structuredClone(group.stagesConfig)),
  )
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const policy =
    settings.reviewPolicy ??
    normalizeCycleSettings(group.settings, cyclePurposeOf(cycle))
      .reviewPolicy!

  const setStageEnabled = (id: ReviewStageId, enabled: boolean) => {
    if (isRequiredReviewStage(id) && !enabled) return
    setStagesConfig((prev) =>
      syncLegacyStageWindows({
        ...prev,
        reviewStages: (prev.reviewStages ?? []).map((stage) =>
          stage.id === id ? { ...stage, enabled } : stage,
        ),
      }),
    )
  }

  const setStageDate = (
    id: ReviewStageId,
    field: 'start' | 'end',
    date: string,
  ) => {
    const parsed = parseDateTime(date)
    setStagesConfig((prev) =>
      syncLegacyStageWindows({
        ...prev,
        reviewStages: (prev.reviewStages ?? []).map((stage) => {
          if (stage.id !== id) return stage
          const next = parsed ?? { date, time: stage[field]?.time ?? '00:00' }
          if (isPublishStage(id)) {
            return { ...stage, start: next, end: next }
          }
          return { ...stage, [field]: next }
        }),
      }),
    )
  }

  const replaceStagesConfig = (next: CycleStagesConfig) => {
    setStagesConfig(structuredClone(next))
  }

  const patchPolicy = (partial: Partial<ReviewPolicy>) => {
    setSettings((prev) => ({
      ...prev,
      reviewPolicy: {
        ...policy,
        ...prev.reviewPolicy,
        ...partial,
      },
    }))
  }

  const save = () => {
    if (saving) return false
    setError(null)
    const weight = pillarWeightTotal(policy)
    if (weight !== 100) {
      setError(
        `Enabled pillars must add up to 100%. They currently add up to ${weight}%. Open the review form to adjust the mix.`,
      )
      return false
    }
    try {
      setSaving(true)
      void updateCycleGroup(cycle.id, group.id, {
        settings: {
          reviewTypes: settings.reviewTypes,
          excludedEmployeeIds: settings.excludedEmployeeIds,
          autoScorecardGeneration: settings.autoScorecardGeneration,
          reviewPolicy: policy,
        },
        stagesConfig,
      })
        .catch(() => { })
        .finally(() => setSaving(false))
      if (!embedded) onClose()
      return true
    } catch (err) {
      setSaving(false)
      setError(err instanceof Error ? err.message : 'Could not save settings.')
      return false
    }
  }

  return {
    settings,
    stagesConfig,
    policy,
    error,
    setSettings,
    setStageEnabled,
    setStageDate,
    replaceStagesConfig,
    patchPolicy,
    save,
    saving,
  }
}

export function ReviewSettingsEditPage({
  cycle,
  group,
  onClose,
  embedded = false,
  draft,
  enabled = true,
  onEnabledChange,
  onSuccess,
}: ReviewSettingsEditPageProps) {
  const owned = useReviewSettingsDraft(cycle, group, onClose, embedded)
  const editor = draft ?? owned
  const {
    policy,
    stagesConfig,
    error,
    setStageEnabled,
    setStageDate,
    patchPolicy,
    save,
    saving,
  } = editor
  const [highlightedStageId, setHighlightedStageId] =
    useState<ReviewStageId | null>(null)
  const flowStages = useMemo(
    () =>
      enabledReviewStages(
        stagesConfig.reviewStages?.filter(
          (stage) => !isCalibrationStage(stage.id),
        ),
      ).filter((stage) => stage.id !== 'goals'),
    [stagesConfig.reviewStages],
  )

  useEffect(() => {
    if (!highlightedStageId) return
    const timer = window.setTimeout(() => setHighlightedStageId(null), 1800)
    return () => window.clearTimeout(timer)
  }, [highlightedStageId])

  const focusStage = (id: ReviewStageId) => {
    setHighlightedStageId(id)
    document.getElementById(stageSectionId(id))?.scrollIntoView({
      behavior: 'smooth',
      block: 'center',
    })
  }

  return (
    <EditPageShell
      title={`${group.name} · Reviews`}
      description={
        enabled
          ? 'When reviews happen, and which grades appear on the scorecard. The form opens on the left.'
          : 'Turn on Reviews to set when they happen and the form.'
      }
      onBack={onClose}
      onSave={() => {
        if (save()) onSuccess?.('Settings saved.')
      }}
      saving={saving}
      error={error}
      embedded={embedded}
      showActions={enabled}
      actionsPlacement="top"
    >
      {enabled && flowStages.length > 0 ? (
        <ol className="pd-reviews-stage-preview" aria-label="Review path">
          {flowStages.map((stage, index) => (
            <li key={stage.id} className="pd-reviews-stage-preview__item">
              <button
                type="button"
                className={`pd-reviews-stage-preview__stage${
                  highlightedStageId === stage.id ? ' is-active' : ''
                }`}
                onClick={() => focusStage(stage.id)}
              >
                {REVIEW_STAGE_LABEL[stage.id]}
              </button>
              {index < flowStages.length - 1 ? (
                <span className="pd-reviews-stage-preview__arrow" aria-hidden>
                  <ArrowRight size={13} strokeWidth={1.75} />
                </span>
              ) : null}
            </li>
          ))}
        </ol>
      ) : null}
      {onEnabledChange ? (
        <section className="pd-reviews-edit-card pd-reviews-module-enable">
          <CycleModuleField
            id="reviews"
            enabled={enabled}
            onChange={onEnabledChange}
          />
        </section>
      ) : null}
      <ModuleSettingsLock locked={!enabled} label="Review settings">
        <div className="pd-reviews-settings-edit pd-reviews-settings-edit--stacked">
          <section className="pd-reviews-edit-card">
            <header className="pd-reviews-edit-card__head">
              <CalendarRange size={16} strokeWidth={1.75} aria-hidden />
              <h3 className="pd-reviews-edit-card__title">When Reviews Happen</h3>
            </header>
            <ReviewStageList
              cycle={cycle}
              groupId={group.id}
              stageIds={REVIEW_ONLY_STAGE_ORDER}
              stagesConfig={stagesConfig}
              moduleEnabled={enabled}
              highlightedId={highlightedStageId}
              setStageEnabled={setStageEnabled}
              setStageDate={setStageDate}
            />
          </section>

          <section className="pd-reviews-edit-card">
            <div className="pd-reviews-edit-card__heading">
              <header className="pd-reviews-edit-card__head">
                <Star size={16} strokeWidth={1.75} aria-hidden />
                <h3 className="pd-reviews-edit-card__title">Grades On The Form</h3>
                <HintIcon
                  content={reviewFormSummary(policy)}
                  label="About Grades On The Form"
                />
              </header>
              <p className="pd-reviews-edit-card__lede">
                Questions and areas open on the left. These switches only show
                or hide grades on the scorecard.
              </p>
            </div>
            <ul className="pd-reviews-type-list">
              <li className="pd-reviews-type-list__item">
                <Target
                  size={16}
                  strokeWidth={1.75}
                  className="pd-reviews-type-list__icon"
                  aria-hidden
                />
                <div>
                  <p className="pd-reviews-type-list__label">Goals Grade</p>
                  <p className="pd-reviews-type-list__desc">
                    Managers pick a Goals grade on the goals card. Off keeps
                    goals as progress only.
                  </p>
                </div>
                <Switch
                  label="Enable Goals Grade"
                  className="pd-reviews-type-list__switch"
                  checked={policy.managerReview.gradeGoals}
                  onChange={(event) =>
                    patchPolicy({
                      managerReview: {
                        ...policy.managerReview,
                        gradeGoals: event.target.checked,
                      },
                    })
                  }
                />
              </li>
              <li className="pd-reviews-type-list__item">
                <LayoutGrid
                  size={16}
                  strokeWidth={1.75}
                  className="pd-reviews-type-list__icon"
                  aria-hidden
                />
                <div>
                  <p className="pd-reviews-type-list__label">Overall Grade</p>
                  <p className="pd-reviews-type-list__desc">
                    Show the overall grade grid on the scorecard. Off hides it.
                  </p>
                </div>
                <Switch
                  label="Enable Overall Grade"
                  className="pd-reviews-type-list__switch"
                  checked={policy.managerReview.gradeOverall}
                  onChange={(event) =>
                    patchPolicy({
                      managerReview: {
                        ...policy.managerReview,
                        gradeOverall: event.target.checked,
                      },
                    })
                  }
                />
              </li>
            </ul>
          </section>
        </div>
      </ModuleSettingsLock>
    </EditPageShell>
  )
}
