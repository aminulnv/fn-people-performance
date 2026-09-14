import { Plus, Trash2 } from 'lucide-react'
import { Button, RadioGroup } from '@/components/ui'
import {
  formatAnswerForDisplay,
  parseAnswer,
  serializeAnswer,
  type DualTextAnswer,
} from '@/lib/reviews/questionAnswers'
import type { ReviewQuestion } from '@/lib/reviews/types'

export type ReviewQuestionFieldProps = {
  question: ReviewQuestion
  value?: string
  disabled?: boolean
  /** Read-only display (scorecard view). */
  readOnly?: boolean
  name?: string
  onChange?: (body: string) => void
  /** Hide the prompt label when the parent renders an editable prompt. */
  hidePrompt?: boolean
  /** Accessible name for the answer control (builder preview). */
  controlLabel?: string
  /** Builder: edit multiple-choice labels inline on each radio row. */
  onOptionsChange?: (options: string[]) => void
  /** Builder: edit dual-text field labels inline above each box. */
  onDualLabelsChange?: (labels: [string, string]) => void
  className?: string
}

function questionKind(question: ReviewQuestion) {
  return question.kind ?? 'open_ended'
}

export function ReviewQuestionField({
  question,
  value = '',
  disabled = false,
  readOnly = false,
  name,
  onChange,
  hidePrompt = false,
  controlLabel,
  onOptionsChange,
  onDualLabelsChange,
  className,
}: ReviewQuestionFieldProps) {
  const kind = questionKind(question)
  const prompt = question.prompt.trim() || 'Untitled question'
  const fieldName = name ?? `question-${question.id}`
  const parsed = parseAnswer(kind, value)
  const locked = disabled || readOnly
  const answerLabel = controlLabel ?? prompt

  const promptNode = hidePrompt ? null : (
    <span className="pd-field__label">
      {prompt}
      {question.required ? (
        <span className="pd-reviews-form-preview__required" aria-label="Required">
          {' '}
          *
        </span>
      ) : null}
    </span>
  )
  const descriptionNode =
    !hidePrompt && question.description?.trim() ? (
      <p className="pd-reviews-gform-card__description-text">
        {question.description.trim()}
      </p>
    ) : null

  if (readOnly) {
    if (kind === 'dual_text' && parsed.kind === 'dual_text') {
      const [labelA, labelB] = question.dualLabels ?? ['Field 1', 'Field 2']
      return (
        <div className={['pd-field', className].filter(Boolean).join(' ')}>
          {promptNode}
          {descriptionNode}
          <div className="pd-reviews-question__dual">
            <div className="pd-field">
              <h3 className="pd-reviews-question__dual-label">{labelA}</h3>
              <p className="pd-reviews-scorecard__feedback-box">
                {parsed.value.a.trim() ? parsed.value.a : '\u00a0'}
              </p>
            </div>
            <div className="pd-field">
              <h3 className="pd-reviews-question__dual-label">{labelB}</h3>
              <p className="pd-reviews-scorecard__feedback-box">
                {parsed.value.b.trim() ? parsed.value.b : '\u00a0'}
              </p>
            </div>
          </div>
        </div>
      )
    }

    const display = formatAnswerForDisplay(kind, value, question.dualLabels)
    return (
      <div className={['pd-field', className].filter(Boolean).join(' ')}>
        {promptNode}
        {descriptionNode}
        <p
          className="pd-reviews-scorecard__feedback-box"
          aria-label={prompt}
        >
          {display.trim() ? display : '\u00a0'}
        </p>
      </div>
    )
  }

  if (kind === 'yes_no') {
    return (
      <div
        className={['pd-field', className].filter(Boolean).join(' ')}
        role={hidePrompt ? 'group' : undefined}
        aria-label={hidePrompt ? answerLabel : undefined}
      >
        {promptNode}
        {descriptionNode}
        <RadioGroup
          name={fieldName}
          disabled={locked}
          value={parsed.kind === 'yes_no' ? parsed.value : ''}
          onChange={(next) => onChange?.(serializeAnswer('yes_no', next))}
          options={[
            { value: 'yes', label: 'Yes' },
            { value: 'no', label: 'No' },
          ]}
        />
      </div>
    )
  }

  if (kind === 'multiple_choice') {
    const choiceLabels = question.options?.length
      ? question.options
      : ['Option 1', 'Option 2']

    if (onOptionsChange) {
      return (
        <div
          className={['pd-field', className].filter(Boolean).join(' ')}
          role="group"
          aria-label={answerLabel}
        >
          {promptNode}
          {descriptionNode}
          <div className="pd-radio-group">
            <div className="pd-radio-group__options pd-reviews-question__editable-options">
              {choiceLabels.map((option, optionIndex) => (
                <div
                  key={optionIndex}
                  className="pd-radio pd-reviews-question__editable-option"
                >
                  <span className="pd-radio__dot" aria-hidden />
                  <input
                    className="pd-reviews-question__option-input"
                    aria-label={`Choice ${optionIndex + 1}`}
                    value={option}
                    placeholder={`Option ${optionIndex + 1}`}
                    onChange={(event) => {
                      const options = [...choiceLabels]
                      options[optionIndex] = event.target.value
                      onOptionsChange(options)
                    }}
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    pill
                    className="pd-reviews-question__option-remove"
                    aria-label={`Remove choice ${optionIndex + 1}`}
                    disabled={choiceLabels.length <= 2}
                    onClick={() =>
                      onOptionsChange(
                        choiceLabels.filter((_, index) => index !== optionIndex),
                      )
                    }
                  >
                    <Trash2 size={14} strokeWidth={2} aria-hidden />
                  </Button>
                </div>
              ))}
            </div>
            <Button
              variant="ghost"
              size="sm"
              pill
              onClick={() =>
                onOptionsChange([
                  ...choiceLabels,
                  `Option ${choiceLabels.length + 1}`,
                ])
              }
            >
              <Plus size={14} strokeWidth={2} aria-hidden />
              Add choice
            </Button>
          </div>
        </div>
      )
    }

    const options = choiceLabels.map((option) => ({
      value: option,
      label: option || 'Untitled option',
    }))
    return (
      <div
        className={['pd-field', className].filter(Boolean).join(' ')}
        role={hidePrompt ? 'group' : undefined}
        aria-label={hidePrompt ? answerLabel : undefined}
      >
        {promptNode}
        {descriptionNode}
        <RadioGroup
          name={fieldName}
          disabled={locked}
          value={parsed.kind === 'multiple_choice' ? parsed.value : ''}
          onChange={(next) => onChange?.(serializeAnswer('multiple_choice', next))}
          options={options}
        />
      </div>
    )
  }

  if (kind === 'dual_text') {
    const dual: DualTextAnswer =
      parsed.kind === 'dual_text' ? parsed.value : { a: '', b: '' }
    const [labelA, labelB] = question.dualLabels ?? ['Field 1', 'Field 2']
    const renderLabel = (label: string, labelIndex: 0 | 1) =>
      onDualLabelsChange ? (
        <input
          className="pd-reviews-question__dual-label"
          aria-label={`Field ${labelIndex + 1} label`}
          value={label}
          placeholder={`Field ${labelIndex + 1}`}
          onChange={(event) => {
            const dualLabels: [string, string] = [labelA, labelB]
            dualLabels[labelIndex] = event.target.value
            onDualLabelsChange(dualLabels)
          }}
        />
      ) : (
        <h3 className="pd-reviews-question__dual-label">{label}</h3>
      )
    return (
      <div
        className={['pd-field', className].filter(Boolean).join(' ')}
        role={hidePrompt ? 'group' : undefined}
        aria-label={hidePrompt ? answerLabel : undefined}
      >
        {promptNode}
        {descriptionNode}
        <div className="pd-reviews-question__dual">
          <label className="pd-field">
            {renderLabel(labelA, 0)}
            <textarea
              className="pd-reviews-scorecard__feedback-box pd-field__control pd-field__control--textarea"
              rows={3}
              disabled={locked}
              value={dual.a}
              onChange={(event) =>
                onChange?.(
                  serializeAnswer('dual_text', { a: event.target.value, b: dual.b }),
                )
              }
            />
          </label>
          <label className="pd-field">
            {renderLabel(labelB, 1)}
            <textarea
              className="pd-reviews-scorecard__feedback-box pd-field__control pd-field__control--textarea"
              rows={3}
              disabled={locked}
              value={dual.b}
              onChange={(event) =>
                onChange?.(
                  serializeAnswer('dual_text', { a: dual.a, b: event.target.value }),
                )
              }
            />
          </label>
        </div>
      </div>
    )
  }

  return (
    <label className={['pd-field', className].filter(Boolean).join(' ')}>
      {promptNode}
      {descriptionNode}
      <textarea
        className="pd-reviews-scorecard__feedback-box pd-field__control pd-field__control--textarea"
        rows={2}
        disabled={locked}
        aria-label={answerLabel}
        value={typeof parsed.value === 'string' ? parsed.value : ''}
        onChange={(event) =>
          onChange?.(serializeAnswer('open_ended', event.target.value))
        }
      />
    </label>
  )
}
