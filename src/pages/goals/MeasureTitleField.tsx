import { InlinePencilField } from './InlinePencilField'

export function MeasureTitleField({
  value,
  onChange,
  inputKey,
  placeholder = 'Metric name',
  editLabel = 'Edit metric name',
  inputLabel = 'Metric name',
}: {
  value: string
  onChange: (value: string) => void
  inputKey?: string
  placeholder?: string
  editLabel?: string
  inputLabel?: string
}) {
  return (
    <InlinePencilField
      value={value}
      onChange={onChange}
      inputKey={inputKey}
      placeholder={placeholder}
      editLabel={editLabel}
      inputLabel={inputLabel}
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
}: {
  value: string
  onChange: (value: string) => void
  inputKey?: string
  requestFocus?: boolean
  onFocusRequested?: () => void
  placeholder?: string
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
      displayClassName="pd-goal-measure-card__title-display"
      inputClassName="pd-goal-measure-card__title-input"
    />
  )
}
