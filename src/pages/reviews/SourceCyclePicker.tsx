import { formatDateRange } from '@/lib/reviews/periods'
import type { ReviewCycle } from '@/lib/reviews/types'

type SourceCyclePickerProps = {
  cycles: ReviewCycle[]
  selectedIds: string[]
  onChange: (nextIds: string[]) => void
  emptyLabel?: string
}

export function SourceCyclePicker({
  cycles,
  selectedIds,
  onChange,
  emptyLabel = 'No other cycles to include yet.',
}: SourceCyclePickerProps) {
  if (cycles.length === 0) {
    return (
      <p className="pd-reviews-create__status" role="status">
        {emptyLabel}
      </p>
    )
  }

  return (
    <ul className="pd-reviews-create__list">
      {cycles.map((item) => {
        const checked = selectedIds.includes(item.id)
        return (
          <li key={item.id}>
            <label className="pd-check pd-reviews-create__row">
              <input
                type="checkbox"
                className="pd-check__input"
                checked={checked}
                onChange={() => {
                  onChange(
                    checked
                      ? selectedIds.filter((id) => id !== item.id)
                      : [...selectedIds, item.id],
                  )
                }}
              />
              <span className="pd-check__box" aria-hidden />
              <span className="pd-reviews-create__row-text">
                <span className="pd-reviews-create__row-name">{item.name}</span>
                <span className="pd-reviews-create__row-meta">
                  {formatDateRange(item.startDate, item.endDate)}
                </span>
              </span>
            </label>
          </li>
        )
      })}
    </ul>
  )
}
