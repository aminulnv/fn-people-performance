import { useEffect, useMemo, useState } from 'react'
import { Megaphone } from 'lucide-react'
import { Button, Field, Modal, Select, Textarea } from '@/components/ui'
import { apiFetch, ApiError } from '@/lib/apiClient'

export type GoalReminderCycleOption = {
  id: string
  label: string
}

type NonSubmitter = {
  id: string
  name: string
  email?: string
  status: string
}

export function GoalReminderBlastButton({
  cycleId,
  cycleLabel,
  cycles,
  disabled,
}: {
  cycleId?: string | null
  cycleLabel?: string
  /** When set, shows a cycle picker (Settings → Notifications). */
  cycles?: GoalReminderCycleOption[]
  disabled?: boolean
}) {
  const hasPicker = Array.isArray(cycles) && cycles.length > 0
  const [pickedCycleId, setPickedCycleId] = useState<string>(
    () => cycleId ?? cycles?.[0]?.id ?? '',
  )
  const [open, setOpen] = useState(false)
  const [people, setPeople] = useState<NonSubmitter[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<string | null>(null)

  useEffect(() => {
    if (cycleId) setPickedCycleId(cycleId)
  }, [cycleId])

  useEffect(() => {
    if (!hasPicker || cycleId) return
    if (!pickedCycleId && cycles[0]) setPickedCycleId(cycles[0].id)
  }, [hasPicker, cycleId, cycles, pickedCycleId])

  const activeCycleId = hasPicker ? pickedCycleId || null : cycleId ?? null
  const activeCycleLabel =
    cycles?.find((cycle) => cycle.id === activeCycleId)?.label ?? cycleLabel

  useEffect(() => {
    if (!open || !activeCycleId) return
    setLoading(true)
    setError(null)
    setResult(null)
    void apiFetch<{ people: NonSubmitter[] }>(
      `/api/platform/goal-cycles/${encodeURIComponent(activeCycleId)}/non-submitters`,
    )
      .then((response) => {
        const next = response.people ?? []
        setPeople(next)
        setSelected(new Set(next.map((person) => person.id)))
      })
      .catch((err) => {
        setError(
          err instanceof ApiError || err instanceof Error
            ? err.message
            : 'Could not load non-submitters.',
        )
      })
      .finally(() => setLoading(false))
  }, [open, activeCycleId])

  const selectedCount = selected.size
  const allSelected = useMemo(
    () => people.length > 0 && selectedCount === people.length,
    [people.length, selectedCount],
  )

  const send = async () => {
    if (!activeCycleId || selectedCount === 0) return
    setSending(true)
    setError(null)
    try {
      const response = await apiFetch<{ sent: number }>(
        `/api/platform/goal-cycles/${encodeURIComponent(activeCycleId)}/remind`,
        {
          method: 'POST',
          body: {
            employeeIds: [...selected],
            message: message.trim() || undefined,
          },
        },
      )
      setResult(`Sent reminder to ${response.sent} people.`)
    } catch (err) {
      setError(
        err instanceof ApiError || err instanceof Error
          ? err.message
          : 'Could not send reminders.',
      )
    } finally {
      setSending(false)
    }
  }

  return (
    <>
      <div className="pd-goal-reminder-blast">
        {hasPicker ? (
          <Select
            aria-label="Goal cycle for reminder"
            value={pickedCycleId}
            onChange={(event) => setPickedCycleId(event.target.value)}
            options={cycles.map((cycle) => ({
              value: cycle.id,
              label: cycle.label,
            }))}
            disabled={disabled}
          />
        ) : null}
        <Button
          type="button"
          variant="secondary"
          size="sm"
          disabled={disabled || !activeCycleId}
          onClick={() => setOpen(true)}
        >
          <Megaphone size={14} strokeWidth={2.25} aria-hidden />
          Remind non-submitters
        </Button>
      </div>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Remind people who have not submitted"
        actions={
          <>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setOpen(false)}
            >
              Close
            </Button>
            <Button
              type="button"
              loading={sending}
              disabled={loading || selectedCount === 0 || Boolean(result)}
              onClick={() => void send()}
            >
              Send to {selectedCount || 0}
            </Button>
          </>
        }
      >
        <p className="pd-goal-reminder-blast__lede">
          {activeCycleLabel
            ? `Only people still in draft / sent back / incomplete for ${activeCycleLabel}.`
            : 'Only people who still need to submit.'}{' '}
          Uses the same notification outbox as in-app (email when SMTP is on).
        </p>
        <Field label="Optional message">
          <Textarea
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            rows={2}
            placeholder="Please complete your goals."
            aria-label="Reminder message"
          />
        </Field>
        {loading ? <p>Loading…</p> : null}
        {error ? (
          <p role="alert" className="pd-goal-reminder-blast__error">
            {error}
          </p>
        ) : null}
        {result ? <p role="status">{result}</p> : null}
        {!loading && people.length === 0 ? (
          <p>Everyone visible to you has already submitted.</p>
        ) : null}
        {people.length > 0 ? (
          <>
            <label className="pd-goal-reminder-blast__row">
              <input
                type="checkbox"
                checked={allSelected}
                onChange={(event) => {
                  setSelected(
                    event.target.checked
                      ? new Set(people.map((person) => person.id))
                      : new Set(),
                  )
                }}
              />
              Select all ({people.length})
            </label>
            <ul className="pd-goal-reminder-blast__list">
              {people.map((person) => (
                <li key={person.id}>
                  <label className="pd-goal-reminder-blast__row">
                    <input
                      type="checkbox"
                      checked={selected.has(person.id)}
                      onChange={(event) => {
                        setSelected((current) => {
                          const next = new Set(current)
                          if (event.target.checked) next.add(person.id)
                          else next.delete(person.id)
                          return next
                        })
                      }}
                    />
                    <span>
                      {person.name}
                      <span className="pd-goal-reminder-blast__status">
                        · {person.status}
                      </span>
                    </span>
                  </label>
                </li>
              ))}
            </ul>
          </>
        ) : null}
      </Modal>
    </>
  )
}
