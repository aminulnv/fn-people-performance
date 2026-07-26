import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cx } from '@/lib/cx'

export type PaginationProps = {
  page: number
  pageCount: number
  onPageChange: (page: number) => void
  className?: string
  /** Visible page number buttons around the current page. */
  siblingCount?: number
}

function buildPages(page: number, pageCount: number, siblingCount: number) {
  if (pageCount <= 1) return [1]

  const pages = new Set<number>([1, pageCount, page])
  for (let i = 1; i <= siblingCount; i += 1) {
    pages.add(page - i)
    pages.add(page + i)
  }

  const sorted = [...pages]
    .filter((value) => value >= 1 && value <= pageCount)
    .sort((a, b) => a - b)

  const result: Array<number | 'ellipsis'> = []
  for (let i = 0; i < sorted.length; i += 1) {
    const current = sorted[i]
    const previous = sorted[i - 1]
    if (previous !== undefined && current - previous > 1) {
      result.push('ellipsis')
    }
    result.push(current)
  }
  return result
}

export function Pagination({
  page,
  pageCount,
  onPageChange,
  className,
  siblingCount = 1,
}: PaginationProps) {
  if (pageCount < 1) return null

  const pages = buildPages(page, pageCount, siblingCount)
  const canPrev = page > 1
  const canNext = page < pageCount

  return (
    <nav
      className={cx('pd-pagination', className)}
      aria-label="Pagination"
    >
      <button
        type="button"
        className="pd-pagination__btn"
        aria-label="Previous page"
        disabled={!canPrev}
        onClick={() => onPageChange(page - 1)}
      >
        <ChevronLeft size={16} strokeWidth={2.25} aria-hidden />
      </button>
      {pages.map((entry, index) =>
        entry === 'ellipsis' ? (
          <span
            key={`ellipsis-${index}`}
            className="pd-pagination__ellipsis"
            aria-hidden
          >
            …
          </span>
        ) : (
          <button
            key={entry}
            type="button"
            className={cx(
              'pd-pagination__btn',
              'pd-pagination__page',
              entry === page && 'is-current',
            )}
            aria-label={`Page ${entry}`}
            aria-current={entry === page ? 'page' : undefined}
            onClick={() => onPageChange(entry)}
          >
            {entry}
          </button>
        ),
      )}
      <button
        type="button"
        className="pd-pagination__btn"
        aria-label="Next page"
        disabled={!canNext}
        onClick={() => onPageChange(page + 1)}
      >
        <ChevronRight size={16} strokeWidth={2.25} aria-hidden />
      </button>
    </nav>
  )
}
