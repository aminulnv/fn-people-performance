import {
  useEffect,
  useId,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type ReactNode,
} from 'react'
import { cx } from '@/lib/cx'
import { useHoverMenu } from '@/layout/useHoverMenu'

export type DropdownMenuItem = {
  id: string
  label: string
  onSelect: () => void
  danger?: boolean
  disabled?: boolean
  icon?: ReactNode
}

export type DropdownMenuProps = {
  label: string
  items: DropdownMenuItem[]
  trigger?: ReactNode
  align?: 'start' | 'end'
  className?: string
  triggerProps?: ButtonHTMLAttributes<HTMLButtonElement>
}

export function DropdownMenu({
  label,
  items,
  trigger,
  align = 'start',
  className,
  triggerProps,
}: DropdownMenuProps) {
  const menuId = useId()
  const [activeIndex, setActiveIndex] = useState(0)
  const itemRefs = useRef<Array<HTMLButtonElement | null>>([])
  const { open, setOpen, containerRef, hoverHandlers, toggle } = useHoverMenu({
    closeOnEscape: true,
  })

  const enabledItems = items.filter((item) => !item.disabled)

  useEffect(() => {
    if (!open) return
    const firstEnabled = items.findIndex((item) => !item.disabled)
    setActiveIndex(firstEnabled >= 0 ? firstEnabled : 0)
  }, [open, items])

  const moveActive = (delta: number) => {
    if (!enabledItems.length) return
    const currentId = items[activeIndex]?.id
    const enabledIndex = enabledItems.findIndex((item) => item.id === currentId)
    const nextEnabled =
      enabledItems[
        (enabledIndex + delta + enabledItems.length) % enabledItems.length
      ]
    const nextIndex = items.findIndex((item) => item.id === nextEnabled.id)
    setActiveIndex(nextIndex)
    queueMicrotask(() => itemRefs.current[nextIndex]?.focus())
  }

  return (
    <div
      ref={containerRef}
      className={cx('pd-menu', className)}
      {...hoverHandlers}
    >
      <button
        type="button"
        className={cx('pd-menu__trigger', triggerProps?.className)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        {...triggerProps}
        onClick={(event) => {
          triggerProps?.onClick?.(event)
          toggle()
        }}
      >
        {trigger ?? label}
      </button>
      {open ? (
        <div
          id={menuId}
          role="menu"
          aria-label={label}
          className={cx('pd-menu__panel', `pd-menu__panel--${align}`)}
        >
          {items.map((item, index) => (
            <button
              key={item.id}
              ref={(node) => {
                itemRefs.current[index] = node
              }}
              type="button"
              role="menuitem"
              className={cx(
                'pd-menu__item',
                item.danger && 'pd-menu__item--danger',
                index === activeIndex && 'is-active',
              )}
              disabled={item.disabled}
              tabIndex={index === activeIndex ? 0 : -1}
              onMouseEnter={() => {
                if (!item.disabled) setActiveIndex(index)
              }}
              onClick={() => {
                item.onSelect()
                setOpen(false)
              }}
              onKeyDown={(event) => {
                if (event.key === 'ArrowDown') {
                  event.preventDefault()
                  moveActive(1)
                } else if (event.key === 'ArrowUp') {
                  event.preventDefault()
                  moveActive(-1)
                } else if (event.key === 'Home') {
                  event.preventDefault()
                  const first = items.findIndex((entry) => !entry.disabled)
                  if (first >= 0) setActiveIndex(first)
                } else if (event.key === 'End') {
                  event.preventDefault()
                  for (let i = items.length - 1; i >= 0; i -= 1) {
                    if (!items[i].disabled) {
                      setActiveIndex(i)
                      break
                    }
                  }
                }
              }}
            >
              {item.icon ? (
                <span className="pd-menu__item-icon" aria-hidden>
                  {item.icon}
                </span>
              ) : null}
              {item.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  )
}
