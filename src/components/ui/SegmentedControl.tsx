import {
  startTransition,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type HTMLAttributes,
  type ReactNode,
} from 'react'
import { cx } from '@/lib/cx'

export type SegmentedOption<T extends string = string> = {
  id: T
  label: ReactNode
}

export type SegmentedControlProps<T extends string = string> = Omit<
  HTMLAttributes<HTMLDivElement>,
  'onChange'
> & {
  options: readonly SegmentedOption<T>[]
  value: T
  onChange: (value: T) => void
  /** Extra class on each segment button. */
  buttonClassName?: string
}

type IndicatorStyle = {
  left: number
  width: number
  height: number
  top: number
}

/**
 * Sliding segmented control — same motion as NEXT-Performance top-bar sub-nav
 * (`translate3d` + width), with optimistic selection so a heavy parent re-render
 * (e.g. expanding the people table) cannot stall the thumb.
 */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  className,
  buttonClassName,
  'aria-label': ariaLabel = 'Options',
  ...props
}: SegmentedControlProps<T>) {
  const rootRef = useRef<HTMLDivElement>(null)
  const buttonRefs = useRef(new Map<T, HTMLButtonElement>())
  /** Optimistic selection — moves the thumb immediately on click. */
  const [visualValue, setVisualValue] = useState(value)
  const [indicator, setIndicator] = useState<IndicatorStyle | null>(null)
  const [indicatorReady, setIndicatorReady] = useState(false)
  const visualValueRef = useRef(visualValue)
  visualValueRef.current = visualValue

  useEffect(() => {
    setVisualValue(value)
  }, [value])

  const updateIndicator = useCallback(() => {
    const button = buttonRefs.current.get(visualValueRef.current)
    if (!button) return

    setIndicator({
      left: button.offsetLeft,
      width: button.offsetWidth,
      height: button.offsetHeight,
      top: button.offsetTop,
    })
    setIndicatorReady(true)
  }, [])

  useLayoutEffect(() => {
    updateIndicator()
  }, [updateIndicator, visualValue, options])

  useEffect(() => {
    const root = rootRef.current
    if (!root || typeof ResizeObserver === 'undefined') return

    const observer = new ResizeObserver(() => updateIndicator())
    observer.observe(root)
    for (const button of buttonRefs.current.values()) {
      observer.observe(button)
    }
    window.addEventListener('resize', updateIndicator)
    return () => {
      observer.disconnect()
      window.removeEventListener('resize', updateIndicator)
    }
  }, [updateIndicator, options])

  const select = (id: T) => {
    if (id === visualValue) return
    setVisualValue(id)
    startTransition(() => onChange(id))
  }

  return (
    <div
      {...props}
      ref={rootRef}
      className={cx('pd-segmented', className)}
      role="group"
      aria-label={ariaLabel}
    >
      {indicator ? (
        <span
          className="pd-segmented__thumb"
          aria-hidden
          style={{
            top: indicator.top,
            width: indicator.width,
            height: indicator.height,
            opacity: indicatorReady ? 1 : 0,
            transform: `translate3d(${indicator.left}px, 0, 0)`,
          }}
        />
      ) : null}

      {options.map((option) => {
        const isActive = option.id === visualValue
        return (
          <button
            key={option.id}
            ref={(node) => {
              if (node) buttonRefs.current.set(option.id, node)
              else buttonRefs.current.delete(option.id)
            }}
            type="button"
            className={cx(
              'pd-segmented__btn',
              buttonClassName,
              isActive && 'is-active',
            )}
            aria-pressed={isActive}
            onClick={() => select(option.id)}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}
