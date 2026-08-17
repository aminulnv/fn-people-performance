import { Rows3, Rows4 } from 'lucide-react'
import { SegmentedControl } from '@/components/ui'
import type { TableDensity } from '@/pages/people/prefs'

const TABLE_DENSITIES: {
  id: TableDensity
  label: string
  icon: typeof Rows3
}[] = [
  {
    id: 'comfortable',
    label: 'Comfortable row spacing',
    icon: Rows3,
  },
  {
    id: 'condensed',
    label: 'Condensed row spacing',
    icon: Rows4,
  },
]

export type TableDensityToggleProps = {
  value: TableDensity
  onChange: (density: TableDensity) => void
  className?: string
  buttonClassName?: string
}

export function TableDensityToggle({
  value,
  onChange,
  className,
  buttonClassName,
}: TableDensityToggleProps) {
  return (
    <SegmentedControl
      className={className}
      buttonClassName={buttonClassName}
      options={TABLE_DENSITIES.map(({ id, label, icon: Icon }) => ({
        id,
        label: (
          <>
            <Icon size={14} strokeWidth={2} aria-hidden />
            <span className="pd-sr-only">{label}</span>
          </>
        ),
      }))}
      value={value}
      onChange={onChange}
      aria-label="Table row density"
    />
  )
}

export function tableDensityWrapClass(density: TableDensity): string {
  return [
    'pd-people__table-wrap',
    `pd-people__table-wrap--${density}`,
  ].join(' ')
}
