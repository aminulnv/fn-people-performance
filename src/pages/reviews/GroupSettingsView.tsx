import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { ChevronLeft, Scale, Star, Target, Users } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Badge, ConfirmDialog, SegmentedControl } from '@/components/ui'
import {
  cycleOverlayFromHash,
  groupSettingsFromHash,
  hashForCycleOverlay,
  hashForGroupSettings,
  hashForPeoplePane,
  peoplePaneFromHash,
  type GroupSettingsHashState,
  type GroupSettingsJob,
} from '@/lib/reviews/groupSettingsHashes'
import { locationWithHash } from '@/lib/routing/urlHash'
import { peopleCountLabel } from '@/lib/reviews/groupSummary'
import { cyclePurposeOf } from '@/lib/reviews/purpose'
import { applyCycleModules, cycleModulesOf } from '@/lib/reviews/reviewStages'
import { updateCycleGroup } from '@/lib/reviews/store'
import type { CycleGroup, CycleModules, ReviewCycle } from '@/lib/reviews/types'
import { CalibrationEditPage } from './CalibrationEditPage'
import { GoalsSettingsEditPage } from './GoalsSettingsEditPage'
import { GroupMembersEditor } from './GroupMembersEditor'
import { reviewFormSideSheet } from './ReviewFormSheet'
import {
  ReviewSettingsEditPage,
  useReviewSettingsDraft,
} from './ReviewSettingsEditPage'
import { SettingsSidePanel } from './SettingsSidePanel'
import { SettingsSideSheetPageHost } from './SettingsSideSheetRail'

type GroupSettingsViewProps = {
  cycle: ReviewCycle
  group: CycleGroup
  onClose: () => void
  variant?: 'panel' | 'page'
  onSuccess?: (message: string) => void
}

const GROUP_JOBS: {
  id: GroupSettingsJob
  label: string
  icon: LucideIcon
}[] = [
    { id: 'people', label: 'People', icon: Users },
    { id: 'goals', label: 'Goals', icon: Target },
    { id: 'review', label: 'Reviews', icon: Star },
    { id: 'calibration', label: 'Calibration', icon: Scale },
  ]

type GroupJob = GroupSettingsJob
type PendingPeopleLeave = GroupJob | 'close'

function jobsForModules(modules: CycleModules) {
  return GROUP_JOBS.map((item) => {
    const option = {
      id: item.id,
      label: (
        <>
          <item.icon size={15} strokeWidth={1.75} aria-hidden />
          {item.label}
        </>
      ),
    }
    return item.id === 'calibration' && !modules.reviews
      ? {
        ...option,
        disabled: true,
        title: 'Turn on Reviews to use Calibration.',
      }
      : option
  })
}

function visibleScreen(requested: GroupJob, modules: CycleModules): GroupJob {
  if (requested === 'calibration' && !modules.reviews) return 'review'
  return requested
}

function withVisibleJob(
  state: GroupSettingsHashState,
  modules: CycleModules,
): GroupSettingsHashState {
  const job = visibleScreen(state.job, modules)
  if (job === state.job) return state
  return {
    job,
    peoplePane: state.peoplePane,
    reviewFormOpen: job === 'review' ? state.reviewFormOpen : false,
  }
}

export function GroupSettingsView({
  cycle,
  group,
  onClose,
  variant = 'panel',
  onSuccess,
}: GroupSettingsViewProps) {
  const location = useLocation()
  const navigate = useNavigate()
  const storedModules = cycleModulesOf(group.stagesConfig.reviewStages)
  const [modules, setModules] = useState(storedModules)
  const [name, setName] = useState(group.name)
  const [peopleDirty, setPeopleDirty] = useState(false)
  const [pendingPeopleLeave, setPendingPeopleLeave] =
    useState<PendingPeopleLeave | null>(null)
  const [peoplePaneMemory, setPeoplePaneMemory] = useState(
    () => readInitialPeoplePane(variant, location.hash, group.id),
  )

  const readHashState = (): GroupSettingsHashState => {
    if (variant === 'page') {
      return withVisibleJob(groupSettingsFromHash(location.hash), {
        goals: modules.goals,
        reviews: modules.reviews,
      })
    }
    const overlay = cycleOverlayFromHash(location.hash)
    if (overlay?.kind === 'group' && overlay.groupId === group.id) {
      return withVisibleJob(overlay, {
        goals: modules.goals,
        reviews: modules.reviews,
      })
    }
    return {
      job: 'people',
      peoplePane: peoplePaneMemory,
      reviewFormOpen: false,
    }
  }

  const parsedHash = readHashState()
  const hashState: GroupSettingsHashState =
    parsedHash.job === 'people'
      ? parsedHash
      : { ...parsedHash, peoplePane: peoplePaneMemory }
  const resolvedScreen = hashState.job
  const pageHash = hashForGroupSettings(
    parsedHash.job === 'people' ? parsedHash : { ...parsedHash, peoplePane: 'added' },
  )
  const claimedIds = (cycle.groups ?? []).flatMap((item) => item.memberIds)
  const jobOptions = jobsForModules(modules)
  const reviewDraft = useReviewSettingsDraft(cycle, group, onClose, true)
  const reviewFormSheet =
    modules.reviews && resolvedScreen === 'review'
      ? reviewFormSideSheet(reviewDraft.policy, (next) =>
        reviewDraft.setSettings((prev) => ({
          ...prev,
          reviewPolicy: next,
        })),
      )
      : undefined

  useEffect(() => {
    setModules(storedModules)
  }, [group.id, storedModules.goals, storedModules.reviews])

  useEffect(() => {
    if (parsedHash.job !== 'people') return
    setPeoplePaneMemory(parsedHash.peoplePane)
  }, [parsedHash.job, parsedHash.peoplePane])

  const writeHash = (next: GroupSettingsHashState) => {
    const allowed = withVisibleJob(next, modules)
    const hash =
      variant === 'page'
        ? hashForGroupSettings(allowed)
        : hashForCycleOverlay({
          kind: 'group',
          groupId: group.id,
          ...allowed,
        })
    if (!normalizeMismatch(location.hash, hash)) return
    navigate(locationWithHash(location, hash), { replace: true })
  }

  useEffect(() => {
    if (variant !== 'page') return
    if (!normalizeMismatch(location.hash, pageHash)) return
    navigate(locationWithHash(location, pageHash), { replace: true })
  }, [location, navigate, pageHash, variant])

  const saveName = () => {
    if (name.trim() && name.trim() !== group.name) {
      void updateCycleGroup(cycle.id, group.id, { name }).catch(() => { })
    }
  }

  const applyScreen = (next: GroupJob) => {
    writeHash({
      job: next,
      peoplePane: peoplePaneMemory,
      reviewFormOpen: false,
    })
  }

  const openScreen = (next: GroupJob) => {
    if (resolvedScreen === 'people' && peopleDirty && next !== 'people') {
      setPendingPeopleLeave(next)
      return false
    }
    applyScreen(next)
    return true
  }

  const requestClose = () => {
    if (resolvedScreen === 'people' && peopleDirty) {
      setPendingPeopleLeave('close')
      return
    }
    onClose()
  }

  const discardPeopleChangesAndLeave = () => {
    const pending = pendingPeopleLeave
    setPendingPeopleLeave(null)
    setPeopleDirty(false)
    if (pending === 'close') {
      onClose()
    } else if (pending) {
      applyScreen(pending)
    }
  }

  const saveModules = (next: CycleModules) => {
    const stagesConfig = applyCycleModules(
      reviewDraft.stagesConfig,
      next,
      cyclePurposeOf(cycle),
      cycle.periodKey,
    )
    setModules(next)
    reviewDraft.replaceStagesConfig(stagesConfig)
    try {
      void updateCycleGroup(cycle.id, group.id, { stagesConfig }).catch(() => { })
    } catch {
      /* Keep the local switch when the cycle is not in the store. */
    }
    if (!next.reviews && resolvedScreen === 'calibration') {
      openScreen('review')
    }
  }

  const title = (
    <div className="pd-group-settings__title-row">
      <input
        className="pd-group-settings__title-input"
        aria-label="Group name"
        placeholder="Group name"
        value={name}
        onChange={(event) => setName(event.target.value)}
        onBlur={saveName}
      />
      <Badge variant="neutral">
        {peopleCountLabel(group.memberIds.length)}
      </Badge>
    </div>
  )

  const nav = (
    <nav className="pd-group-settings__nav" aria-label="Group settings">
      <SegmentedControl
        className="pd-group-settings__subnav"
        aria-label="Group section"
        options={jobOptions}
        value={resolvedScreen}
        onChange={openScreen}
      />
    </nav>
  )

  const people = (
    <GroupMembersEditor
      memberIds={group.memberIds}
      claimedIds={claimedIds}
      otherGroups={(cycle.groups ?? [])
        .filter((item) => item.id !== group.id)
        .map((item) => ({
          name: item.name,
          memberIds: item.memberIds,
        }))}
      pane={peoplePaneFromHash(hashState.peoplePane)}
      onPaneChange={(pane) => {
        const peoplePane = hashForPeoplePane(pane)
        setPeoplePaneMemory(peoplePane)
        writeHash({
          job: 'people',
          peoplePane,
          reviewFormOpen: false,
        })
      }}
      onChange={(memberIds) =>
        updateCycleGroup(cycle.id, group.id, { memberIds }).then(() => {
          onSuccess?.('People updated.')
        })
      }
      onDirtyChange={setPeopleDirty}
    />
  )

  const body =
    resolvedScreen === 'people' ? (
      people
    ) : (
      <div
        className={
          variant === 'page'
            ? 'pd-reviews-settings pd-group-settings pd-group-settings--page'
            : 'pd-reviews-settings pd-group-settings'
        }
      >
        {resolvedScreen === 'goals' ? (
          <GoalsSettingsEditPage
            cycle={cycle}
            group={group}
            enabled={modules.goals}
            onEnabledChange={(goals) => saveModules({ ...modules, goals })}
            embedded
            onClose={onClose}
            onSuccess={onSuccess}
          />
        ) : null}

        {resolvedScreen === 'review' ? (
          <ReviewSettingsEditPage
            cycle={cycle}
            group={group}
            enabled={modules.reviews}
            onEnabledChange={(reviews) => saveModules({ ...modules, reviews })}
            embedded
            draft={reviewDraft}
            onClose={onClose}
            onSuccess={onSuccess}
          />
        ) : null}

        {modules.reviews && resolvedScreen === 'calibration' ? (
          <CalibrationEditPage
            cycle={cycle}
            group={group}
            embedded
            onClose={onClose}
            onSuccess={onSuccess}
          />
        ) : null}
      </div>
    )

  const reviewFormOpen = hashState.reviewFormOpen
  const setReviewFormOpen = (open: boolean) => {
    if (resolvedScreen !== 'review') return
    writeHash({
      job: 'review',
      peoplePane: hashState.peoplePane,
      reviewFormOpen: open,
    })
  }

  if (variant === 'page') {
    return (
      <div className="pd-group-settings-page">
        <header className="pd-group-settings-page__chrome">
          <div className="pd-reviews-cycle-header">
            <div className="pd-reviews-cycle-header__title">
              <button
                type="button"
                className="pd-reviews-edit__back"
                onClick={requestClose}
                aria-label="Back To Cycle"
              >
                <ChevronLeft size={20} strokeWidth={2} aria-hidden />
              </button>
              {title}
            </div>
          </div>
          {nav}
        </header>
        {reviewFormSheet ? (
          <SettingsSideSheetPageHost
            sideSheet={reviewFormSheet}
            open={reviewFormOpen}
            onOpenChange={setReviewFormOpen}
          >
            {body}
          </SettingsSideSheetPageHost>
        ) : (
          body
        )}
        <ConfirmDialog
          open={pendingPeopleLeave !== null}
          onClose={() => setPendingPeopleLeave(null)}
          onConfirm={discardPeopleChangesAndLeave}
          title="Discard people changes?"
          description="Your unsaved people selections will be lost."
          confirmLabel="Discard changes"
          cancelLabel="Keep editing"
          confirmVariant="danger"
        />
      </div>
    )
  }

  return (
    <SettingsSidePanel
      label={name.trim() || group.name}
      closeLabel="Close Group Settings"
      onClose={requestClose}
      title={title}
      subnav={nav}
      sideSheet={reviewFormSheet}
      sideSheetOpen={reviewFormOpen}
      onSideSheetOpenChange={setReviewFormOpen}
    >
      {body}
      <ConfirmDialog
        open={pendingPeopleLeave !== null}
        onClose={() => setPendingPeopleLeave(null)}
        onConfirm={discardPeopleChangesAndLeave}
        title="Discard people changes?"
        description="Your unsaved people selections will be lost."
        confirmLabel="Discard changes"
        cancelLabel="Keep editing"
        confirmVariant="danger"
      />
    </SettingsSidePanel>
  )
}

function normalizeMismatch(hash: string, expected: string): boolean {
  const current = hash.startsWith('#') ? hash.slice(1) : hash
  return current !== expected
}

function readInitialPeoplePane(
  variant: 'panel' | 'page',
  hash: string,
  groupId: string,
) {
  if (variant === 'page') {
    return groupSettingsFromHash(hash).peoplePane
  }
  const overlay = cycleOverlayFromHash(hash)
  if (overlay?.kind === 'group' && overlay.groupId === groupId) {
    return overlay.peoplePane
  }
  return 'added' as const
}
