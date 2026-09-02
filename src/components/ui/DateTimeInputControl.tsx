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

export type DateTimeInputControlProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'type'
>

type PopoverPoint = { top: number; left: number }

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
  const [point, setPoint] = useState<PopoverPoint>({ top: 0, left: 0 })
  const [draft, setDraft] = useState(() => draftFromValue(committed))

  const placePopover = () => {
    const trigger = rootRef.current?.getBoundingClientRect()
    if (!trigger) return
    const width = 26.5 * 16
    const height = 22 * 16
    let left = trigger.left
    let top = trigger.bottom + 8
    if (left + width > window.innerWidth - 8) {
      left = Math.max(8, window.innerWidth - width - 8)
    }
    if (top + height > window.innerHeight - 8) {
      top = Math.max(8, trigger.top - height - 8)
    }
    setPoint({ top, left })
  }

  const openPicker = () => {
    if (disabled) return
    setDraft(draftFromValue(committed))
    placePopover()
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
    const onReposition = () => placePopover()
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown, true)
    window.addEventListener('resize', onReposition)
    window.addEventListener('scroll', onReposition, true)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown, true)
      window.removeEventListener('resize', onReposition)
      window.removeEventListener('scroll', onReposition, true)
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
              style={{ top: point.top, left: point.left }}
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
