import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { BadgeCheck, ChevronDown, ChevronUp, Copy, PenLine, Plus, Settings2, Trash2 } from 'lucide-react'
import {
  Button,
  EmptyState,
  Input,
  ListboxSelect,
  Modal,
  Switch,
} from '@/components/ui'
import type { Goal } from '@/lib/goals/types'
import {
  clampPillarWeight,
  gradesGoalsSeparately,
  pillarWeightTotal,
  remainingPillarWeight,
  reweightEnabledPillars,
} from '@/lib/reviews/reviewPolicy'
import type { ScorecardDetail } from '@/lib/reviews/scorecards'
import { WeightHoverField } from '@/pages/goals/GoalMeasurementReadout'
import { OverallGradePicker } from '@/pages/reviews/OverallGradePicker'
import { ReviewQuestionField } from '@/pages/reviews/ReviewQuestionField'
import { ScorecardFeedbackCard } from '@/pages/reviews/ScorecardFeedbackCard'
import {
  GRADE_LISTBOX_OPTIONS,
  ScorecardGoalsCard,
} from '@/pages/reviews/ScorecardGoalsCard'
import { ScorecardHero } from '@/pages/reviews/ScorecardHero'
import {
  addCustomPillar,
  addReviewQuestion,
  duplicateReviewQuestion,
  FORM_ADD_BLOCK_OPTIONS,
  moveReviewQuestion,
  QUESTION_VISIBILITY,
  removeScorecardPillar,
  removeReviewQuestion,
  REVIEW_QUESTION_KINDS,
  setReviewQuestionKind,
  toggleQuestionOutputVisibility,
  toggleQuestionVisibility,
  updateReviewQuestion,
  updateScorecardFeedback,
  updateOverallGrading,
  updateScorecardPillar,
} from '@/lib/reviews/scorecardTemplates'
import type {
  ReviewPolicy,
  ReviewQuestion,
  ReviewQuestionKind,
  ReviewQuestionOutputVisibility,
  ReviewQuestionVisibility,
} from '@/lib/reviews/types'
import { useEnabledValues } from '@/lib/values/useValues'

/** Dummy person so the builder matches scorecard view layout. */
const FORM_PREVIEW_DETAIL: ScorecardDetail = {
  id: 'form-preview',
  cycleKey: 'preview-cycle',
  cycleLabel: 'Example Cycle',
  employeeId: 0,
  employeeName: 'Employee Name',
  employeeAvatarUrl: '',
  reviewerId: null,
  reviewerName: 'Reviewer Name',
  reviewerAvatarUrl: '',
  gradeHidden: false,
  grade: null,
  role: 'Job Title',
  seniority: '-',
  team: '-',
  department: 'Department',
  status: 'in_progress',
  isMine: false,
  goalsOverallPercent: 25,
  goalsOverallBand: 'exceptional',
  performanceGoals: [],
  organisationalGoals: [],
  contributionGrade: null,
  overallGrade: null,
  feedback: {
    authorName: 'Reviewer Name',
    authorRole: 'LM',
    dateLabel: '',
    strengths: '',
    developments: '',
  },
}

const FORM_PREVIEW_GOALS: Goal[] = [
  {
    id: 'preview-goal-1',
    description: 'Example Goal 1',
    weight: 50,
    measurements: [
      {
        id: 'preview-m1',
        kind: 'metric',
        title: 'Progress',
        weight: 100,
        unit: 'number',
        direction: 'increase',
        startValue: 0,
        targetValue: 100,
        currentValue: 50,
      },
    ],
  },
  {
    id: 'preview-goal-2',
    description: 'Example Goal 2',
    weight: 50,
    measurements: [
      {
        id: 'preview-m2',
        kind: 'metric',
        title: 'Progress',
        weight: 100,
        unit: 'number',
        direction: 'increase',
        startValue: 0,
        targetValue: 100,
        currentValue: 0,
      },
    ],
  },
]

type ScorecardFormEditorProps = {
  policy: ReviewPolicy
  onChange: (next: ReviewPolicy) => void
  /** Hide the inline Grade Areas toolbar (parent renders the button). */
  hideGradesToolbar?: boolean
  gradesOpen?: boolean
  onGradesOpenChange?: (open: boolean) => void
  /** Allocated forms are read-only — duplicate to edit. */
  locked?: boolean
}

const SHOWN_ON: Record<ReviewQuestionVisibility, string> = {
  employee: 'Self-Review',
  manager: 'Manager Review',
  calibrators: 'Calibration',
}

const OUTPUT_AUDIENCES: Array<{
  id: ReviewQuestionOutputVisibility
  label: string
}> = [
    { id: 'employee', label: 'Employee' },
    { id: 'manager', label: 'Manager' },
  ]

type SelectedBlock = 'overall' | 'feedback' | string | null

function ScorecardSetupSection({
  title,
  meta,
  manageLabel,
  onManage,
  showManage = true,
  selected = false,
  onSelect,
  titleEdit,
  children,
}: {
  title: string
  meta?: string
  manageLabel: string
  onManage: () => void
  showManage?: boolean
  selected?: boolean
  onSelect?: () => void
  titleEdit?: {
    value: string
    onChange: (value: string) => void
    ariaLabel: string
  }
  children: ReactNode
}) {
  return (
    <section
      className={
        selected
          ? 'pd-reviews-scorecard__card pd-reviews-form-setup-section is-selected'
          : 'pd-reviews-scorecard__card pd-reviews-form-setup-section'
      }
      aria-label={title}
      onClick={onSelect}
    >
      <header
        className="pd-reviews-scorecard__card-head pd-reviews-form-setup-section__head"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="pd-reviews-scorecard__card-title">
          {titleEdit ? (
            <input
              className="pd-reviews-gform-card__prompt pd-reviews-form-setup-section__title-input"
              aria-label={titleEdit.ariaLabel}
              value={titleEdit.value}
              placeholder={title}
              onFocus={onSelect}
              onChange={(event) => titleEdit.onChange(event.target.value)}
            />
          ) : (
            <h2 className="pd-reviews-scorecard__section-title">{title}</h2>
          )}
          {meta ? (
            <span className="pd-reviews-scorecard__goals-percent">{meta}</span>
          ) : null}
        </div>
        {showManage ? (
          <Button
            variant="secondary"
            size="sm"
            pill
            aria-label={manageLabel}
            onClick={onManage}
          >
            {manageLabel}
          </Button>
        ) : null}
      </header>
      <div
        className="pd-reviews-form-setup-section__body"
        onClick={(event) => {
          if (onSelect) event.stopPropagation()
        }}
      >
        {children}
      </div>
    </section>
  )
}

/** Inline type picker — stays inside the modal (no portal; dialog top-layer safe). */
function AddQuestionTypeMenu({
  label,
  variant = 'secondary',
  open: openProp,
  onOpenChange,
  onPick,
}: {
  label: string
  variant?: 'primary' | 'secondary'
  open?: boolean
  onOpenChange?: (open: boolean) => void
  onPick: (kind: ReviewQuestionKind) => void
}) {
  const [openInternal, setOpenInternal] = useState(false)
  const open = openProp ?? openInternal
  const setOpen = onOpenChange ?? setOpenInternal
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onPointerDown = (event: PointerEvent) => {
      if (
        event.target instanceof Node &&
        rootRef.current?.contains(event.target)
      ) {
        return
      }
      setOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [open, setOpen])

  return (
    <div ref={rootRef} className="pd-reviews-form-canvas__type-menu">
      <Button
        variant={variant}
        size="sm"
        pill
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen(!open)}
      >
        <Plus size={14} strokeWidth={2} aria-hidden />
        {label}
      </Button>
      {open ? (
        <ul className="pd-reviews-form-canvas__type-list" role="menu" aria-label={label}>
          {FORM_ADD_BLOCK_OPTIONS.map((item) => (
            <li key={item.id} role="none">
              <button
                type="button"
                role="menuitem"
                className="pd-reviews-form-canvas__type-item"
                aria-label={item.label}
                onClick={() => {
                  onPick(item.id)
                  setOpen(false)
                }}
              >
                <span className="pd-reviews-form-canvas__type-label" aria-hidden>
                  {item.label}
                </span>
                <span className="pd-reviews-form-canvas__type-hint" aria-hidden>
                  {item.hint}
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}

export function ScorecardFormEditor({
  policy,
  onChange: onChangeProp,
  hideGradesToolbar = false,
  gradesOpen: gradesOpenProp,
  onGradesOpenChange,
  locked = false,
}: ScorecardFormEditorProps) {
  const enabledValues = useEnabledValues()
  const [selectedBlock, setSelectedBlock] = useState<SelectedBlock>(null)
  const [focusPillarId, setFocusPillarId] = useState<string | null>(null)
  const [modifyingPillars, setModifyingPillars] = useState(false)
  const [gradesOpenInternal, setGradesOpenInternal] = useState(false)
  const [questionsMenuOpen, setQuestionsMenuOpen] = useState(false)
  const gradesOpen = gradesOpenProp ?? gradesOpenInternal
  const setGradesOpen = onGradesOpenChange ?? setGradesOpenInternal
  const formRef = useRef<HTMLDivElement>(null)
  const weight = pillarWeightTotal(policy)
  const onForm = policy.scorecard.questions.filter((question) => question.enabled)
  const offForm = policy.scorecard.questions.filter((question) => !question.enabled)
  const showOverall = policy.managerReview.gradeOverall
  const feedbackOn = Boolean(policy.scorecard.feedback?.enabled)
  const goalsPillar = policy.scorecard.pillars.find(
    (pillar) => pillar.kind === 'goals',
  )
  const ratingPillars = policy.scorecard.pillars.filter(
    (pillar) => pillar.kind !== 'goals',
  )
  const onChange = locked ? () => { } : onChangeProp

  const openGradeAreas = () => {
    setGradesOpen(true)
    setModifyingPillars(false)
  }

  const manageQuestions = () => {
    if (onForm[0]) {
      setSelectedBlock(onForm[0].id)
      setQuestionsMenuOpen(false)
      return
    }
    setQuestionsMenuOpen(true)
  }

  const manageOverall = () => {
    if (!showOverall) {
      onChange(updateOverallGrading(policy, true))
    }
    setSelectedBlock('overall')
  }

  const manageFeedback = () => {
    if (!feedbackOn) {
      onChange(updateScorecardFeedback(policy, { enabled: true }))
    }
    setSelectedBlock('feedback')
  }

  useEffect(() => {
    if (gradesOpen) setModifyingPillars(false)
  }, [gradesOpen])

  useEffect(() => {
    if (!selectedBlock) return
    const onPointerDown = (event: PointerEvent) => {
      const root = formRef.current
      if (!root) return
      if (event.target instanceof Node && root.contains(event.target)) return
      setSelectedBlock(null)
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [selectedBlock])

  const addQuestion = (kind: ReviewQuestionKind) => {
    const next = addReviewQuestion(policy, kind)
    onChange(next)
    const created = next.scorecard.questions[next.scorecard.questions.length - 1]
    if (created) setSelectedBlock(created.id)
  }

  const gradeAreasTable =
    policy.scorecard.pillars.length > 0 ? (
      <div className="pd-people__panel pd-people__panel--table pd-reviews-form__grade-table-panel">
        <div className="pd-people__table-wrap">
          <table
            className="pd-people__table pd-reviews-form__grade-table"
            aria-label="Grade areas"
          >
            <thead>
              <tr>
                <th scope="col">Area</th>
                <th
                  scope="col"
                  className="pd-reviews-form__grade-weight-col"
                >
                  Weight %
                </th>
                {modifyingPillars ? (
                  <th scope="col">
                    <span className="pd-reviews-form-preview__sr">
                      Actions
                    </span>
                  </th>
                ) : null}
              </tr>
            </thead>
            <tbody>
              {policy.scorecard.pillars.map((item) => (
                <tr
                  key={item.id}
                  className={item.enabled ? undefined : 'is-off'}
                >
                  <td>
                    <div className="pd-reviews-form__grade-area">
                      <Switch
                        label={item.label}
                        className="pd-reviews-type-list__switch"
                        checked={item.enabled}
                        onChange={(event) => {
                          const next = updateScorecardPillar(
                            policy,
                            item.id,
                            {
                              enabled: event.target.checked,
                              weight: event.target.checked
                                ? clampPillarWeight(
                                  policy,
                                  item.id,
                                  item.weight,
                                )
                                : item.weight,
                            },
                          )
                          onChange(
                            event.target.checked
                              ? next
                              : reweightEnabledPillars(next),
                          )
                        }}
                      />
                      {modifyingPillars ? (
                        <Input
                          aria-label="Area name"
                          className="pd-reviews-pillar-list__name-field"
                          value={item.label}
                          placeholder="Area name"
                          autoFocus={focusPillarId === item.id}
                          onFocus={() => setFocusPillarId(null)}
                          onChange={(event) =>
                            onChange(
                              updateScorecardPillar(policy, item.id, {
                                label: event.target.value,
                              }),
                            )
                          }
                        />
                      ) : (
                        <span className="pd-reviews-form__grade-area-name">
                          {item.label || 'Custom area'}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="pd-reviews-form__grade-weight-col">
                    {item.enabled ? (
                      <WeightHoverField
                        weight={item.weight}
                        ariaLabel={`weight for ${item.label || 'Custom area'}`}
                        maxWeight={remainingPillarWeight(policy, item.id)}
                        showSuffix={false}
                        onChange={(nextWeight) =>
                          onChange(
                            updateScorecardPillar(policy, item.id, {
                              weight: clampPillarWeight(
                                policy,
                                item.id,
                                nextWeight,
                              ),
                            }),
                          )
                        }
                      />
                    ) : (
                      <span className="pd-reviews-pillar-list__off">Off</span>
                    )}
                  </td>
                  {modifyingPillars ? (
                    <td className="pd-reviews-form__grade-action-col">
                      <Button
                        variant="ghost"
                        size="sm"
                        pill
                        className="pd-reviews-pillar-list__remove"
                        aria-label={`Remove ${item.label || 'grading area'}`}
                        onClick={() =>
                          onChange(removeScorecardPillar(policy, item.id))
                        }
                      >
                        <Trash2 size={14} strokeWidth={2} aria-hidden />
                      </Button>
                    </td>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {modifyingPillars ? (
          <div className="pd-reviews-form__grade-footer">
            <Button
              variant="ghost"
              size="sm"
              pill
              onClick={() => {
                const next = addCustomPillar(policy)
                const created =
                  next.scorecard.pillars[next.scorecard.pillars.length - 1]
                onChange(next)
                if (created) setFocusPillarId(created.id)
              }}
            >
              <Plus size={14} strokeWidth={2} aria-hidden />
              Add
            </Button>
          </div>
        ) : null}
      </div>
    ) : (
      <EmptyState
        className="pd-empty--inline"
        title="No Grade Areas"
        description="Add areas to weight Goals, Skills, and other pillars."
        action={
          <Button
            variant="primary"
            size="sm"
            pill
            onClick={() => {
              const next = addCustomPillar(policy)
              const created =
                next.scorecard.pillars[next.scorecard.pillars.length - 1]
              onChange(next)
              setModifyingPillars(true)
              if (created) setFocusPillarId(created.id)
            }}
          >
            <Plus size={14} strokeWidth={2} aria-hidden />
            Add Area
          </Button>
        }
      />
    )

  return (
    <div
      ref={formRef}
      className={
        locked
          ? 'pd-reviews-form pd-reviews-scorecard pd-reviews-form--builder pd-reviews-form--locked'
          : 'pd-reviews-form pd-reviews-scorecard pd-reviews-form--builder'
      }
    >
      <fieldset
        disabled={locked}
        className="pd-reviews-form__lock-fieldset"
        aria-label={locked ? 'Allocated form (read-only)' : undefined}
      >
        {!hideGradesToolbar ? (
          <div className="pd-reviews-form__toolbar">
            <Button
              variant="secondary"
              size="sm"
              pill
              onClick={openGradeAreas}
            >
              <Settings2 size={14} strokeWidth={2} aria-hidden />
              Grade Areas
            </Button>
            {weight !== 100 ? (
              <p className="pd-reviews-form__weight">{weight}% of 100%</p>
            ) : null}
          </div>
        ) : null}

        <section
          className="pd-reviews-form__page pd-reviews-form__page--scorecard"
          aria-label="Review form preview"
        >
          <ScorecardHero
            detail={FORM_PREVIEW_DETAIL}
            packet={null}
            hideStages
          />

          <ScorecardSetupSection
            title={goalsPillar?.label || 'Goals'}
            meta={goalsPillar?.enabled ? `${goalsPillar.weight}%` : 'Off'}
            manageLabel="Manage evaluation criteria"
            onManage={openGradeAreas}
            showManage={!locked}
          >
            {goalsPillar?.enabled ? (
              <ScorecardGoalsCard
                cycleLabel={FORM_PREVIEW_DETAIL.cycleLabel}
                goals={FORM_PREVIEW_GOALS}
                overallPercent={FORM_PREVIEW_DETAIL.goalsOverallPercent}
                overallBand={
                  gradesGoalsSeparately(policy)
                    ? FORM_PREVIEW_DETAIL.goalsOverallBand
                    : null
                }
                owner={{
                  id: 'form-preview',
                  name: FORM_PREVIEW_DETAIL.employeeName,
                }}
                hideTitle
                bare
              />
            ) : (
              <EmptyState
                className="pd-empty--inline"
                title="Goals are off"
                description="Turn Goals on in Grade Areas to include them on this scorecard."
                action={
                  locked ? null : (
                    <Button variant="secondary" size="sm" pill onClick={openGradeAreas}>
                      Manage evaluation criteria
                    </Button>
                  )
                }
              />
            )}
          </ScorecardSetupSection>

          {ratingPillars.map((pillar) => (
            <ScorecardSetupSection
              key={pillar.id}
              title={pillar.label || 'Custom area'}
              meta={pillar.enabled ? `${pillar.weight}%` : 'Off'}
              manageLabel={`Manage ${pillar.label || 'area'}`}
              onManage={openGradeAreas}
              showManage={!locked}
            >
              {pillar.id === 'skills' ? (
                pillar.enabled ? (
                  <p className="pd-reviews-flow__hint">
                    Skills come from each person&apos;s profile and are graded on
                    the review ({pillar.weight}% of overall when on).
                  </p>
                ) : (
                  <EmptyState
                    className="pd-empty--inline"
                    title="Skills is off"
                    description="Turn it on in Grade Areas to show and grade profile skills on this scorecard. Prior skill grades stay saved but do not count toward overall."
                    action={
                      locked ? null : (
                        <Button
                          variant="secondary"
                          size="sm"
                          pill
                          onClick={openGradeAreas}
                        >
                          Manage Skills
                        </Button>
                      )
                    }
                  />
                )
              ) : pillar.id === 'values' ? (
                pillar.enabled ? (
                  <div>
                    <p className="pd-reviews-flow__hint">
                      Everyone is graded on the company cultural values. The
                      unweighted average is {pillar.weight}% of overall and
                      cannot be set by hand.
                    </p>
                    <ul className="pd-reviews-values-preview">
                      {enabledValues.map((value) => (
                        <li key={value.id}>{value.name}</li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  <EmptyState
                    className="pd-empty--inline"
                    title="Core Values is off"
                    description="Turn it on in Grade Areas to grade the seven cultural values on this scorecard. Prior value grades stay saved but do not count toward overall."
                    action={
                      locked ? null : (
                        <Button
                          variant="secondary"
                          size="sm"
                          pill
                          onClick={openGradeAreas}
                        >
                          Manage Core Values
                        </Button>
                      )
                    }
                  />
                )
              ) : pillar.enabled ? (
                <div className="pd-reviews-scorecard__contribution-card">
                  <ListboxSelect
                    className="pd-reviews-scorecard__goals-grade"
                    id={`form-preview-pillar-${pillar.id}`}
                    aria-label={`${pillar.label || 'Area'} grade preview`}
                    value=""
                    onValueChange={() => { }}
                    disabled
                    placeholder="Select a grade"
                    emptyLabel="Select a grade"
                    options={GRADE_LISTBOX_OPTIONS}
                  />
                </div>
              ) : (
                <EmptyState
                  className="pd-empty--inline"
                  title={`${pillar.label || 'This area'} is off`}
                  description="Turn it on in Grade Areas to grade it on this scorecard."
                  action={
                    locked ? null : (
                      <Button variant="secondary" size="sm" pill onClick={openGradeAreas}>
                        {`Manage ${pillar.label || 'area'}`}
                      </Button>
                    )
                  }
                />
              )}
            </ScorecardSetupSection>
          ))}

          <ScorecardSetupSection
            title="Questions"
            manageLabel="Manage questions"
            onManage={manageQuestions}
            showManage={!locked}
          >
            {onForm.length === 0 ? (
              <EmptyState
                className="pd-reviews-form-preview__empty"
                title="No Questions Yet"
                description="Add custom questions here. This section stays empty on the live scorecard until you do."
                action={
                  <AddQuestionTypeMenu
                    label="Create Question"
                    variant="primary"
                    open={questionsMenuOpen}
                    onOpenChange={setQuestionsMenuOpen}
                    onPick={addQuestion}
                  />
                }
              />
            ) : (
              <>
                <div className="pd-reviews-form-canvas__questions" aria-label="Questions list">
                  {onForm.map((question) => {
                    const index = policy.scorecard.questions.indexOf(question)
                    return (
                      <FormQuestionCard
                        key={question.id}
                        question={question}
                        index={index}
                        total={policy.scorecard.questions.length}
                        policy={policy}
                        selected={selectedBlock === question.id}
                        onSelect={() =>
                          setSelectedBlock((current) =>
                            current === question.id ? null : question.id,
                          )
                        }
                        onFocusQuestion={(questionId = question.id) =>
                          setSelectedBlock(questionId)
                        }
                        onChange={onChange}
                      />
                    )
                  })}
                </div>
                <div className="pd-reviews-form-canvas__add">
                  <AddQuestionTypeMenu
                    label="Add Question"
                    open={questionsMenuOpen}
                    onOpenChange={setQuestionsMenuOpen}
                    onPick={addQuestion}
                  />
                </div>
              </>
            )}
          </ScorecardSetupSection>

          <ScorecardSetupSection
            title="Overall Grading"
            manageLabel="Manage overall grading"
            onManage={manageOverall}
            showManage={!locked}
            selected={selectedBlock === 'overall'}
            onSelect={() => {
              if (showOverall) setSelectedBlock('overall')
              else manageOverall()
            }}
          >
            {showOverall ? (
              <>
                <OverallGradePicker
                  name="form-preview-overall"
                  value=""
                  disabled
                  hideTitle
                />
                {selectedBlock === 'overall' ? (
                  <div
                    className="pd-reviews-gform-card__footer"
                    onClick={(event) => event.stopPropagation()}
                  >
                    <div className="pd-reviews-gform-card__footer-controls">
                      <div className="pd-reviews-gform-card__footer-rules">
                        <Button
                          variant="ghost"
                          size="sm"
                          pill
                          onClick={() => {
                            onChange(updateOverallGrading(policy, false))
                            setSelectedBlock(null)
                          }}
                        >
                          Turn off
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : null}
              </>
            ) : (
              <EmptyState
                className="pd-empty--inline"
                title="Overall grading is off"
                description="Turn it on to show the five-band overall grade on this scorecard."
                action={
                  locked ? null : (
                    <Button variant="primary" size="sm" pill onClick={manageOverall}>
                      Include overall grading
                    </Button>
                  )
                }
              />
            )}
          </ScorecardSetupSection>

          <ScorecardSetupSection
            title={policy.scorecard.feedback?.title || 'Feedback'}
            manageLabel="Manage feedback"
            onManage={manageFeedback}
            showManage={!locked}
            selected={selectedBlock === 'feedback'}
            onSelect={() => {
              if (feedbackOn) setSelectedBlock('feedback')
              else manageFeedback()
            }}
            titleEdit={
              selectedBlock === 'feedback' && feedbackOn
                ? {
                  value: policy.scorecard.feedback?.title ?? 'Feedback',
                  ariaLabel: 'Feedback section title',
                  onChange: (title) =>
                    onChange(updateScorecardFeedback(policy, { title })),
                }
                : undefined
            }
          >
            {feedbackOn ? (
              <>
                <ScorecardFeedbackCard
                  feedback={{
                    authorName: '',
                    authorRole: '',
                    dateLabel: '',
                    strengths: '',
                    developments: '',
                  }}
                  title={policy.scorecard.feedback?.title ?? 'Feedback'}
                  labels={
                    policy.scorecard.feedback?.labels ?? [
                      'Strengths',
                      'Areas Of Improvement',
                    ]
                  }
                  hideTitle
                  bare
                  onLabelsChange={
                    selectedBlock === 'feedback'
                      ? (labels) => onChange(updateScorecardFeedback(policy, { labels }))
                      : undefined
                  }
                />
                {selectedBlock === 'feedback' ? (
                  <div
                    className="pd-reviews-gform-card__footer"
                    onClick={(event) => event.stopPropagation()}
                  >
                    <div className="pd-reviews-gform-card__footer-visibility">
                      <div
                        className="pd-reviews-form-preview__shown"
                        role="group"
                        aria-label="Answered on"
                      >
                        <span className="pd-reviews-form-preview__shown-label">
                          <PenLine size={12} strokeWidth={2} aria-hidden />
                          Answered On
                        </span>
                        {QUESTION_VISIBILITY.filter((option) => option.id !== 'calibrators').map(
                          (option) => {
                            const on = (
                              policy.scorecard.feedback?.visibility ?? [
                                'employee',
                                'manager',
                              ]
                            ).includes(option.id)
                            return (
                              <button
                                key={option.id}
                                type="button"
                                className={
                                  on
                                    ? 'pd-reviews-form-preview__chip is-on'
                                    : 'pd-reviews-form-preview__chip'
                                }
                                aria-pressed={on}
                                title={option.hint}
                                onClick={() => {
                                  const current =
                                    policy.scorecard.feedback?.visibility ?? [
                                      'employee',
                                      'manager',
                                    ]
                                  const next = on
                                    ? current.filter((item) => item !== option.id)
                                    : [...current, option.id]
                                  onChange(
                                    updateScorecardFeedback(policy, {
                                      visibility:
                                        next.length > 0 ? next : current,
                                    }),
                                  )
                                }}
                              >
                                {SHOWN_ON[option.id]}
                              </button>
                            )
                          },
                        )}
                      </div>
                      <div
                        className="pd-reviews-form-preview__shown"
                        role="group"
                        aria-label="Published to"
                      >
                        <span className="pd-reviews-form-preview__shown-label">
                          <BadgeCheck size={12} strokeWidth={2} aria-hidden />
                          Published To
                        </span>
                        {OUTPUT_AUDIENCES.map((option) => {
                          const current =
                            policy.scorecard.feedback?.outputVisibility ?? [
                              'employee',
                              'manager',
                            ]
                          const on = current.includes(option.id)
                          return (
                            <button
                              key={option.id}
                              type="button"
                              className={
                                on
                                  ? 'pd-reviews-form-preview__chip is-on'
                                  : 'pd-reviews-form-preview__chip'
                              }
                              aria-pressed={on}
                              onClick={() => {
                                const next = on
                                  ? current.filter((item) => item !== option.id)
                                  : [...current, option.id]
                                onChange(
                                  updateScorecardFeedback(policy, {
                                    outputVisibility:
                                      next.length > 0 ? next : current,
                                  }),
                                )
                              }}
                            >
                              {option.label}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                    <div className="pd-reviews-gform-card__footer-controls">
                      <div className="pd-reviews-gform-card__footer-rules">
                        <Button
                          variant="ghost"
                          size="sm"
                          pill
                          onClick={() => {
                            onChange(
                              updateScorecardFeedback(policy, { enabled: false }),
                            )
                            setSelectedBlock(null)
                          }}
                        >
                          Turn off
                        </Button>
                        <Switch
                          label="Required"
                          className="pd-reviews-gform-card__required"
                          checked={Boolean(policy.scorecard.feedback?.required)}
                          onChange={(event) =>
                            onChange(
                              updateScorecardFeedback(policy, {
                                required: event.target.checked,
                              }),
                            )
                          }
                        />
                      </div>
                    </div>
                  </div>
                ) : null}
              </>
            ) : (
              <EmptyState
                className="pd-empty--inline"
                title="Feedback is off"
                description="Turn it on to collect strengths and areas of development on this scorecard."
                action={
                  locked ? null : (
                    <Button variant="primary" size="sm" pill onClick={manageFeedback}>
                      Include feedback
                    </Button>
                  )
                }
              />
            )}
          </ScorecardSetupSection>
        </section>

        <Modal
          open={gradesOpen}
          onClose={() => {
            setGradesOpen(false)
            setModifyingPillars(false)
          }}
          title="Grade Areas"
          description="Turn areas on and set weights. This is how grading shows on the scorecard."
          className="pd-reviews-form-modal pd-reviews-form-modal--grades"
          actions={
            <>
              <Button
                variant="ghost"
                size="sm"
                pill
                onClick={() => setModifyingPillars((open) => !open)}
              >
                {modifyingPillars ? 'Done Editing' : 'Modify'}
              </Button>
              <Button
                variant="primary"
                size="sm"
                pill
                onClick={() => {
                  setGradesOpen(false)
                  setModifyingPillars(false)
                }}
              >
                Done
              </Button>
            </>
          }
        >
          {gradeAreasTable}
        </Modal>

        {offForm.length > 0 ? (
          <details className="pd-cycle-setup__more">
            <summary>Off the form ({offForm.length})</summary>
            <ul className="pd-reviews-form-preview__aside">
              {offForm.map((question) => (
                <li key={question.id}>
                  <p>{question.prompt || 'Untitled question'}</p>
                  <Button
                    variant="ghost"
                    size="sm"
                    pill
                    onClick={() =>
                      onChange(
                        updateReviewQuestion(policy, question.id, {
                          enabled: true,
                        }),
                      )
                    }
                  >
                    Put On The Form
                  </Button>
                </li>
              ))}
            </ul>
          </details>
        ) : null}
      </fieldset>
    </div>
  )
}


function FormQuestionCard({
  question,
  index,
  total,
  policy,
  selected,
  onSelect,
  onFocusQuestion,
  onChange,
}: {
  question: ReviewQuestion
  index: number
  total: number
  policy: ReviewPolicy
  selected: boolean
  onSelect: () => void
  onFocusQuestion: (questionId?: string) => void
  onChange: (next: ReviewPolicy) => void
}) {
  const number = index + 1
  const promptId = useId()
  const descriptionId = useId()
  const kind = question.kind ?? 'open_ended'
  const description = question.description ?? ''

  return (
    <section
      className={
        selected
          ? 'pd-reviews-edit-card pd-reviews-form-canvas__block pd-reviews-gform-card is-selected'
          : 'pd-reviews-edit-card pd-reviews-form-canvas__block pd-reviews-gform-card'
      }
      aria-label={`Question ${number}`}
      onClick={onSelect}
    >
      <div
        className="pd-reviews-gform-card__header"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="pd-reviews-gform-card__title">
          <label className="pd-reviews-form-preview__sr" htmlFor={promptId}>
            Question {number} prompt
          </label>
          <input
            id={promptId}
            className="pd-reviews-gform-card__prompt"
            aria-label={`Question ${number} prompt`}
            value={question.prompt}
            placeholder="Question"
            onFocus={() => {
              if (!selected) onFocusQuestion()
            }}
            onChange={(event) =>
              onChange(
                updateReviewQuestion(policy, question.id, {
                  prompt: event.target.value,
                }),
              )
            }
          />
          {question.required ? (
            <span className="pd-reviews-form-preview__required" aria-label="Required">
              *
            </span>
          ) : null}
        </div>
        {selected ? (
          <ListboxSelect
            id={`question-kind-${question.id}`}
            className="pd-reviews-gform-card__type"
            aria-label={`Question ${number} type`}
            allowEmpty={false}
            portal
            value={kind}
            onValueChange={(next) =>
              onChange(
                setReviewQuestionKind(
                  policy,
                  question.id,
                  next as ReviewQuestionKind,
                ),
              )
            }
            options={(
              kind === 'dual_text'
                ? [
                  {
                    id: 'dual_text' as const,
                    label: 'Two fields',
                    hint: 'Legacy dual text',
                  },
                  ...REVIEW_QUESTION_KINDS,
                ]
                : REVIEW_QUESTION_KINDS
            ).map((item) => ({
              value: item.id,
              label: item.label,
              description: item.hint,
            }))}
          />
        ) : null}
      </div>

      {(selected || description) ? (
        <div
          className="pd-reviews-gform-card__description"
          onClick={(event) => event.stopPropagation()}
        >
          {selected ? (
            <>
              <label className="pd-reviews-form-preview__sr" htmlFor={descriptionId}>
                Question {number} description
              </label>
              <input
                id={descriptionId}
                className="pd-reviews-gform-card__description-input"
                aria-label={`Question ${number} description`}
                value={description}
                placeholder="Description (optional)"
                onFocus={() => {
                  if (!selected) onFocusQuestion()
                }}
                onChange={(event) =>
                  onChange(
                    updateReviewQuestion(policy, question.id, {
                      description: event.target.value,
                    }),
                  )
                }
              />
            </>
          ) : (
            <p className="pd-reviews-gform-card__description-text">{description}</p>
          )}
        </div>
      ) : null}

      <div
        className="pd-reviews-gform-card__body"
        onClick={(event) => event.stopPropagation()}
      >
        <ReviewQuestionField
          question={question}
          hidePrompt
          disabled
          controlLabel={`Question ${number} answer preview`}
          onOptionsChange={
            kind === 'multiple_choice'
              ? (options) => {
                if (!selected) onFocusQuestion()
                onChange(
                  updateReviewQuestion(policy, question.id, { options }),
                )
              }
              : undefined
          }
          onDualLabelsChange={
            kind === 'dual_text'
              ? (dualLabels) => {
                if (!selected) onFocusQuestion()
                onChange(
                  updateReviewQuestion(policy, question.id, { dualLabels }),
                )
              }
              : undefined
          }
        />
      </div>

      {selected ? (
        <div
          className="pd-reviews-gform-card__footer"
          onClick={(event) => event.stopPropagation()}
        >
          <div className="pd-reviews-gform-card__footer-visibility">
            <div
              className="pd-reviews-form-preview__shown"
              role="group"
              aria-label="Answered on"
            >
              <span className="pd-reviews-form-preview__shown-label">
                <PenLine size={12} strokeWidth={2} aria-hidden />
                Answered On
              </span>
              {QUESTION_VISIBILITY.filter((option) => option.id !== 'calibrators').map(
                (option) => {
                  const on = question.visibility.includes(option.id)
                  return (
                    <button
                      key={option.id}
                      type="button"
                      className={
                        on
                          ? 'pd-reviews-form-preview__chip is-on'
                          : 'pd-reviews-form-preview__chip'
                      }
                      aria-pressed={on}
                      title={option.hint}
                      onClick={() =>
                        onChange(
                          toggleQuestionVisibility(
                            policy,
                            question.id,
                            option.id,
                            !on,
                          ),
                        )
                      }
                    >
                      {SHOWN_ON[option.id]}
                    </button>
                  )
                },
              )}
            </div>
            <div
              className="pd-reviews-form-preview__shown"
              role="group"
              aria-label="Published to"
            >
              <span className="pd-reviews-form-preview__shown-label">
                <BadgeCheck size={12} strokeWidth={2} aria-hidden />
                Published To
              </span>
              {OUTPUT_AUDIENCES.map((option) => {
                const on = (question.outputVisibility ?? ['employee', 'manager']).includes(
                  option.id,
                )
                return (
                  <button
                    key={option.id}
                    type="button"
                    className={
                      on
                        ? 'pd-reviews-form-preview__chip is-on'
                        : 'pd-reviews-form-preview__chip'
                    }
                    aria-pressed={on}
                    title={
                      option.id === 'employee'
                        ? 'Employee can see this answer when results are shared'
                        : 'Manager can see this answer when results are shared'
                    }
                    onClick={() =>
                      onChange(
                        toggleQuestionOutputVisibility(
                          policy,
                          question.id,
                          option.id,
                          !on,
                        ),
                      )
                    }
                  >
                    {option.label}
                  </button>
                )
              })}
            </div>
          </div>
          <div className="pd-reviews-gform-card__footer-controls">
            <div className="pd-reviews-gform-card__footer-actions">
              <Button
                variant="ghost"
                size="sm"
                pill
                aria-label={`Move question ${number} up`}
                disabled={index === 0}
                onClick={() => onChange(moveReviewQuestion(policy, question.id, -1))}
              >
                <ChevronUp size={15} strokeWidth={2} aria-hidden />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                pill
                aria-label={`Move question ${number} down`}
                disabled={index === total - 1}
                onClick={() => onChange(moveReviewQuestion(policy, question.id, 1))}
              >
                <ChevronDown size={15} strokeWidth={2} aria-hidden />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                pill
                aria-label={`Duplicate question ${number}`}
                onClick={() => {
                  const next = duplicateReviewQuestion(policy, question.id)
                  onChange(next)
                  const created = next.scorecard.questions[index + 1]
                  if (created) onFocusQuestion(created.id)
                }}
              >
                <Copy size={15} strokeWidth={2} aria-hidden />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                pill
                aria-label={`Remove question ${number}`}
                onClick={() => onChange(removeReviewQuestion(policy, question.id))}
              >
                <Trash2 size={15} strokeWidth={2} aria-hidden />
              </Button>
            </div>
            <div className="pd-reviews-gform-card__footer-rules">
              <Button
                variant="ghost"
                size="sm"
                pill
                onClick={() =>
                  onChange(
                    updateReviewQuestion(policy, question.id, { enabled: false }),
                  )
                }
              >
                Hide
              </Button>
              <Switch
                label="Required"
                className="pd-reviews-gform-card__required"
                checked={question.required}
                onChange={(event) =>
                  onChange(
                    updateReviewQuestion(policy, question.id, {
                      required: event.target.checked,
                    }),
                  )
                }
              />
            </div>
          </div>
        </div>
      ) : null}

      {/* Keep a dedicated settings control for keyboard / tests. */}
      <button
        type="button"
        className="pd-reviews-form-preview__sr"
        aria-label={`Question ${number} settings`}
        aria-pressed={selected}
        onClick={(event) => {
          event.stopPropagation()
          onSelect()
        }}
      >
        Question {number} settings
      </button>
    </section>
  )
}
