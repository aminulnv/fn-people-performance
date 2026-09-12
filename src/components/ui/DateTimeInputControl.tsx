import {
  useEffect,
  useId,
  useRef,
  useState,
  type ChangeEvent,
  type InputHTMLAttributes,
} from 'react'
import { createPortal } from 'react-dom'
import { CalendarDays } from 'lucide-react'
import { cx } from '@/lib/cx'
import { formatLocalTimestamp, localWallToUtcIso } from '@/lib/dates/timezone'
import { parseDateTime } from '@/lib/dates/timestamp'
import { DateTimePicker, draftFromValue } from './DateTimePicker'
import { useFloatingPanel } from './useFloatingPanel'

export type DateTimeInputControlProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'type'
>

function emitChange(
  onChange: DateTimeInputControlProps['onChange'],
  timestamp: string,
) {
  onChange?.({
    target: { value: timestamp },
    currentTarget: { value: timestamp },
  } as ChangeEvent<HTMLInputElement>)
}

function isoFrom(value: InputHTMLAttributes<HTMLInputElement>['value']): string {
  return typeof value === 'string' ? value : ''
}

export function DateTimeInputControl({
  className,
  value,
  defaultValue,
  onChange,
  min,
  max,
  disabled,
  id,
  ...props
}: DateTimeInputControlProps) {
  const isControlled = value !== undefined
  const [uncontrolled, setUncontrolled] = useState(isoFrom(defaultValue))
  const committed = isControlled ? isoFrom(value) : uncontrolled
  const display = formatLocalTimestamp(committed)
  const autoId = useId()
  const inputId = id ?? autoId
  const rootRef = useRef<HTMLSpanElement>(null)
  const popoverRef = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState(() => draftFromValue(committed))
  const popoverStyle = useFloatingPanel({
    open,
    anchorRef: rootRef,
    panelRef: popoverRef,
  })

  const openPicker = () => {
    if (disabled) return
    setDraft(draftFromValue(committed))
    setOpen(true)
  }

  useEffect(() => {
    if (!open) return
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node
      if (rootRef.current?.contains(target)) return
      if (popoverRef.current?.contains(target)) return
      setOpen(false)
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      event.preventDefault()
      event.stopPropagation()
      setOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown, true)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown, true)
    }
  }, [open])

  const commit = (next: string) => {
    if (!isControlled) setUncontrolled(next)
    emitChange(onChange, next)
  }

  const applyDraft = () => {
    commit(localWallToUtcIso(draft.date, draft.time))
    setOpen(false)
  }

  return (
    <span ref={rootRef} className="pd-date-input pd-datetime-input">
      <input
        {...props}
        id={inputId}
        type="text"
        inputMode="none"
        autoComplete="off"
        disabled={disabled}
        className={cx('pd-date-input__native', className)}
        value={committed}
        min={typeof min === 'string' ? min : undefined}
        max={typeof max === 'string' ? max : undefined}
        onChange={(event) => {
          const next = event.target.value
          const parsed = parseDateTime(next)
          const normalized = parsed
            ? localWallToUtcIso(parsed.date, parsed.time)
            : next
          if (!isControlled) setUncontrolled(normalized)
          emitChange(onChange, normalized)
        }}
        onClick={openPicker}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault()
            openPicker()
          }
        }}
      />
      <span
        className={cx('pd-date-input__display', className)}
        aria-hidden="true"
        data-empty={!display || undefined}
      >
        {display || 'DD-MMM-YYYY, HH:MM'}
      </span>
      <span className="pd-date-input__icon" aria-hidden>
        <CalendarDays size={16} strokeWidth={2.25} />
      </span>
      {open
        ? createPortal(
            <div
              ref={popoverRef}
              className="pd-datetime-popover"
              style={{
                ...popoverStyle,
                visibility: popoverStyle ? 'visible' : 'hidden',
              }}
            >
              <DateTimePicker
                date={draft.date}
                time={draft.time}
                min={typeof min === 'string' ? min : undefined}
                max={typeof max === 'string' ? max : undefined}
                onDateChange={(nextDate) =>
                  setDraft((current) => ({ ...current, date: nextDate }))
                }
                onTimeChange={(nextTime) =>
                  setDraft((current) => ({ ...current, time: nextTime }))
                }
                onCancel={() => setOpen(false)}
                onApply={applyDraft}
              />
            </div>,
            document.body,
          )
        : null}
    </span>
  )
}
