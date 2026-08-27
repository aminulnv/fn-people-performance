import type { ReactNode } from 'react'
import { Switch } from '@/components/ui'
import { cx } from '@/lib/cx'
import type { CycleModules } from '@/lib/reviews/types'
import { HintIcon } from './HintIcon'

export type CycleModuleId = keyof CycleModules

type CycleModulesFieldsProps = {
  modules: CycleModules
  onChange: (next: CycleModules) => void
  className?: string
}

const MODULE_COPY: Record<
  CycleModuleId,
  { title: string; hint: string; enableLabel: string }
> = {
  goals: {
    title: 'Goals',
    hint: 'People write and update goals.',
    enableLabel: 'Enable Goals',
  },
  reviews: {
    title: 'Reviews',
    hint: 'Managers rate people and release grades.',
    enableLabel: 'Enable Reviews',
  },
}

const MODULE_ORDER: CycleModuleId[] = ['goals', 'reviews']

export function CycleModuleField({
  id,
  enabled,
  onChange,
}: {
  id: CycleModuleId
  enabled: boolean
  onChange: (enabled: boolean) => void
}) {
  const item = MODULE_COPY[id]
  return (
    <div className="pd-reviews-stage-list__row">
      <div className="pd-reviews-stage-list__copy pd-reviews-edit-card__head">
        <p className="pd-reviews-stage-list__title">{item.title}</p>
        <HintIcon content={item.hint} label={`About ${item.title}`} />
        <Switch
          label={item.enableLabel}
          className="pd-reviews-type-list__switch"
          checked={enabled}
          onChange={(event) => onChange(event.target.checked)}
        />
      </div>
    </div>
  )
}

export function ModuleSettingsLock({
  locked,
  label,
  children,
}: {
  locked: boolean
  label: string
  children: ReactNode
}) {
  return (
    <fieldset
      className={cx('pd-reviews-module-body', locked && 'is-locked')}
      disabled={locked}
      aria-disabled={locked || undefined}
    >
      <legend className="pd-sr-only">
        {locked ? `${label} locked until enabled` : label}
      </legend>
      {children}
    </fieldset>
  )
}

export function CycleModulesFields({
  modules,
  onChange,
  className,
}: CycleModulesFieldsProps) {
  return (
    <ul className={cx('pd-reviews-stage-list', className)}>
      {MODULE_ORDER.map((id) => (
        <li key={id} className="pd-reviews-stage-list__item">
          <CycleModuleField
            id={id}
            enabled={modules[id]}
            onChange={(enabled) => onChange({ ...modules, [id]: enabled })}
          />
        </li>
      ))}
    </ul>
  )
}
