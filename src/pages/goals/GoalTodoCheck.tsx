import { Check } from 'lucide-react'

export function GoalTodoCheck({
  checked,
  disabled = false,
  ariaLabel,
  onChange,
}: {
  checked: boolean
  disabled?: boolean
  ariaLabel: string
  onChange: (checked: boolean) => void
}) {
  return (
    <label
      className={`pd-goal-todo-check${disabled ? ' is-disabled' : ''}`}
    >
      <input
        type="checkbox"
        className="pd-sr-only"
        checked={checked}
        disabled={disabled}
        aria-label={ariaLabel}
        onChange={(event) => onChange(event.target.checked)}
      />
      <span className="pd-goal-todo-check__box" aria-hidden>
        {checked ? (
          <Check size={13} strokeWidth={2.75} strokeLinecap="round" strokeLinejoin="round" />
        ) : null}
      </span>
    </label>
  )
}
