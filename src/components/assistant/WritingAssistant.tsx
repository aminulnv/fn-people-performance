import { useEffect, useId, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { AnimatePresence, motion, type Transition } from 'motion/react'
import { X } from 'lucide-react'
import {
  AssistantCharacter,
  type AssistantLook,
  type AssistantMood,
} from './AssistantCharacter'
import { tipForPath } from './tips'
import { cx } from '@/lib/cx'

const STORAGE_KEY = 'pd-assistant-dismissed'
const WELCOME_DELAY_MS = 380
const LOOK_FULL_DISTANCE_PX = 140
const EYE_VIEWBOX = { x: 48 / 96, y: 27 / 112 }

/**
 * Peek uses a clipped stage: only the top of the character (eyes) can stick
 * into view from the bottom-right corner. Positive y pushes the body down
 * out of the clip; positive x tucks it further behind the right edge.
 *
 * Pose must stay on the `animate` prop (not only imperative animate) so
 * whileHover / whileTap return to home instead of snapping to `initial`.
 */
const HIDDEN_POSE = { x: 30, y: 94, rotate: -4, opacity: 1 }
const PEEK_POSE = { x: 24, y: 60, rotate: -10, opacity: 1 }
const DUCK_POSE = { x: 28, y: 72, rotate: -3, opacity: 1 }
const HOME_POSE = { x: 0, y: 0, rotate: 0, opacity: 1 }

const SNAP: Transition = { duration: 0 }
const PEEK_SPRING: Transition = { type: 'spring', stiffness: 420, damping: 26, mass: 0.75 }
const DUCK_SPRING: Transition = { type: 'spring', stiffness: 460, damping: 28 }
const WALK_SPRING: Transition = { type: 'spring', stiffness: 180, damping: 18, mass: 1.05 }
const HOVER_SPRING: Transition = { type: 'spring', stiffness: 420, damping: 24 }

const PEEK_LOOK: AssistantLook = { x: -0.9, y: -0.25 }

type EnterStage = 'waiting' | 'peek' | 'walk' | 'done'
type AssistantPose = typeof HIDDEN_POSE

function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

export function WritingAssistant() {
  const { pathname } = useLocation()
  const tip = tipForPath(pathname)
  const titleId = useId()
  const panelId = useId()
  const panelFocusRef = useRef<HTMLButtonElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const lookFrameRef = useRef(0)
  const [isOpen, setIsOpen] = useState(false)
  const [mood, setMood] = useState<AssistantMood>('idle')
  const [hasAutoShown, setHasAutoShown] = useState(false)
  const [look, setLook] = useState<AssistantLook>({ x: 0, y: 0 })
  const [enterStage, setEnterStage] = useState<EnterStage>('waiting')
  const [pose, setPose] = useState<AssistantPose>(HIDDEN_POSE)
  const [poseTransition, setPoseTransition] = useState<Transition>(SNAP)
  const isEntering = enterStage !== 'done'

  useEffect(() => {
    let cancelled = false
    const timers: number[] = []

    const wait = (ms: number) =>
      new Promise<void>((resolve) => {
        timers.push(
          window.setTimeout(() => {
            resolve()
          }, ms),
        )
      })

    const goTo = (next: AssistantPose, transition: Transition) => {
      setPoseTransition(transition)
      setPose(next)
    }

    async function runEntrance() {
      if (prefersReducedMotion()) {
        goTo(HOME_POSE, SNAP)
        setEnterStage('done')
        setMood('idle')
        setLook({ x: 0, y: 0 })
        return
      }

      setEnterStage('waiting')
      goTo(HIDDEN_POSE, SNAP)

      await wait(380)
      if (cancelled) return

      // Only the eyes / top rim peep through the clipped stage
      setEnterStage('peek')
      setMood('tip')
      setLook(PEEK_LOOK)
      goTo(PEEK_POSE, PEEK_SPRING)

      await wait(720)
      if (cancelled) return

      setLook({ x: -1, y: -0.05 })
      await wait(240)
      if (cancelled) return
      setLook({ x: -0.65, y: -0.55 })
      await wait(280)
      if (cancelled) return

      // Duck back behind the corner
      setLook({ x: -0.4, y: -0.2 })
      goTo(DUCK_POSE, DUCK_SPRING)

      await wait(320)
      if (cancelled) return

      // Walk fully into the stage frame
      setEnterStage('walk')
      setMood('idle')
      setLook({ x: -0.2, y: -0.08 })
      goTo(HOME_POSE, WALK_SPRING)

      await wait(700)
      if (cancelled) return

      setEnterStage('done')
      // Keep HOME on the animate prop permanently - gesture props exit to this
      goTo(HOME_POSE, SNAP)
      setMood('celebrate')
      await wait(420)
      if (cancelled) return
      setMood('idle')
      setLook({ x: 0, y: 0 })
    }

    void runEntrance()

    return () => {
      cancelled = true
      for (const id of timers) window.clearTimeout(id)
    }
  }, [])

  useEffect(() => {
    if (hasAutoShown || enterStage !== 'done') return
    if (typeof sessionStorage !== 'undefined' && sessionStorage.getItem(STORAGE_KEY) === '1') {
      setHasAutoShown(true)
      return
    }

    const timer = window.setTimeout(() => {
      setIsOpen(true)
      setMood('tip')
      setHasAutoShown(true)
    }, WELCOME_DELAY_MS)

    return () => window.clearTimeout(timer)
  }, [enterStage, hasAutoShown])

  useEffect(() => {
    if (!isOpen) return
    panelFocusRef.current?.focus()
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) return

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsOpen(false)
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [isOpen])

  useEffect(() => {
    if (isEntering) return
    if (isOpen) {
      setMood('tip')
      return
    }
    setMood('idle')
  }, [isOpen, pathname, isEntering])

  useEffect(() => {
    if (prefersReducedMotion()) return

    const updateLook = (clientX: number, clientY: number) => {
      if (enterStage !== 'done') return
      const el = triggerRef.current
      if (!el) return

      const rect = el.getBoundingClientRect()
      const eyeX = rect.left + rect.width * EYE_VIEWBOX.x
      const eyeY = rect.top + rect.height * EYE_VIEWBOX.y
      const dx = clientX - eyeX
      const dy = clientY - eyeY
      const distance = Math.hypot(dx, dy)

      if (distance < 0.5) {
        setLook({ x: 0, y: 0 })
        return
      }

      const strength = Math.min(1, distance / LOOK_FULL_DISTANCE_PX)
      setLook({
        x: (dx / distance) * strength,
        y: (dy / distance) * strength,
      })
    }

    const onPointerMove = (event: PointerEvent) => {
      if (lookFrameRef.current) return
      const { clientX, clientY } = event
      lookFrameRef.current = window.requestAnimationFrame(() => {
        lookFrameRef.current = 0
        updateLook(clientX, clientY)
      })
    }

    window.addEventListener('pointermove', onPointerMove, { passive: true })
    return () => {
      window.removeEventListener('pointermove', onPointerMove)
      if (lookFrameRef.current) window.cancelAnimationFrame(lookFrameRef.current)
    }
  }, [enterStage])

  const close = (persistDismiss = false) => {
    setIsOpen(false)
    setMood('idle')
    if (persistDismiss && typeof sessionStorage !== 'undefined') {
      sessionStorage.setItem(STORAGE_KEY, '1')
    }
  }

  const toggle = () => {
    if (isEntering) return
    setIsOpen((open) => {
      const next = !open
      setMood(next ? 'celebrate' : 'idle')
      if (next) {
        window.setTimeout(() => setMood('tip'), 420)
      }
      return next
    })
  }

  return (
    <div
      className={cx(
        'pd-assistant',
        `pd-assistant--enter-${enterStage}`,
        isEntering && 'pd-assistant--entering',
      )}
    >
      <AnimatePresence>
        {isOpen ? (
          <motion.div
            id={panelId}
            key="assistant-panel"
            className="pd-assistant__panel is-open"
            role="dialog"
            aria-modal="false"
            aria-labelledby={titleId}
            initial={{ opacity: 0, y: 14, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 420, damping: 30, mass: 0.8 }}
          >
            <div className="pd-assistant__panel-head">
              <p className="pd-assistant__eyebrow">Quick Tip</p>
              <button
                ref={panelFocusRef}
                type="button"
                className="pd-assistant__icon-btn"
                aria-label="Close Tip"
                onClick={() => close()}
              >
                <X size={16} strokeWidth={2.25} aria-hidden="true" />
              </button>
            </div>
            <h2 id={titleId} className="pd-assistant__title">
              {tip.title}
            </h2>
            <p className="pd-assistant__body">{tip.body}</p>
            <div className="pd-assistant__actions">
              <button type="button" className="pd-assistant__btn" onClick={() => close()}>
                Got It
              </button>
              <button
                type="button"
                className="pd-assistant__btn pd-assistant__btn--quiet"
                onClick={() => close(true)}
              >
                Hide for Now
              </button>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <div className="pd-assistant__stage" aria-hidden={isEntering || undefined}>
        <motion.button
          ref={triggerRef}
          type="button"
          className={cx(
            'pd-assistant__trigger',
            isOpen && 'is-open',
            enterStage === 'walk' && 'is-walking',
          )}
          aria-expanded={isOpen}
          aria-controls={panelId}
          aria-label={isOpen ? 'Hide Tip' : 'Show Tip'}
          tabIndex={isEntering ? -1 : 0}
          initial={HIDDEN_POSE}
          animate={pose}
          transition={poseTransition}
          whileHover={isEntering ? undefined : { y: -3, scale: 1.04, transition: HOVER_SPRING }}
          whileTap={isEntering ? undefined : { scale: 0.96 }}
          onClick={toggle}
        >
          <AssistantCharacter mood={mood} look={look} />
        </motion.button>
      </div>
    </div>
  )
}
