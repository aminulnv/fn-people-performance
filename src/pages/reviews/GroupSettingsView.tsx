import { useState } from 'react'
import { Badge, SegmentedControl } from '@/components/ui'
import { updateCycleGroup } from '@/lib/reviews/store'
import type { CycleGroup, ReviewCycle } from '@/lib/reviews/types'
import { GroupMembersEditor } from './GroupMembersEditor'
import { CalibrationEditPage } from './CalibrationEditPage'
import { GoalsSettingsEditPage } from './GoalsSettingsEditPage'
import { ReviewSettingsEditPage } from './ReviewSettingsEditPage'
import { SettingsSidePanel } from './SettingsSidePanel'

type GroupSettingsViewProps = {
  cycle: ReviewCycle
  group: CycleGroup
  onClose: () => void
}

const GROUP_SEGMENTS = [
  { id: 'people', label: 'People' },
  { id: 'goals', label: 'Goals' },
  { id: 'review', label: 'Reviews' },
  { id: 'calibration', label: 'Calibration' },
] as const

type GroupSegment = (typeof GROUP_SEGMENTS)[number]['id']

export function GroupSettingsView({
  cycle,
  group,
  onClose,
}: GroupSettingsViewProps) {
  const [segment, setSegment] = useState<GroupSegment>('people')
  const [name, setName] = useState(group.name)
  const claimedIds = (cycle.groups ?? []).flatMap((item) => item.memberIds)
  const hasPeople = group.memberIds.length > 0

  const saveName = () => {
    if (name.trim() && name.trim() !== group.name) {
      void updateCycleGroup(cycle.id, group.id, { name }).catch(() => {})
    }
  }

  return (
    <SettingsSidePanel
      label={name.trim() || group.name}
      closeLabel="Close group settings"
      onClose={onClose}
      title={
        <div className="pd-group-settings__title-row">
          <input
            className="pd-group-settings__title-input"
            aria-label="Group name"
            placeholder="Group name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            onBlur={saveName}
          />
          {hasPeople ? (
            <Badge variant="neutral">
              {group.memberIds.length === 1
                ? '1 person'
                : `${group.memberIds.length} people`}
            </Badge>
          ) : (
            <Badge variant="pending">Needs people</Badge>
          )}
        </div>
      }
    >
      <div className="pd-reviews-settings pd-group-settings">
        <div className="pd-group-settings__nav">
          <SegmentedControl
            className="pd-group-settings__subnav"
            aria-label="Group sections"
            options={GROUP_SEGMENTS}
            value={segment}
            onChange={setSegment}
          />
        </div>

        <div hidden={segment !== 'people'}>
          <GroupMembersEditor
            memberIds={group.memberIds}
            claimedIds={claimedIds}
            onChange={(memberIds) => {
              void updateCycleGroup(cycle.id, group.id, { memberIds }).catch(
                () => {},
              )
            }}
          />
        </div>

        <div hidden={segment !== 'goals'}>
          <GoalsSettingsEditPage
            cycle={cycle}
            group={group}
            embedded
            onClose={onClose}
          />
        </div>

        <div hidden={segment !== 'review'}>
          <ReviewSettingsEditPage
            cycle={cycle}
            group={group}
            embedded
            onClose={onClose}
          />
        </div>

        <div hidden={segment !== 'calibration'}>
          <CalibrationEditPage
            cycle={cycle}
            group={group}
            embedded
            onClose={onClose}
          />
        </div>
      </div>
    </SettingsSidePanel>
  )
}
