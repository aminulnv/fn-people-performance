import { useState } from 'react'
import { ChevronLeft, Pencil, Scale, Target, Users } from 'lucide-react'
import { Button, Card, Input } from '@/components/ui'
import {
  goalCountPolicyLabel,
  postWindowGoalPolicyLabel,
} from '@/lib/reviews/labels'
import { formatDateRange } from '@/lib/reviews/periods'
import { updateCycleGroup } from '@/lib/reviews/store'
import type { CycleGroup, ReviewCycle } from '@/lib/reviews/types'
import { GroupMembersEditor } from './GroupMembersEditor'
import { CalibrationEditPage } from './CalibrationEditPage'
import { GoalsSettingsEditPage } from './GoalsSettingsEditPage'
import { ReviewSettingsEditPage } from './ReviewSettingsEditPage'

type GroupSettingsViewProps = {
  cycle: ReviewCycle
  group: CycleGroup
  onClose: () => void
  onEditingChange?: (editing: boolean) => void
}

type GroupEdit = 'goals' | 'review' | 'calibration' | null

export function GroupSettingsView({
  cycle,
  group,
  onClose,
  onEditingChange,
}: GroupSettingsViewProps) {
  const [editing, setEditing] = useState<GroupEdit>(null)
  const [name, setName] = useState(group.name)
  const claimedIds = (cycle.groups ?? []).flatMap((item) => item.memberIds)
  const goalWindow = group.stagesConfig.goals.employee

  const openEdit = (target: GroupEdit) => {
    setEditing(target)
    onEditingChange?.(true)
  }

  const closeEdit = () => {
    setEditing(null)
    onEditingChange?.(false)
  }

  if (editing === 'goals') {
    return (
      <GoalsSettingsEditPage cycle={cycle} group={group} onClose={closeEdit} />
    )
  }
  if (editing === 'review') {
    return (
      <ReviewSettingsEditPage cycle={cycle} group={group} onClose={closeEdit} />
    )
  }
  if (editing === 'calibration') {
    return (
      <CalibrationEditPage cycle={cycle} group={group} onClose={closeEdit} />
    )
  }

  return (
    <div className="pd-reviews-settings">
      <header className="pd-reviews-edit__header">
        <div className="pd-reviews-edit__heading">
          <button
            type="button"
            className="pd-reviews-edit__back"
            onClick={onClose}
            aria-label="Back to cycle settings"
          >
            <ChevronLeft size={20} strokeWidth={2} aria-hidden />
          </button>
          <div className="pd-reviews-edit__titles">
            <h2 className="pd-reviews-edit__title">{group.name}</h2>
            <p className="pd-reviews-edit__description">
              Settings for this group only. Other people keep the cycle defaults.
            </p>
          </div>
        </div>
      </header>

      <section className="pd-reviews-edit-card">
        <Input
          label="Group name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          onBlur={() => {
            if (name.trim() && name.trim() !== group.name) {
              void updateCycleGroup(cycle.id, group.id, { name }).catch(() => {})
            }
          }}
        />
        <GroupMembersEditor
          memberIds={group.memberIds}
          claimedIds={claimedIds}
          onChange={(memberIds) => {
            void updateCycleGroup(cycle.id, group.id, { memberIds }).catch(
              () => {},
            )
          }}
        />
      </section>

      <Card
        className="pd-reviews-settings__card"
        title={
          <span className="pd-reviews-card-title">
            <Target size={16} strokeWidth={1.75} aria-hidden />
            Goals settings
          </span>
        }
        actions={
          <Button variant="primary" size="sm" pill onClick={() => openEdit('goals')}>
            <Pencil size={13} strokeWidth={2} aria-hidden />
            Edit
          </Button>
        }
      >
        <dl className="pd-reviews-kv pd-reviews-kv--compact">
          <div className="pd-reviews-kv__row">
            <dt>Goal-setting window</dt>
            <dd>{formatDateRange(goalWindow.startDate, goalWindow.endDate)}</dd>
          </div>
          <div className="pd-reviews-kv__row">
            <dt>Goal-count policy</dt>
            <dd>{goalCountPolicyLabel(group.settings.goalCountPolicy)}</dd>
          </div>
          <div className="pd-reviews-kv__row">
            <dt>Submissions after deadline</dt>
            <dd>{postWindowGoalPolicyLabel(group.settings.postWindowGoalPolicy)}</dd>
          </div>
        </dl>
      </Card>

      <Card
        className="pd-reviews-settings__card"
        title={
          <span className="pd-reviews-card-title">
            <Users size={16} strokeWidth={1.75} aria-hidden />
            Review settings
          </span>
        }
        actions={
          <Button variant="primary" size="sm" pill onClick={() => openEdit('review')}>
            <Pencil size={13} strokeWidth={2} aria-hidden />
            Edit
          </Button>
        }
      >
        <p className="pd-cycle-groups__count">
          Review window, types, and publishing for this group.
        </p>
      </Card>

      <Card
        className="pd-reviews-settings__card"
        title={
          <span className="pd-reviews-card-title">
            <Scale size={16} strokeWidth={1.75} aria-hidden />
            Calculation and calibration
          </span>
        }
        actions={
          <Button
            variant="primary"
            size="sm"
            pill
            onClick={() => openEdit('calibration')}
          >
            <Pencil size={13} strokeWidth={2} aria-hidden />
            Edit
          </Button>
        }
      >
        <p className="pd-cycle-groups__count">
          Grade recommendation and distribution for this group.
        </p>
      </Card>
    </div>
  )
}
