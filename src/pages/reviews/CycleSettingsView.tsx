import { useState } from 'react'
import { Pencil } from 'lucide-react'
import { Button } from '@/components/ui'
import { dayValue, formatDateRange } from '@/lib/reviews/periods'
import { includedCycleCount } from '@/lib/reviews/groupSummary'
import { PURPOSE_LABEL, PURPOSE_SHORT } from '@/lib/reviews/purpose'
import { createCycleGroup, deleteCycleGroup } from '@/lib/reviews/store'
import type { CycleGroup, ReviewCycle } from '@/lib/reviews/types'
import { CycleDetailsEditPage } from './CycleDetailsEditPage'
import { CycleGroupsSection } from './CycleGroupsSection'
import { CyclePublishSection } from './CyclePublishSection'
import { GroupSettingsView } from './GroupSettingsView'
import { SettingsSidePanel } from './SettingsSidePanel'

type CycleSettingsViewProps = {
  cycle: ReviewCycle
}

type EditTarget = 'cycle-details' | { groupId: string } | null

export function CycleSettingsView({ cycle }: CycleSettingsViewProps) {
  const [editing, setEditing] = useState<EditTarget>(null)
  const [openedGroup, setOpenedGroup] = useState<CycleGroup | null>(null)
  const groups = cycle.groups ?? []
  const editingGroup =
    editing && typeof editing === 'object'
      ? (groups.find((item) => item.id === editing.groupId) ??
        (openedGroup?.id === editing.groupId ? openedGroup : null))
      : null
  const cycleForEditor =
    editingGroup && !groups.some((group) => group.id === editingGroup.id)
      ? { ...cycle, groups: [...groups, editingGroup] }
      : cycle
  const closeEditor = () => {
    setEditing(null)
    setOpenedGroup(null)
  }
  const openGroup = (group: CycleGroup) => {
    setOpenedGroup(group)
    setEditing({ groupId: group.id })
  }

  const purpose = cycle.purpose ?? 'quarterly_checkin'
  const dayCount = inclusiveDayCount(cycle.startDate, cycle.endDate)
  const included = purpose === 'annual_appraisal' ? includedCycleCount(cycle) : null

  return (
    <div className="pd-reviews-settings pd-cycle-setup">
      <section
        className="pd-cycle-setup__identity"
        aria-labelledby="cycle-overview-heading"
      >
        <header className="pd-cycle-setup__identity-head">
          <div>
            <h2 className="pd-cycle-setup__eyebrow" id="cycle-overview-heading">
              About this cycle
            </h2>
            <p className="pd-cycle-setup__purpose">{PURPOSE_LABEL[purpose]}</p>
            <p className="pd-cycle-setup__lede">{PURPOSE_SHORT[purpose]}</p>
          </div>
          <Button
            variant="primary"
            size="sm"
            pill
            onClick={() => setEditing('cycle-details')}
          >
            <Pencil size={13} strokeWidth={2} aria-hidden />
            Edit
          </Button>
        </header>

        <dl className="pd-cycle-setup__facts">
          <div className="pd-cycle-setup__fact">
            <dt>Dates</dt>
            <dd>
              {formatDateRange(cycle.startDate, cycle.endDate)}
              <span className="pd-cycle-setup__fact-aside">
                {dayCount === 1 ? '1 day' : `${dayCount} days`}
              </span>
            </dd>
          </div>
          {cycle.yearKey ? (
            <div className="pd-cycle-setup__fact">
              <dt>Year</dt>
              <dd>{cycle.yearKey}</dd>
            </div>
          ) : null}
          {included ? (
            <div className="pd-cycle-setup__fact">
              <dt>Includes</dt>
              <dd>{included}</dd>
            </div>
          ) : null}
        </dl>
      </section>

      <CycleGroupsSection
        cycle={cycle}
        onAddGroup={() => {
          void createCycleGroup(cycle.id, { name: 'New group' })
            .then((group) => {
              openGroup(group)
            })
            .catch(() => {})
        }}
        onDelete={(groupId) => {
          void deleteCycleGroup(cycle.id, groupId).catch(() => {})
        }}
        onOpenGroup={(groupId) => {
          const group = groups.find((item) => item.id === groupId)
          if (group) openGroup(group)
        }}
      />

      <CyclePublishSection cycle={cycle} />

      {editing === 'cycle-details' ? (
        <SettingsSidePanel
          label="Cycle details"
          closeLabel="Close cycle details"
          onClose={closeEditor}
        >
          <CycleDetailsEditPage
            cycle={cycle}
            embedded
            onClose={closeEditor}
          />
        </SettingsSidePanel>
      ) : null}

      {editingGroup ? (
        <GroupSettingsView
          cycle={cycleForEditor}
          group={editingGroup}
          onClose={closeEditor}
        />
      ) : null}
    </div>
  )
}

function inclusiveDayCount(startDate: string, endDate: string): number {
  const days =
    Math.round((dayValue(endDate) - dayValue(startDate)) / 86_400_000) + 1
  return Number.isFinite(days) && days > 0 ? days : 1
}
