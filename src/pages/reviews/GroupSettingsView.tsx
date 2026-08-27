import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { ChevronLeft, Maximize2 } from 'lucide-react'
import { Badge, SegmentedControl } from '@/components/ui'
import { peopleCountLabel } from '@/lib/reviews/groupSummary'
import { cycleGroupPath } from '@/lib/reviews/paths'
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

const GROUP_JOBS = [
  { id: 'people', label: 'People' },
  { id: 'goals', label: 'Goals' },
  { id: 'review', label: 'Reviews' },
  { id: 'calibration', label: 'Calibration' },
] as const

type GroupJob = (typeof GROUP_JOBS)[number]['id']

function isGroupJob(value: string): value is GroupJob {
  return GROUP_JOBS.some((item) => item.id === value)
}

function jobFromHash(hash: string): GroupJob {
  const id = decodeURIComponent(hash.replace(/^#/, ''))
  return isGroupJob(id) ? id : 'people'
}

function jobsForModules(modules: CycleModules) {
  return GROUP_JOBS.map((item) =>
    item.id === 'calibration' && !modules.reviews
      ? {
          ...item,
          disabled: true,
          title: 'Turn on Reviews to use Calibration.',
        }
      : item,
  )
}

function visibleScreen(requested: GroupJob, modules: CycleModules): GroupJob {
  if (requested === 'calibration' && !modules.reviews) return 'review'
  return requested
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
  const [screen, setScreen] = useState<GroupJob>(() =>
    visibleScreen(
      variant === 'page' ? jobFromHash(location.hash) : 'people',
      storedModules,
    ),
  )
  const [name, setName] = useState(group.name)
  const claimedIds = (cycle.groups ?? []).flatMap((item) => item.memberIds)
  const resolvedScreen = visibleScreen(screen, modules)
  const fullViewHref = cycleGroupPath(
    cycle.id,
    group.id,
    resolvedScreen === 'people' ? undefined : resolvedScreen,
  )
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
    if (variant !== 'page') return
    const next = visibleScreen(jobFromHash(location.hash), {
      goals: modules.goals,
      reviews: modules.reviews,
    })
    setScreen((current) => (current === next ? current : next))
  }, [location.hash, modules.goals, modules.reviews, variant])

  const saveName = () => {
    if (name.trim() && name.trim() !== group.name) {
      void updateCycleGroup(cycle.id, group.id, { name }).catch(() => {})
    }
  }

  const openScreen = (next: GroupJob) => {
    const allowed = visibleScreen(next, modules)
    setScreen(allowed)
    if (variant === 'page') {
      navigate({ hash: allowed === 'people' ? '' : allowed }, { replace: true })
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
      void updateCycleGroup(cycle.id, group.id, { stagesConfig }).catch(() => {})
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

  const body = (
    <div
      className={
        variant === 'page'
          ? 'pd-reviews-settings pd-group-settings pd-group-settings--page'
          : 'pd-reviews-settings pd-group-settings'
      }
    >
      {resolvedScreen === 'people' ? (
        <GroupMembersEditor
          memberIds={group.memberIds}
          claimedIds={claimedIds}
          otherGroups={(cycle.groups ?? [])
            .filter((item) => item.id !== group.id)
            .map((item) => ({
              name: item.name,
              memberIds: item.memberIds,
            }))}
          onChange={(memberIds) => {
            void updateCycleGroup(cycle.id, group.id, { memberIds }).catch(
              () => {},
            )
          }}
        />
      ) : null}

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

  if (variant === 'page') {
    return (
      <div className="pd-group-settings-page">
        <header className="pd-group-settings-page__chrome">
          <div className="pd-reviews-cycle-header">
            <div className="pd-reviews-cycle-header__title">
              <button
                type="button"
                className="pd-reviews-edit__back"
                onClick={onClose}
                aria-label="Back to cycle"
              >
                <ChevronLeft size={20} strokeWidth={2} aria-hidden />
              </button>
              {title}
            </div>
          </div>
          {nav}
        </header>
        {reviewFormSheet ? (
          <SettingsSideSheetPageHost sideSheet={reviewFormSheet}>
            {body}
          </SettingsSideSheetPageHost>
        ) : (
          body
        )}
      </div>
    )
  }

  return (
    <SettingsSidePanel
      label={name.trim() || group.name}
      closeLabel="Close group settings"
      onClose={onClose}
      title={title}
      subnav={nav}
      sideSheet={reviewFormSheet}
      tools={
        <Link
          to={fullViewHref}
          className="pd-people__icon-btn"
          aria-label="Full view"
          title="Full view"
        >
          <Maximize2 size={16} strokeWidth={1.75} aria-hidden />
        </Link>
      }
    >
      {body}
    </SettingsSidePanel>
  )
}
