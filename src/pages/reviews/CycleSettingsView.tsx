import { useEffect, useRef, useState } from 'react'
import { CalendarRange, Pencil } from 'lucide-react'
import { Button } from '@/components/ui'
import { formatLocalTimestamp } from '@/lib/dates/timezone'
import { includedCycleCount } from '@/lib/reviews/groupSummary'
import { cyclePurposeOf } from '@/lib/reviews/purpose'
import {
  createCycleGroup,
  deleteCycleGroup,
  getReviewCycle,
} from '@/lib/reviews/store'
import type { CycleGroup, ReviewCycle } from '@/lib/reviews/types'
import { CycleDetailsEditPage } from './CycleDetailsEditPage'
import { CycleGroupsSection } from './CycleGroupsSection'
import { GroupSettingsView } from './GroupSettingsView'
import {
  ReviewSaveBanner,
  successNotice,
  type ReviewSaveNotice,
} from './ReviewSaveBanner'
import { SettingsSidePanel } from './SettingsSidePanel'

type CycleSettingsViewProps = {
  cycle: ReviewCycle
}

type EditTarget = 'cycle-details' | { groupId: string } | null

export function CycleSettingsView({ cycle }: CycleSettingsViewProps) {
  const [editing, setEditing] = useState<EditTarget>(null)
  const [openedGroup, setOpenedGroup] = useState<CycleGroup | null>(null)
  const [toastNotice, setToastNotice] = useState<ReviewSaveNotice | null>(null)
  const skipEmptyGroupProvision = useRef(false)
  const groups = cycle.groups ?? []
  const showSuccessToast = (message: string) => {
    setToastNotice(successNotice(message))
  }

  useEffect(() => {
    if (skipEmptyGroupProvision.current || groups.length > 0) return
    const latest = getReviewCycle(cycle.id)
    if (!latest || (latest.groups?.length ?? 0) > 0) return
    void createCycleGroup(cycle.id, { name: 'New group' }).catch(() => {})
  }, [cycle.id, groups.length])

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

  const purpose = cyclePurposeOf(cycle)
  const included =
    purpose === 'annual_appraisal' ? includedCycleCount(cycle) : null
  const showPerformanceYear =
    purpose !== 'quarterly_checkin' && Boolean(cycle.yearKey)

  return (
    <div className="pd-reviews-settings pd-cycle-setup">
      <ReviewSaveBanner
        notice={toastNotice}
        onDismiss={() => setToastNotice(null)}
      />
      <section
        className="pd-cycle-setup__identity"
        aria-labelledby="cycle-overview-heading"
      >
        <header className="pd-cycle-setup__identity-head">
          <div className="pd-cycle-setup__identity-title">
            <CalendarRange size={18} strokeWidth={1.75} aria-hidden />
            <h2
              className="pd-cycle-setup__identity-heading"
              id="cycle-overview-heading"
            >
              Cycle Details
            </h2>
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
            <dt>Starts</dt>
            <dd>{formatLocalTimestamp(cycle.startDate)}</dd>
          </div>
          <div className="pd-cycle-setup__fact">
            <dt>Ends</dt>
            <dd>{formatLocalTimestamp(cycle.endDate)}</dd>
          </div>
          {showPerformanceYear ? (
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
          skipEmptyGroupProvision.current = true
          void deleteCycleGroup(cycle.id, groupId)
            .then(() => {
              showSuccessToast('Group deleted.')
            })
            .catch(() => {})
        }}
        onOpenGroup={(groupId) => {
          const group = groups.find((item) => item.id === groupId)
          if (group) openGroup(group)
        }}
      />

      {editing === 'cycle-details' ? (
        <SettingsSidePanel
          label="Cycle Details"
          closeLabel="Close Cycle Details"
          title={
            <div className="pd-cycle-setup__identity-title">
              <CalendarRange size={18} strokeWidth={1.75} aria-hidden />
              <h2 className="pd-settings-panel__title">Cycle Details</h2>
            </div>
          }
          onClose={closeEditor}
        >
          <CycleDetailsEditPage
            cycle={cycle}
            embedded
            onClose={closeEditor}
            onSuccess={showSuccessToast}
          />
        </SettingsSidePanel>
      ) : null}

      {editingGroup ? (
        <GroupSettingsView
          cycle={cycleForEditor}
          group={editingGroup}
          onClose={closeEditor}
          onSuccess={showSuccessToast}
        />
      ) : null}
    </div>
  )
}

