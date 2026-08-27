import { useState } from 'react'
import { ChevronDown, ChevronUp, Minus, Plus, Trash2 } from 'lucide-react'
import { Button, EmptyState, Field, Input, ListboxSelect, Switch } from '@/components/ui'
import {
  clampPillarWeight,
  pillarWeightTotal,
  remainingPillarWeight,
  reweightEnabledPillars,
} from '@/lib/reviews/reviewPolicy'
import { BufferedWeightInput } from '@/pages/goals/GoalMeasurementReadout'
import {
  addCustomPillar,
  addReviewQuestion,
  applyScorecardTemplate,
  moveReviewQuestion,
  QUESTION_VISIBILITY,
  removeCustomPillar,
  removeReviewQuestion,
  SCORECARD_LIBRARY_TEMPLATES,
  toggleQuestionVisibility,
  updateReviewQuestion,
  updateScorecardPillar,
  type ScorecardTemplateId,
} from '@/lib/reviews/scorecardTemplates'
import type { ReviewPolicy, ReviewQuestion, ReviewQuestionVisibility } from '@/lib/reviews/types'

type ScorecardFormEditorProps = {
  policy: ReviewPolicy
  onChange: (next: ReviewPolicy) => void
}

const WEIGHT_STEP = 5

function clampWeight(value: number, max = 100) {
  return Math.min(max, Math.max(0, value))
}

function PillarWeightField({
  label,
  weight,
  max,
  onChange,
}: {
  label: string
  weight: number
  max: number
  onChange: (weight: number) => void
}) {
  const ceiling = Math.min(100, max)
  return (
    <div className="pd-reviews-weight">
      <p className="pd-reviews-weight__label">Weight</p>
      <div className="pd-reviews-weight__stepper">
        <button
          type="button"
          className="pd-reviews-weight__step"
          aria-label={`Decrease weight for ${label}`}
          disabled={weight <= 0}
          onClick={() => onChange(clampWeight(weight - WEIGHT_STEP, ceiling))}
        >
          <Minus size={14} strokeWidth={2.25} aria-hidden />
        </button>
        <div className="pd-reviews-weight__edit">
          <BufferedWeightInput
            weight={weight}
            ariaLabel={`Weight for ${label}`}
            className="pd-reviews-weight__input"
            maxWeight={ceiling}
            onChange={(next) => onChange(clampWeight(next, ceiling))}
          />
          <span className="pd-reviews-weight__suffix" aria-hidden>
            %
          </span>
        </div>
        <button
          type="button"
          className="pd-reviews-weight__step"
          aria-label={`Increase weight for ${label}`}
          disabled={weight >= ceiling}
          onClick={() => onChange(clampWeight(weight + WEIGHT_STEP, ceiling))}
        >
          <Plus size={14} strokeWidth={2.25} aria-hidden />
        </button>
      </div>
    </div>
  )
}

const SHOWN_ON: Record<ReviewQuestionVisibility, string> = {
  employee: 'Self-Review',
  manager: 'Manager Review',
  calibrators: 'Calibration',
}

export function ScorecardFormEditor({
  policy,
  onChange,
}: ScorecardFormEditorProps) {
  const [templateId, setTemplateId] = useState<ScorecardTemplateId>(() =>
    policy.scorecard.questions.length === 0 ? 'blank' : 'annual',
  )
  const [customLabel, setCustomLabel] = useState('')
  const weight = pillarWeightTotal(policy)
  const onForm = policy.scorecard.questions.filter((question) => question.enabled)
  const offForm = policy.scorecard.questions.filter((question) => !question.enabled)

  return (
    <div className="pd-reviews-form">
      <section className="pd-reviews-form__library">
        <Field label="Preset" htmlFor="review-form-preset">
          <ListboxSelect
            id="review-form-preset"
            aria-label="Preset"
            allowEmpty={false}
            value={templateId}
            onValueChange={(next) =>
              setTemplateId(next as ScorecardTemplateId)
            }
            options={SCORECARD_LIBRARY_TEMPLATES.map((item) => ({
              value: item.id,
              label: item.name,
              description: item.hint,
              className:
                item.id === 'blank' ? 'pd-reviews-form__create-option' : undefined,
              leading:
                item.id === 'blank' ? (
                  <span className="pd-reviews-form__create-icon" aria-hidden>
                    <Plus size={12} strokeWidth={2.5} />
                  </span>
                ) : undefined,
            }))}
          />
        </Field>
        <Button
          variant="secondary"
          size="sm"
          pill
          onClick={() => onChange(applyScorecardTemplate(policy, templateId))}
        >
          {templateId === 'blank' ? 'Create' : 'Use'}
        </Button>
      </section>

      <section className="pd-reviews-group-form__block">
        <div className="pd-reviews-form__section-head">
          <h3 className="pd-field__label">What We Grade</h3>
          {weight !== 100 ? (
            <p className="pd-reviews-form__weight">{weight}% of 100%</p>
          ) : null}
        </div>
        <ul className="pd-reviews-pillar-list">
          {policy.scorecard.pillars.map((item) => (
            <li key={item.id} className="pd-reviews-pillar-list__item">
              <div className="pd-reviews-stage-list__row">
                <Switch
                  label={item.label}
                  className="pd-reviews-type-list__switch"
                  checked={item.enabled}
                  onChange={(event) => {
                    const next = updateScorecardPillar(policy, item.id, {
                      enabled: event.target.checked,
                      weight: event.target.checked
                        ? clampPillarWeight(policy, item.id, item.weight)
                        : item.weight,
                    })
                    onChange(
                      event.target.checked
                        ? next
                        : reweightEnabledPillars(next),
                    )
                  }}
                />
                {item.kind === 'custom' ? (
                  <Input
                    label="Area name"
                    value={item.label}
                    onChange={(event) =>
                      onChange(
                        updateScorecardPillar(policy, item.id, {
                          label: event.target.value,
                        }),
                      )
                    }
                  />
                ) : (
                  <p className="pd-reviews-stage-list__title">{item.label}</p>
                )}
              </div>
              <div className="pd-reviews-form__pillar-tools">
                <PillarWeightField
                  label={item.label}
                  weight={item.weight}
                  max={remainingPillarWeight(policy, item.id)}
                  onChange={(nextWeight) =>
                    onChange(
                      updateScorecardPillar(policy, item.id, {
                        weight: clampPillarWeight(policy, item.id, nextWeight),
                      }),
                    )
                  }
                />
                {item.kind === 'custom' ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    pill
                    aria-label={`Remove ${item.label}`}
                    onClick={() => onChange(removeCustomPillar(policy, item.id))}
                  >
                    <Trash2 size={14} strokeWidth={2} aria-hidden />
                  </Button>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
        <div className="pd-reviews-form__add-row">
          <Input
            label="Custom area"
            value={customLabel}
            onChange={(event) => setCustomLabel(event.target.value)}
            placeholder="e.g. Client impact"
          />
          <Button
            variant="secondary"
            size="sm"
            pill
            disabled={!customLabel.trim()}
            onClick={() => {
              onChange(addCustomPillar(policy, customLabel))
              setCustomLabel('')
            }}
          >
            <Plus size={14} strokeWidth={2} aria-hidden />
            Add Area
          </Button>
        </div>
      </section>

      <section className="pd-reviews-group-form__block">
        <h3 className="pd-field__label">Questions</h3>

        {onForm.length === 0 ? (
          <EmptyState
            className="pd-reviews-form-preview__empty"
            title="No Questions Yet"
            description="Create one for this form, or use a preset above."
            action={
              <Button
                variant="primary"
                size="sm"
                pill
                onClick={() => onChange(addReviewQuestion(policy))}
              >
                <Plus size={14} strokeWidth={2} aria-hidden />
                Create Question
              </Button>
            }
          />
        ) : (
          <ol className="pd-reviews-form-preview">
            {onForm.map((question) => (
              <FormQuestionCard
                key={question.id}
                question={question}
                index={policy.scorecard.questions.indexOf(question)}
                total={policy.scorecard.questions.length}
                policy={policy}
                onChange={onChange}
              />
            ))}
          </ol>
        )}

        {onForm.length > 0 ? (
          <Button
            variant="secondary"
            size="sm"
            pill
            onClick={() => onChange(addReviewQuestion(policy))}
          >
            <Plus size={14} strokeWidth={2} aria-hidden />
            Add Question
          </Button>
        ) : null}

        {offForm.length > 0 ? (
          <details className="pd-cycle-setup__more">
            <summary>Off the form ({offForm.length})</summary>
            <ul className="pd-reviews-form-preview__aside">
              {offForm.map((question) => (
                <li key={question.id}>
                  <p>{question.prompt || 'Untitled question'}</p>
                  <Button
                    variant="ghost"
                    size="sm"
                    pill
                    onClick={() =>
                      onChange(
                        updateReviewQuestion(policy, question.id, {
                          enabled: true,
                        }),
                      )
                    }
                  >
                    Put On The Form
                  </Button>
                </li>
              ))}
            </ul>
          </details>
        ) : null}
      </section>
    </div>
  )
}

function FormQuestionCard({
  question,
  index,
  total,
  policy,
  onChange,
}: {
  question: ReviewQuestion
  index: number
  total: number
  policy: ReviewPolicy
  onChange: (next: ReviewPolicy) => void
}) {
  const number = index + 1
  return (
    <li className="pd-reviews-form-preview__item">
      <div className="pd-field">
        <div className="pd-reviews-form-preview__prompt-row">
          <input
            className="pd-reviews-form-preview__prompt"
            aria-label={`Question ${number} prompt`}
            value={question.prompt}
            placeholder="Write the question people will see"
            onChange={(event) =>
              onChange(
                updateReviewQuestion(policy, question.id, {
                  prompt: event.target.value,
                }),
              )
            }
          />
          {question.required ? (
            <span className="pd-reviews-form-preview__required">Required</span>
          ) : null}
        </div>
        <textarea
          className="pd-field__control"
          rows={3}
          disabled
          tabIndex={-1}
          placeholder="People write their answer here"
          aria-label={`Question ${number} answer preview`}
        />
      </div>

      <div className="pd-reviews-form-preview__tools">
        <div className="pd-reviews-form-preview__shown" role="group" aria-label="Shown on">
          <span className="pd-reviews-form-preview__shown-label">Shown on</span>
          {QUESTION_VISIBILITY.map((option) => {
            const on = question.visibility.includes(option.id)
            return (
              <button
                key={option.id}
                type="button"
                className={
                  on
                    ? 'pd-reviews-form-preview__chip is-on'
                    : 'pd-reviews-form-preview__chip'
                }
                aria-pressed={on}
                title={option.hint}
                onClick={() =>
                  onChange(
                    toggleQuestionVisibility(
                      policy,
                      question.id,
                      option.id,
                      !on,
                    ),
                  )
                }
              >
                {SHOWN_ON[option.id]}
              </button>
            )
          })}
        </div>
        <button
          type="button"
          className={
            question.required
              ? 'pd-reviews-form-preview__chip is-on'
              : 'pd-reviews-form-preview__chip'
          }
          aria-pressed={question.required}
          onClick={() =>
            onChange(
              updateReviewQuestion(policy, question.id, {
                required: !question.required,
              }),
            )
          }
        >
          Required
        </button>
        <Button
          variant="ghost"
          size="sm"
          pill
          onClick={() =>
            onChange(
              updateReviewQuestion(policy, question.id, { enabled: false }),
            )
          }
        >
          Hide
        </Button>
        <div className="pd-reviews-form-preview__reorder">
          <Button
            variant="ghost"
            size="sm"
            pill
            aria-label={`Move question ${number} up`}
            disabled={index === 0}
            onClick={() => onChange(moveReviewQuestion(policy, question.id, -1))}
          >
            <ChevronUp size={14} strokeWidth={2} aria-hidden />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            pill
            aria-label={`Move question ${number} down`}
            disabled={index === total - 1}
            onClick={() => onChange(moveReviewQuestion(policy, question.id, 1))}
          >
            <ChevronDown size={14} strokeWidth={2} aria-hidden />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            pill
            aria-label={`Remove question ${number}`}
            onClick={() => onChange(removeReviewQuestion(policy, question.id))}
          >
            <Trash2 size={14} strokeWidth={2} aria-hidden />
          </Button>
        </div>
      </div>
    </li>
  )
}
