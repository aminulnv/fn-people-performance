import { useMemo, useState } from 'react'
import {
  BarChart3,
  ListChecks,
  SlidersHorizontal,
  ToggleLeft,
} from 'lucide-react'
import { Input, Select, Switch } from '@/components/ui'
import { normalizeCycleSettings } from '@/lib/reviews/demoData'
import { PURPOSE_HINT } from '@/lib/reviews/purpose'
import {
  describeEnabledFlow,
  REVIEW_STAGE_HINT,
  REVIEW_STAGE_LABEL,
  REVIEW_STAGE_ORDER,
  syncLegacyStageWindows,
} from '@/lib/reviews/reviewStages'
import { pillarWeightTotal, reweightEnabledPillars } from '@/lib/reviews/reviewPolicy'
import { updateCycleGroup } from '@/lib/reviews/store'
import type {
  CycleGroup,
  CycleStagesConfig,
  ReviewCycle,
  ReviewPolicy,
  ReviewStageId,
} from '@/lib/reviews/types'
import { EditPageShell } from './EditPageShell'
import { StageWindowFields } from './StageDateTable'

type ReviewSettingsEditPageProps = {
  cycle: ReviewCycle
  group: CycleGroup
  onClose: () => void
  embedded?: boolean
}

export function ReviewSettingsEditPage({
  cycle,
  group,
  onClose,
  embedded = false,
}: ReviewSettingsEditPageProps) {
  const [settings, setSettings] = useState(() =>
    normalizeCycleSettings(group.settings, cycle.purpose ?? 'quarterly_checkin'),
  )
  const [stagesConfig, setStagesConfig] = useState<CycleStagesConfig>(() =>
    structuredClone(group.stagesConfig),
  )
  const [error, setError] = useState<string | null>(null)

  const policy =
    settings.reviewPolicy ??
    normalizeCycleSettings(group.settings, cycle.purpose ?? 'quarterly_checkin')
      .reviewPolicy!
  const flow = useMemo(
    () => describeEnabledFlow(stagesConfig.reviewStages),
    [stagesConfig.reviewStages],
  )

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
    setStagesConfig((prev) =>
      syncLegacyStageWindows({
        ...prev,
        reviewStages: (prev.reviewStages ?? []).map((stage) =>
          stage.id === id
            ? {
                ...stage,
                [field]: { date, time: stage[field]?.time ?? '00:00' },
              }
            : stage,
        ),
      }),
    )
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
      setError(`Enabled pillars must add up to 100%. They currently add up to ${weight}%.`)
      return
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
      }).catch(() => {})
      if (!embedded) onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save settings.')
    }
  }

  return (
    <EditPageShell
      title={`${group.name} · Review settings`}
      description="Turn a stage off and it leaves the journey. Nothing here is locked to the 2026 annual script."
      onBack={onClose}
      onSave={save}
      error={error}
      embedded={embedded}
    >
      <div className="pd-reviews-edit__body--wide pd-reviews-edit__body--stacked">
        <section className="pd-reviews-flow">
          <p className="pd-reviews-flow__kicker">How this group runs</p>
          <p className="pd-reviews-flow__path">{flow}</p>
          <p className="pd-reviews-flow__hint">
            {PURPOSE_HINT[cycle.purpose ?? 'quarterly_checkin']}
          </p>
        </section>

        <section className="pd-reviews-edit-card">
          <header className="pd-reviews-edit-card__head">
            <ToggleLeft size={16} strokeWidth={1.75} aria-hidden />
            <h3 className="pd-reviews-edit-card__title">Stages</h3>
          </header>
          <ul className="pd-reviews-stage-list">
            {REVIEW_STAGE_ORDER.map((id) => {
              const stage = (stagesConfig.reviewStages ?? []).find((item) => item.id === id)
              if (!stage) return null
              return (
                <li key={id} className="pd-reviews-stage-list__item">
                  <div className="pd-reviews-stage-list__top">
                    <div>
                      <p className="pd-reviews-stage-list__title">
                        {REVIEW_STAGE_LABEL[id]}
                      </p>
                      <p className="pd-reviews-stage-list__hint">
                        {REVIEW_STAGE_HINT[id]}
                      </p>
                    </div>
                    <Switch
                      label={`Enable ${REVIEW_STAGE_LABEL[id]}`}
                      checked={stage.enabled}
                      onChange={(event) =>
                        setStageEnabled(id, event.target.checked)
                      }
                    />
                  </div>
                  {stage.enabled ? (
                    <StageWindowFields
                      startLabel="Opens"
                      endLabel="Closes"
                      startValue={stage.start?.date ?? cycle.startDate}
                      endValue={stage.end?.date ?? stage.start?.date ?? cycle.endDate}
                      onStartChange={(date) => setStageDate(id, 'start', date)}
                      onEndChange={(date) => setStageDate(id, 'end', date)}
                    />
                  ) : null}
                </li>
              )
            })}
          </ul>
        </section>

        <section className="pd-reviews-edit-card">
          <header className="pd-reviews-edit-card__head">
            <BarChart3 size={16} strokeWidth={1.75} aria-hidden />
            <h3 className="pd-reviews-edit-card__title">Scorecard</h3>
          </header>
          <p className="pd-reviews-flow__hint">
            Enabled pillars must total 100%. Disable Skills (or any pillar) if it
            is not ready this year.
          </p>
          <ul className="pd-reviews-pillar-list">
            {policy.scorecard.pillars.map((pillar, index) => (
              <li key={pillar.id} className="pd-reviews-pillar-list__item">
                <Switch
                  label={pillar.label}
                  checked={pillar.enabled}
                  onChange={(event) => {
                    const next = structuredClone(policy)
                    next.scorecard.pillars[index].enabled = event.target.checked
                    patchPolicy(
                      event.target.checked
                        ? next
                        : reweightEnabledPillars(next),
                    )
                  }}
                />
                <Input
                  label={`${pillar.label} weight`}
                  type="number"
                  min={0}
                  max={100}
                  value={String(pillar.weight)}
                  onChange={(event) => {
                    const next = structuredClone(policy)
                    next.scorecard.pillars[index].weight = Number(event.target.value)
                    patchPolicy(next)
                  }}
                />
              </li>
            ))}
          </ul>
        </section>

        <section className="pd-reviews-edit-card">
          <header className="pd-reviews-edit-card__head">
            <ListChecks size={16} strokeWidth={1.75} aria-hidden />
            <h3 className="pd-reviews-edit-card__title">Questions</h3>
          </header>
          <ul className="pd-reviews-question-list">
            {policy.scorecard.questions.map((question, index) => (
              <li key={question.id} className="pd-reviews-question-list__item">
                <Switch
                  label="Ask this"
                  checked={question.enabled}
                  onChange={(event) => {
                    const next = structuredClone(policy)
                    next.scorecard.questions[index].enabled = event.target.checked
                    patchPolicy(next)
                  }}
                />
                <Input
                  label="Prompt"
                  value={question.prompt}
                  onChange={(event) => {
                    const next = structuredClone(policy)
                    next.scorecard.questions[index].prompt = event.target.value
                    patchPolicy(next)
                  }}
                />
              </li>
            ))}
          </ul>
        </section>

        <section className="pd-reviews-edit-card">
          <header className="pd-reviews-edit-card__head">
            <SlidersHorizontal size={16} strokeWidth={1.75} aria-hidden />
            <h3 className="pd-reviews-edit-card__title">Rules</h3>
          </header>
          <div className="pd-reviews-policy-grid">
            <Select
              label="Self-review visibility"
              value={policy.selfReview.visibility}
              onChange={(event) =>
                patchPolicy({
                  selfReview: {
                    ...policy.selfReview,
                    visibility: event.target.value as ReviewPolicy['selfReview']['visibility'],
                  },
                })
              }
              options={[
                { value: 'blinded', label: 'Blinded until the manager submits' },
                { value: 'visible_first', label: 'Manager sees self-review first' },
                { value: 'sequential', label: 'Self-review must finish first' },
              ]}
            />
            <Select
              label="Late self-review"
              value={policy.selfReview.latePolicy}
              onChange={(event) =>
                patchPolicy({
                  selfReview: {
                    ...policy.selfReview,
                    latePolicy: event.target.value as ReviewPolicy['selfReview']['latePolicy'],
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
                { value: 'override_with_reason', label: 'Manager may override with a reason' },
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
                { value: 'override_with_reason', label: 'Confirm or override with a reason' },
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
                { value: 'manager_then_deadline', label: 'Manager releases, then deadline' },
                { value: 'immediate_on_submit', label: 'Visible when the manager submits' },
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
        </section>
      </div>
    </EditPageShell>
  )
}
