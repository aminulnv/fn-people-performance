import { useId, useState, type ReactNode } from 'react'
import { ChevronDown } from 'lucide-react'
import { cx } from '@/lib/cx'

export type AccordionItem = {
  id: string
  title: string
  content: ReactNode
  disabled?: boolean
}

export type AccordionProps = {
  items: AccordionItem[]
  /** Allow multiple panels open at once. */
  multiple?: boolean
  defaultOpenIds?: string[]
  className?: string
}

export function Accordion({
  items,
  multiple = false,
  defaultOpenIds = [],
  className,
}: AccordionProps) {
  const baseId = useId()
  const [openIds, setOpenIds] = useState<string[]>(defaultOpenIds)

  const toggle = (id: string) => {
    setOpenIds((current) => {
      const isOpen = current.includes(id)
      if (multiple) {
        return isOpen ? current.filter((value) => value !== id) : [...current, id]
      }
      return isOpen ? [] : [id]
    })
  }

  return (
    <div className={cx('pd-accordion', className)}>
      {items.map((item) => {
        const open = openIds.includes(item.id)
        const panelId = `${baseId}-panel-${item.id}`
        const triggerId = `${baseId}-trigger-${item.id}`

        return (
          <div
            key={item.id}
            className={cx('pd-accordion__item', open && 'is-open')}
          >
            <h3 className="pd-accordion__heading">
              <button
                id={triggerId}
                type="button"
                className="pd-accordion__trigger"
                aria-expanded={open}
                aria-controls={panelId}
                disabled={item.disabled}
                onClick={() => toggle(item.id)}
              >
                <span>{item.title}</span>
                <ChevronDown
                  className="pd-accordion__chevron"
                  size={16}
                  strokeWidth={2.25}
                  aria-hidden
                />
              </button>
            </h3>
            <div
              id={panelId}
              role="region"
              aria-labelledby={triggerId}
              className="pd-accordion__panel"
              hidden={!open}
            >
              {open ? (
                <div className="pd-accordion__content">{item.content}</div>
              ) : null}
            </div>
          </div>
        )
      })}
    </div>
  )
}
