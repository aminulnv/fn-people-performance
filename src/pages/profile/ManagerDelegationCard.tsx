import { useMemo, useState } from 'react'
import {
  CalendarClock,
  CircleHelp,
  UserRound,
  UserRoundCog,
} from 'lucide-react'
import {
  Avatar,
  Button,
  ListboxSelect,
  Modal,
  Tooltip,
} from '@/components/ui'
import { formatLocalDateRange, toUtcIso } from '@/lib/dates/timezone'
import { hasSystemPermission } from '@/lib/accessControl/types'
import { possessiveName } from '@/lib/delegations/roles'
import {
  assignManagerDelegation,
  listActiveDelegationForEmployee,
  revokeManagerDelegation,
} from '@/lib/delegations/store'
import { useManagerDelegations } from '@/lib/delegations/useManagerDelegations'
import { avatarStyle } from '@/lib/employees/avatar'
import type { PlatformEmployee } from '@/lib/employees/types'
import { useAuth } from '@/lib/useAuth'
import { StageWindowFields } from '@/pages/reviews/StageDateTable'

function nowUtcIso(): string {
  return new Date().toISOString()
}

function plusDaysUtcIso(days: number): string {
  return new Date(Date.now() + days * 86_400_000).toISOString()
}

function formatDelegationRange(startsOn: string, endsOn: string): string {
  return formatLocalDateRange(startsOn, endsOn)
}

const DELEGATION_HINT =
  'The delegate acts as this manager for their reports - goals, reviews, and their queue. The reporting line does not change.'

function DelegationHintIcon() {
  return (
    <Tooltip content={DELEGATION_HINT} side="top" portal delayMs={80}>
      <button
        type="button"
        className="pd-help-icon"
        aria-label="What a delegation does"
      >
        <CircleHelp size={16} strokeWidth={2} aria-hidden />
      </button>
    </Tooltip>
  )
}

export type ManagerDelegationEditor = ReturnType<
  typeof useManagerDelegationEditor
>

export function useManagerDelegationEditor({
  employee,
  employees,
  hasDirectReports,
  onSuccess,
}: {
  employee: PlatformEmployee
  employees: PlatformEmployee[]
  hasDirectReports: boolean
  onSuccess?: (message: string) => void
}) {
  const { user } = useAuth()
  const canAssign = hasSystemPermission(user?.permissions, 'platform.write_all')
  const { activeReceived, received } = useManagerDelegations(employee.employeeId)
  const [open, setOpen] = useState(false)
  const [delegateEmployeeId, setDelegateEmployeeId] = useState('')
  const [startsOn, setStartsOn] = useState(nowUtcIso)
  const [endsOn, setEndsOn] = useState(() => plusDaysUtcIso(14))
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const delegateOptions = useMemo(
    () =>
      employees
        .filter(
          (person) =>
            person.isActive && person.employeeId !== employee.employeeId,
        )
        .slice()
        .sort((left, right) => left.fullName.localeCompare(right.fullName))
        .map((person) => ({
          value: String(person.employeeId),
          label: person.fullName,
          description: [person.jobTitle, person.department]
            .filter(Boolean)
            .join(' · '),
          searchText: [
            person.email,
            person.jobTitle,
            person.department,
            person.team,
          ].join(' '),
          leading: (
            <Avatar
              name={person.fullName}
              src={person.avatarUrl || undefined}
              size="sm"
              style={avatarStyle(person.fullName)}
            />
          ),
        })),
    [employee.employeeId, employees],
  )

  const scheduled = received.find((item) => item.status === 'scheduled')
  const visibleReceived = activeReceived ?? scheduled
  const canManage = canAssign && (hasDirectReports || Boolean(visibleReceived))
  const assignLabel = visibleReceived
    ? 'Change Delegation'
    : 'Assign Delegation'

  function openAssign() {
    const current =
      listActiveDelegationForEmployee(employee.employeeId) ?? scheduled
    setError(null)
    setDelegateEmployeeId(current ? String(current.delegateEmployeeId) : '')
    setStartsOn(toUtcIso(current?.startsOn) || nowUtcIso())
    setEndsOn(toUtcIso(current?.endsOn) || plusDaysUtcIso(14))
    setOpen(true)
  }

  async function onAssign() {
    const delegate = employees.find(
      (person) => String(person.employeeId) === delegateEmployeeId,
    )
    if (!delegate) {
      setError('Choose someone to delegate this responsibility to.')
      return
    }
    setSaving(true)
    setError(null)
    try {
      const current =
        listActiveDelegationForEmployee(employee.employeeId) ?? scheduled
      if (current) await revokeManagerDelegation(current.id)
      await assignManagerDelegation({
        absentEmployeeId: employee.employeeId,
        delegateEmployeeId: delegate.employeeId,
        startsOn: toUtcIso(startsOn),
        endsOn: toUtcIso(endsOn),
        absentName: employee.fullName,
        absentAvatarUrl: employee.avatarUrl,
        delegateName: delegate.fullName,
        delegateAvatarUrl: delegate.avatarUrl,
        assignedByEmployeeId: Number(user?.personId) || 0,
        assignedByName: user?.name ?? 'Admin',
      })
      setOpen(false)
      setDelegateEmployeeId('')
      onSuccess?.(current ? 'Delegation updated.' : 'Delegation assigned.')
    } catch (nextError) {
      setError(
        nextError instanceof Error
          ? nextError.message
          : 'Could not assign this delegation.',
      )
    } finally {
      setSaving(false)
    }
  }

  async function onRevoke() {
    const current =
      listActiveDelegationForEmployee(employee.employeeId) ?? scheduled
    if (!current) return
    setSaving(true)
    setError(null)
    try {
      await revokeManagerDelegation(current.id)
      onSuccess?.('Delegation revoked.')
    } catch (nextError) {
      setError(
        nextError instanceof Error
          ? nextError.message
          : 'Could not revoke this delegation.',
      )
    } finally {
      setSaving(false)
    }
  }

  return {
    employee,
    canManage,
    assignLabel,
    canRevoke: canManage && Boolean(visibleReceived),
    openAssign,
    onAssign,
    onRevoke,
    saving,
    error,
    visibleReceived,
    showStatus: Boolean(visibleReceived) || Boolean(error),
    modalOpen: open,
    closeModal: () => setOpen(false),
    delegateEmployeeId,
    setDelegateEmployeeId,
    delegateOptions,
    startsOn,
    setStartsOn,
    endsOn,
    setEndsOn,
  }
}

export function ManagerDelegationStatusCard({
  editor,
}: {
  editor: ManagerDelegationEditor
}) {
  if (!editor.showStatus) return null
  const { visibleReceived, error } = editor

  return (
    <section className="pd-profile__cover-note" aria-label="Responsibility delegation">
      {visibleReceived ? (
        <div className="pd-profile__cover-person">
          <Avatar
            name={visibleReceived.delegateName}
            src={visibleReceived.delegateAvatarUrl}
            size="sm"
            style={avatarStyle(visibleReceived.delegateName)}
          />
          <p className="pd-profile__cover-line">
            Delegated to <strong>{visibleReceived.delegateName}</strong>
            <DelegationHintIcon />
            <span className="pd-profile__cover-range">
              {visibleReceived.status === 'scheduled' ? 'Starts ' : ''}
              {formatDelegationRange(
                visibleReceived.startsOn,
                visibleReceived.endsOn,
              )}
            </span>
          </p>
        </div>
      ) : null}
      {error ? <p className="pd-profile__cover-error">{error}</p> : null}
    </section>
  )
}

export function ManagerDelegationAssignModal({
  editor,
}: {
  editor: ManagerDelegationEditor
}) {
  return (
    <Modal
      className="pd-profile__cover-modal"
      open={editor.modalOpen}
      onClose={editor.closeModal}
      title={`Delegate ${possessiveName(editor.employee.fullName)} responsibility`}
      titleHint={DELEGATION_HINT}
      titleHintLabel="What a delegation does"
      actions={
        <>
          <Button variant="secondary" pill onClick={editor.closeModal}>
            Cancel
          </Button>
          <Button
            pill
            loading={editor.saving}
            disabled={!editor.delegateEmployeeId}
            onClick={() => void editor.onAssign()}
          >
            <UserRoundCog size={16} strokeWidth={2} aria-hidden />
            Assign Delegation
          </Button>
        </>
      }
    >
      <section className="pd-delegation-modal__section">
        <span className="pd-delegation-modal__label">
          <UserRound size={15} strokeWidth={2} aria-hidden />
          Delegate to
        </span>
        <ListboxSelect
          aria-label="Delegate to"
          value={editor.delegateEmployeeId}
          onValueChange={editor.setDelegateEmployeeId}
          placeholder="Search for a person"
          options={editor.delegateOptions}
          searchable
          searchPlaceholder="Search for a person"
          noResultsText="No people found"
          allowEmpty={false}
        />
        <p className="pd-field__hint">
          Search by name, title, or department.
        </p>
      </section>
      <section className="pd-delegation-modal__section">
        <span className="pd-delegation-modal__label">
          <CalendarClock size={15} strokeWidth={2} aria-hidden />
          Delegation window
        </span>
        <StageWindowFields
          startLabel="Starts"
          endLabel="Ends"
          startValue={editor.startsOn}
          endValue={editor.endsOn}
          onStartChange={editor.setStartsOn}
          onEndChange={editor.setEndsOn}
          labelPlacement="notch"
        />
      </section>
    </Modal>
  )
}
