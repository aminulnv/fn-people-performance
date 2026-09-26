import { useState } from 'react'
import { Modal } from '@/components/ui'
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

/** Live / Locked chip + session lock control for the page header. */
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

  return (
    <>
      {canLock ? (
        <button
          type="button"
          className={cx('pd-cal-session-badge', locked && 'is-locked')}
          onClick={() => setLockOpen(true)}
          aria-label={
            locked
              ? `Session locked${changes ? `, ${changes} rating changes` : ''}. Change lock.`
              : `Session live${changes ? `, ${changes} rating changes` : ''}. Change lock.`
          }
        >
          {locked ? 'Locked' : 'Live'}
          {changes > 0 ? ` · ${changes}` : null}
        </button>
      ) : (
        <span
          className={cx('pd-cal-session-badge', locked && 'is-locked')}
          aria-label={
            locked
              ? `Session locked${changes ? `, ${changes} rating changes` : ''}`
              : `Session live${changes ? `, ${changes} rating changes` : ''}`
          }
        >
          {locked ? 'Locked' : 'Live'}
          {changes > 0 ? ` · ${changes}` : null}
        </span>
      )}

      <Modal
        open={lockOpen}
        onClose={() => {
          if (!locking) setLockOpen(false)
        }}
        title={locked ? 'Unlock session?' : 'Lock session?'}
        description={
          locked
            ? 'Unlocking lets calibrators edit ratings and notes again.'
            : 'Locking freezes ratings and notes for this sitting.'
        }
        actions={
          <>
            <button
              type="button"
              className="pd-btn pd-btn--secondary pd-btn--sm pd-btn--pill"
              disabled={locking}
              onClick={() => setLockOpen(false)}
            >
              Cancel
            </button>
            <button
              type="button"
              className="pd-btn pd-btn--primary pd-btn--sm pd-btn--pill"
              disabled={locking}
              onClick={() => {
                void applyLock()
              }}
            >
              {locking
                ? locked
                  ? 'Unlocking…'
                  : 'Locking…'
                : locked
                  ? 'Unlock session'
                  : 'Lock session'}
            </button>
          </>
        }
      >
        {lockError ? (
          <p className="pd-cal-rt__override-error" role="alert">
            {lockError}
          </p>
        ) : null}
      </Modal>
    </>
  )
}
