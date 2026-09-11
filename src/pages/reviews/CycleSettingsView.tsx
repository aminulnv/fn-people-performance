import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { CalendarRange, Pencil } from 'lucide-react'
import { Button } from '@/components/ui'
import { formatLocalTimestamp } from '@/lib/dates/timezone'
import {
  cycleOverlayFromHash,
  hashForCycleOverlay,
} from '@/lib/reviews/groupSettingsHashes'
import { includedCycleCount } from '@/lib/reviews/groupSummary'
import { locationWithHash } from '@/lib/routing/urlHash'
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

function nextCycleGroupName(groups: CycleGroup[]): string {
  const usedNumbers = groups
    .map((group) => /^(?:New )?group(?: (\d+))?$/i.exec(group.name.trim()))
    .filter((match): match is RegExpExecArray => match != null)
    .map((match) => (match[1] ? Number(match[1]) : 1))
  if (usedNumbers.length === 0) return 'Group 1'
  return `Group ${Math.max(...usedNumbers) + 1}`
}

function editingFromHash(hash: string): EditTarget {
  const overlay = cycleOverlayFromHash(hash)
  if (!overlay) return null
  if (overlay.kind === 'cycle-details') return 'cycle-details'
  return { groupId: overlay.groupId }
}

export function CycleSettingsView({ cycle }: CycleSettingsViewProps) {
  const location = useLocation()
  const navigate = useNavigate()
  const [editing, setEditing] = useState<EditTarget>(() =>
    editingFromHash(location.hash),
  )
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
    void createCycleGroup(cycle.id, { name: 'Group 1' }).catch(() => { })
  }, [cycle.id, groups.length])

  // Follow hash for deep links and back/forward; local open sets state first.
  useEffect(() => {
    if (!location.hash) {
      setEditing(null)
      setOpenedGroup(null)
      return
    }
    const fromHash = editingFromHash(location.hash)
    if (fromHash) setEditing(fromHash)
  }, [location.hash])

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
    if (location.hash) {
      navigate(locationWithHash(location, ''), { replace: true })
    }
  }

  const openGroup = (group: CycleGroup) => {
    setOpenedGroup(group)
    setEditing({ groupId: group.id })
    navigate(
      locationWithHash(
        location,
        hashForCycleOverlay({
          kind: 'group',
          groupId: group.id,
          job: 'people',
          peoplePane: 'added',
          reviewFormOpen: false,
        }),
      ),
      { replace: true },
    )
  }

  const openCycleDetails = () => {
    setOpenedGroup(null)
    setEditing('cycle-details')
    navigate(
      locationWithHash(location, hashForCycleOverlay({ kind: 'cycle-details' })),
      { replace: true },
    )
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
            onClick={openCycleDetails}
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
          void createCycleGroup(cycle.id, { name: nextCycleGroupName(groups) })
            .then((group) => {
              openGroup(group)
            })
            .catch(() => { })
        }}
        onDelete={(groupId) => {
          skipEmptyGroupProvision.current = true
          void deleteCycleGroup(cycle.id, groupId)
            .then(() => {
              if (
                editing &&
                typeof editing === 'object' &&
                editing.groupId === groupId
              ) {
                closeEditor()
              }
              showSuccessToast('Group deleted.')
            })
            .catch(() => { })
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
