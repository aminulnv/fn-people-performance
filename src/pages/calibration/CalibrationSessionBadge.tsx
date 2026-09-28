import { useState } from 'react'
import { Lock, LockOpen } from 'lucide-react'
import { ConfirmDialog } from '@/components/ui'
import { cx } from '@/lib/cx'
import { useAuth } from '@/lib/useAuth'
import { hasSystemPermission } from '@/lib/accessControl/types'
import {
  lockCalibrationSession,
  unlockCalibrationSession,
  type CalibrationSitting,
} from '@/lib/calibration/sessionApi'
import {
  setCalibrationSittingCache,
  useCalibrationSitting,
} from '@/lib/calibration/useCalibrationSession'

/** Lock / Unlock control for the calibration page header. */
export function CalibrationSessionBadge({
  cycleId,
  sitting: sittingProp,
  onSittingChange,
}: {
  cycleId: string
  /** When the parent already loaded the sitting (Ratings tab), pass it through. */
  sitting?: CalibrationSitting | null
  onSittingChange?: (sitting: CalibrationSitting) => void
}) {
  const { user } = useAuth()
  const canLock = hasSystemPermission(user?.permissions, 'platform.write_all')
  const { data: sittingQuery } = useCalibrationSitting(
    cycleId,
    sittingProp === undefined,
  )
  const sitting = sittingProp !== undefined ? sittingProp : (sittingQuery ?? null)
  const [lockOpen, setLockOpen] = useState(false)
  const [locking, setLocking] = useState(false)
  const [lockError, setLockError] = useState<string | null>(null)

  const changes =
    sitting?.employees.filter((person) => person.adjustedAt != null).length ?? 0
  const locked = Boolean(sitting?.lockedAt)
  // Action affordance for editors; state icon for read-only viewers.
  const Icon = canLock
    ? locked
      ? LockOpen
      : Lock
    : locked
      ? Lock
      : LockOpen
  const label = canLock
    ? locked
      ? 'Unlock Calibration'
      : 'Lock Calibration'
    : locked
      ? 'Locked'
      : 'Unlocked'
  const changesHint = changes ? `, ${changes} Rating Changes` : ''

  async function applyLock() {
    setLocking(true)
    setLockError(null)
    try {
      const next = locked
        ? await unlockCalibrationSession(cycleId)
        : await lockCalibrationSession(cycleId)
      setCalibrationSittingCache(cycleId, next)
      onSittingChange?.(next)
      setLockOpen(false)
    } catch (error) {
      setLockError(
        error instanceof Error
          ? error.message
          : locked
            ? 'Could Not Unlock The Session.'
            : 'Could Not Lock The Session.',
      )
    } finally {
      setLocking(false)
    }
  }

  const badgeClass = cx(
    'pd-cal-session-badge',
    locked ? 'is-locked' : 'is-unlocked',
  )

  const badgeBody = (
    <>
      <Icon className="pd-cal-session-badge__icon" aria-hidden size={14} strokeWidth={2.25} />
      {label}
    </>
  )

  return (
    <>
      {canLock ? (
        <button
          type="button"
          className={badgeClass}
          onClick={() => {
            setLockError(null)
            setLockOpen(true)
          }}
          aria-label={
            locked
              ? `Session Locked${changesHint}. Unlock Session.`
              : `Session Unlocked${changesHint}. Lock Session.`
          }
        >
          {badgeBody}
        </button>
      ) : (
        <span
          className={badgeClass}
          aria-label={
            locked
              ? `Session Locked${changesHint}`
              : `Session Unlocked${changesHint}`
          }
        >
          {badgeBody}
        </span>
      )}

      <ConfirmDialog
        open={lockOpen}
        onClose={() => setLockOpen(false)}
        onConfirm={() => {
          void applyLock()
        }}
        title={locked ? 'Unlock Session?' : 'Lock Session?'}
        description={
          locked
            ? 'Unlocking Lets Calibrators Edit Ratings And Notes Again.'
            : 'Locking Freezes Ratings And Notes For This Sitting.'
        }
        confirmLabel={locked ? 'Unlock Session' : 'Lock Session'}
        confirmLoading={locking}
      >
        {lockError ? (
          <p className="pd-cal-rt__override-error" role="alert">
            {lockError}
          </p>
        ) : null}
      </ConfirmDialog>
    </>
  )
}
