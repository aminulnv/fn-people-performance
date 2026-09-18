import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, Navigate } from 'react-router-dom'
import {
  ActivityLogDrawer,
  ActivityLogTrigger,
} from '@/components/activity/ActivityLogDrawer'
import { Button, ConfirmDialog, Field, ListboxSelect, PageStatus } from '@/components/ui'
import { hasSystemPermission } from '@/lib/accessControl/types'
import { useAuth } from '@/lib/auth'
import { useHydrateManagerDelegations, useManagerDelegationsRevision } from '@/lib/delegations/useManagerDelegations'
import { useEmployees } from '@/lib/employees/useEmployees'
import { canWriteManagerReview } from '@/lib/reviews/managerReviewAccess'
import { selectGoalCycle } from '@/lib/goalsApi'
import { getGoalsSnapshotForCycle, subscribeGoalsStore } from '@/lib/goals/store'
import {
  answersFromFeedbackText,
  buildScorecardDetail,
  feedbackTextForRole,
  isScorecardFeedbackQuestion,
  scorecardDetailPath,
} from '@/lib/reviews/scorecards'
import {
  appealReviewPacket,
  calibrateReviewPacket,
  fetchReviewPacket,
  resolveReviewAppeal,
  saveReviewPacket,
} from '@/lib/reviews/packetsApi'
import {
  annualGoalsComponent,
  outcomeForAnnualQuarter,
  readAnnualQ4Grade,
} from '@/lib/reviews/annualQuarters'
import { cyclePurposeOf } from '@/lib/reviews/purpose'
import {
  defaultReviewPolicy,
  enabledPillars,
  enabledQuestions,
  enabledOutputQuestions,
  feedbackEnabledForVisibility,
  gradesGoalsSeparately,
  gradesOverall,
  scorecardFeedbackOf,
} from '@/lib/reviews/reviewPolicy'
import { describeEnabledFlow, getReviewStage } from '@/lib/reviews/reviewStages'
import { combinePillarScores, rollupGoalsPillar } from '@/lib/reviews/rollup'
import { getReviewCycle } from '@/lib/reviews/store'
import {
  useReviewCyclesHydrated,
  useReviewsSnapshot,
  useScorecardFormsSnapshot,
} from '@/lib/reviews/useReviews'
import type { GradeBandId, ReviewPacket, ReviewPolicy } from '@/lib/reviews/types'
import { resolveCyclePolicyForPerson } from '@/lib/reviews/cycleGroups'
import {
  calibrationIsEditable,
  stageShowsReviewForm,
} from '@/lib/reviews/scorecardStages'
import { officialReviewReleasedToEmployee } from '@/lib/reviews/packetVisibility'
import { useLiveTopic } from '@/lib/realtime/useLiveTopic'
import { goalsDetailPath } from '@/pages/goals/goalHelpers'
import { AnnualGoalsQuarters } from '@/pages/reviews/AnnualGoalsQuarters'
import { OverallGradePicker } from '@/pages/reviews/OverallGradePicker'
import { ReviewQuestionField } from '@/pages/reviews/ReviewQuestionField'
import { ScorecardFeedbackCard } from '@/pages/reviews/ScorecardFeedbackCard'
import {
  GRADE_LISTBOX_OPTIONS,
  ScorecardGoalsCard,
} from '@/pages/reviews/ScorecardGoalsCard'
import { ScorecardHero } from '@/pages/reviews/ScorecardHero'
import {
  ReviewActionIsland,
  ReviewSaveBanner,
  type ReviewSaveNotice,
} from '@/pages/reviews/ReviewSaveBanner'
import { ScorecardSkillsGradeCard } from '@/pages/reviews/ScorecardSkillsGradeCard'
import { ScorecardValuesGradeCard } from '@/pages/reviews/ScorecardValuesGradeCard'
import { useAnnualLinkedQuarters } from '@/pages/reviews/useAnnualLinkedQuarters'
import { useScorecardViewStage } from '@/pages/reviews/useScorecardViewStage'
import {
  averageSkillGrade,
  hasStoredSkillGrades,
  isSkillScorePillarId,
  skillIdFromScorePillarId,
  skillScorePillarId,
  skillsWithStoredGrades,
} from '@/lib/skills/reviewScores'
import { useEmployeeSkills, useSkillsLibrary } from '@/lib/skills/useSkills'
import {
  averageValueGrade,
  hasStoredValueGrades,
  isValueScorePillarId,
  valueIdFromScorePillarId,
  valueScorePillarId,
  valuesWithStoredGrades,
} from '@/lib/values/reviewScores'
import { useEnabledValues } from '@/lib/values/useValues'
import '@/styles/layout-activity.css'

type PacketDraft = {
  answers: Array<{ questionId: string; body: string }>
  pillarScores: Array<{ pillarId: string; grade: GradeBandId | null; comment: string }>
  overallGrade: GradeBandId | null
  goalsComponent?: ReviewPacket['goalsComponent']
}

function GradeField({
  id,
  label,
  value,
  disabled,
  hint,
  allowEmpty = true,
  onChange,
}: {
  id: string
  label: string
  value: string
  disabled?: boolean
  hint?: string
  allowEmpty?: boolean
  onChange: (value: GradeBandId | '') => void
}) {
  return (
    <Field htmlFor={id} label={label} hint={hint}>
      <ListboxSelect
        className={[
          'pd-reviews-scorecard__grade-select',
          value ? `pd-reviews-scorecard__grade-select--${value}` : '',
        ]
          .filter(Boolean)
          .join(' ')}
        id={id}
        aria-label={label}
        value={value}
        disabled={disabled}
        allowEmpty={allowEmpty}
        placeholder="Select a grade"
        emptyLabel="Select a grade"
        onValueChange={(next) => onChange(next as GradeBandId | '')}
        options={GRADE_LISTBOX_OPTIONS}
      />
    </Field>
  )
}

type ReviewPacketViewProps = {
  cycleId: string
  employeeId: number
}

export function ReviewPacketView({ cycleId, employeeId }: ReviewPacketViewProps) {
  const navigate = useNavigate()
  const { user } = useAuth()
  useHydrateManagerDelegations(user?.employeeId ?? undefined)
  useManagerDelegationsRevision()
  const { employees, isLoading: employeesLoading } = useEmployees()
  const [packet, setPacket] = useState<ReviewPacket | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [goalsRevision, setGoalsRevision] = useState(0)
  const [strengths, setStrengths] = useState('')
  const [developments, setDevelopments] = useState('')
  const [goalsGrade, setGoalsGrade] = useState<GradeBandId | ''>('')
  const [q4Grade, setQ4Grade] = useState<GradeBandId | ''>('')
  const [skillGrades, setSkillGrades] = useState<Record<string, GradeBandId | ''>>(
    {},
  )
  const [valueGrades, setValueGrades] = useState<Record<string, GradeBandId | ''>>(
    {},
  )
  const [packetDraft, setPacketDraft] = useState<PacketDraft | null>(null)
  const [isDirty, setDirty] = useState(false)
  const assignedSkills = useEmployeeSkills(employeeId)
  const { skills: skillsCatalog } = useSkillsLibrary()
  const enabledValues = useEnabledValues()
  const [leaveOpen, setLeaveOpen] = useState(false)
  const [saveNotice, setSaveNotice] = useState<ReviewSaveNotice | null>(null)
  const [activityOpen, setActivityOpen] = useState(false)
  const { cycles } = useReviewsSnapshot()
  const forms = useScorecardFormsSnapshot()
  const cyclesHydrated = useReviewCyclesHydrated()
  const cycle = getReviewCycle(cycleId)
  const policyResolution = cycle
    ? resolveCyclePolicyForPerson(cycle, employeeId, forms)
    : null
  const policy =
    policyResolution?.settings.reviewPolicy ??
    defaultReviewPolicy(cyclePurposeOf(cycle))
  const viewerId = user?.employeeId ?? (Number(user?.personId) || null)
  const isSubject = viewerId === employeeId
  const subjectEmployee = employees.find(
    (person) => person.employeeId === employeeId,
  )
  const isManager = canWriteManagerReview({
    viewerEmployeeId: viewerId,
    subjectEmployeeId: employeeId,
    subject: subjectEmployee,
    directory: employees,
    permissions: user?.permissions,
  })
  const goalsPillar = enabledPillars(policy).find((pillar) => pillar.id === 'goals')
  const linkedQuarters = useAnnualLinkedQuarters({
    cycle,
    employeeId,
    goalsPillar,
    goalsRevision,
  })

  useEffect(() => {
    let cancelled = false
    void selectGoalCycle(cycleId).then(() => {
      if (!cancelled) setGoalsRevision((value) => value + 1)
    })
    return () => {
      cancelled = true
    }
  }, [cycleId])

  useEffect(() => {
    return subscribeGoalsStore(() => setGoalsRevision((value) => value + 1))
  }, [])

  const detail = useMemo(
    () =>
      buildScorecardDetail(cycleId, employeeId, employees, user?.email, packet),
    [cycleId, cycles, employeeId, employees, goalsRevision, packet, user?.email],
  )

  useEffect(() => {
    let cancelled = false
    void fetchReviewPacket(cycleId, employeeId)
      .then((next) => {
        if (!cancelled) setPacket(next)
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Could not load this review.')
        }
      })
    return () => {
      cancelled = true
    }
  }, [cycleId, employeeId])

  const refreshLivePacket = useCallback(
    (event: { cycleId?: string; employeeId?: string }) => {
      if (isDirty) return
      if (event.cycleId && event.cycleId !== cycleId) return
      if (event.employeeId && event.employeeId !== String(employeeId)) return
      void fetchReviewPacket(cycleId, employeeId)
        .then(setPacket)
        .catch(() => {
          /* Keep the open packet until the next event or navigation. */
        })
    },
    [cycleId, employeeId, isDirty],
  )
  useLiveTopic('packets', refreshLivePacket)

  const stages = policyResolution?.stagesConfig.reviewStages
  const stageView = useScorecardViewStage({
    packet,
    stages,
    viewerEmployeeId: viewerId,
  })
  const selfOn = Boolean(getReviewStage(stages, 'self_review')?.enabled)
  const managerOn = Boolean(getReviewStage(stages, 'manager_review')?.enabled)
  const feedbackRole = managerOn && isManager
    ? 'manager'
    : selfOn && isSubject
      ? 'self'
      : null

  useEffect(() => {
    if (!packet || !feedbackRole) return
    const next = feedbackTextForRole(packet.answers, feedbackRole)
    setStrengths(next.strengths)
    setDevelopments(next.developments)
  }, [feedbackRole, packet])

  const goalsGradeRole = managerOn && isManager
    ? 'manager'
    : selfOn && isSubject
      ? 'self'
      : null

  useEffect(() => {
    if (!packet || !goalsGradeRole) return
    setGoalsGrade(
      packet.pillarScores.find(
        (score) =>
          score.pillarId === 'goals' && score.actorRole === goalsGradeRole,
      )?.grade ?? '',
    )
    if (linkedQuarters.enabled) {
      setQ4Grade(readAnnualQ4Grade(packet) ?? '')
    }
  }, [goalsGradeRole, linkedQuarters.enabled, packet])

  useEffect(() => {
    if (!packet || !goalsGradeRole) return
    const nextSkills: Record<string, GradeBandId | ''> = {}
    const nextValues: Record<string, GradeBandId | ''> = {}
    for (const score of packet.pillarScores) {
      if (score.actorRole !== goalsGradeRole) continue
      const skillId = skillIdFromScorePillarId(score.pillarId)
      if (skillId) nextSkills[skillId] = score.grade ?? ''
      const valueId = valueIdFromScorePillarId(score.pillarId)
      if (valueId) nextValues[valueId] = score.grade ?? ''
    }
    setSkillGrades(nextSkills)
    setValueGrades(nextValues)
  }, [goalsGradeRole, packet])

  if (!cycle) {
    if (!cyclesHydrated) {
      return (
        <PageStatus
          variant="loading"
          description="Loading the review packet…"
        />
      )
    }
    return <PageStatus variant="not-found" description="This cycle is not available." />
  }
  if (error) {
    return <PageStatus variant="error" description={error} />
  }
  if (!packet || !policy || (employeesLoading && !detail)) {
    return (
      <PageStatus
        variant="loading"
        description="Loading the review packet…"
      />
    )
  }
  if (!isSubject && !isManager) {
    return (
      <Navigate
        to={scorecardDetailPath(cycleId, employeeId)}
        replace
      />
    )
  }

  const calOn = Boolean(
    getReviewStage(stages, 'calibration_hod_hrbp')?.enabled ||
    getReviewStage(stages, 'calibration_slt')?.enabled,
  )
  const appealOn = Boolean(getReviewStage(stages, 'appeal')?.enabled)
  const pillars = enabledPillars(policy)
  const employeeOutputReleased =
    isSubject && officialReviewReleasedToEmployee(packet.status)
  const managerOutputReleased =
    isManager &&
    (packet.status === 'released_to_managers' ||
      packet.status === 'released_to_employees' ||
      packet.status === 'appealed')
  const outputAudience = employeeOutputReleased
    ? 'employee'
    : managerOutputReleased
      ? 'manager'
      : null
  const outputQuestionIds = outputAudience
    ? new Set(
        enabledOutputQuestions(policy, outputAudience).map(
          (question) => question.id,
        ),
      )
    : null
  const forCurrentAudience = (question: ReviewPolicy['scorecard']['questions'][number]) =>
    outputQuestionIds == null || outputQuestionIds.has(question.id)
  const selfQuestions = enabledQuestions(policy, 'employee').filter(
    forCurrentAudience,
  )
  const managerQuestions = enabledQuestions(policy, 'manager').filter(
    forCurrentAudience,
  )
  const showSelfForm = selfOn && (isSubject || packet.status !== 'not_started')
  const showManagerForm = managerOn && (isManager || employeeOutputReleased)
  const showCalibrationForm =
    calOn && isManager && calibrationIsEditable(packet.status)
  const showAppealForm =
    appealOn && isSubject && packet.status === 'released_to_employees'
  const openAppeal = packet.appeals.find((appeal) => appeal.status === 'open')
  const canResolveAppeal = hasSystemPermission(
    user?.permissions,
    'platform.write_all',
  )
  const feedbackLocked =
    feedbackRole === 'manager'
      ? packet.status === 'released_to_employees' ||
        packet.status === 'released_to_managers'
      : !isSubject ||
        packet.status === 'self_submitted' ||
        packet.status === 'manager_submitted'
  const feedbackQuestions =
    feedbackRole === 'manager' ? managerQuestions : selfQuestions
  const feedbackAnswers = answersFromFeedbackText(
    feedbackQuestions,
    strengths,
    developments,
  )
  const hideEmployeeGoalsGrade = linkedQuarters.enabled && isSubject
  const gradeGoals = gradesGoalsSeparately(policy)
  const gradeOverall = gradesOverall(policy)
  const useWeightedSuggest = linkedQuarters.enabled
  const rollupGoalsFromQuarters = (includeQ4: boolean) =>
    useWeightedSuggest
      ? rollupGoalsPillar({
          links: linkedQuarters.rows.map((row) => ({
            sourceCycleId: row.sourceCycleId,
            weightPercent: 25,
            excluded: row.excluded,
          })),
          quarters: linkedQuarters.rows.map((row) => ({
            sourceCycleId: row.sourceCycleId,
            label: row.label,
            outcome: outcomeForAnnualQuarter(
              row,
              includeQ4 && q4Grade ? q4Grade : null,
            ),
          })),
          bands: policy.scorecard.bands,
        })
      : null
  const selfGoalsRollup = rollupGoalsFromQuarters(false)
  const managerGoalsRollup = rollupGoalsFromQuarters(true)
  const rolledGoalsGrade =
    (isManager ? managerGoalsRollup : selfGoalsRollup)?.averageGrade ?? null
  const skillsPillarOn = pillars.some((pillar) => pillar.id === 'skills')
  const hasPriorSkillGrades = hasStoredSkillGrades(skillGrades)
  const priorSkills = skillsWithStoredGrades(skillGrades, skillsCatalog)
  const skillsRollupGrade = averageSkillGrade(
    assignedSkills.map((skill) => skillGrades[skill.id]),
  )
  const valuesPillarOn = pillars.some((pillar) => pillar.id === 'values')
  const hasPriorValueGrades = hasStoredValueGrades(valueGrades)
  const priorValues = valuesWithStoredGrades(valueGrades)
  const valuesRollupGrade = averageValueGrade(
    enabledValues.map((value) => valueGrades[value.id]),
  )
  const skillExtraGrades =
    skillsPillarOn && skillsRollupGrade
      ? { skills: skillsRollupGrade as GradeBandId | '' }
      : undefined
  const valueExtraGrades =
    valuesPillarOn && valuesRollupGrade
      ? { values: valuesRollupGrade as GradeBandId | '' }
      : undefined
  const selfExtraGrades = {
    ...(useWeightedSuggest
      ? selfGoalsRollup?.averageGrade
        ? { goals: selfGoalsRollup.averageGrade as GradeBandId | '' }
        : {}
      : gradeGoals && goalsGradeRole === 'self' && !hideEmployeeGoalsGrade
        ? { goals: goalsGrade }
        : {}),
    ...skillExtraGrades,
    ...valueExtraGrades,
  }
  const managerExtraGrades = {
    ...(useWeightedSuggest
      ? managerGoalsRollup?.averageGrade
        ? { goals: managerGoalsRollup.averageGrade as GradeBandId | '' }
        : {}
      : gradeGoals && goalsGradeRole === 'manager'
        ? { goals: goalsGrade }
        : {}),
    ...skillExtraGrades,
    ...valueExtraGrades,
  }
  const managerFormLocked =
    packet.status === 'released_to_employees' ||
    packet.status === 'released_to_managers'
  const selfFormLocked =
    !isSubject ||
    packet.status === 'self_submitted' ||
    packet.status === 'manager_submitted'
  const goalsGradeLocked =
    goalsGradeRole === 'manager' ? managerFormLocked : selfFormLocked
  const q4GradeLocked = goalsGradeLocked
  const viewingManagerForm = stageView.viewing === 'manager_review'
  const viewingSelfForm = stageView.viewing === 'self_review'
  const viewingPublishedForm = stageView.viewing === 'publish_employees'
  const showSelfPacket =
    showSelfForm && (viewingSelfForm || (viewingPublishedForm && isSubject))
  const showManagerPacket =
    showManagerForm && (viewingManagerForm || viewingPublishedForm)
  const formOwnsOverall =
    gradeOverall && (showSelfPacket || showManagerPacket)
  const formActorRole = viewingSelfForm && showSelfPacket ? 'self' : 'manager'
  const formLocked =
    formActorRole === 'manager' ? managerFormLocked : selfFormLocked

  const viewHref = `${scorecardDetailPath(
    detail?.cycleKey ?? cycleId,
    detail?.employeeId ?? employeeId,
  )}?stage=${stageView.viewing}`

  const requestLeave = () => {
    if (isDirty) {
      setLeaveOpen(true)
      return
    }
    navigate(viewHref)
  }

  const savePacket = async (submit: boolean) => {
    if (!packetDraft) return
    setSaving(true)
    setSaveNotice(null)
    try {
      const skillsPillarOn = pillars.some((pillar) => pillar.id === 'skills')
      // When Skills is on: write live grades. When off: keep any prior skill
      // grades on the packet but do not roll them into the overall.
      const skillPillarScores = skillsPillarOn
        ? assignedSkills.map((skill) => ({
            pillarId: skillScorePillarId(skill.id),
            grade: (skillGrades[skill.id] || null) as GradeBandId | null,
            comment: '',
          }))
        : packet.pillarScores
            .filter(
              (score) =>
                score.actorRole === formActorRole &&
                isSkillScorePillarId(score.pillarId),
            )
            .map((score) => ({
              pillarId: score.pillarId,
              grade: score.grade,
              comment: score.comment,
            }))
      const skillsRollup = skillsPillarOn
        ? averageSkillGrade(
            assignedSkills.map((skill) => skillGrades[skill.id]),
          )
        : null
      const valuesPillarOn = pillars.some((pillar) => pillar.id === 'values')
      const valuePillarScores = valuesPillarOn
        ? enabledValues.map((value) => ({
            pillarId: valueScorePillarId(value.id),
            grade: (valueGrades[value.id] || null) as GradeBandId | null,
            comment: '',
          }))
        : packet.pillarScores
            .filter(
              (score) =>
                score.actorRole === formActorRole &&
                isValueScorePillarId(score.pillarId),
            )
            .map((score) => ({
              pillarId: score.pillarId,
              grade: score.grade,
              comment: score.comment,
            }))
      const valuesRollup = valuesPillarOn
        ? averageValueGrade(enabledValues.map((value) => valueGrades[value.id]))
        : null
      const basePillars = packetDraft.pillarScores.filter(
        (score) =>
          score.pillarId !== 'skills' &&
          !isSkillScorePillarId(score.pillarId) &&
          score.pillarId !== 'values' &&
          !isValueScorePillarId(score.pillarId),
      )
      const next = await saveReviewPacket(packet.id, {
        ...packetDraft,
        pillarScores: [
          ...basePillars,
          ...skillPillarScores,
          ...valuePillarScores,
          ...(skillsPillarOn
            ? [{ pillarId: 'skills', grade: skillsRollup, comment: '' }]
            : []),
          ...(valuesPillarOn
            ? [{ pillarId: 'values', grade: valuesRollup, comment: '' }]
            : []),
        ],
        goalsComponent: useWeightedSuggest
          ? annualGoalsComponent(q4Grade || null)
          : packetDraft.goalsComponent,
        actorRole: formActorRole,
        submit,
      })
      setPacket(next)
      setDirty(false)
      navigate(viewHref, {
        state: {
          reviewNotice: {
            variant: 'success',
            message: submit ? 'Review submitted.' : 'Draft saved.',
            shownAt: Date.now(),
          } satisfies ReviewSaveNotice,
        },
      })
    } catch (err: unknown) {
      setSaveNotice({
        variant: 'error',
        message:
          err instanceof Error ? err.message : 'Could not save this review.',
        shownAt: Date.now(),
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="pd-page pd-page--wide pd-reviews pd-reviews-scorecard pd-review-packet">
      {detail ? (
        <ScorecardHero
          detail={detail}
          packet={packet}
          stages={stages}
          viewerEmployeeId={viewerId}
          viewingStage={stageView.viewing}
          onViewStage={stageView.selectStage}
        />
      ) : null}
      <p className="pd-reviews-flow__path">
        {describeEnabledFlow(stages)}
      </p>
      <ActivityLogTrigger
        label="View Review Activity"
        onClick={() => setActivityOpen(true)}
      />

      {detail && linkedQuarters.enabled ? (
        <AnnualGoalsQuarters
          rows={linkedQuarters.rows}
          goalsByCycleId={linkedQuarters.goalsByCycleId}
          q4Goals={linkedQuarters.q4Goals}
          q4CycleId={linkedQuarters.progressRow?.sourceCycleId}
          personId={String(employeeId)}
          owner={{
            id: String(detail.employeeId),
            name: detail.employeeName,
            avatarUrl: detail.employeeAvatarUrl || undefined,
          }}
          q4Grade={isManager && gradeGoals ? q4Grade || null : null}
          onQ4GradeChange={
            isManager && goalsGradeRole && gradeGoals
              ? (next) => {
                  setQ4Grade(next)
                  setDirty(true)
                }
              : undefined
          }
          q4GradeLocked={q4GradeLocked}
          goalsRollupGrade={rolledGoalsGrade}
        />
      ) : detail ? (
        <ScorecardGoalsCard
          cycleId={cycleId}
          personId={String(employeeId)}
          owner={{
            id: String(detail.employeeId),
            name: detail.employeeName,
            avatarUrl: detail.employeeAvatarUrl || undefined,
          }}
          cycleLabel={detail.cycleLabel}
          goals={
            getGoalsSnapshotForCycle(cycleId).byPerson[String(employeeId)]
              ?.goals ?? []
          }
          overallPercent={detail.goalsOverallPercent}
          overallBand={
            gradeGoals
              ? showManagerForm
                ? packet.pillarScores.find(
                    (score) =>
                      score.pillarId === 'goals' && score.actorRole === 'manager',
                  )?.grade ?? null
                : detail.goalsOverallBand
              : null
          }
          goalsHref={goalsDetailPath(cycleId, String(employeeId))}
          editing={gradeGoals}
          goalsWeight={goalsPillar?.weight}
          goalsGrade={gradeGoals ? goalsGrade || null : null}
          onGoalsGradeChange={
            gradeGoals && goalsGradeRole && goalsPillar
              ? (next) => {
                  setGoalsGrade(next)
                  setDirty(true)
                }
              : undefined
          }
          gradeLocked={goalsGradeLocked}
        />
      ) : null}

      {skillsPillarOn && (showSelfPacket || showManagerPacket) ? (
        <ScorecardSkillsGradeCard
          skills={assignedSkills}
          grades={skillGrades}
          editing={Boolean(goalsGradeRole)}
          locked={
            formActorRole === 'manager' ? managerFormLocked : selfFormLocked
          }
          profileHref={`/people/${employeeId}`}
          onGradeChange={
            goalsGradeRole
              ? (skillId, next) => {
                  setSkillGrades((current) => ({
                    ...current,
                    [skillId]: next,
                  }))
                  setDirty(true)
                }
              : undefined
          }
        />
      ) : !skillsPillarOn &&
        hasPriorSkillGrades &&
        (showSelfPacket || showManagerPacket) ? (
        <ScorecardSkillsGradeCard
          skills={priorSkills}
          grades={skillGrades}
          priorOnly
        />
      ) : null}

      {valuesPillarOn && (showSelfPacket || showManagerPacket) ? (
        <ScorecardValuesGradeCard
          values={enabledValues}
          grades={valueGrades}
          editing={Boolean(goalsGradeRole)}
          locked={
            formActorRole === 'manager' ? managerFormLocked : selfFormLocked
          }
          onGradeChange={
            goalsGradeRole
              ? (valueId, next) => {
                  setValueGrades((current) => ({
                    ...current,
                    [valueId]: next,
                  }))
                  setDirty(true)
                }
              : undefined
          }
        />
      ) : !valuesPillarOn &&
        hasPriorValueGrades &&
        (showSelfPacket || showManagerPacket) ? (
        <ScorecardValuesGradeCard
          values={priorValues}
          grades={valueGrades}
          priorOnly
        />
      ) : null}

      {showSelfPacket ? (
        <PacketForm
          title="Self-Review"
          locked={!isSubject || packet.status === 'self_submitted' || packet.status === 'manager_submitted' || viewingPublishedForm}
          questions={selfQuestions}
          pillars={pillars}
          policy={policy}
          packet={packet}
          actorRole="self"
          overall={packet.selfOverallGrade}
          extraAnswers={feedbackRole === 'self' ? feedbackAnswers : undefined}
          extraGrades={
            Object.keys(selfExtraGrades).length > 0 ? selfExtraGrades : undefined
          }
          hidePillarIds={[
            'skills',
            'values',
            ...(useWeightedSuggest ||
            !gradeGoals ||
            goalsGradeRole === 'self' ||
            hideEmployeeGoalsGrade
              ? (['goals'] as const)
              : []),
          ]}
          showOverall={gradeOverall}
          suggestOverall={useWeightedSuggest}
          onDraftChange={setPacketDraft}
          onUserEdit={() => setDirty(true)}
        />
      ) : null}

      {showManagerPacket ? (
        <PacketForm
          title="Manager Review"
          locked={
            viewingPublishedForm ||
            packet.status === 'released_to_employees' ||
            packet.status === 'released_to_managers'
          }
          questions={managerQuestions}
          pillars={pillars}
          policy={policy}
          packet={packet}
          actorRole="manager"
          overall={packet.managerOverallGrade}
          extraAnswers={feedbackRole === 'manager' ? feedbackAnswers : undefined}
          extraGrades={
            Object.keys(managerExtraGrades).length > 0
              ? managerExtraGrades
              : undefined
          }
          hidePillarIds={[
            'skills',
            'values',
            ...(useWeightedSuggest || !gradeGoals || goalsGradeRole === 'manager'
              ? (['goals'] as const)
              : []),
          ]}
          showOverall={gradeOverall}
          suggestOverall={useWeightedSuggest}
          onDraftChange={setPacketDraft}
          onUserEdit={() => setDirty(true)}
        />
      ) : null}

      {gradeOverall && !formOwnsOverall ? (
        <section className="pd-reviews-scorecard__card">
          <OverallGradePicker
            name="scorecard-overall-grade-readonly"
            value={
              packet.publishedOverallGrade ??
              packet.calibratedOverallGrade ??
              packet.managerOverallGrade ??
              ''
            }
            disabled
          />
        </section>
      ) : null}

      {stageShowsReviewForm(stageView.viewing) &&
      feedbackEnabledForVisibility(
        policy,
        feedbackRole === 'self' ? 'employee' : 'manager',
      ) ? (
        <ScorecardFeedbackCard
          feedback={
            detail?.feedback ?? {
              authorName: '',
              authorRole: '',
              dateLabel: '',
              strengths: '',
              developments: '',
            }
          }
          editing
          locked={
            viewingPublishedForm ||
            feedbackRole == null ||
            feedbackLocked
          }
          title={scorecardFeedbackOf(policy).title}
          labels={scorecardFeedbackOf(policy).labels}
          strengths={strengths}
          developments={developments}
          onStrengthsChange={(next) => {
            setStrengths(next)
            setDirty(true)
          }}
          onDevelopmentsChange={(next) => {
            setDevelopments(next)
            setDirty(true)
          }}
        />
      ) : null}

      <ReviewSaveBanner
        notice={saveNotice}
        onDismiss={() => setSaveNotice(null)}
      />
      <ReviewActionIsland>
        <div className="pd-review-packet__island">
          <div className="pd-review-packet__actions">
            <Button variant="secondary" pill disabled={saving} onClick={requestLeave}>
              Cancel
            </Button>
            {!formLocked &&
            !viewingPublishedForm &&
            ((showSelfForm && viewingSelfForm) ||
              (showManagerForm && viewingManagerForm)) ? (
              <>
                <Button
                  variant="secondary"
                  pill
                  disabled={saving || packetDraft == null}
                  onClick={() => void savePacket(false)}
                >
                  Save Draft
                </Button>
                <Button
                  variant="primary"
                  pill
                  disabled={saving || packetDraft == null}
                  onClick={() => void savePacket(true)}
                >
                  Submit
                </Button>
              </>
            ) : null}
          </div>
        </div>
      </ReviewActionIsland>

      <ConfirmDialog
        open={leaveOpen}
        onClose={() => setLeaveOpen(false)}
        onConfirm={() => {
          setLeaveOpen(false)
          navigate(viewHref)
        }}
        title="Unsaved Changes"
        description="Leave without saving? Your edits will be lost."
        confirmLabel="Discard"
        cancelLabel="Stay"
        confirmVariant="danger"
      />

      {showCalibrationForm && stageView.viewing === 'calibration_hod_hrbp' ? (
        <CalibrationBlock
          packet={packet}
          onSave={async (toGrade, reason) => {
            try {
              const next = await calibrateReviewPacket(packet.id, {
                toGrade,
                reason,
                stageId: 'calibration_hod_hrbp',
              })
              setPacket(next)
              setSaveNotice({
                variant: 'success',
                message: 'Calibration recorded.',
                shownAt: Date.now(),
              })
            } catch (err: unknown) {
              setSaveNotice({
                variant: 'error',
                message:
                  err instanceof Error
                    ? err.message
                    : 'Could not record calibration.',
                shownAt: Date.now(),
              })
            }
          }}
        />
      ) : null}

      {stageView.viewing === 'appeal' &&
      (showAppealForm || packet.appeals.length > 0) ? (
        <AppealBlock
          packet={packet}
          onSave={async (body) => {
            try {
              setPacket(await appealReviewPacket(packet.id, body))
              setSaveNotice({
                variant: 'success',
                message: 'Appeal submitted.',
                shownAt: Date.now(),
              })
            } catch (err: unknown) {
              setSaveNotice({
                variant: 'error',
                message:
                  err instanceof Error
                    ? err.message
                    : 'Could not submit this appeal.',
                shownAt: Date.now(),
              })
            }
          }}
        />
      ) : null}
      {stageView.viewing === 'appeal' && canResolveAppeal && openAppeal ? (
        <AppealOverrideBlock
          packet={packet}
          onSave={async (toGrade, justification) => {
            try {
              setPacket(
                await resolveReviewAppeal(packet.id, openAppeal.id, {
                  toGrade,
                  justification,
                }),
              )
              setSaveNotice({
                variant: 'success',
                message: 'Appeal resolved and final rating updated.',
                shownAt: Date.now(),
              })
            } catch (err: unknown) {
              setSaveNotice({
                variant: 'error',
                message:
                  err instanceof Error
                    ? err.message
                    : 'Could not resolve this appeal.',
                shownAt: Date.now(),
              })
            }
          }}
        />
      ) : null}
      <ActivityLogDrawer
        open={activityOpen}
        onClose={() => setActivityOpen(false)}
        title="Review activity"
        description="Self-review, manager review, calibration, and release for this person."
        filters={{ cycleId, subjectEmployeeId: employeeId }}
      />
    </div>
  )
}

function PacketForm({
  title,
  locked,
  questions,
  pillars,
  policy,
  packet,
  actorRole,
  overall,
  extraAnswers,
  extraGrades,
  hidePillarIds = [],
  showOverall = true,
  suggestOverall = false,
  onDraftChange,
  onUserEdit,
}: {
  title: string
  locked: boolean
  questions: ReviewPolicy['scorecard']['questions']
  pillars: ReviewPolicy['scorecard']['pillars']
  policy: ReviewPolicy
  packet: ReviewPacket
  actorRole: 'self' | 'manager'
  overall: GradeBandId | null
  extraAnswers?: Array<{ questionId: string; body: string }>
  extraGrades?: Record<string, GradeBandId | ''>
  hidePillarIds?: string[]
  showOverall?: boolean
  suggestOverall?: boolean
  onDraftChange: (draft: PacketDraft) => void
  onUserEdit: () => void
}) {
  const [answers, setAnswers] = useState<Record<string, string>>(() => {
    const next: Record<string, string> = {}
    for (const answer of packet.answers) {
      if (answer.actorRole === actorRole) next[answer.questionId] = answer.body
    }
    return next
  })
  const [grades, setGrades] = useState<Record<string, GradeBandId | ''>>(() => {
    const next: Record<string, GradeBandId | ''> = {}
    for (const score of packet.pillarScores) {
      if (score.actorRole === actorRole) next[score.pillarId] = score.grade ?? ''
    }
    return next
  })
  const [overallGrade, setOverallGrade] = useState<GradeBandId | ''>(overall ?? '')
  const [overallTouched, setOverallTouched] = useState(Boolean(overall))
  const lastDraftJson = useRef('')
  const lastAppliedSuggestion = useRef<GradeBandId | null>(null)

  const mergedGrades = { ...grades, ...extraGrades }
  const formPillars = pillars.filter(
    (pillar) => !hidePillarIds.includes(pillar.id),
  )
  const formQuestions = questions.filter(
    (question) => !isScorecardFeedbackQuestion(question.id),
  )
  const suggestedOverall = suggestOverall
    ? combinePillarScores({
        policy,
        pillarGrades: Object.fromEntries(
          Object.entries(mergedGrades).map(([id, grade]) => [
            id,
            grade || null,
          ]),
        ),
      }).suggestedGrade
    : null

  useEffect(() => {
    if (!suggestOverall || !suggestedOverall || locked) return
    const shouldApply =
      !overallTouched ||
      overallGrade === '' ||
      overallGrade === lastAppliedSuggestion.current
    if (!shouldApply) return
    if (overallGrade === suggestedOverall) {
      lastAppliedSuggestion.current = suggestedOverall
      return
    }
    lastAppliedSuggestion.current = suggestedOverall
    setOverallGrade(suggestedOverall)
  }, [
    locked,
    overallGrade,
    overallTouched,
    suggestOverall,
    suggestedOverall,
  ])

  useEffect(() => {
    const nextGrades = { ...grades, ...extraGrades }
    const draft = {
      answers: [
        ...questions
          .filter((question) => !isScorecardFeedbackQuestion(question.id))
          .map((question) => ({
            questionId: question.id,
            body: answers[question.id] ?? '',
          })),
        ...(extraAnswers ?? []),
      ],
      pillarScores: pillars.map((pillar) => ({
        pillarId: pillar.id,
        grade: (nextGrades[pillar.id] || null) as GradeBandId | null,
        comment: '',
      })),
      overallGrade: (overallGrade || null) as GradeBandId | null,
    }
    const serialized = JSON.stringify(draft)
    if (serialized === lastDraftJson.current) return
    lastDraftJson.current = serialized
    onDraftChange(draft)
  }, [
    answers,
    extraAnswers,
    extraGrades,
    grades,
    onDraftChange,
    overallGrade,
    pillars,
    questions,
  ])

  return (
    <section className="pd-reviews-edit-card" aria-label={title}>
      {showOverall && packet.selfOverallGrade ? (
        <p className="pd-reviews-flow__hint">
          Self-review overall: {packet.selfOverallGrade}
        </p>
      ) : null}
      {formPillars.map((pillar) => (
        <GradeField
          key={pillar.id}
          id={`packet-grade-${actorRole}-${pillar.id}`}
          label={`${pillar.label} (${pillar.weight}%)`}
          value={mergedGrades[pillar.id] ?? ''}
          disabled={locked}
          onChange={(next) => {
            setGrades((current) => ({
              ...current,
              [pillar.id]: next,
            }))
            onUserEdit()
          }}
        />
      ))}
      {formQuestions.map((question) => (
        <ReviewQuestionField
          key={question.id}
          question={question}
          name={`packet-${actorRole}-${question.id}`}
          disabled={locked}
          value={answers[question.id] ?? ''}
          onChange={(next) => {
            setAnswers((current) => ({
              ...current,
              [question.id]: next,
            }))
            onUserEdit()
          }}
        />
      ))}
      {showOverall ? (
        <OverallGradePicker
          name={`packet-grade-${actorRole}-overall`}
          value={overallGrade}
          disabled={locked}
          suggestedGrade={suggestedOverall}
          onChange={(next) => {
            setOverallTouched(true)
            setOverallGrade(next)
            onUserEdit()
          }}
        />
      ) : null}
    </section>
  )
}

function CalibrationBlock({
  packet,
  onSave,
}: {
  packet: ReviewPacket
  onSave: (toGrade: GradeBandId, reason: string) => Promise<void>
}) {
  const [grade, setGrade] = useState<GradeBandId | ''>(
    packet.calibratedOverallGrade ?? packet.managerOverallGrade ?? '',
  )
  const [reason, setReason] = useState('')
  return (
    <section className="pd-reviews-edit-card">
      <h2 className="pd-reviews-edit-card__title">Calibration</h2>
      <p className="pd-reviews-flow__hint">
        Manager grade: {packet.managerOverallGrade ?? '-'} · Self grade:{' '}
        {packet.selfOverallGrade ?? '-'}
      </p>
      <GradeField
        id="packet-grade-calibrated"
        label="Calibrated grade"
        value={grade}
        allowEmpty={false}
        onChange={(next) => {
          if (next) setGrade(next)
        }}
      />
      <label className="pd-field">
        <span className="pd-field__label">Reason for the change</span>
        <textarea
          className="pd-field__control"
          rows={3}
          value={reason}
          onChange={(event) => setReason(event.target.value)}
        />
      </label>
      <Button
        variant="primary"
        pill
        disabled={!grade || !reason.trim()}
        onClick={() => grade && void onSave(grade, reason)}
      >
        Record Calibration Change
      </Button>
    </section>
  )
}

function AppealBlock({
  packet,
  onSave,
}: {
  packet: ReviewPacket
  onSave: (body: string) => Promise<void>
}) {
  const [body, setBody] = useState('')
  if (packet.appeals.length > 0) {
    return (
      <section className="pd-reviews-edit-card">
        <h2 className="pd-reviews-edit-card__title">Appeal</h2>
        <p>{packet.appeals[0].body}</p>
      </section>
    )
  }
  return (
    <section className="pd-reviews-edit-card">
      <h2 className="pd-reviews-edit-card__title">Appeal</h2>
      <label className="pd-field">
        <span className="pd-field__label">Written record</span>
        <textarea
          className="pd-field__control"
          rows={4}
          value={body}
          onChange={(event) => setBody(event.target.value)}
        />
      </label>
      <Button
        variant="primary"
        pill
        disabled={!body.trim()}
        onClick={() => void onSave(body)}
      >
        Submit Appeal
      </Button>
    </section>
  )
}

function AppealOverrideBlock({
  packet,
  onSave,
}: {
  packet: ReviewPacket
  onSave: (toGrade: GradeBandId, justification: string) => Promise<void>
}) {
  const [grade, setGrade] = useState<GradeBandId | ''>(
    packet.publishedOverallGrade ?? '',
  )
  const [justification, setJustification] = useState('')

  return (
    <section className="pd-reviews-edit-card" aria-label="Admin appeal override">
      <h2 className="pd-reviews-edit-card__title">Admin Appeal Override</h2>
      <p className="pd-reviews-flow__hint">
        Current final rating: {packet.publishedOverallGrade ?? '-'}
      </p>
      <GradeField
        id="packet-grade-appeal-override"
        label="Final rating"
        value={grade}
        allowEmpty={false}
        onChange={(next) => {
          if (next) setGrade(next)
        }}
      />
      <label className="pd-field">
        <span className="pd-field__label">Override justification</span>
        <textarea
          className="pd-field__control"
          rows={4}
          value={justification}
          onChange={(event) => setJustification(event.target.value)}
        />
      </label>
      <Button
        variant="primary"
        pill
        disabled={!grade || !justification.trim()}
        onClick={() => grade && void onSave(grade, justification)}
      >
        Resolve Appeal
      </Button>
    </section>
  )
}
