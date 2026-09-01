import { useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { CornerDownRight, CornerLeftDown } from 'lucide-react'
import { Avatar, ListboxSelect, Tooltip } from '@/components/ui'
import { avatarStyle } from '@/lib/employees/avatar'
import {
  applyCascadeSelection,
  selectedCascadeOption,
  type CascadeGoalOption,
  type CascadeRecipient,
  type CascadeToOption,
  type LineManagerCascade,
} from '@/lib/goals/operations'
import type { Goal } from '@/lib/goals/types'
import {
  GoalCascadeTargetDialog,
  type CascadeTarget,
} from './GoalCascadeTargetDialog'

const CREATE_CASCADE_VALUE = '__create_cascade__'

export type CascadeGoalHref = (
  personId: string,
  goalId: string,
) => string | undefined

export function CascadeLabel({
  children,
  as: Tag = 'span',
  className,
  direction,
  iconOnly = false,
}: {
  children: ReactNode
  as?: 'span' | 'p'
  className?: string
  direction: 'from' | 'to'
  iconOnly?: boolean
}) {
  const Icon = direction === 'from' ? CornerLeftDown : CornerDownRight
  const tip =
    typeof children === 'string'
      ? children
      : direction === 'from'
        ? 'Cascading from'
        : 'Cascaded to'
  const classNames = `pd-goal-cascade__heading${iconOnly ? ' pd-goal-cascade__heading--icon' : ''
    }${className ? ` ${className}` : ''}`

  if (iconOnly) {
    return (
      <Tooltip content={tip} side="top" portal delayMs={80}>
        <span className={classNames} role="img" aria-label={tip} tabIndex={0}>
          <Icon size={13} strokeWidth={2.25} aria-hidden />
        </span>
      </Tooltip>
    )
  }

  return (
    <Tag className={classNames}>
      <Icon size={13} strokeWidth={2.25} aria-hidden />
      {children}
    </Tag>
  )
}

export const EMPTY_LINE_MANAGER_CASCADE: LineManagerCascade = {
  managerName: null,
  options: [],
}

export function cascadeReadout(
  goal: Pick<Goal, 'cascadedFromGoalId' | 'linkedGoalLabel'>,
  options: CascadeGoalOption[],
): string | null {
  const selected = selectedCascadeOption(goal, options)
  if (!selected) return null
  if (selected.managerName) return `${selected.title} · ${selected.managerName}`
  return selected.title
}

export function cascadeRecipientLabel(recipient: CascadeRecipient): string {
  return `${recipient.goalTitle} · ${recipient.personName}`
}

export function cascadedToReadout(recipients: CascadeRecipient[]): string | null {
  if (recipients.length === 0) return null
  return recipients.map(cascadeRecipientLabel).join(', ')
}

export function selectedCascadePerson(
  goal: Pick<Goal, 'cascadedFromGoalId' | 'linkedGoalLabel'>,
  cascadeFrom: LineManagerCascade,
): CascadeGoalOption | null {
  const selected = selectedCascadeOption(goal, cascadeFrom.options)
  if (!selected) return null
  return {
    ...selected,
    managerId: selected.managerId || cascadeFrom.managerId || undefined,
    managerName: selected.managerName || cascadeFrom.managerName || '',
    managerAvatarUrl:
      selected.managerAvatarUrl || cascadeFrom.managerAvatarUrl,
  }
}

export function CascadeGoalTip({
  title,
  ownerName,
  ownerAvatarUrl,
}: {
  title: string
  ownerName?: string
  ownerAvatarUrl?: string
}) {
  return (
    <section className="pd-goal-cascade-tip">
      <p className="pd-goal-cascade-tip__title">{title}</p>
      {ownerName ? (
        <p className="pd-goal-cascade-tip__owner">
          <Avatar
            name={ownerName}
            src={ownerAvatarUrl}
            size="sm"
            style={avatarStyle(ownerName)}
          />
          <span>{ownerName}</span>
        </p>
      ) : null}
    </section>
  )
}

function CascadeGoalRef({
  href,
  title,
  personName,
  personAvatarUrl,
}: {
  href?: string
  title: string
  personName?: string
  personAvatarUrl?: string
}) {
  const className = href
    ? 'pd-goal-cascade__ref pd-goal-cascade__ref--link'
    : 'pd-goal-cascade__ref'
  const label = personName ? `${title} · ${personName}` : title
  const body = href ? (
    <Link to={href} className={className} aria-label={label}>
      <span className="pd-goal-cascade__goal">{title}</span>
    </Link>
  ) : (
    <span className={className} aria-label={label}>
      <span className="pd-goal-cascade__goal">{title}</span>
    </span>
  )
  return (
    <Tooltip
      content={
        <CascadeGoalTip
          title={title}
          ownerName={personName}
          ownerAvatarUrl={personAvatarUrl}
        />
      }
      side="bottom"
      portal
      delayMs={80}
    >
      {body}
    </Tooltip>
  )
}

export function GoalCascadeFromReadout({
  goal,
  cascadeFrom,
  hrefFor,
}: {
  goal: Pick<Goal, 'cascadedFromGoalId' | 'linkedGoalLabel'>
  cascadeFrom: LineManagerCascade
  hrefFor?: CascadeGoalHref
}) {
  const selected = selectedCascadePerson(goal, cascadeFrom)
  if (!selected) return null
  const href =
    selected.managerId && selected.id
      ? hrefFor?.(selected.managerId, selected.id)
      : undefined
  return (
    <div className="pd-goal-cascade">
      <CascadeLabel direction="from">Cascading from</CascadeLabel>
      <CascadeGoalRef
        href={href}
        title={selected.title}
        personName={selected.managerName}
        personAvatarUrl={selected.managerAvatarUrl}
      />
    </div>
  )
}

export type { CascadeToOption }

export function GoalCascadeToField({
  recipients,
  options,
  targets = [],
  hrefFor,
  onLink,
  onUnlink,
  onCreate,
}: {
  recipients: CascadeRecipient[]
  options: CascadeToOption[]
  targets?: CascadeTarget[]
  hrefFor?: CascadeGoalHref
  onLink?: (option: CascadeToOption) => void
  onUnlink?: (recipient: CascadeRecipient) => void
  onCreate?: (reportIds: string[]) => void
}) {
  const [createOpen, setCreateOpen] = useState(false)
  const canCreate = Boolean(onCreate && targets.length > 0)
  const pickerOptions = [
    ...options.map((option) => ({
      value: option.id,
      label: option.title,
      description: option.personName,
    })),
    ...(canCreate
      ? [
        {
          value: CREATE_CASCADE_VALUE,
          label: 'Create New Cascading Goal',
          description: 'Copy title and metrics for selected reports',
          className: 'pd-listbox__option--action',
        },
      ]
      : []),
  ]

  return (
    <div className="pd-goal-cascade pd-goal-cascade--to">
      <CascadeLabel as="p" direction="to">
        Cascaded to
      </CascadeLabel>
      {recipients.length > 0 ? (
        <ul className="pd-goal-cascade__people">
          {recipients.map((item) => (
            <li key={item.goalId} className="pd-goal-cascade__to-item">
              <CascadeGoalRef
                href={hrefFor?.(item.personId, item.goalId)}
                title={item.goalTitle}
                personName={item.personName}
                personAvatarUrl={item.avatarUrl}
              />
              {onUnlink ? (
                <button
                  type="button"
                  className="pd-goal-cascade__unlink"
                  onClick={() => onUnlink(item)}
                >
                  Unlink
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
      {pickerOptions.length > 0 ? (
        <ListboxSelect
          value=""
          allowEmpty
          emptyLabel="None"
          placeholder="Select a report’s goal"
          searchable={options.length > 5}
          searchPlaceholder="Search report goals"
          aria-label="Cascaded to"
          showDescriptionInTrigger
          options={pickerOptions}
          onValueChange={(next) => {
            if (next === CREATE_CASCADE_VALUE) {
              setCreateOpen(true)
              return
            }
            const option = options.find((item) => item.id === next)
            if (option) onLink?.(option)
          }}
        />
      ) : recipients.length === 0 ? (
        <p className="pd-goal-cascade__empty">
          Reports have no goals in this cycle.
        </p>
      ) : null}
      {canCreate ? (
        <GoalCascadeTargetDialog
          open={createOpen}
          targets={targets}
          onClose={() => setCreateOpen(false)}
          onConfirm={(reportIds) => {
            onCreate?.(reportIds)
            setCreateOpen(false)
          }}
        />
      ) : null}
    </div>
  )
}

export function GoalCascadedTo({
  recipients,
  hrefFor,
}: {
  recipients: CascadeRecipient[]
  hrefFor?: CascadeGoalHref
}) {
  if (recipients.length === 0) return null
  return (
    <div className="pd-goal-cascade pd-goal-cascade--to">
      <CascadeLabel direction="to">Cascaded to</CascadeLabel>
      <ul className="pd-goal-cascade__people">
        {recipients.map((item) => (
          <li key={item.goalId}>
            <CascadeGoalRef
              href={hrefFor?.(item.personId, item.goalId)}
              title={item.goalTitle}
              personName={item.personName}
              personAvatarUrl={item.avatarUrl}
            />
          </li>
        ))}
      </ul>
    </div>
  )
}

type GoalCascadeFieldProps = {
  goal: Pick<Goal, 'cascadedFromGoalId' | 'linkedGoalLabel'>
  cascadeFrom: LineManagerCascade
  onChange: (next: Pick<Goal, 'cascadedFromGoalId' | 'linkedGoalLabel'>) => void
}

export function GoalCascadeField({
  goal,
  cascadeFrom,
  onChange,
}: GoalCascadeFieldProps) {
  const selected = selectedCascadeOption(goal, cascadeFrom.options)
  const options = cascadeFrom.options.map((option) => ({
    value: option.id,
    label: option.title,
    description: option.managerName,
  }))
  if (selected && selected.id && !options.some((option) => option.value === selected.id)) {
    options.unshift({
      value: selected.id,
      label: selected.title,
      description: selected.managerName,
    })
  }

  const value = selected?.id ?? ''

  if (cascadeFrom.options.length === 0 && !selected) {
    return (
      <div className="pd-goal-cascade">
        <CascadeLabel as="p" direction="from">
          Cascading from
        </CascadeLabel>
        <p className="pd-goal-cascade__empty">
          {cascadeFrom.managerName
            ? `${cascadeFrom.managerName} has no goals in this cycle.`
            : 'No manager to cascade from.'}
        </p>
      </div>
    )
  }

  return (
    <div className="pd-goal-cascade">
      <CascadeLabel as="p" direction="from">
        Cascading from
      </CascadeLabel>
      <ListboxSelect
        value={value}
        allowEmpty
        emptyLabel="None"
        placeholder={
          cascadeFrom.managerName
            ? `Select a goal from ${cascadeFrom.managerName}`
            : 'Select a manager goal'
        }
        searchable={cascadeFrom.options.length > 5}
        searchPlaceholder="Search manager goals"
        aria-label="Cascading from"
        showDescriptionInTrigger
        options={options}
        onValueChange={(next) => {
          const option =
            cascadeFrom.options.find((item) => item.id === next) ?? null
          onChange(applyCascadeSelection(option))
        }}
      />
    </div>
  )
}
