import { useId } from 'react'
import { Minus, Plus } from 'lucide-react'
import { Field } from '@/components/ui'

type CountStepperFieldProps = {
  label: string
  value: number | null
  min?: number
  allowEmpty?: boolean
  emptyStepTo?: number
  placeholder?: string
  onChange: (value: number | null) => void
}

function parseCount(raw: string): number | null {
  if (raw.trim() === '') return null
  const next = Number(raw)
  if (!Number.isFinite(next)) return null
  return Math.floor(next)
}

export function CountStepperField({
  label,
  value,
  min = 1,
  allowEmpty = false,
  emptyStepTo,
  placeholder,
  onChange,
}: CountStepperFieldProps) {
  const inputId = useId()
  const canDecrease = allowEmpty ? value != null : (value ?? 0) > min

  const commit = (next: number | null) => {
    if (next == null) {
      if (allowEmpty) onChange(null)
      return
    }
    onChange(Math.max(min, next))
  }

  return (
    <Field label={label} htmlFor={inputId}>
      <div className="pd-reviews-count-stepper">
        <button
          type="button"
          className="pd-reviews-count-step"
          aria-label={`Decrease ${label}`}
          disabled={!canDecrease}
          onClick={() => {
            if (value == null) return
            if (allowEmpty && value <= min) {
              commit(null)
              return
            }
            commit(value - 1)
          }}
        >
          <Minus size={14} strokeWidth={2.25} aria-hidden />
        </button>
        <input
          id={inputId}
          className="pd-reviews-count-input"
          type="text"
          inputMode="numeric"
          placeholder={placeholder}
          value={value ?? ''}
          onChange={(event) => {
            const parsed = parseCount(event.target.value.replace(/\D/g, ''))
            if (parsed == null) {
              if (allowEmpty) commit(null)
              return
            }
            commit(parsed)
          }}
        />
        <button
          type="button"
          className="pd-reviews-count-step"
          aria-label={`Increase ${label}`}
          onClick={() => {
            commit(value == null ? (emptyStepTo ?? min) : value + 1)
          }}
        >
          <Plus size={14} strokeWidth={2.25} aria-hidden />
        </button>
      </div>
    </Field>
  )
}
