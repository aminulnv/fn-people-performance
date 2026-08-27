import { useMemo, useState, type Dispatch, type SetStateAction } from 'react'
import { Select, Switch } from '@/components/ui'
import { parseDateTime } from '@/lib/dates/timestamp'
import { toUtcIso } from '@/lib/dates/timezone'
import { normalizeCycleSettings } from '@/lib/reviews/demoData'
import { cyclePurposeOf } from '@/lib/reviews/purpose'
import {
  describeEnabledFlow,
  isCyclePublishStage,
  REVIEW_FLOW_STAGE_ORDER,
  REVIEW_STAGE_HINT,
  REVIEW_STAGE_LABEL,
  syncLegacyStageWindows,
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
import { reviewFormSummary } from './ReviewFormSheet'
import { StageWindowFields } from './StageDateTable'

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
    structuredClone(group.stagesConfig),
  )
  const [error, setError] = useState<string | null>(null)

  const policy =
    settings.reviewPolicy ??
    normalizeCycleSettings(group.settings, cyclePurposeOf(cycle))
      .reviewPolicy!

  const setStageEnabled = (id: ReviewStageId, enabled: boolean) => {
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
        reviewStages: (prev.reviewStages ?? []).map((stage) =>
          stage.id === id
            ? {
              ...stage,
              [field]: parsed ?? { date, time: stage[field]?.time ?? '00:00' },
            }
            : stage,
        ),
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
    setError(null)
    const weight = pillarWeightTotal(policy)
    if (weight !== 100) {
      setError(
        `Enabled pillars must add up to 100%. They currently add up to ${weight}%. Open the review form to adjust the mix.`,
      )
      return false
    }
    try {
      void updateCycleGroup(cycle.id, group.id, {
        settings: {
          reviewTypes: settings.reviewTypes,
          excludedEmployeeIds: settings.excludedEmployeeIds,
          autoScorecardGeneration: settings.autoScorecardGeneration,
          reviewPolicy: policy,
        },
        stagesConfig,
      }).catch(() => { })
      if (!embedded) onClose()
      return true
    } catch (err) {
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
  } = editor
  const flow = useMemo(
    () => describeEnabledFlow(stagesConfig.reviewStages),
    [stagesConfig.reviewStages],
  )

  return (
    <EditPageShell
      title={`${group.name} · Reviews`}
      description={
        enabled
          ? 'When reviews happen, and extra rules. The form opens on the left.'
          : 'Turn on Reviews to set when they happen and the form.'
      }
      onBack={onClose}
      onSave={() => {
        if (save()) onSuccess?.('Settings saved.')
      }}
      error={error}
      embedded={embedded}
      showActions={enabled}
      actionsPlacement={embedded ? 'bottom' : 'top'}
    >
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
        <div className="pd-reviews-group-form">
          <section className="pd-reviews-flow">
            <p className="pd-reviews-flow__path">{flow}</p>
          </section>

          <section className="pd-reviews-group-form__block">
            <h3 className="pd-field__label">When reviews happen</h3>
            <ul className="pd-reviews-stage-list">
              {REVIEW_FLOW_STAGE_ORDER.map((id) => {
                const stage = (stagesConfig.reviewStages ?? []).find(
                  (item) => item.id === id,
                )
                if (!stage) return null
                return (
                  <li key={id} className="pd-reviews-stage-list__item">
                    <div className="pd-reviews-stage-list__row">
                      <Switch
                        label={`Enable ${REVIEW_STAGE_LABEL[id]}`}
                        className="pd-reviews-type-list__switch"
                        checked={stage.enabled}
                        onChange={(event) =>
                          setStageEnabled(id, event.target.checked)
                        }
                      />
                      <div className="pd-reviews-stage-list__copy">
                        <p className="pd-reviews-stage-list__title">
                          {REVIEW_STAGE_LABEL[id]}
                        </p>
                        <p className="pd-reviews-stage-list__hint">
                          {REVIEW_STAGE_HINT[id]}
                        </p>
                      </div>
                    </div>
                    {isCyclePublishStage(id) ? null : stage.enabled ||
                      !enabled ? (
                      <div className="pd-reviews-stage-list__window">
                        <StageWindowFields
                          startLabel="Opens"
                          endLabel="Closes"
                          startValue={toUtcIso(
                            stage.start ?? {
                              date: cycle.startDate,
                              time: '00:00',
                            },
                          )}
                          endValue={toUtcIso(
                            stage.end ??
                              stage.start ?? {
                                date: cycle.endDate,
                                time: '00:00',
                              },
                          )}
                          onStartChange={(date) => setStageDate(id, 'start', date)}
                          onEndChange={(date) => setStageDate(id, 'end', date)}
                        />
                      </div>
                    ) : null}
                  </li>
                )
              })}
            </ul>
          </section>

          <section className="pd-reviews-group-form__block">
            <h3 className="pd-field__label">Form people fill in</h3>
            <p className="pd-reviews-flow__hint">{reviewFormSummary(policy)}</p>
            <ul className="pd-reviews-stage-list">
              <li className="pd-reviews-stage-list__item">
                <div className="pd-reviews-stage-list__row">
                  <Switch
                    label="Enable Goals grade"
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
                  <div className="pd-reviews-stage-list__copy">
                    <p className="pd-reviews-stage-list__title">Goals grade</p>
                    <p className="pd-reviews-stage-list__hint">
                      Managers pick a Goals grade on the goals card. Off keeps
                      goals as progress only.
                    </p>
                  </div>
                </div>
              </li>
              <li className="pd-reviews-stage-list__item">
                <div className="pd-reviews-stage-list__row">
                  <Switch
                    label="Enable Overall grade"
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
                  <div className="pd-reviews-stage-list__copy">
                    <p className="pd-reviews-stage-list__title">Overall grade</p>
                    <p className="pd-reviews-stage-list__hint">
                      Show the overall grade grid on the scorecard. Off hides
                      it.
                    </p>
                  </div>
                </div>
              </li>
            </ul>
          </section>

          <details className="pd-cycle-setup__more">
            <summary>More review rules</summary>
            <div className="pd-reviews-policy-grid">
              <Select
                label="Self-review visibility"
                value={policy.selfReview.visibility}
                onChange={(event) =>
                  patchPolicy({
                    selfReview: {
                      ...policy.selfReview,
                      visibility: event.target
                        .value as ReviewPolicy['selfReview']['visibility'],
                    },
                  })
                }
                options={[
                  { value: 'visible_first', label: 'Manager sees self-review first' },
                  { value: 'sequential', label: 'Self-review must finish first' },
                  { value: 'blinded', label: 'Blinded until the manager submits' },
                ]}
              />
              <Select
                label="Late self-review"
                value={policy.selfReview.latePolicy}
                onChange={(event) =>
                  patchPolicy({
                    selfReview: {
                      ...policy.selfReview,
                      latePolicy: event.target
                        .value as ReviewPolicy['selfReview']['latePolicy'],
                    },
                  })
                }
                options={[
                  { value: 'proceed', label: 'Manager proceeds without it' },
                  { value: 'block', label: 'Block manager until it is in' },
                  { value: 'ptr_unblock', label: 'PTR unblocks case by case' },
                ]}
              />
              <Select
                label="Goals score"
                value={policy.managerReview.goalsScoreEdit}
                onChange={(event) =>
                  patchPolicy({
                    managerReview: {
                      ...policy.managerReview,
                      goalsScoreEdit: event.target
                        .value as ReviewPolicy['managerReview']['goalsScoreEdit'],
                    },
                  })
                }
                options={[
                  { value: 'read_only', label: 'Read only — system average' },
                  {
                    value: 'override_with_reason',
                    label: 'Manager may override with a reason',
                  },
                ]}
              />
              <Select
                label="Final grade"
                value={policy.managerReview.finalGradeEdit}
                onChange={(event) =>
                  patchPolicy({
                    managerReview: {
                      ...policy.managerReview,
                      finalGradeEdit: event.target
                        .value as ReviewPolicy['managerReview']['finalGradeEdit'],
                    },
                  })
                }
                options={[
                  {
                    value: 'override_with_reason',
                    label: 'Confirm or override with a reason',
                  },
                  { value: 'confirm_only', label: 'Confirm the calculated grade only' },
                ]}
              />
              <Select
                label="Release"
                value={policy.release.mode}
                onChange={(event) =>
                  patchPolicy({
                    release: {
                      ...policy.release,
                      mode: event.target.value as ReviewPolicy['release']['mode'],
                    },
                  })
                }
                options={[
                  { value: 'window_then_auto', label: 'Window, then auto-release' },
                  { value: 'batch_ptr', label: 'PTR releases everyone at once' },
                  {
                    value: 'manager_then_deadline',
                    label: 'Manager releases, then deadline',
                  },
                  {
                    value: 'immediate_on_submit',
                    label: 'Visible when the manager submits',
                  },
                ]}
              />
              <Select
                label="Appeal"
                value={policy.appeal.mode}
                onChange={(event) =>
                  patchPolicy({
                    appeal: {
                      ...policy.appeal,
                      mode: event.target.value as ReviewPolicy['appeal']['mode'],
                    },
                  })
                }
                options={[
                  { value: 'record_only', label: 'Written record only' },
                  { value: 'can_change_with_ptr', label: 'PTR may change the grade' },
                ]}
              />
            </div>
          </details>
        </div>
      </ModuleSettingsLock>
    </EditPageShell>
  )
}
