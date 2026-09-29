import { useState } from 'react'
import { Lock, LockOpen } from 'lucide-react'
import { ConfirmDialog } from '@/components/ui'
import { cx } from '@/lib/cx'
import { useAuth } from '@/lib/useAuth'
import { hasSystemPermission } from '@/lib/accessControl/types'
import {
  LOCK_SESSION_CONFIRM,
  LOCK_SESSION_DESCRIPTION,
  LOCK_SESSION_TITLE,
  LOCK_SESSION_TOOLTIP,
  UNLOCK_SESSION_CONFIRM,
  UNLOCK_SESSION_DESCRIPTION,
  UNLOCK_SESSION_TITLE,
  UNLOCK_SESSION_TOOLTIP,
} from '@/lib/calibration/lockedOverrideCopy'
import {
  lockCalibrationSession,
  unlockCalibrationSession,
  type CalibrationSitting,
} from '@/lib/calibration/sessionApi'
import {
  setCalibrationSittingCache,
  useCalibrationSitting,
} from '@/lib/calibration/useCalibrationSession'

/** Lock / Unlock control for the calibration page header (admins only). */
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
  const tooltip = locked
    ? canLock
      ? UNLOCK_SESSION_TOOLTIP
      : LOCK_SESSION_TOOLTIP
    : LOCK_SESSION_TOOLTIP

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
            ? 'Could not unlock the session.'
            : 'Could not lock the session.',
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
          title={tooltip}
          onClick={() => {
            setLockError(null)
            setLockOpen(true)
          }}
          aria-label={
            locked
              ? `Session locked${changesHint}. Unlock session.`
              : `Session unlocked${changesHint}. Lock session.`
          }
        >
          {badgeBody}
        </button>
      ) : (
        <span
          className={badgeClass}
          title={locked ? LOCK_SESSION_TOOLTIP : undefined}
          aria-label={
            locked
              ? `Session locked${changesHint}`
              : `Session unlocked${changesHint}`
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
        title={locked ? UNLOCK_SESSION_TITLE : LOCK_SESSION_TITLE}
        description={
          locked ? UNLOCK_SESSION_DESCRIPTION : LOCK_SESSION_DESCRIPTION
        }
        confirmLabel={locked ? UNLOCK_SESSION_CONFIRM : LOCK_SESSION_CONFIRM}
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
