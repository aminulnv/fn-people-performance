import { useEffect, useMemo, useState, type Dispatch, type SetStateAction } from 'react'
import {
  ArrowRight,
  ChevronDown,
  ClipboardList,
  LayoutGrid,
  SlidersHorizontal,
  Star,
  Target,
} from 'lucide-react'
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
import { ModuleSettingsLock } from './CycleModulesFields'
import { EditPageShell } from './EditPageShell'
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
    settings,
    policy,
    stagesConfig,
    error,
    setSettings,
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
  const [advancedOpen, setAdvancedOpen] = useState(false)

  useEffect(() => {
    if (!highlightedStageId) return
    const timer = window.setTimeout(() => setHighlightedStageId(null), 1800)
    return () => window.clearTimeout(timer)
  }, [highlightedStageId])

  const focusStage = (id: ReviewStageId) => {
    setHighlightedStageId(id)
    window.setTimeout(() => {
      document.getElementById(stageSectionId(id))?.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      })
    }, 40)
  }

  const stageListProps = {
    cycle,
    groupId: group.id,
    stagesConfig,
    moduleEnabled: enabled,
    highlightedId: highlightedStageId,
    setStageEnabled,
    setStageDate,
    excludedEmployeeIds: settings.excludedEmployeeIds,
    onExcludedEmployeeIdsChange: (excludedEmployeeIds: number[]) =>
      setSettings((current) => ({
        ...current,
        excludedEmployeeIds,
      })),
  }

  return (
    <EditPageShell
      title={`${group.name} · Reviews`}
      description={
        enabled
          ? 'Stages follow the review journey. Form grades are under Advanced.'
          : 'Turn on Reviews to configure the path and form.'
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
        <ol
          className="pd-reviews-stage-preview pd-reviews-stage-preview--above"
          aria-label="Review path"
        >
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
                <span
                  className="pd-reviews-stage-preview__arrow"
                  aria-hidden
                >
                  <ArrowRight size={13} strokeWidth={1.75} />
                </span>
              ) : null}
            </li>
          ))}
        </ol>
      ) : null}

      <div className="pd-settings-stack">
        {onEnabledChange ? (
          <div className="pd-settings-stack__row pd-settings-stack__row--master">
            <div className="pd-settings-stack__copy">
              <p className="pd-settings-stack__label">
                <ClipboardList size={15} strokeWidth={1.75} aria-hidden />
                Reviews
              </p>
            </div>
            <Switch
              label="Enable Reviews"
              className="pd-reviews-type-list__switch"
              checked={enabled}
              onChange={(event) => onEnabledChange(event.target.checked)}
            />
          </div>
        ) : null}

        <ModuleSettingsLock locked={!enabled} label="Review settings">
          <section className="pd-settings-stack__block pd-settings-stack__block--flush">
            <ReviewStageList
              {...stageListProps}
              stageIds={REVIEW_ONLY_STAGE_ORDER}
            />
          </section>

          <div className="pd-settings-stack__advanced">
            <button
              type="button"
              className="pd-settings-stack__advanced-toggle"
              aria-expanded={advancedOpen}
              onClick={() => setAdvancedOpen((open) => !open)}
            >
              <span className="pd-settings-stack__advanced-copy">
                <span className="pd-settings-stack__advanced-label">
                  <SlidersHorizontal size={15} strokeWidth={1.75} aria-hidden />
                  Advanced
                </span>
                {!advancedOpen ? (
                  <span className="pd-settings-stack__advanced-summary">
                    Grades On The Form
                  </span>
                ) : null}
              </span>
              <ChevronDown
                size={16}
                strokeWidth={2}
                className={
                  advancedOpen
                    ? 'pd-settings-stack__chevron is-open'
                    : 'pd-settings-stack__chevron'
                }
                aria-hidden
              />
            </button>

            {advancedOpen ? (
              <div className="pd-settings-stack__advanced-body">
                <section className="pd-settings-stack__block pd-settings-stack__block--flush">
                  <div className="pd-settings-stack__block-head">
                    <h3 className="pd-settings-stack__eyebrow">
                      <Star size={14} strokeWidth={1.75} aria-hidden />
                      Grades On The Form
                    </h3>
                  </div>

                  <div className="pd-settings-stack__row pd-settings-stack__row--compact">
                    <p className="pd-settings-stack__label">
                      <Target size={15} strokeWidth={1.75} aria-hidden />
                      Goals Grade
                    </p>
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
                  </div>

                  <div className="pd-settings-stack__row pd-settings-stack__row--compact">
                    <p className="pd-settings-stack__label">
                      <LayoutGrid size={15} strokeWidth={1.75} aria-hidden />
                      Overall Grade
                    </p>
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
                  </div>
                </section>
              </div>
            ) : null}
          </div>
        </ModuleSettingsLock>
      </div>
    </EditPageShell>
  )
}
