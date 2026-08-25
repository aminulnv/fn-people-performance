import { InlinePencilField } from './InlinePencilField'

export function MeasureTitleField({
  value,
  onChange,
  inputKey,
  placeholder = 'Metric name',
  editLabel = 'Edit metric name',
  inputLabel = 'Metric name',
  error,
  requestFocus,
  onEmptyBlur,
  disabled,
}: {
  value: string
  onChange: (value: string) => void
  inputKey?: string
  placeholder?: string
  editLabel?: string
  inputLabel?: string
  error?: string
  requestFocus?: boolean
  onEmptyBlur?: () => void
  disabled?: boolean
}) {
  return (
    <InlinePencilField
      value={value}
      onChange={onChange}
      inputKey={inputKey}
      placeholder={placeholder}
      editLabel={editLabel}
      inputLabel={inputLabel}
      error={error}
      requestFocus={requestFocus}
      stayInEditWhenEmpty
      onEmptyBlur={onEmptyBlur}
      disabled={disabled}
      displayClassName="pd-goal-measure-card__title-display"
      inputClassName="pd-goal-measure-card__title-input"
    />
  )
}

export function TaskListNameField({
  value,
  onChange,
  inputKey,
  requestFocus,
  onFocusRequested,
  placeholder = 'Task list name',
  disabled,
}: {
  value: string
  onChange: (value: string) => void
  inputKey?: string
  requestFocus?: boolean
  onFocusRequested?: () => void
  placeholder?: string
  disabled?: boolean
}) {
  return (
    <InlinePencilField
      value={value}
      onChange={onChange}
      inputKey={inputKey}
      placeholder={placeholder}
      editLabel="Edit task list name"
      inputLabel="Task list name"
      requestFocus={requestFocus}
      onFocusRequested={onFocusRequested}
      disabled={disabled}
      displayClassName="pd-goal-measure-card__title-display"
      inputClassName="pd-goal-measure-card__title-input"
    />
  )
}
