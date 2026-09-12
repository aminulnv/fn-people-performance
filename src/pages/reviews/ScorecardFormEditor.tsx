import { useEffect, useId, useRef, useState } from 'react'
import { ChevronDown, ChevronUp, Plus, Settings2, Trash2 } from 'lucide-react'
import { Button, EmptyState, Field, Input, ListboxSelect, Switch } from '@/components/ui'
import {
  clampPillarWeight,
  pillarWeightTotal,
  remainingPillarWeight,
  reweightEnabledPillars,
} from '@/lib/reviews/reviewPolicy'
import { WeightHoverField } from '@/pages/goals/GoalMeasurementReadout'
import { OverallGradePicker } from '@/pages/reviews/OverallGradePicker'
import { GRADE_LISTBOX_OPTIONS } from '@/pages/reviews/ScorecardGoalsCard'
import {
  addCustomPillar,
  addReviewQuestion,
  applyScorecardTemplate,
  moveReviewQuestion,
  QUESTION_VISIBILITY,
  removeScorecardPillar,
  removeReviewQuestion,
  SCORECARD_LIBRARY_TEMPLATES,
  toggleQuestionOutputVisibility,
  toggleQuestionVisibility,
  updateReviewQuestion,
  updateScorecardPillar,
  type ScorecardTemplateId,
} from '@/lib/reviews/scorecardTemplates'
import type {
  ReviewPolicy,
  ReviewQuestion,
  ReviewQuestionOutputVisibility,
  ReviewQuestionVisibility,
} from '@/lib/reviews/types'

type ScorecardFormEditorProps = {
  policy: ReviewPolicy
  onChange: (next: ReviewPolicy) => void
}

const SHOWN_ON: Record<ReviewQuestionVisibility, string> = {
  employee: 'Self-Review',
  manager: 'Manager Review',
  calibrators: 'Calibration',
}

const OUTPUT_AUDIENCES: Array<{
  id: ReviewQuestionOutputVisibility
  label: string
}> = [
  { id: 'employee', label: 'Employee' },
  { id: 'manager', label: 'Manager' },
]

type SelectedQuestionId = string | null

export function ScorecardFormEditor({
  policy,
  onChange,
}: ScorecardFormEditorProps) {
  const [templateId, setTemplateId] = useState<ScorecardTemplateId>(() =>
    policy.scorecard.questions.length === 0 ? 'blank' : 'annual',
  )
  const [selectedQuestionId, setSelectedQuestionId] =
    useState<SelectedQuestionId>(null)
  const [focusPillarId, setFocusPillarId] = useState<string | null>(null)
  const [modifyingPillars, setModifyingPillars] = useState(false)
  const formRef = useRef<HTMLDivElement>(null)
  const weight = pillarWeightTotal(policy)
  const onForm = policy.scorecard.questions.filter((question) => question.enabled)
  const offForm = policy.scorecard.questions.filter((question) => !question.enabled)
  const showOverall = policy.managerReview.gradeOverall

  useEffect(() => {
    if (!selectedQuestionId) return
    const onPointerDown = (event: PointerEvent) => {
      const root = formRef.current
      if (!root) return
      if (event.target instanceof Node && root.contains(event.target)) return
      setSelectedQuestionId(null)
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [selectedQuestionId])

  return (
    <div ref={formRef} className="pd-reviews-form">
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

      <section className="pd-reviews-form__page" aria-label="Review form preview">
        {policy.scorecard.pillars.length > 0 || showOverall ? (
          <section className="pd-reviews-form__grade-panel" aria-label="Grade areas">
            <div className="pd-reviews-form__grade-head">
              <h3 className="pd-field__label">Grade Areas</h3>
              <div className="pd-reviews-form__section-actions">
                {weight !== 100 ? (
                  <p className="pd-reviews-form__weight">{weight}% of 100%</p>
                ) : null}
                <Button
                  variant="ghost"
                  size="sm"
                  pill
                  onClick={() => setModifyingPillars((open) => !open)}
                >
                  {modifyingPillars ? 'Done' : 'Modify'}
                </Button>
              </div>
            </div>

            <div className="pd-people__panel pd-people__panel--table pd-reviews-form__grade-table-panel">
              <div className="pd-people__table-wrap">
                <table
                  className="pd-people__table pd-reviews-form__grade-table"
                  aria-label="Grade areas"
                >
                  <thead>
                    <tr>
                      <th scope="col">Area</th>
                      <th
                        scope="col"
                        className="pd-reviews-form__grade-weight-col"
                      >
                        Weight %
                      </th>
                      <th scope="col">Grade</th>
                      {modifyingPillars ? (
                        <th scope="col">
                          <span className="pd-reviews-form-preview__sr">
                            Actions
                          </span>
                        </th>
                      ) : null}
                    </tr>
                  </thead>
                  <tbody>
                    {policy.scorecard.pillars.map((item) => (
                      <tr
                        key={item.id}
                        className={item.enabled ? undefined : 'is-off'}
                      >
                        <td>
                          <div className="pd-reviews-form__grade-area">
                            <Switch
                              label={item.label}
                              className="pd-reviews-type-list__switch"
                              checked={item.enabled}
                              onChange={(event) => {
                                const next = updateScorecardPillar(
                                  policy,
                                  item.id,
                                  {
                                    enabled: event.target.checked,
                                    weight: event.target.checked
                                      ? clampPillarWeight(
                                          policy,
                                          item.id,
                                          item.weight,
                                        )
                                      : item.weight,
                                  },
                                )
                                onChange(
                                  event.target.checked
                                    ? next
                                    : reweightEnabledPillars(next),
                                )
                              }}
                            />
                            {modifyingPillars ? (
                              <Input
                                aria-label="Area name"
                                className="pd-reviews-pillar-list__name-field"
                                value={item.label}
                                placeholder="Area name"
                                autoFocus={focusPillarId === item.id}
                                onFocus={() => setFocusPillarId(null)}
                                onChange={(event) =>
                                  onChange(
                                    updateScorecardPillar(policy, item.id, {
                                      label: event.target.value,
                                    }),
                                  )
                                }
                              />
                            ) : (
                              <span className="pd-reviews-form__grade-area-name">
                                {item.label || 'Custom area'}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="pd-reviews-form__grade-weight-col">
                          {item.enabled ? (
                            <WeightHoverField
                              weight={item.weight}
                              ariaLabel={`weight for ${item.label || 'Custom area'}`}
                              maxWeight={remainingPillarWeight(
                                policy,
                                item.id,
                              )}
                              showSuffix={false}
                              onChange={(nextWeight) =>
                                onChange(
                                  updateScorecardPillar(policy, item.id, {
                                    weight: clampPillarWeight(
                                      policy,
                                      item.id,
                                      nextWeight,
                                    ),
                                  }),
                                )
                              }
                            />
                          ) : (
                            <span className="pd-reviews-pillar-list__off">
                              Off
                            </span>
                          )}
                        </td>
                        <td>
                          {item.enabled ? (
                            <ListboxSelect
                              className="pd-reviews-scorecard__grade-select pd-reviews-form__grade-select"
                              id={`form-preview-grade-${item.id}`}
                              aria-label={`${item.label} grade preview`}
                              value=""
                              disabled
                              allowEmpty
                              placeholder="Select a grade"
                              emptyLabel="Select a grade"
                              onValueChange={() => undefined}
                              options={GRADE_LISTBOX_OPTIONS}
                            />
                          ) : (
                            <span className="pd-reviews-pillar-list__off">
                              —
                            </span>
                          )}
                        </td>
                        {modifyingPillars ? (
                          <td className="pd-reviews-form__grade-action-col">
                            <Button
                              variant="ghost"
                              size="sm"
                              pill
                              className="pd-reviews-pillar-list__remove"
                              aria-label={`Remove ${item.label || 'grading area'}`}
                              onClick={() =>
                                onChange(
                                  removeScorecardPillar(policy, item.id),
                                )
                              }
                            >
                              <Trash2
                                size={14}
                                strokeWidth={2}
                                aria-hidden
                              />
                            </Button>
                          </td>
                        ) : null}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {modifyingPillars ? (
                <div className="pd-reviews-form__grade-footer">
                  <Button
                    variant="ghost"
                    size="sm"
                    pill
                    onClick={() => {
                      const next = addCustomPillar(policy)
                      const created = next.scorecard.pillars.at(-1)
                      onChange(next)
                      if (created) setFocusPillarId(created.id)
                    }}
                  >
                    <Plus size={14} strokeWidth={2} aria-hidden />
                    Add
                  </Button>
                </div>
              ) : null}
            </div>
            {showOverall ? (
              <div className="pd-reviews-form__grade-overall">
                <OverallGradePicker
                  name="form-preview-overall"
                  value=""
                  disabled
                />
              </div>
            ) : null}
          </section>
        ) : null}

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
            {onForm.map((question) => {
              const index = policy.scorecard.questions.indexOf(question)
              return (
                <FormQuestionCard
                  key={question.id}
                  question={question}
                  index={index}
                  total={policy.scorecard.questions.length}
                  policy={policy}
                  selected={selectedQuestionId === question.id}
                  onToggleSettings={() =>
                    setSelectedQuestionId((current) =>
                      current === question.id ? null : question.id,
                    )
                  }
                  onChange={onChange}
                />
              )
            })}
          </ol>
        )}

        {onForm.length > 0 ? (
          <Button
            variant="secondary"
            size="sm"
            pill
            onClick={() => {
              const next = addReviewQuestion(policy)
              onChange(next)
              const created = next.scorecard.questions.at(-1)
              if (created) setSelectedQuestionId(created.id)
            }}
          >
            <Plus size={14} strokeWidth={2} aria-hidden />
            Add Question
          </Button>
        ) : null}
      </section>

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
    </div>
  )
}

function FormQuestionCard({
  question,
  index,
  total,
  policy,
  selected,
  onToggleSettings,
  onChange,
}: {
  question: ReviewQuestion
  index: number
  total: number
  policy: ReviewPolicy
  selected: boolean
  onToggleSettings: () => void
  onChange: (next: ReviewPolicy) => void
}) {
  const number = index + 1
  const promptId = useId()
  return (
    <li
      className={
        selected
          ? 'pd-reviews-form-preview__item is-selected'
          : 'pd-reviews-form-preview__item'
      }
    >
      <div className="pd-reviews-form-preview__prompt-row">
        <label className="pd-reviews-form-preview__sr" htmlFor={promptId}>
          Question {number} prompt
        </label>
        <div className="pd-reviews-form-preview__prompt-main">
          <input
            id={promptId}
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
            <span className="pd-reviews-form-preview__required" aria-label="Required">
              *
            </span>
          ) : null}
        </div>
        <button
          type="button"
          className={
            selected
              ? 'pd-reviews-form-preview__settings is-on'
              : 'pd-reviews-form-preview__settings'
          }
          aria-label={`Question ${number} settings`}
          aria-pressed={selected}
          title="Question settings"
          onClick={onToggleSettings}
        >
          <Settings2 size={15} strokeWidth={2} aria-hidden />
        </button>
      </div>
      <textarea
        className="pd-field__control"
        rows={3}
        disabled
        tabIndex={-1}
        aria-label={`Question ${number} answer preview`}
      />

      {selected ? (
        <div className="pd-reviews-form-preview__tools">
          <div className="pd-reviews-form-preview__shown" role="group" aria-label="Input stages">
            <span className="pd-reviews-form-preview__shown-label">Input</span>
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
          <div className="pd-reviews-form-preview__shown" role="group" aria-label="Output audience">
            <span className="pd-reviews-form-preview__shown-label">Output</span>
            {OUTPUT_AUDIENCES.map((option) => {
              const on = (question.outputVisibility ?? ['employee', 'manager']).includes(
                option.id,
              )
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
                  onClick={() =>
                    onChange(
                      toggleQuestionOutputVisibility(
                        policy,
                        question.id,
                        option.id,
                        !on,
                      ),
                    )
                  }
                >
                  {option.label}
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
      ) : null}
    </li>
  )
}
