import { useRef, type ReactNode } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'

type VirtualListProps<T> = {
  items: T[]
  estimateSize: number
  /** Virtualize only when the list is at least this long. */
  threshold?: number
  className?: string
  getKey: (item: T, index: number) => string
  renderItem: (item: T, index: number) => ReactNode
}

/**
 * Windowed list for feeds/tables that may grow large.
 * Below `threshold`, renders a plain map to avoid virtualizer overhead.
 */
export function VirtualList<T>({
  items,
  estimateSize,
  threshold = 24,
  className,
  getKey,
  renderItem,
}: VirtualListProps<T>) {
  const parentRef = useRef<HTMLDivElement>(null)
  const shouldVirtualize = items.length >= threshold

  const virtualizer = useVirtualizer({
    count: shouldVirtualize ? items.length : 0,
    getScrollElement: () => parentRef.current,
    estimateSize: () => estimateSize,
    overscan: 6,
  })

  if (!shouldVirtualize) {
    return (
      <ul className={className}>
        {items.map((item, index) => (
          <li key={getKey(item, index)}>{renderItem(item, index)}</li>
        ))}
      </ul>
    )
  }

  return (
    <div
      ref={parentRef}
      className={className}
      style={{ overflow: 'auto', maxHeight: 'min(24rem, 60vh)' }}
    >
      <ul
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
          margin: 0,
          padding: 0,
          listStyle: 'none',
        }}
      >
        {virtualizer.getVirtualItems().map((row) => {
          const item = items[row.index]
          return (
            <li
              key={getKey(item, row.index)}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: `${row.size}px`,
                transform: `translateY(${row.start}px)`,
              }}
            >
              {renderItem(item, row.index)}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
