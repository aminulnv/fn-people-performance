import { useEffect, useMemo, useRef, useState, type PointerEvent } from 'react'
import { ChevronLeft, ChevronRight, Moon, Sun } from 'lucide-react'
import { cx } from '@/lib/cx'
import { listConcurrentTimes } from '@/lib/dates/concurrentTimes'
import {
  localWallToUtcIso,
  toUtcIso,
  utcIsoToLocalWall,
} from '@/lib/dates/timezone'
import {
  CLOCK_HOURS,
  CLOCK_MINUTES,
  clockAngleDegrees,
  clockHandDegrees,
  datePart,
  formatTimestampSummary,
  isNightClock,
  joinWallClock,
  minuteFromClockAngle,
  parseDateTime,
  parseTypedHour12,
  parseTypedMinute,
  splitWallClock,
} from '@/lib/dates/timestamp'
import { Button } from './Button'

const WEEKDAYS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'] as const
const MONTH_LABELS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
] as const

export type DateTimePickerProps = {
  date: string
  time: string
  min?: string
  max?: string
  confirmLabel?: string
  onDateChange: (date: string) => void
  onTimeChange: (time: string) => void
  onCancel: () => void
  onApply: () => void
}

function toLocalIsoDate(value: Date): string {
  const year = value.getFullYear()
  const month = String(value.getMonth() + 1).padStart(2, '0')
  const day = String(value.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function startOfMondayGrid(year: number, monthIndex: number): Date {
  const first = new Date(year, monthIndex, 1)
  const weekday = first.getDay()
  const mondayOffset = weekday === 0 ? 6 : weekday - 1
  first.setDate(first.getDate() - mondayOffset)
  return first
}

function isTimeDisabled(date: string, time: string, min?: string, max?: string): boolean {
  const stamp = localWallToUtcIso(date, time)
  if (min && stamp < toUtcIso(min)) return true
  if (max && stamp > toUtcIso(max)) return true
  return false
}

export function DateTimePicker({
  date,
  time,
  min,
  max,
  confirmLabel = 'Apply',
  onDateChange,
  onTimeChange,
  onCancel,
  onApply,
}: DateTimePickerProps) {
  const faceRef = useRef<HTMLDivElement>(null)
  const hourRef = useRef<HTMLInputElement>(null)
  const minuteRef = useRef<HTMLInputElement>(null)
  const clockRef = useRef(splitWallClock(time))
  const clockModeRef = useRef<'hour' | 'minute'>('hour')
  const needleDragRef = useRef(false)
  const [clockMode, setClockMode] = useState<'hour' | 'minute'>('hour')
  const [draggingNeedle, setDraggingNeedle] = useState(false)
  const parsedMin = parseDateTime(min)
  const parsedMax = parseDateTime(max)
  const view = parseDateTime(date) ?? parseDateTime(toLocalIsoDate(new Date()))
  const viewDate = view?.date ?? toLocalIsoDate(new Date())
  const [year, month] = viewDate.split('-').map(Number)
  const monthIndex = (month ?? 1) - 1
  const clock = splitWallClock(time)
  clockRef.current = clock
  clockModeRef.current = clockMode
  const minuteLabel = String(clock.minute).padStart(2, '0')
  const [hourDraft, setHourDraft] = useState(String(clock.hour12))
  const [minuteDraft, setMinuteDraft] = useState(minuteLabel)
  const hourDraftRef = useRef(hourDraft)
  const minuteDraftRef = useRef(minuteDraft)
  hourDraftRef.current = hourDraft
  minuteDraftRef.current = minuteDraft
  const ticks = clockMode === 'hour' ? CLOCK_HOURS : CLOCK_MINUTES
  const handDeg = clockHandDegrees(clockMode, clock)
  const nightSky = isNightClock(clock)

  useEffect(() => {
    if (hourRef.current !== document.activeElement) {
      setHourDraft(String(clock.hour12))
    }
    if (minuteRef.current !== document.activeElement) {
      setMinuteDraft(String(clock.minute).padStart(2, '0'))
    }
  }, [clock.hour12, clock.minute])

  const days = useMemo(() => {
    const cursor = startOfMondayGrid(year, monthIndex)
    return Array.from({ length: 42 }, () => {
      const iso = toLocalIsoDate(cursor)
      const inMonth = cursor.getMonth() === monthIndex
      cursor.setDate(cursor.getDate() + 1)
      return { iso, inMonth }
    })
  }, [monthIndex, year])

  const shiftMonth = (delta: number) => {
    const selectedDay = Number(datePart(date).slice(8, 10) || 1)
    const next = new Date(year, monthIndex + delta, selectedDay)
    if (next.getMonth() !== ((monthIndex + delta + 12) % 12)) {
      next.setDate(0)
    }
    onDateChange(toLocalIsoDate(next))
  }

  const selectDay = (iso: string) => {
    if (parsedMin && datePart(iso) < parsedMin.date) return
    if (parsedMax && datePart(iso) > parsedMax.date) return
    onDateChange(iso)
  }

  const emitTime = (next: Partial<typeof clock>) => {
    onTimeChange(joinWallClock({ ...clock, ...next }))
  }

  const focusMinutes = () => {
    setClockMode('minute')
    requestAnimationFrame(() => {
      minuteRef.current?.focus()
      minuteRef.current?.select()
    })
  }

  const commitHourDraft = (raw = hourDraftRef.current) => {
    const hour = parseTypedHour12(raw)
    if (hour == null) {
      const fallback = String(clock.hour12)
      hourDraftRef.current = fallback
      setHourDraft(fallback)
      return false
    }
    emitTime({ hour12: hour })
    hourDraftRef.current = String(hour)
    setHourDraft(String(hour))
    return true
  }

  const commitMinuteDraft = (raw = minuteDraftRef.current) => {
    const minute = parseTypedMinute(raw)
    if (minute == null) {
      const fallback = String(clock.minute).padStart(2, '0')
      minuteDraftRef.current = fallback
      setMinuteDraft(fallback)
      return false
    }
    emitTime({ minute })
    const next = String(minute).padStart(2, '0')
    minuteDraftRef.current = next
    setMinuteDraft(next)
    return true
  }

  const onHourDraftChange = (raw: string) => {
    const digits = raw.replace(/\D/g, '').slice(0, 2)
    hourDraftRef.current = digits
    setHourDraft(digits)
    if (digits.length !== 2) return
    if (commitHourDraft(digits)) focusMinutes()
    else {
      const next = digits.slice(0, 1)
      hourDraftRef.current = next
      setHourDraft(next)
    }
  }

  const onMinuteDraftChange = (raw: string) => {
    const digits = raw.replace(/\D/g, '').slice(0, 2)
    minuteDraftRef.current = digits
    setMinuteDraft(digits)
    if (digits.length !== 2) return
    if (!commitMinuteDraft(digits)) {
      const next = digits.slice(0, 1)
      minuteDraftRef.current = next
      setMinuteDraft(next)
    }
  }

  const selectTick = (index: number) => {
    if (needleDragRef.current) return
    if (clockMode === 'hour') {
      emitTime({ hour12: CLOCK_HOURS[index] })
      setClockMode('minute')
      return
    }
    emitTime({ minute: CLOCK_MINUTES[index] })
  }

  const applyNeedle = (clientX: number, clientY: number) => {
    const face = faceRef.current
    if (!face) return
    const current = clockRef.current
    const deg = clockAngleDegrees(clientX, clientY, face.getBoundingClientRect())
    const next =
      clockModeRef.current === 'hour'
        ? joinWallClock({
            ...current,
            hour12: CLOCK_HOURS[Math.round(deg / 30) % 12],
          })
        : joinWallClock({
            ...current,
            minute: minuteFromClockAngle(deg),
          })
    if (isTimeDisabled(viewDate, next, min, max)) return
    onTimeChange(next)
  }

  const startNeedleDrag = (event: PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return
    event.preventDefault()
    needleDragRef.current = true
    setDraggingNeedle(true)
    const target = event.currentTarget
    if (typeof target.setPointerCapture === 'function') {
      target.setPointerCapture(event.pointerId)
    }
    applyNeedle(event.clientX, event.clientY)
  }

  const moveNeedle = (event: PointerEvent<HTMLDivElement>) => {
    if (!needleDragRef.current) return
    applyNeedle(event.clientX, event.clientY)
  }

  const endNeedleDrag = (event: PointerEvent<HTMLDivElement>) => {
    if (!needleDragRef.current) return
    applyNeedle(event.clientX, event.clientY)
    if (clockModeRef.current === 'hour') setClockMode('minute')
    setDraggingNeedle(false)
    const target = event.currentTarget
    if (
      typeof target.hasPointerCapture === 'function' &&
      target.hasPointerCapture(event.pointerId)
    ) {
      target.releasePointerCapture(event.pointerId)
    }
    window.setTimeout(() => {
      needleDragRef.current = false
    }, 0)
  }

  const summary = formatTimestampSummary({ date: viewDate, time })
  const canApply =
    Boolean(viewDate && time) && !isTimeDisabled(viewDate, time, min, max)
  const concurrentTimes = useMemo(
    () => (viewDate && time ? listConcurrentTimes(viewDate, time) : []),
    [time, viewDate],
  )

  return (
    <div className="pd-datetime-picker" role="dialog" aria-label="Choose date and time">
      <div className="pd-datetime-picker__body">
        <div className="pd-datetime-picker__calendar">
          <div className="pd-datetime-picker__month">
            <button
              type="button"
              className="pd-datetime-picker__nav"
              aria-label="Previous month"
              onClick={() => shiftMonth(-1)}
            >
              <ChevronLeft size={16} strokeWidth={2} aria-hidden />
            </button>
            <p className="pd-datetime-picker__month-label">
              {MONTH_LABELS[monthIndex]} {year}
            </p>
            <button
              type="button"
              className="pd-datetime-picker__nav"
              aria-label="Next month"
              onClick={() => shiftMonth(1)}
            >
              <ChevronRight size={16} strokeWidth={2} aria-hidden />
            </button>
          </div>
          <div className="pd-datetime-picker__weekdays">
            {WEEKDAYS.map((day) => (
              <span key={day}>{day}</span>
            ))}
          </div>
          <div className="pd-datetime-picker__grid">
            {days.map((day) => {
              const selected = day.iso === viewDate
              const disabled =
                Boolean(parsedMin && day.iso < parsedMin.date) ||
                Boolean(parsedMax && day.iso > parsedMax.date)
              return (
                <button
                  key={day.iso}
                  type="button"
                  className={cx(
                    'pd-datetime-picker__day',
                    !day.inMonth && 'is-outside',
                    selected && 'is-selected',
                  )}
                  disabled={disabled}
                  aria-pressed={selected}
                  onClick={() => selectDay(day.iso)}
                >
                  {Number(day.iso.slice(8, 10))}
                </button>
              )
            })}
          </div>
        </div>
        <section
          className="pd-datetime-picker__clock"
          data-sky={nightSky ? 'night' : 'day'}
          aria-label={nightSky ? 'Choose time, night' : 'Choose time, day'}
        >
          <div className="pd-datetime-picker__clock-header">
            <span className="pd-datetime-picker__sky-mark" aria-hidden>
              {nightSky ? (
                <Moon size={16} strokeWidth={2} />
              ) : (
                <Sun size={16} strokeWidth={2} />
              )}
            </span>
            <div className="pd-datetime-picker__clock-digital">
              <input
                ref={hourRef}
                type="text"
                className={cx(
                  'pd-datetime-picker__clock-part',
                  clockMode === 'hour' && 'is-active',
                )}
                inputMode="numeric"
                autoComplete="off"
                spellCheck={false}
                maxLength={2}
                aria-label="Hours"
                value={hourDraft}
                onFocus={(event) => {
                  setClockMode('hour')
                  event.currentTarget.select()
                }}
                onChange={(event) => onHourDraftChange(event.target.value)}
                onBlur={() => commitHourDraft()}
                onKeyDown={(event) => {
                  if (event.key !== 'Enter') return
                  event.preventDefault()
                  if (commitHourDraft()) focusMinutes()
                }}
              />
              <span className="pd-datetime-picker__clock-sep" aria-hidden>
                :
              </span>
              <input
                ref={minuteRef}
                type="text"
                className={cx(
                  'pd-datetime-picker__clock-part',
                  clockMode === 'minute' && 'is-active',
                )}
                inputMode="numeric"
                autoComplete="off"
                spellCheck={false}
                maxLength={2}
                aria-label="Minutes"
                value={minuteDraft}
                onFocus={(event) => {
                  setClockMode('minute')
                  event.currentTarget.select()
                }}
                onChange={(event) => onMinuteDraftChange(event.target.value)}
                onBlur={() => commitMinuteDraft()}
                onKeyDown={(event) => {
                  if (event.key !== 'Enter') return
                  event.preventDefault()
                  commitMinuteDraft()
                }}
              />
            </div>
            <div className="pd-datetime-picker__meridiem">
              {(['AM', 'PM'] as const).map((period) => {
                const selected = clock.period === period
                const nextTime = joinWallClock({ ...clock, period })
                return (
                  <button
                    key={period}
                    type="button"
                    className={cx(
                      'pd-datetime-picker__period',
                      selected && 'is-selected',
                    )}
                    aria-pressed={selected}
                    disabled={isTimeDisabled(viewDate, nextTime, min, max)}
                    onClick={() => emitTime({ period })}
                  >
                    {period}
                  </button>
                )
              })}
            </div>
          </div>
          <div
            ref={faceRef}
            className={cx(
              'pd-datetime-picker__clock-face',
              draggingNeedle && 'is-dragging',
            )}
            role="listbox"
            aria-label={clockMode === 'hour' ? 'Hour marks' : 'Minute marks'}
            onPointerDown={startNeedleDrag}
            onPointerMove={moveNeedle}
            onPointerUp={endNeedleDrag}
            onPointerCancel={endNeedleDrag}
          >
            <span
              className="pd-datetime-picker__clock-hand"
              style={{ transform: `rotate(${handDeg}deg)` }}
              aria-hidden
            />
            <span className="pd-datetime-picker__clock-hub" aria-hidden />
            {ticks.map((tick, index) => {
              const selected =
                clockMode === 'hour'
                  ? clock.hour12 === tick
                  : clock.minute === tick
              const nextTime =
                clockMode === 'hour'
                  ? joinWallClock({ ...clock, hour12: tick })
                  : joinWallClock({ ...clock, minute: tick })
              const label =
                clockMode === 'hour'
                  ? `${tick} o'clock`
                  : `${String(tick).padStart(2, '0')} minutes`
              return (
                <button
                  key={`${clockMode}-${tick}`}
                  type="button"
                  role="option"
                  className={cx(
                    'pd-datetime-picker__clock-tick',
                    selected && 'is-selected',
                  )}
                  style={{ ['--tick-deg' as string]: `${index * 30}deg` }}
                  aria-label={label}
                  aria-selected={selected}
                  disabled={isTimeDisabled(viewDate, nextTime, min, max)}
                  onClick={() => selectTick(index)}
                >
                  {clockMode === 'hour' ? tick : String(tick).padStart(2, '0')}
                </button>
              )
            })}
          </div>
        </section>
      </div>
      {concurrentTimes.length > 0 ? (
        <ul
          className="pd-datetime-picker__zones"
          aria-label="Same time in other countries"
        >
          {concurrentTimes.map((place) => (
            <li key={place.id} className="pd-datetime-picker__zone">
              <span className="pd-datetime-picker__flag" aria-hidden>
                {place.flag}
              </span>
              <span className="pd-datetime-picker__zone-name">{place.name}</span>
              <time className="pd-datetime-picker__zone-time">
                {place.timeLabel}
                {place.crossesDay ? ` · ${place.dateLabel}` : ''}
              </time>
            </li>
          ))}
        </ul>
      ) : null}
      <div className="pd-datetime-picker__footer">
        <Button variant="ghost" size="sm" onClick={onCancel}>
          Cancel
        </Button>
        <p className="pd-datetime-picker__summary">{summary || 'Choose a date and time'}</p>
        <Button
          variant="secondary"
          size="sm"
          disabled={!canApply}
          onClick={onApply}
        >
          {confirmLabel}
        </Button>
      </div>
    </div>
  )
}

export function draftFromValue(
  value: string,
  fallbackTime = '09:00',
): { date: string; time: string } {
  const wall = utcIsoToLocalWall(value)
  if (wall) return wall
  const parsed = parseDateTime(value)
  if (!parsed) {
    return { date: toLocalIsoDate(new Date()), time: fallbackTime }
  }
  return { date: parsed.date, time: /T\d{2}:\d{2}/.test(value) ? parsed.time : fallbackTime }
}
