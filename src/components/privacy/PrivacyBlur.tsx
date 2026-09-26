import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  AnimatePresence,
  motion,
  useReducedMotion,
  type Transition,
} from 'motion/react'
import { isTypingTarget } from '@/lib/search'
import { publicUrl } from '@/lib/publicUrl'
import '@/styles/privacy-blur.css'

const ROAD_BLOCK_ICON = publicUrl('images/3D Icons/road-block-sign.png')

/** Keep the Image alive so the browser does not cancel the fetch. */
const warmedIcon = new Image()
warmedIcon.decoding = 'async'
warmedIcon.src = ROAD_BLOCK_ICON

if (typeof document !== 'undefined') {
  const preloadId = 'privacy-blur-icon-preload'
  if (!document.getElementById(preloadId)) {
    const link = document.createElement('link')
    link.id = preloadId
    link.rel = 'preload'
    link.as = 'image'
    link.href = ROAD_BLOCK_ICON
    document.head.appendChild(link)
  }
}

const EASE_OUT: [number, number, number, number] = [0.23, 1, 0.32, 1]

const VEIL: Transition = { duration: 0.2, ease: EASE_OUT }

const DROP_SPRING: Transition = {
  type: 'spring',
  stiffness: 420,
  damping: 20,
  mass: 0.8,
  delay: 0.12,
}

const LIFT_OUT: Transition = { duration: 0.22, ease: EASE_OUT }

const TITLE_IN: Transition = {
  duration: 0.24,
  ease: EASE_OUT,
  delay: 0.28,
}

const HINT_IN: Transition = {
  duration: 0.22,
  ease: EASE_OUT,
  delay: 0.36,
}

/**
 * Press Space (outside form fields) to blur the screen. Space, Escape, or
 * click reveals it. Veil first, then barricade drops on top (visible motion).
 */
export function PrivacyBlur() {
  const [active, setActive] = useState(false)
  const reduceMotion = useReducedMotion()
  const activeRef = useRef(active)
  const previousOverflowRef = useRef('')
  activeRef.current = active

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.isComposing) return

      if (active && event.key === 'Escape') {
        event.preventDefault()
        setActive(false)
        return
      }

      if (event.key !== ' ' && event.code !== 'Space') return
      if (event.metaKey || event.ctrlKey || event.altKey) return
      if (!active && isTypingTarget(event.target)) return

      event.preventDefault()
      setActive((prev) => !prev)
    }

    window.addEventListener('keydown', onKeyDown, true)
    return () => window.removeEventListener('keydown', onKeyDown, true)
  }, [active])

  useEffect(() => {
    if (!active) return
    previousOverflowRef.current = document.body.style.overflow
    document.body.style.overflow = 'hidden'
  }, [active])

  const clearPrivacyLock = () => {
    if (activeRef.current) return
    document.body.style.overflow = previousOverflowRef.current
  }

  return createPortal(
    <AnimatePresence onExitComplete={clearPrivacyLock}>
      {active ? (
        <div
          key="privacy-blur"
          className="privacy-blur"
          role="dialog"
          aria-modal="true"
          aria-label="Privacy Mode Activated"
          onClick={() => setActive(false)}
        >
          {/* Frost only — fades by itself so content above stays sharp */}
          <motion.div
            className="privacy-blur__veil"
            aria-hidden
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: VEIL }}
            transition={VEIL}
          />

          <div className="privacy-blur__content">
            <div className="privacy-blur__stage">
              <motion.span
                className="privacy-blur__shadow"
                aria-hidden
                initial={
                  reduceMotion
                    ? { opacity: 0 }
                    : { opacity: 0, transform: 'scaleX(0.4)' }
                }
                animate={
                  reduceMotion
                    ? { opacity: 0.5 }
                    : { opacity: 0.5, transform: 'scaleX(1)' }
                }
                exit={{ opacity: 0, transition: LIFT_OUT }}
                transition={reduceMotion ? VEIL : DROP_SPRING}
              />
              <motion.img
                className="privacy-blur__icon"
                src={ROAD_BLOCK_ICON}
                alt=""
                width={120}
                height={120}
                decoding="async"
                draggable={false}
                initial={
                  reduceMotion
                    ? { opacity: 0 }
                    : {
                        opacity: 0,
                        transform: 'translateY(-4.5rem) rotate(-12deg) scale(0.94)',
                      }
                }
                animate={
                  reduceMotion
                    ? { opacity: 1 }
                    : {
                        opacity: 1,
                        transform: 'translateY(0) rotate(0deg) scale(1)',
                      }
                }
                exit={
                  reduceMotion
                    ? { opacity: 0, transition: VEIL }
                    : {
                        opacity: 0,
                        transform: 'translateY(-3rem) rotate(8deg) scale(0.96)',
                        transition: LIFT_OUT,
                      }
                }
                transition={reduceMotion ? VEIL : DROP_SPRING}
              />
            </div>

            <motion.p
              className="privacy-blur__message"
              initial={
                reduceMotion
                  ? { opacity: 0 }
                  : { opacity: 0, transform: 'translateY(0.6rem)' }
              }
              animate={
                reduceMotion
                  ? { opacity: 1 }
                  : { opacity: 1, transform: 'translateY(0)' }
              }
              exit={{ opacity: 0, transition: VEIL }}
              transition={reduceMotion ? VEIL : TITLE_IN}
            >
              Privacy Mode Activated
              <motion.span
                className="privacy-blur__hint"
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.85 }}
                exit={{ opacity: 0, transition: VEIL }}
                transition={reduceMotion ? VEIL : HINT_IN}
              >
                Press Space or Esc to reveal
              </motion.span>
            </motion.p>
          </div>
        </div>
      ) : null}
    </AnimatePresence>,
    document.body,
  )
}
