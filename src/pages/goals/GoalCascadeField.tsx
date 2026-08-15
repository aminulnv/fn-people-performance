import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { GitFork } from 'lucide-react'
import { Avatar, ListboxSelect } from '@/components/ui'
import { avatarStyle } from '@/lib/employees/avatar'
import {
  applyCascadeSelection,
  selectedCascadeOption,
  type CascadeGoalOption,
  type CascadeRecipient,
  type LineManagerCascade,
} from '@/lib/goals/operations'
import type { Goal } from '@/lib/goals/types'

export type CascadeGoalHref = (
  personId: string,
  goalId: string,
) => string | undefined

export function CascadeLabel({
  children,
  as: Tag = 'span',
  className = 'pd-goal-cascade__label',
}: {
  children: ReactNode
  as?: 'span' | 'p'
  className?: string
}) {
  return (
    <Tag className={`pd-goal-cascade__heading ${className}`.trim()}>
      <GitFork size={12} strokeWidth={2} aria-hidden />
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

export function CascadeGoalChip({
  href,
  title,
  personName,
  avatarUrl,
}: {
  href?: string
  title: string
  personName: string
  avatarUrl?: string
}) {
  const body = (
    <>
      <Avatar
        name={personName}
        src={avatarUrl}
        size="sm"
        style={avatarStyle(personName)}
      />
      <span className="pd-goal-cascade__chip-copy">
        <span className="pd-goal-cascade__chip-title">{title}</span>
        {personName ? (
          <span className="pd-goal-cascade__chip-name">{personName}</span>
        ) : null}
      </span>
    </>
  )
  if (!href) {
    return <div className="pd-goal-cascade__chip">{body}</div>
  }
  return (
    <Link
      to={href}
      className="pd-goal-cascade__chip pd-goal-cascade__chip--link"
      aria-label={`${title} · ${personName}`}
    >
      {body}
    </Link>
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
    <CascadeGoalChip
      href={href}
      title={selected.title}
      personName={selected.managerName}
      avatarUrl={selected.managerAvatarUrl}
    />
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
    <div className="pd-goal-cascade">
      <CascadeLabel>Cascaded to</CascadeLabel>
      <ul className="pd-goal-cascade__people">
        {recipients.map((item) => (
          <li key={item.goalId}>
            <CascadeGoalChip
              href={hrefFor?.(item.personId, item.goalId)}
              title={item.goalTitle}
              personName={item.personName}
              avatarUrl={item.avatarUrl}
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
      description: selected.managerName || undefined,
    })
  }

  const value = selected?.id ?? ''

  if (cascadeFrom.options.length === 0 && !selected) {
    return (
      <div className="pd-goal-cascade">
        <CascadeLabel>Cascading from</CascadeLabel>
        <p className="pd-goal-cascade__empty">
          {cascadeFrom.managerName
            ? `${cascadeFrom.managerName} has no goals in this cycle.`
            : 'No line manager to cascade from.'}
        </p>
      </div>
    )
  }

  return (
    <div className="pd-goal-cascade">
      <CascadeLabel>Cascading from</CascadeLabel>
      <ListboxSelect
        value={value}
        allowEmpty
        emptyLabel="None"
        placeholder="Select a line manager goal"
        searchable={cascadeFrom.options.length > 5}
        searchPlaceholder="Search manager goals"
        aria-label="Cascading from"
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
