import { Fragment, useEffect, useMemo, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { Link, useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  ArrowLeft,
  Briefcase,
  Building2,
  CalendarDays,
  ChevronDown,
  ChevronRight,
  CircleAlert,
  CircleCheck,
  CircleDot,
  Clock3,
  FilePenLine,
  Plus,
  Search,
  Target,
  Undo2,
  UserRound,
  Users,
} from "lucide-react";
import {
  AttributeFilters,
  Avatar,
  Button,
  CountBadge,
  Divider,
  EmptyState,
  PageHeader,
  Progress,
  ResizableTable,
  sanitizeCycleSelection,
  SegmentedControl,
  type ResizableColumn,
} from "@/components/ui";
import {
  matchesAttributeFilters,
  uniqueAttributeValues,
  uniqueLabeledAttributeValues,
  type AttributeFilterMap,
  type AttributeValue,
} from "@/lib/filters/attributeFilters";
import {
  appendGoalWithWeight,
  canSubmitGoals,
  overallCompletion,
  ensureGoalCycleHydrated,
  removeGoalKeepingWeights,
  selectGoalCycle,
  submitBlockersForGoal,
  submitIssueForGoal,
  submitSetBlockers,
  sumGoalWeights,
  type DemoPhase,
  type Goal,
  type GoalsSnapshot,
  type PersonGoals,
} from "@/lib/goalsApi";
import {
  hasPromptableUnsavedGoalDraft,
  isBlankGoalDraft,
  isGoalDraftDirty,
  progressOnlyGoals,
} from "@/lib/goals/draft";
import { blankGoal, measurementPanels } from "@/lib/goals/measurements";
import {
  cascadeApprovers,
  indexCascadeRecipients,
  type CascadeRecipient,
  type CascadeToOption,
  type GoalOwnerOption,
  type LineManagerCascade,
} from "@/lib/goals/operations";
import {
  deriveGoalCapabilities,
  isComposableGoalStatus,
  type GoalCapabilities,
} from "@/lib/goals/permissions";
import {
  countOwnGoalTodos,
  countReportGoalTodos,
  goalTodoBadgeLabel,
} from "@/lib/goals/todoCounts";
import {
  goalEditLockSegments,
  speakGoalEditLockSegments,
} from "@/lib/goals/editWindow";
import {
  isGoalWindowOpenForPerson,
  resolveGoalDeadline,
} from "@/lib/goals/goalExtensions";
import { useAuth } from "@/lib/auth";
import { hasSystemPermission } from "@/lib/accessControl/types";
import {
  hydrateManagerDelegations,
  listActiveDelegatedManagerIds,
  subscribeManagerDelegations,
} from "@/lib/delegations/store";
import { avatarStyle } from "@/lib/employees/avatar";
import { getEmployee } from "@/lib/employees/store";
import { applyOkrPayloadToGoal, type OkrGoalDropPayload } from "@/lib/okr/applyToGoal";
import { okrQuarterFromLabel } from "@/lib/okr/quarter";
import type { OkrReferenceScope } from "@/lib/okr/reference";
import {
  useGoalsHydration,
  useSharedGoalsSnapshot,
} from "@/lib/goals/useSharedGoalsSnapshot";
import { DEMO_PHASES } from "@/lib/goals/phases";
import {
  GoalCascadeName,
  GoalIssueIcon,
  GoalProgressAge,
  GoalsTable,
  GoalWeightTree,
  MeasureNameCell,
} from "./goals/GoalsTable";
import {
  GoalProgressInfo,
  GoalProgressInfoTip,
} from "./goals/GoalProgressInfo";
import { formatWeightReadout } from "./goals/GoalMeasurementReadout";
import {
  measurePanelLatestProgressAt,
  measurePanelName,
  measurePanelProgress,
  measurePanelTableWeight,
} from "./goals/measurePanelDisplay";
import { GoalSendBackNotice } from "./goals/GoalSendBackNotice";
import { GoalSubmitBlockNotice } from "./goals/GoalSubmitBlockNotice";
import { GoalCountNotice } from "./goals/GoalCountNotice";
import {
  CycleIneligibilityNotice,
  GoalEditLockNotice,
} from "./goals/GoalEditLockNotice";
import { GoalSubmitAllButton } from "./goals/GoalSubmitAllButton";
import {
  ReviewSaveBanner,
  successNotice,
  type ReviewSaveNotice,
} from "./reviews/ReviewSaveBanner";
import { GoalEmptyActions } from "./goals/GoalEmptyActions";
import { GoalUnsavedCloseDialog } from "./goals/GoalUnsavedCloseDialog";
import { useGoalDraftState } from "./goals/useGoalDraftState";
import { useDebouncedGoalSave } from "./goals/useDebouncedGoalSave";
import { useGoalEditGuard } from "./goals/useGoalEditGuard";
import { GoalLockSegments } from "./goals/PersonMention";
import { useGoalUnsavedClose } from "./goals/useGoalUnsavedClose";
import { GoalCreateDrawer } from "./goals/GoalCreateDrawer";
import {
  GoalOkrReferenceSheet,
  OKR_REFERENCE_SHEET_LABEL,
  OKR_REFERENCE_TAB_LABEL,
} from "./goals/GoalOkrReferenceSheet";
import { GoalDetailView } from "./goals/GoalDetailView";
import type { CascadeTarget } from "./goals/GoalCascadeTargetDialog";
import { ReportGoalsCard, ReportGoalsEmpty } from "./goals/ReportGoalsCard";
import { GoalsCycleSelect } from "./goals/GoalsCycleSelect";
import { useGoalsController } from "./goals/useGoalsController";
import {
  goalTitle,
  goalSectionLabels,
  goalsDetailPath,
  goalsGoalPath,
  duplicateCycleOptions,
  canViewPersonGoals,
  GOALS_MY_GOALS_HASH,
  hashForManagerTab,
  hashForGoalsScope,
  goalsScopeFromHash,
  managerTabFromHash,
  type GoalsDirectoryScope,
  type GoalsManagerTab,
} from "./goals/goalHelpers";
import { locationWithHash, useUrlHashTab } from "@/lib/routing/urlHash";
import {
  combineStatusCounts,
  describeEmptyGoalsList,
  EMPTY_STATUS_COUNTS,
  goalExpandKey,
  goalRows,
  matchesStatusFilter,
  peopleInScope,
  peopleWithoutGoals,
  statusCounts,
  withOwnerRowSpans,
  type GoalsListFilter,
} from "./goals/overviewRows";
import { GoalApprovalStatus } from "./goals/GoalApprovalStatus";
import {
  cycleIneligibilityEmptyState,
  ownGoalsEmptyCopy,
  statusLabel,
} from "./goals/statusLabels";
import { getGoalsSnapshotForCycle } from "@/lib/goals/store";
import { cycleIneligibilityReason } from "@/lib/goals/demoData";
import { goalsCycleForPerson } from "@/lib/goals/cyclesFromReviews";
import { cyclesListPath } from "@/lib/reviews/paths";
import { useReviewCyclesHydrated } from "@/lib/reviews/useReviews";
import "@/styles/layout-people.css";
import "@/styles/layout-goals.css";

function phaseLabel(phase: DemoPhase): string {
  return DEMO_PHASES.find((p) => p.id === phase)?.label ?? phase;
}
/** Designation and department - one line under the owner name in the goals table. */
function personOwnerMeta(person: GoalsSnapshot["people"][number]): string {
  return [person.title, person.department].filter(Boolean).join(", ");
}

/** Single-line role summary - mirrors the employee profile hero. */
function personMeta(person: GoalsSnapshot["people"][number]): string {
  const division = getEmployee(Number(person.id))?.division;
  return [person.title, person.department, division].filter(Boolean).join(" · ");
}

function okrScopeFor(personId: string): OkrReferenceScope | undefined {
  const employee = getEmployee(Number(personId));
  if (!employee) return undefined;
  return {
    department: employee.department,
    wing: employee.team,
  };
}

function persistThenNotify(
  persist: () => Promise<boolean | void> | boolean | void,
  onSuccess: () => void,
) {
  return Promise.resolve(persist()).then((saved) => {
    if (saved === false) return false;
    onSuccess();
    return true;
  });
}

/** Bookmark tab that pulls the read-only OKRs out from behind the goal drawer. */
function okrSideSheetFor(personId: string, cycleLabel?: string) {
  const employeeId = Number(personId);
  if (!Number.isInteger(employeeId) || employeeId <= 0) return undefined;
  return {
    tabLabel: OKR_REFERENCE_TAB_LABEL,
    tabIcon: Target,
    label: OKR_REFERENCE_SHEET_LABEL,
    content: (
      <GoalOkrReferenceSheet
        employeeId={employeeId}
        quarter={okrQuarterFromLabel(cycleLabel)}
        cycleLabel={cycleLabel}
        scope={okrScopeFor(personId)}
      />
    ),
  };
}

function Notice({
  tone = "neutral",
  children,
}: {
  tone?: "neutral" | "warn" | "ok" | "danger";
  children: ReactNode;
}) {
  const mod =
    tone === "neutral"
      ? ""
      : ` pd-goals__notice--${tone === "ok" ? "ok" : tone}`;
  return <p className={`pd-goals__notice${mod}`}>{children}</p>;
}

function GoalsToolbar({
  start,
  actions,
}: {
  start?: ReactNode;
  actions?: ReactNode;
}) {
  if (!start && !actions) return null;
  return (
    <div className="pd-goals-toolbar">
      {start}
      {actions ? (
        <div className="pd-goals-toolbar__end">{actions}</div>
      ) : null}
    </div>
  );
}

type ManagerTab = GoalsManagerTab;

const OVERVIEW_SCOPES: {
  id: Extract<GoalsDirectoryScope, "mine" | "all" | "reports">;
  label: string;
}[] = [
    { id: "mine", label: "My Goals" },
    { id: "reports", label: "My Reports" },
    { id: "all", label: "Everyone" },
  ];

const GOALS_COLUMNS: ResizableColumn[] = [
  { id: "owner", label: "Owner" },
  { id: "cycle", label: "Cycle" },
  { id: "goals", label: "Goals", grow: true },
  { id: "weight", label: "Weight" },
  { id: "progress", label: "Progress" },
  { id: "approval", label: "Approval" },
];

function cascadeTargetsFor(
  reportIds: string[],
  people: GoalsSnapshot["people"],
): CascadeTarget[] {
  return reportIds.flatMap((id) => {
    const person = people.find((candidate) => candidate.id === id);
    if (!person) return [];
    return [
      {
        id: person.id,
        name: person.name,
        title: person.title,
        avatarUrl: person.avatarUrl,
      },
    ];
  });
}

export default function GoalsPage() {
  const { cycleId, personId, goalId } = useParams();

  if (cycleId && personId) {
    return (
      <GoalsPersonDetail
        cycleId={cycleId}
        personId={personId}
        goalId={goalId}
      />
    );
  }

  return <GoalsOverview />;
}

type OverviewPanelSelection = {
  cycleId: string;
  personId: string;
  goalId: string;
  measureKey?: string | null;
};

function GoalsOverviewGoalPanel({
  cycleId,
  personId,
  goalId,
  highlightMeasureKey,
  onClose,
  onGoalChange,
}: {
  cycleId: string;
  personId: string;
  goalId: string;
  highlightMeasureKey?: string | null;
  onClose: () => void;
  onGoalChange: (nextGoalId: string, nextCycleId?: string) => void;
}) {
  const {
    snapshot,
    actor,
    subject,
    subjectGoals,
    subjectCycle,
    cycleMembershipReady,
    capabilities,
    cascadeFrom,
    cascadeRecipientsFor,
    cascadeToOptionsFor,
    resolveOwner,
    actions,
  } = useGoalsController({
    cycleId,
    subjectId: personId,
    syncActiveSelection: false,
  });
  const [toastNotice, setToastNotice] = useState<ReviewSaveNotice | null>(null);
  const showOverviewGoalToast = (message: string) => {
    setToastNotice(successNotice(message));
  };

  const personCycle = subjectCycle ?? snapshot?.cycle;
  const ineligibility =
    cycleMembershipReady && subject && personCycle
      ? cycleIneligibilityReason(subject, personCycle, subjectGoals?.status)
      : null;
  const drawerApprovers = cascadeApprovers(cascadeFrom);
  const { requestGoalEdit, goalEditGuard } = useGoalEditGuard({
    personId,
    actorId: actor?.id,
    status: subjectGoals?.status ?? "draft",
    deadlinePassed: Boolean(
      personCycle &&
      subject &&
      personCycle.phase === "hard_lock" &&
      !isGoalWindowOpenForPerson(personCycle, subject) &&
      personCycle.postWindowGoalPolicy === "two_tier_approval",
    ),
    lineManager: drawerApprovers.lineManager,
    skipLevelManager: drawerApprovers.skipLevelManager,
  });

  const persistedGoals = subjectGoals?.goals ?? [];
  const { goals, setGoals } = useGoalDraftState({
    personId,
    status: subjectGoals?.status ?? "draft",
    persistedGoals,
  });
  const persistBaselineRef = useRef(persistedGoals);
  if (!hasPromptableUnsavedGoalDraft(goals, persistedGoals)) {
    persistBaselineRef.current = persistedGoals;
  }
  const canEditDraft = Boolean(capabilities?.canEditStructure);
  const canManualSave =
    canEditDraft &&
    isComposableGoalStatus(
      subjectGoals?.status ?? "draft",
      personCycle ?? snapshot?.cycle,
    );
  const persistDraft = () => {
    void actions.saveGoals(personId, goals);
  };
  const unsavedClose = useGoalUnsavedClose({
    dirty:
      canManualSave &&
      hasPromptableUnsavedGoalDraft(goals, persistBaselineRef.current),
    onSaveDraft: persistDraft,
    onDiscard: () => setGoals(persistedGoals),
  });

  if (!snapshot || !subject || !subjectGoals) return null;

  const selectedIndex = goals.findIndex((goal) => goal.id === goalId);
  const selectedGoal = selectedIndex >= 0 ? goals[selectedIndex] : null;
  if (!selectedGoal) return null;

  const selectedPersisted = persistedGoals.find(
    (goal) => goal.id === selectedGoal.id,
  );
  const selectedHasUnsavedChanges = Boolean(
    selectedPersisted
      ? isGoalDraftDirty(selectedPersisted, selectedGoal)
      : !isBlankGoalDraft(selectedGoal),
  );
  const canUpdateProgress = Boolean(capabilities?.canUpdateProgress);
  const canDuplicate = Boolean(capabilities?.canDuplicate);
  const canCascade = Boolean(capabilities?.canCascade);
  const isCurrentCycle = snapshot.cycleStatus === "current";
  const editLockArgs = {
    cycle: personCycle ?? snapshot.cycle,
    cycleStatus: snapshot.cycleStatus,
    canUpdateProgress,
    status: subjectGoals.status,
    postWindowApprovalStage: subjectGoals.postWindowApprovalStage,
    subject,
    lineManagerName: drawerApprovers.lineManager?.name,
    skipLevelManagerName: drawerApprovers.skipLevelManager?.name ?? null,
  };
  const editLockSegments = goalEditLockSegments(editLockArgs);
  const editLock = editLockSegments
    ? speakGoalEditLockSegments(editLockSegments, editLockArgs)
    : null;
  const lockMessage = ineligibility || canEditDraft ? null : editLock;
  const lockContent =
    ineligibility || canEditDraft
      ? null
      : editLockSegments
        ? (
          <GoalLockSegments
            segments={editLockSegments}
            lineManager={drawerApprovers.lineManager}
            skipLevelManager={drawerApprovers.skipLevelManager}
          />
        )
        : editLock;
  const owner = resolveOwner(selectedGoal, subject.id) ?? {
    id: subject.id,
    name: subject.name,
    title: subject.title,
    avatarUrl: subject.avatarUrl,
  };
  const replaceSelected = (next: Goal) =>
    goals.map((goal) => (goal.id === next.id ? next : goal));
  const saveGoal = (next: Goal, message = "Goal saved.") => {
    const updated = replaceSelected(next);
    setGoals(updated);
    persistBaselineRef.current = updated;
    void persistThenNotify(
      () => actions.saveGoals(personId, updated),
      () => showOverviewGoalToast(message),
    );
  };
  const canSubmitBatch =
    Boolean(capabilities?.canSubmit) &&
    isComposableGoalStatus(
      subjectGoals.status,
      personCycle ?? snapshot.cycle,
    );
  const submitCheck = canSubmitGoals(
    goals,
    (personCycle ?? snapshot.cycle).goalCountPolicy,
  );

  return (
    <GoalCreateDrawer
      label={`View ${goalTitle(selectedGoal, selectedIndex)}`}
      closeLabel="Close Goal"
      sideSheet={okrSideSheetFor(personId, snapshot.cycle.label)}
      onClose={() => unsavedClose.requestLeave(onClose)}
      ribbon={
        canSubmitBatch ? (
          <GoalSubmitBlockNotice
            layout="ribbon"
            nameTheGoal={false}
            blockers={submitBlockersForGoal(selectedGoal.id, submitCheck.blockers)}
            onOpenGoal={onGoalChange}
          />
        ) : ineligibility ? (
          <CycleIneligibilityNotice
            layout="ribbon"
            personName={subject.name}
            reason={ineligibility}
          />
        ) : lockContent && lockMessage ? (
          <GoalEditLockNotice
            layout="ribbon"
            message={lockContent}
            spoken={lockMessage}
          />
        ) : null
      }
    >
      <ReviewSaveBanner
        notice={toastNotice}
        onDismiss={() => setToastNotice(null)}
      />
      {goalEditGuard}
      <GoalUnsavedCloseDialog
        open={unsavedClose.dialogOpen}
        onStay={unsavedClose.stay}
        onDiscard={unsavedClose.discard}
        onSaveDraft={unsavedClose.saveDraft}
      />
      <div className="pd-goals-review">
        <GoalDetailView
          goal={selectedGoal}
          index={selectedIndex}
          owner={owner}
          highlightMeasureKey={highlightMeasureKey}
          cycleId={snapshot.cycle.id}
          subjectId={personId}
          fullViewHref={goalsGoalPath(cycleId, personId, goalId)}
          cascadeFrom={cascadeFrom}
          cascadedTo={cascadeRecipientsFor(selectedGoal.id)}
          cascadeToOptions={cascadeToOptionsFor(selectedGoal.id)}
          cascadeHref={(pid, gid) =>
            goalsGoalPath(snapshot.cycle.id, pid, gid)
          }
          cycleLabel={snapshot.cycle.label}
          isCurrentCycle={isCurrentCycle}
          status={subjectGoals.status}
          postWindowApprovalStage={subjectGoals.postWindowApprovalStage}
          commentAuthorName={actor?.name ?? subject.name}
          commentAuthorId={actor?.id ?? subject.id}
          commentAuthors={snapshot.people}
          canEdit={canEditDraft}
          canUpdateProgress={canUpdateProgress}
          canRemove={canEditDraft}
          cascadeTargets={cascadeTargetsFor(subject.reportIds, snapshot.people)}
          onRequestEdit={requestGoalEdit}
          manualSave={canManualSave}
          hasUnsavedChanges={selectedHasUnsavedChanges}
          onChange={(next) => {
            const updated = replaceSelected(next);
            setGoals(updated);
            const progressGoals = progressOnlyGoals(persistedGoals, updated);
            if (progressGoals) {
              void persistThenNotify(
                () => actions.saveProgress(personId, progressGoals),
                () => showOverviewGoalToast("Progress saved."),
              );
            }
          }}
          onAddComment={(text) => {
            void persistThenNotify(
              () => actions.addComment(personId, selectedGoal.id, text),
              () => showOverviewGoalToast("Comment added."),
            );
          }}
          onUpdateComment={(commentId, text) => {
            void persistThenNotify(
              () =>
                actions.updateComment(
                  personId,
                  selectedGoal.id,
                  commentId,
                  text,
                ),
              () => showOverviewGoalToast("Comment updated."),
            );
          }}
          onRemoveComment={(commentId) => {
            void persistThenNotify(
              () => actions.removeComment(personId, selectedGoal.id, commentId),
              () => showOverviewGoalToast("Comment deleted."),
            );
          }}
          onSave={(next) => requestGoalEdit(() => saveGoal(next))}
          onDuplicate={
            canDuplicate
              ? (targetCycleId) => {
                requestGoalEdit(() => {
                  void actions
                    .duplicateGoal(personId, selectedGoal.id, targetCycleId)
                    .then((copy) => {
                      if (!copy) return;
                      onGoalChange(copy.id, targetCycleId);
                      showOverviewGoalToast("Goal duplicated.");
                    });
                });
              }
              : undefined
          }
          duplicateCycles={duplicateCycleOptions(snapshot.availableCycles)}
          defaultDuplicateCycleId={cycleId}
          onCascade={
            canCascade
              ? (reportIds) => {
                requestGoalEdit(() => {
                  void actions
                    .cascadeGoal(personId, selectedGoal.id, reportIds)
                    .then(() => {
                      showOverviewGoalToast("Goal cascaded.");
                    });
                });
              }
              : undefined
          }
          onLinkCascadeTo={
            canCascade
              ? (option) => {
                requestGoalEdit(() => {
                  void persistThenNotify(
                    () =>
                      actions.linkCascadeTo(
                        personId,
                        selectedGoal.id,
                        option,
                      ),
                    () => showOverviewGoalToast("Goal cascaded."),
                  );
                });
              }
              : undefined
          }
          onUnlinkCascadeTo={
            canCascade
              ? (recipient) => {
                requestGoalEdit(() => {
                  void persistThenNotify(
                    () =>
                      actions.unlinkCascadeTo(personId, selectedGoal.id, {
                        personId: recipient.personId,
                        goalId: recipient.goalId,
                      }),
                    () => showOverviewGoalToast("Cascade removed."),
                  );
                });
              }
              : undefined
          }
          onRemove={
            canEditDraft
              ? () => {
                requestGoalEdit(() => {
                  const updated = removeGoalKeepingWeights(
                    goals,
                    selectedGoal.id,
                  );
                  setGoals(updated);
                  persistBaselineRef.current = updated;
                  void persistThenNotify(
                    () => actions.saveGoals(personId, updated),
                    () => showOverviewGoalToast("Goal deleted."),
                  );
                  onClose();
                });
              }
              : undefined
          }
          onApplyOkrAsNewGoal={
            canEditDraft
              ? (payload) => {
                requestGoalEdit(() => {
                  unsavedClose.requestLeave(() => {
                    const created = applyOkrPayloadToGoal(
                      blankGoal({ ownerId: personId }),
                      payload,
                    );
                    const updated = appendGoalWithWeight(goals, created);
                    setGoals(updated);
                    persistBaselineRef.current = updated;
                    void persistThenNotify(
                      () => actions.saveGoals(personId, updated),
                      () => {
                        showOverviewGoalToast("Goal created.");
                        onGoalChange(created.id);
                      },
                    );
                  });
                });
              }
              : undefined
          }
        />
      </div>
    </GoalCreateDrawer>
  );
}

function GoalsOverview() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const snapshot = useSharedGoalsSnapshot();
  const cycleMembershipReady = useReviewCyclesHydrated();
  const [query, setQuery] = useState("");
  const [attributeFilters, setAttributeFilters] = useState<AttributeFilterMap>(
    {},
  );
  const [selectedCycleIds, setSelectedCycleIds] = useState<string[]>(() => [
    snapshot.cycle.id,
  ]);
  const hydration = useGoalsHydration(selectedCycleIds);

  useEffect(() => {
    void hydrateManagerDelegations().catch(() => {
      /* Delegation list stays empty until the viewer can load it. */
    });
  }, []);

  useEffect(() => {
    const availableIds = snapshot.availableCycles.map((cycle) => cycle.id);
    const next = sanitizeCycleSelection(
      selectedCycleIds,
      availableIds,
      snapshot.cycle.id,
    );
    if (
      next.length === selectedCycleIds.length &&
      next.every((id, index) => id === selectedCycleIds[index])
    ) {
      return;
    }
    setSelectedCycleIds(next);
  }, [selectedCycleIds, snapshot.availableCycles, snapshot.cycle.id]);

  useEffect(() => {
    for (const cycleId of selectedCycleIds) {
      void ensureGoalCycleHydrated(cycleId);
    }
  }, [selectedCycleIds]);
  const [scope, setScope] = useUrlHashTab<
    Extract<GoalsDirectoryScope, "mine" | "reports" | "all">
  >({
    defaultTab: "mine",
    tabFromHash: goalsScopeFromHash,
    hashFromTab: hashForGoalsScope,
  });
  const [statusFilter, setStatusFilter] = useState<GoalsListFilter | null>(null);
  const panelSelection = useMemo<OverviewPanelSelection | null>(() => {
    const personId = searchParams.get("person");
    const goalId = searchParams.get("goal");
    const cycleId = searchParams.get("cycle") ?? snapshot.cycle.id;
    const measureKey = searchParams.get("measure");
    if (!personId || !goalId) return null;
    return { cycleId, personId, goalId, measureKey };
  }, [searchParams, snapshot.cycle.id]);
  const [hoveredPersonId, setHoveredPersonId] = useState<string | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => new Set());

  function setPanelSelection(next: OverviewPanelSelection | null) {
    const params = new URLSearchParams(searchParams);
    if (next) {
      params.set("person", next.personId);
      params.set("goal", next.goalId);
      params.set("cycle", next.cycleId);
      if (next.measureKey) params.set("measure", next.measureKey);
      else params.delete("measure");
    } else {
      params.delete("person");
      params.delete("goal");
      params.delete("cycle");
      params.delete("measure");
    }
    const search = params.toString();
    navigate(
      {
        pathname: location.pathname,
        search: search ? `?${search}` : "",
        hash: location.hash,
      },
      { replace: true },
    );
  }

  function toggleStatusFilter(next: GoalsListFilter) {
    setStatusFilter((current) => (current === next ? null : next));
  }

  const me = useMemo(() => {
    if (!snapshot) return null;
    const email = user?.email?.trim().toLowerCase();
    const personId = user?.personId;
    return (
      snapshot.people.find((person) => {
        if (email && person.email.trim().toLowerCase() === email) return true;
        if (personId && personId !== "local" && person.id === personId) {
          return true;
        }
        return false;
      }) ?? null
    );
  }, [snapshot, user?.email, user?.personId]);

  const viewer = useMemo(
    () => (me ? { ...me, permissions: user?.permissions } : null),
    [me, user?.permissions],
  );
  const coverVersion = useSyncExternalStore(
    subscribeManagerDelegations,
    () =>
      me
        ? listActiveDelegatedManagerIds(me.id).join(",")
        : "",
    () => "",
  );
  const coveredManagerIds = useMemo(
    () => (me ? listActiveDelegatedManagerIds(me.id) : []),
    [coverVersion, me],
  );
  const overviewScopes = OVERVIEW_SCOPES.filter((item) => {
    if (item.id === "reports") {
      return Boolean(me?.reportIds.length || coveredManagerIds.length);
    }
    if (item.id === "all") {
      if (!me || !viewer) return false;
      return snapshot.people.some(
        (person) =>
          person.id !== me.id &&
          canViewPersonGoals(person, viewer, snapshot.people),
      );
    }
    return true;
  });
  const visibleScope = overviewScopes.some((item) => item.id === scope)
    ? scope
    : "mine";
  const cycleSnapshots = useMemo(
    () =>
      selectedCycleIds.map((cycleId) => getGoalsSnapshotForCycle(cycleId)),
    [selectedCycleIds, snapshot],
  );
  const scopedPeople = useMemo(() => {
    const byId = new Map<string, (typeof snapshot.people)[number]>();
    for (const cycleSnapshot of cycleSnapshots) {
      for (const person of peopleInScope(cycleSnapshot, viewer, visibleScope)) {
        byId.set(person.id, person);
      }
    }
    return [...byId.values()];
  }, [cycleSnapshots, viewer, visibleScope]);
  const viewerIneligibility = useMemo(() => {
    if (!me || !cycleMembershipReady) return null;
    for (const cycleSnapshot of cycleSnapshots) {
      const reason = cycleIneligibilityReason(
        me,
        goalsCycleForPerson(cycleSnapshot.cycle, me.id),
        cycleSnapshot.byPerson[me.id]?.status,
      );
      if (reason) return reason;
    }
    return null;
  }, [cycleMembershipReady, cycleSnapshots, me]);
  const ownCycleEmpty =
    me && viewerIneligibility
      ? cycleIneligibilityEmptyState(me.name, viewerIneligibility)
      : null;
  const ownGoalCount = me
    ? cycleSnapshots.reduce(
      (total, cycleSnapshot) =>
        total + (cycleSnapshot.byPerson[me.id]?.goals.length ?? 0),
      0,
    )
    : 0;
  const scopedRows = useMemo(
    () =>
      cycleSnapshots.flatMap((cycleSnapshot) =>
        goalRows(
          cycleSnapshot,
          peopleInScope(cycleSnapshot, viewer, visibleScope),
        ),
      ),
    [cycleSnapshots, viewer, visibleScope],
  );

  const countsReady =
    visibleScope === "mine" ? hydration.ownReady : hydration.cycleReady;
  const counts = useMemo(
    () =>
      snapshot && countsReady
        ? combineStatusCounts(
          cycleSnapshots.map((cycleSnapshot) =>
            statusCounts(
              cycleSnapshot,
              peopleInScope(cycleSnapshot, viewer, visibleScope),
            ),
          ),
        )
        : EMPTY_STATUS_COUNTS,
    [countsReady, cycleSnapshots, snapshot, viewer, visibleScope],
  );

  const filtered = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return scopedRows
      .filter((row) => {
        if (!matchesStatusFilter(row.status, statusFilter)) return false;
        if (
          !matchesAttributeFilters(attributeFilters, {
            owner: row.person.name.trim(),
            cycle: row.cycleLabel.trim(),
            goal: row.title.trim(),
            department: row.person.department.trim(),
            jobTitle: row.person.title.trim(),
          })
        ) {
          return false;
        }
        if (!normalizedQuery) return true;
        return [
          row.title,
          row.person.name,
          row.person.title,
          row.person.department,
          row.cycleLabel,
          statusLabel(row.status),
          ...measurementPanels(row.measurements).map(
            (panel) => measurePanelName(panel),
          ),
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(normalizedQuery);
      })
      .sort((a, b) => {
        const aDept = a.person.department.trim();
        const bDept = b.person.department.trim();
        const aBlank = aDept === "";
        const bBlank = bDept === "";
        if (aBlank !== bBlank) return aBlank ? 1 : -1;
        const byDept = aDept.localeCompare(bDept, undefined, {
          sensitivity: "base",
        });
        if (byDept !== 0) return byDept;
        const byName = a.person.name.localeCompare(b.person.name, undefined, {
          sensitivity: "base",
        });
        if (byName !== 0) return byName;
        const byCycle = a.cycleLabel.localeCompare(b.cycleLabel, undefined, {
          sensitivity: "base",
        });
        if (byCycle !== 0) return byCycle;
        return a.title.localeCompare(b.title, undefined, {
          sensitivity: "base",
        });
      });
  }, [attributeFilters, query, scopedRows, statusFilter]);

  const tableRows = useMemo(
    () => withOwnerRowSpans(filtered, expandedIds),
    [expandedIds, filtered],
  );

  const canAddOwnGoals = useMemo(() => {
    if (!snapshot || !viewer || viewerIneligibility) return false;
    const row = snapshot.byPerson[viewer.id];
    if (!row) return false;
    return deriveGoalCapabilities({
      actor: viewer,
      subject: viewer,
      row,
      cycle: goalsCycleForPerson(snapshot.cycle, viewer.id),
      cycleStatus: snapshot.cycleStatus,
    }).canCreate;
  }, [snapshot, viewer, viewerIneligibility]);

  const emptyList = useMemo(
    () =>
      describeEmptyGoalsList({
        scope: visibleScope,
        peopleInScope: scopedPeople.length,
        waitingPeople: snapshot
          ? scopedPeople.filter((person) =>
            cycleSnapshots.every(
              (cycleSnapshot) =>
                peopleWithoutGoals(
                  cycleSnapshot,
                  [person],
                  statusFilter,
                ).length > 0,
            ),
          ).length
          : 0,
        hasQuery: query.trim().length > 0,
        statusFilter,
        canAddOwnGoals,
      }),
    [
      canAddOwnGoals,
      cycleSnapshots,
      query,
      scopedPeople,
      snapshot,
      statusFilter,
      visibleScope,
    ],
  );

  useEffect(() => {
    if (!panelSelection) return;
    const row = getGoalsSnapshotForCycle(panelSelection.cycleId).byPerson[
      panelSelection.personId
    ];
    if (!row?.goals.some((goal) => goal.id === panelSelection.goalId)) {
      setPanelSelection(null);
    }
  }, [panelSelection, snapshot]);

  useEffect(() => {
    if (!panelSelection?.measureKey) return;
    const key = `${panelSelection.cycleId}:${panelSelection.goalId}`;
    setExpandedIds((current) => {
      if (current.has(key)) return current;
      return new Set(current).add(key);
    });
  }, [panelSelection]);

  const summaryItems: {
    id: GoalsListFilter;
    label: string;
    value: number;
    icon: typeof Target;
  }[] = [
      { id: "all", label: "Goals", value: counts.goals, icon: Target },
      { id: "draft", label: "Draft", value: counts.draft, icon: FilePenLine },
      {
        id: "sent_back",
        label: "Sent Back",
        value: counts.sentBack,
        icon: Undo2,
      },
      {
        id: "submitted",
        label: "Pending Approval",
        value: counts.submitted,
        icon: Clock3,
      },
      {
        id: "approved",
        label: "Approved",
        value: counts.approved,
        icon: CircleCheck,
      },
      {
        id: "incomplete",
        label: "Incomplete",
        value: counts.incomplete,
        icon: CircleAlert,
      },
    ];

  const goalAttributes = useMemo(
    () => [
      { id: "owner", label: "Owner", icon: UserRound },
      { id: "cycle", label: "Cycle", icon: CalendarDays },
      { id: "goal", label: "Goal", icon: Target },
      { id: "department", label: "Department", icon: Building2 },
      { id: "jobTitle", label: "Job title", icon: Briefcase },
      { id: "approval", label: "Approval", icon: CircleDot },
    ],
    [],
  );

  const goalAttributeValues = useMemo(
    (): Record<string, AttributeValue[]> => ({
      owner: uniqueAttributeValues(scopedRows.map((row) => row.person.name)),
      cycle: uniqueAttributeValues(scopedRows.map((row) => row.cycleLabel)),
      goal: uniqueAttributeValues(scopedRows.map((row) => row.title)),
      department: uniqueAttributeValues(
        scopedRows.map((row) => row.person.department),
      ),
      jobTitle: uniqueAttributeValues(scopedRows.map((row) => row.person.title)),
      approval: uniqueLabeledAttributeValues(
        scopedRows.map((row) => ({
          value: row.status,
          label: statusLabel(row.status),
        })),
      ),
    }),
    [scopedRows],
  );

  const selectedGoalFilters = useMemo(
    () => ({
      ...attributeFilters,
      approval:
        statusFilter && statusFilter !== "all" ? [statusFilter] : [],
    }),
    [attributeFilters, statusFilter],
  );

  const isGoalsListPending =
    visibleScope === "mine"
      ? (!hydration.ownReady || !cycleMembershipReady) && ownGoalCount === 0
      : !hydration.cycleReady && filtered.length === 0;

  return (
    <div
      className="pd-page pd-page--pane pd-goals pd-goals-overview"
      aria-label="Goals"
    >
      <div
        className="pd-people__summary pd-people__summary--stretch"
        role="group"
        aria-label="Goal submission totals"
        aria-busy={countsReady ? undefined : true}
      >
        {summaryItems.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              type="button"
              className={[
                "pd-people__summary-btn",
                statusFilter === item.id ? "is-active" : "",
              ]
                .filter(Boolean)
                .join(" ")}
              aria-pressed={statusFilter === item.id}
              onClick={() => toggleStatusFilter(item.id)}
            >
              <span className="pd-people__summary-label">
                <Icon size={14} strokeWidth={1.75} aria-hidden />
                {item.label}
              </span>
              <span className="pd-people__summary-value">{item.value}</span>
            </button>
          );
        })}
      </div>

      <div className="pd-people__header pd-people__header--bar">
        <div className="pd-people__bar-start">
          <GoalsCycleSelect
            multiple
            cycles={snapshot.availableCycles}
            selectedCycleIds={selectedCycleIds}
            onSelectMany={setSelectedCycleIds}
          />
          {me ? (
            <SegmentedControl
              className="pd-people__scope pd-goals-overview__scope"
              buttonClassName="pd-people__scope-btn"
              options={overviewScopes}
              value={visibleScope}
              onChange={setScope}
              aria-label="Goals scope"
            />
          ) : null}
        </div>

        <div className="pd-people__toolbar">
          <AttributeFilters
            attributes={goalAttributes}
            valuesFor={(id) => goalAttributeValues[id] ?? []}
            selected={selectedGoalFilters}
            onChange={(next) => {
              const { approval, ...rest } = next;
              if (approval?.length === 1) {
                setStatusFilter(approval[0] as GoalsListFilter);
              } else {
                setStatusFilter(null);
              }
              setAttributeFilters(rest);
            }}
            sectionLabel="Goal attributes"
          />
          <label className="pd-people__search pd-goals-overview__search">
            <Search size={16} strokeWidth={1.75} aria-hidden />
            <span className="pd-sr-only">Search goals</span>
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search goals or people…"
              className="pd-people__search-input"
            />
          </label>
        </div>
      </div>

      <section
        className="pd-people__panel pd-people__panel--table"
        aria-labelledby="goals-people-heading"
      >
        <h2 id="goals-people-heading" className="pd-sr-only">
          {scope === "mine"
            ? "My Goals"
            : scope === "reports"
              ? "My Reports' Goals"
              : "Everyone's Goals"}
        </h2>
        {isGoalsListPending ? (
          <div
            className="pd-people__empty-state"
            aria-busy="true"
            aria-label="Loading goals"
          />
        ) : visibleScope === "mine" && ownCycleEmpty && ownGoalCount === 0 ? (
          <div className="pd-people__empty-state">
            <EmptyState
              className="pd-empty--inline"
              icon={Target}
              title={ownCycleEmpty.title}
              description={ownCycleEmpty.description}
            />
          </div>
        ) : filtered.length === 0 ? (
          <div className="pd-people__empty-state">
            <EmptyState
              className="pd-empty--inline"
              icon={Target}
              title={emptyList.title}
              description={emptyList.description}
              action={
                emptyList.offerAdd && me ? (
                  <Button
                    pill
                    onClick={() =>
                      navigate(
                        goalsDetailPath(snapshot.cycle.id, me.id),
                      )
                    }
                  >
                    <Plus size={16} strokeWidth={1.75} aria-hidden />
                    Add Goal
                  </Button>
                ) : undefined
              }
            />
          </div>
        ) : (
          <div className="pd-people__table-wrap">
            {visibleScope === "mine" && viewerIneligibility && me ? (
              <div className="pd-goals__notices">
                <CycleIneligibilityNotice
                  layout="ribbon"
                  personName={me.name}
                  reason={viewerIneligibility}
                />
              </div>
            ) : null}
            <ResizableTable
              className="pd-people__table pd-goals-overview__table"
              storageKey="goals-overview-column-widths"
              columns={GOALS_COLUMNS}
            >
              <tbody>
                {tableRows.map((row) => {
                  const expandKey = goalExpandKey(row);
                  const panels = measurementPanels(row.measurements);
                  const titleIssue = row.issue;
                  const isOpen = expandedIds.has(expandKey);
                  const isGoalSelected =
                    panelSelection?.cycleId === row.cycleId &&
                    panelSelection?.personId === row.person.id &&
                    panelSelection?.goalId === row.goalId &&
                    !panelSelection.measureKey;
                  const isOwnerActive =
                    hoveredPersonId === row.person.id ||
                    panelSelection?.personId === row.person.id;
                  const ownerMeta = personOwnerMeta(row.person);
                  const openGoal = () =>
                    setPanelSelection({
                      cycleId: row.cycleId,
                      personId: row.person.id,
                      goalId: row.goalId,
                    });
                  const hoverPerson = {
                    onMouseEnter: () => setHoveredPersonId(row.person.id),
                    onMouseLeave: () => setHoveredPersonId(null),
                  };
                  return (
                    <Fragment key={row.key}>
                      <tr
                        className={[
                          "pd-goals-overview__row",
                          isGoalSelected ? "is-selected" : "",
                          row.isPersonEnd && !isOpen
                            ? "pd-goals-overview__row--person-end"
                            : "",
                        ]
                          .filter(Boolean)
                          .join(" ")}
                        tabIndex={0}
                        aria-selected={isGoalSelected}
                        {...hoverPerson}
                        onClick={(event) => {
                          const target = event.target as HTMLElement;
                          if (target.closest("a, button")) return;
                          openGoal();
                        }}
                        onKeyDown={(event) => {
                          if (event.key !== "Enter" && event.key !== " ") return;
                          event.preventDefault();
                          openGoal();
                        }}
                      >
                        {row.ownerRowSpan > 0 ? (
                          <td
                            rowSpan={row.ownerRowSpan}
                            data-col="owner"
                            className={[
                              "pd-goals-overview__owner-cell",
                              isOwnerActive ? "is-active" : "",
                            ]
                              .filter(Boolean)
                              .join(" ")}
                          >
                            <div className="pd-goals-overview__owner">
                              <Link
                                to={goalsDetailPath(
                                  row.cycleId,
                                  row.person.id,
                                )}
                                className="pd-goals-overview__owner-link"
                              >
                                <Avatar
                                  name={row.person.name}
                                  src={row.person.avatarUrl}
                                  size="sm"
                                  className="pd-people__avatar"
                                  style={avatarStyle(row.person.name)}
                                />
                                <div className="pd-goals-overview__owner-text">
                                  <span className="pd-people__person-name">
                                    {row.person.name}
                                  </span>
                                  {ownerMeta ? (
                                    <span className="pd-goals-overview__owner-meta">
                                      {ownerMeta}
                                    </span>
                                  ) : null}
                                </div>
                              </Link>
                            </div>
                          </td>
                        ) : null}
                        <td
                          data-col="cycle"
                          className="pd-goals-overview__cycle"
                        >
                          {row.cycleLabel}
                        </td>
                        <td data-col="goals">
                          <div className="pd-goals-table__name-cell">
                            {panels.length > 0 ? (
                              <button
                                type="button"
                                className="pd-goals-table__expand"
                                aria-expanded={isOpen}
                                aria-label={
                                  isOpen
                                    ? `Collapse ${row.title}`
                                    : `Expand ${row.title}`
                                }
                                onClick={(event) => {
                                  event.stopPropagation();
                                  setExpandedIds((current) => {
                                    const next = new Set(current);
                                    if (next.has(expandKey)) next.delete(expandKey);
                                    else next.add(expandKey);
                                    return next;
                                  });
                                }}
                                onKeyDown={(event) => event.stopPropagation()}
                              >
                                {isOpen ? (
                                  <ChevronDown
                                    size={16}
                                    strokeWidth={1.75}
                                    aria-hidden
                                  />
                                ) : (
                                  <ChevronRight
                                    size={16}
                                    strokeWidth={1.75}
                                    aria-hidden
                                  />
                                )}
                              </button>
                            ) : (
                              <span
                                className="pd-goals-table__expand-spacer"
                                aria-hidden
                              />
                            )}
                            <span
                              className="pd-goals-overview__goal"
                              title={row.title}
                            >
                              <GoalCascadeName
                                goal={row}
                                cascadeFrom={row.cascadeFrom}
                                cascadedTo={row.cascadedTo}
                              >
                                <span
                                  className={
                                    titleIssue
                                      ? "pd-goals-overview__goal-text pd-goals-overview__goal-text--error"
                                      : "pd-goals-overview__goal-text"
                                  }
                                >
                                  {row.title}
                                </span>
                                {titleIssue ? (
                                  <GoalIssueIcon issue={titleIssue} />
                                ) : null}
                              </GoalCascadeName>
                            </span>
                          </div>
                        </td>
                        <td data-col="weight">
                          <GoalWeightTree
                            limb={
                              panels.length > 0
                                ? isOpen
                                  ? "stem"
                                  : "spacer"
                                : undefined
                            }
                          >
                            <span className="pd-goals-overview__weight">
                              {row.weight}%
                            </span>
                          </GoalWeightTree>
                        </td>
                        <td data-col="progress">
                          <div className="pd-goals-overview__progress">
                            <div className="pd-goals-overview__progress-meta">
                              <GoalProgressAge at={row.lastUpdatedAt} />
                              <GoalProgressInfo
                                label={`Progress details for ${row.title}`}
                              >
                                <GoalProgressInfoTip
                                  goal={{
                                    id: row.goalId,
                                    description: row.title,
                                    weight: row.weight,
                                    measurements: row.measurements,
                                  }}
                                />
                              </GoalProgressInfo>
                              <span className="pd-goals-overview__progress-label">
                                {row.completion}%
                              </span>
                            </div>
                            <Progress value={row.completion} />
                          </div>
                        </td>
                        <td data-col="approval">
                          <GoalApprovalStatus
                            status={row.status}
                            postWindowApprovalStage={row.postWindowApprovalStage}
                          />
                        </td>
                      </tr>
                      {isOpen
                        ? panels.map((panel, index) => {
                          const measureName =
                            measurePanelName(panel) || "Metric";
                          const measureProgress = measurePanelProgress(panel);
                          const measureWeight = measurePanelTableWeight(
                            panel,
                            panels.length,
                          );
                          const isLastMeasure = index === panels.length - 1;
                          const isMeasureSelected = Boolean(
                            panelSelection?.cycleId === row.cycleId &&
                            panelSelection.personId === row.person.id &&
                            panelSelection.goalId === row.goalId &&
                            panelSelection.measureKey === panel.key,
                          );
                          return (
                            <tr
                              key={`${row.key}:${panel.key}`}
                              className={[
                                "pd-goals-overview__row",
                                "pd-goals-overview__row--measure",
                                "pd-goals-table__row--measure",
                                isMeasureSelected ? "is-selected" : "",
                                isLastMeasure
                                  ? "pd-goals-overview__row--measure-last"
                                  : "",
                                row.isPersonEnd && isLastMeasure
                                  ? "pd-goals-overview__row--person-end"
                                  : "",
                              ]
                                .filter(Boolean)
                                .join(" ")}
                              tabIndex={0}
                              aria-selected={isMeasureSelected}
                              {...hoverPerson}
                              onClick={(event) => {
                                const target = event.target as HTMLElement;
                                if (target.closest("a, button")) return;
                                setPanelSelection({
                                  cycleId: row.cycleId,
                                  personId: row.person.id,
                                  goalId: row.goalId,
                                  measureKey: panel.key,
                                });
                              }}
                              onKeyDown={(event) => {
                                if (
                                  event.key !== "Enter" &&
                                  event.key !== " "
                                ) {
                                  return;
                                }
                                event.preventDefault();
                                setPanelSelection({
                                  cycleId: row.cycleId,
                                  personId: row.person.id,
                                  goalId: row.goalId,
                                  measureKey: panel.key,
                                });
                              }}
                            >
                              <td
                                data-col="cycle"
                                className="pd-goals-overview__cycle"
                              />
                              <td data-col="goals">
                                <MeasureNameCell
                                  name={measureName}
                                  panel={panel}
                                />
                              </td>
                              <td data-col="weight">
                                <GoalWeightTree limb="branch">
                                  <span className="pd-goals-table__weight-pill">
                                    {formatWeightReadout(measureWeight)}
                                  </span>
                                </GoalWeightTree>
                              </td>
                              <td data-col="progress">
                                <div className="pd-goals-table__progress">
                                  <div className="pd-goals-table__progress-meta">
                                    <GoalProgressAge
                                      at={measurePanelLatestProgressAt(panel)}
                                    />
                                    <GoalProgressInfo
                                      label={`Progress details for ${measureName}`}
                                    >
                                      <GoalProgressInfoTip panel={panel} />
                                    </GoalProgressInfo>
                                    <span className="pd-goals-table__progress-label">
                                      {measureProgress}%
                                    </span>
                                  </div>
                                  <Progress value={measureProgress} />
                                </div>
                              </td>
                              <td data-col="approval" />
                            </tr>
                          );
                        })
                        : null}
                    </Fragment>
                  );
                })}
              </tbody>
            </ResizableTable>
          </div>
        )}
      </section>
      {panelSelection ? (
        <GoalsOverviewGoalPanel
          cycleId={panelSelection.cycleId}
          personId={panelSelection.personId}
          goalId={panelSelection.goalId}
          highlightMeasureKey={panelSelection.measureKey}
          onClose={() => setPanelSelection(null)}
          onGoalChange={(nextGoalId, nextCycleId) =>
            setPanelSelection({
              cycleId: nextCycleId ?? panelSelection.cycleId,
              personId: panelSelection.personId,
              goalId: nextGoalId,
            })
          }
        />
      ) : null}
    </div>
  );
}

export function GoalsPersonDetail({
  cycleId,
  personId,
  goalId,
  embedded = false,
}: {
  cycleId?: string;
  personId: string;
  goalId?: string;
  embedded?: boolean;
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const canManageCycles = hasSystemPermission(
    user?.permissions,
    "platform.write_all",
  );
  const {
    snapshot,
    actor,
    subject: active,
    subjectGoals: activeGoals,
    subjectCycle,
    cycleMembershipReady,
    previousCycle,
    reports,
    ownerOptions,
    cascadeFrom,
    cascadeFromFor,
    cascadeRecipientsFor,
    cascadeToOptionsFor,
    capabilities,
    capabilitiesFor,
    resolveOwner,
    busy,
    error,
    actions,
  } = useGoalsController({ cycleId, subjectId: personId });
  const hydration = useGoalsHydration(snapshot?.cycle.id);
  const goalsReady =
    hydration.cycleReady ||
    (actor?.id === personId && hydration.ownReady);
  const [sendBackReason, setSendBackReason] = useState("");
  const [embeddedManagerTab, setEmbeddedManagerTab] =
    useState<ManagerTab>("mine");
  const managerTab: ManagerTab = embedded
    ? embeddedManagerTab
    : goalId
      ? "mine"
      : managerTabFromHash(location.hash) ?? "mine";
  const [embeddedGoalId, setEmbeddedGoalId] = useState<string | null>(null);
  const [openMeasureKey, setOpenMeasureKey] = useState<string | null>(() =>
    new URLSearchParams(location.search).get("measure"),
  );

  useEffect(() => {
    if (embedded) return;
    setOpenMeasureKey(
      goalId ? new URLSearchParams(location.search).get("measure") : null,
    );
  }, [embedded, goalId, location.search]);

  useEffect(() => {
    if (embedded) return;
    if (goalId) {
      if (location.hash !== `#${GOALS_MY_GOALS_HASH}`) {
        navigate(locationWithHash(location, GOALS_MY_GOALS_HASH), {
          replace: true,
        });
      }
      return;
    }
    if (managerTabFromHash(location.hash) === null) {
      navigate(locationWithHash(location, GOALS_MY_GOALS_HASH), {
        replace: true,
      });
    }
  }, [embedded, goalId, location, navigate]);

  useEffect(() => {
    if (embedded || !cycleId || !goalId || !snapshot) return;
    const row = snapshot.byPerson[personId];
    if (!row) return;
    if (row.goals.some((goal) => goal.id === goalId)) return;
    navigate(
      {
        pathname: goalsDetailPath(cycleId, personId),
        hash: GOALS_MY_GOALS_HASH,
      },
      { replace: true },
    );
  }, [cycleId, embedded, goalId, navigate, personId, snapshot]);

  const setManagerTab = (tab: ManagerTab) => {
    if (embedded) {
      setEmbeddedManagerTab(tab);
      return;
    }
    navigate(locationWithHash(location, hashForManagerTab(tab)), {
      replace: true,
    });
  };

  /** The Reports section belongs to the profile owner, so it follows them. */
  const coverVersion = useSyncExternalStore(
    subscribeManagerDelegations,
    () =>
      active
        ? listActiveDelegatedManagerIds(active.id).join(",")
        : "",
    () => "",
  );
  const coveredManagerIds = coverVersion ? coverVersion.split(",") : [];
  const hasReports = Boolean(
    active && (active.reportIds.length > 0 || coveredManagerIds.length > 0),
  );

  if (!snapshot) {
    return (
      <div className="pd-page pd-goals" aria-busy="true" aria-label="Goals" />
    );
  }

  const cycleToolbar = (
    <div className="pd-goals-shell__top">
      <GoalsCycleSelect
        cycles={snapshot.availableCycles}
        activeCycleId={snapshot.cycle.id}
        onSelect={(nextCycleId) => {
          void selectGoalCycle(nextCycleId);
          if (embedded) {
            setEmbeddedGoalId(null);
            return;
          }
          navigate({
            pathname: goalsDetailPath(nextCycleId, personId),
            hash: hashForManagerTab(managerTab),
          });
        }}
      />
    </div>
  );

  if (
    cycleId &&
    snapshot.availableCycles.length > 0 &&
    !snapshot.availableCycles.some((cycle) => cycle.id === cycleId)
  ) {
    return (
      <div className="pd-page pd-goals" aria-label="Goals">
        <EmptyState
          icon={Target}
          title="Cycle Not Found"
          description="That goal cycle is not available. Open All Goals and pick a current cycle."
          action={
            <Link to="/goals" className="pd-people__create-btn">
              Back To All Goals
            </Link>
          }
        />
      </div>
    );
  }

  if (cycleId && snapshot.cycle.id !== cycleId) {
    return (
      <div className="pd-page pd-goals" aria-busy="true" aria-label="Goals" />
    );
  }

  if (snapshot.availableCycles.length === 0) {
    return (
      <div className="pd-page pd-goals" aria-label="Goals">
        <PageHeader
          title="Goals"
          description="Select a cycle to set goals under it."
        />
        <EmptyState
          icon={Target}
          title="No Goal Cycles Yet"
          description={
            canManageCycles
              ? "Add a cycle, then come back to set goals."
              : "Ask an administrator to add a cycle before setting goals."
          }
          action={
            canManageCycles ? (
              <Link
                to={cyclesListPath()}
                className="pd-people__create-btn"
              >
                <Plus size={18} strokeWidth={2} aria-hidden />
                Add Cycle
              </Link>
            ) : undefined
          }
        />
      </div>
    );
  }

  if (!active || !activeGoals) {
    return (
      <div className="pd-page pd-goals" aria-label="Goals">
        <PageHeader
          title="Goals"
          description={`${snapshot.cycle.label} · ${phaseLabel(snapshot.cycle.phase)}`}
        />
        {cycleToolbar}
        <EmptyState
          icon={Users}
          title="No People Yet"
          description="Add employees in People to start setting and reviewing goals."
          action={
            <Link to="/people/new" className="pd-people__create-btn">
              <Plus size={18} strokeWidth={2} aria-hidden />
              Add Employee
            </Link>
          }
        />
      </div>
    );
  }

  if (!canViewPersonGoals(active, actor, snapshot.people)) {
    return (
      <div className="pd-page pd-goals" aria-label="Goals">
        <EmptyState
          icon={Target}
          title="Goals Not Available"
          description="You do not have access to this person's goals."
        />
      </div>
    );
  }

  const personCycle = subjectCycle ?? snapshot.cycle;
  const ineligibility = cycleMembershipReady
    ? cycleIneligibilityReason(active, personCycle, activeGoals.status)
    : null;
  const weightTotal = !cycleMembershipReady
    ? 0
    : sumGoalWeights(activeGoals.goals);
  const completion = !cycleMembershipReady
    ? 0
    : Math.round(overallCompletion(activeGoals.goals));
  const canEditDraft = Boolean(capabilities?.canEditStructure);
  const reportTodoCount = cycleMembershipReady
    ? countReportGoalTodos(reports, snapshot.cycle)
    : 0;
  const ownTodoCount =
    !cycleMembershipReady || ineligibility
      ? 0
      : countOwnGoalTodos(activeGoals, personCycle, {
        canSubmit: Boolean(capabilities?.canSubmit),
      });

  const isCurrentCycle = snapshot.cycleStatus === "current";
  const activeGoalId = embedded ? (embeddedGoalId ?? undefined) : goalId;
  const sectionLabels = goalSectionLabels(active.name, actor?.id === active.id);
  const showsReports = hasReports && managerTab === "team";
  const viewingAsManager = Boolean(
    actor && active && actor.id !== active.id && capabilities?.canViewAsManager,
  );
  const showsSubjectReview = viewingAsManager && !showsReports;
  const managerPanelReports = showsSubjectReview
    ? [{ person: active, row: activeGoals }]
    : reports;

  const selectCycle = (nextCycleId: string) => {
    void selectGoalCycle(nextCycleId);
    if (embedded) {
      setEmbeddedGoalId(null);
      return;
    }
    navigate({
      pathname: goalsDetailPath(nextCycleId, personId),
      hash: hashForManagerTab(managerTab),
    });
  };

  const managerTabs = (
    <SegmentedControl
      className="pd-people__scope pd-goals__tabs"
      buttonClassName="pd-people__scope-btn"
      options={[
        {
          id: "mine",
          label: (
            <>
              {sectionLabels.goals}
              <CountBadge
                count={ownTodoCount}
                aria-label={goalTodoBadgeLabel(ownTodoCount, "own")}
              />
            </>
          ),
        },
        {
          id: "team",
          label: (
            <>
              {sectionLabels.reports}
              <CountBadge
                count={reportTodoCount}
                aria-label={goalTodoBadgeLabel(reportTodoCount, "reports")}
              />
            </>
          ),
        },
      ]}
      value={managerTab}
      onChange={(tab) => {
        if (embedded) {
          setEmbeddedGoalId(null);
        } else if (goalId) {
          navigate({
            pathname: goalsDetailPath(snapshot.cycle.id, personId),
            hash: hashForManagerTab(tab),
          });
          return;
        }
        setManagerTab(tab);
      }}
      aria-label="Goal sections"
    />
  );

  const openGoal = (
    nextGoalId: string | null,
    measureKey?: string,
    nextCycleId?: string,
  ) => {
    setOpenMeasureKey(nextGoalId ? (measureKey ?? null) : null);
    const activeCycleId = nextCycleId ?? snapshot.cycle.id;
    if (embedded) {
      if (nextCycleId && nextCycleId !== snapshot.cycle.id) {
        void selectGoalCycle(nextCycleId);
      }
      setEmbeddedGoalId(nextGoalId);
      return;
    }
    if (nextGoalId) {
      const params = new URLSearchParams(location.search);
      if (measureKey) params.set("measure", measureKey);
      else params.delete("measure");
      const search = params.toString();
      navigate({
        pathname: goalsGoalPath(activeCycleId, personId, nextGoalId),
        search: search ? `?${search}` : "",
      });
      return;
    }
    navigate({
      pathname: goalsDetailPath(activeCycleId, personId),
      hash: hashForManagerTab(managerTab),
    });
  };

  const cycleSelect = (
    <GoalsCycleSelect
      cycles={snapshot.availableCycles}
      activeCycleId={snapshot.cycle.id}
      onSelect={selectCycle}
    />
  );
  const sectionToolbar = (
    <GoalsToolbar
      start={
        <div className="pd-goals-toolbar__start">
          {cycleSelect}
          {hasReports ? managerTabs : null}
        </div>
      }
    />
  );

  const myGoalsApprovers = cascadeApprovers(cascadeFrom);
  const myGoalsLockArgs = {
    cycle: personCycle,
    cycleStatus: snapshot.cycleStatus,
    canUpdateProgress: Boolean(capabilities?.canUpdateProgress),
    status: activeGoals.status,
    postWindowApprovalStage: activeGoals.postWindowApprovalStage,
    subject: active,
    lineManagerName: myGoalsApprovers.lineManager?.name,
    skipLevelManagerName: myGoalsApprovers.skipLevelManager?.name ?? null,
  };
  const myGoalsLockSegments = ineligibility
    ? null
    : goalEditLockSegments(myGoalsLockArgs);
  const myGoalsLockSpoken = ineligibility
    ? cycleIneligibilityEmptyState(active.name, ineligibility).description
    : myGoalsLockSegments
      ? speakGoalEditLockSegments(myGoalsLockSegments, myGoalsLockArgs)
      : null;

  const myGoalsPanel = (
    <EmployeePanel
      personName={active.name}
      personAvatarUrl={active.avatarUrl}
      personId={active.id}
      cycleId={snapshot.cycle.id}
      cycleLabel={snapshot.cycle.label}
      goalCountPolicy={personCycle.goalCountPolicy}
      allowLateSubmissions={
        personCycle.phase === "hard_lock" &&
        !isGoalWindowOpenForPerson(personCycle, active) &&
        personCycle.postWindowGoalPolicy === "two_tier_approval"
      }
      deadlineMissedAt={resolveGoalDeadline(personCycle, active)}
      editLock={myGoalsLockSpoken}
      editLockContent={
        ineligibility || !myGoalsLockSegments
          ? null
          : (
            <GoalLockSegments
              segments={myGoalsLockSegments}
              lineManager={myGoalsApprovers.lineManager}
              skipLevelManager={myGoalsApprovers.skipLevelManager}
            />
          )
      }
      isCurrentCycle={isCurrentCycle}
      row={activeGoals}
      membershipPending={
        (activeGoals?.goals.length ?? 0) === 0 &&
        (!cycleMembershipReady || !goalsReady)
      }
      ineligibility={ineligibility}
      canEditDraft={canEditDraft}
      canUpdateProgress={Boolean(capabilities?.canUpdateProgress)}
      canDuplicate={Boolean(capabilities?.canDuplicate)}
      canCascade={Boolean(capabilities?.canCascade)}
      canSubmit={Boolean(capabilities?.canSubmit)}
      isSelf={actor?.id === active.id}
      busy={busy}
      openGoalId={activeGoalId}
      commentAuthorName={actor?.name ?? active.name}
      commentAuthorId={actor?.id ?? active.id}
      toolbarOnly={showsReports || showsSubjectReview}
      ownerOptions={ownerOptions.filter((option) => option.id === active.id)}
      commentAuthors={ownerOptions}
      cascadeFrom={cascadeFrom}
      cascadeRecipientsFor={cascadeRecipientsFor}
      cascadeToOptionsFor={cascadeToOptionsFor}
      cascadeHref={(pid, gid) => goalsGoalPath(snapshot.cycle.id, pid, gid)}
      resolveOwner={(goal) =>
        resolveOwner(goal, active.id) ?? {
          id: active.id,
          name: active.name,
          avatarUrl: active.avatarUrl,
        }
      }
      highlightMeasureKey={openMeasureKey}
      onOpenGoal={openGoal}
      onPersistGoals={(goals) => actions.saveGoals(active.id, goals)}
      onPersistProgress={(goals) => actions.saveProgress(active.id, goals)}
      onAddComment={(goalId, text) => actions.addComment(active.id, goalId, text)}
      onUpdateComment={(goalId, commentId, text) =>
        actions.updateComment(active.id, goalId, commentId, text)
      }
      onRemoveComment={(goalId, commentId) =>
        actions.removeComment(active.id, goalId, commentId)
      }
      onDuplicateGoal={(goalId, targetCycleId) =>
        actions.duplicateGoal(active.id, goalId, targetCycleId)
      }
      previousCycleLabel={previousCycle?.label}
      onCopyPreviousGoals={() => actions.copyPreviousGoals(active.id)}
      cascadeTargets={reports.map(({ person }) => ({
        id: person.id,
        name: person.name,
        title: person.title,
        avatarUrl: person.avatarUrl,
      }))}
      duplicateCycles={duplicateCycleOptions(snapshot.availableCycles)}
      onCascadeGoal={(goalId, reportIds) =>
        actions.cascadeGoal(active.id, goalId, reportIds)
      }
      onLinkCascadeTo={(goalId, option) =>
        actions.linkCascadeTo(active.id, goalId, option)
      }
      onUnlinkCascadeTo={(goalId, child) =>
        actions.unlinkCascadeTo(active.id, goalId, child)
      }
      onSubmit={(goals, lateJustification) =>
        actions.saveAndSubmit(active.id, goals, lateJustification)
      }
    />
  );

  return (
    <div
      className={embedded ? "pd-goals pd-goals--embedded" : "pd-page pd-goals"}
      aria-label={`${active.name} goals`}
    >
      <header className="pd-goals-detail-header">
        {!embedded ? (
          <>
            <Link
              to="/goals"
              className="pd-people__back pd-people__back--toolbar"
            >
              <ArrowLeft size={16} strokeWidth={1.75} aria-hidden />
              Back To All Goals
            </Link>
            <section className="pd-profile__hero pd-goals-detail-header__hero">
              <div className="pd-profile__hero-main">
                <Avatar
                  name={active.name}
                  src={active.avatarUrl || undefined}
                  size="lg"
                  className="pd-profile__hero-avatar"
                  style={avatarStyle(active.name)}
                />
                <div className="pd-profile__hero-text">
                  <h1 className="pd-profile__name">{active.name}</h1>
                  <p className="pd-profile__hero-meta">
                    {personMeta(active) || phaseLabel(snapshot.cycle.phase)}
                  </p>
                </div>
              </div>
            </section>
          </>
        ) : null}
        {sectionToolbar}
        {!embedded && !showsReports ? (
          <div
            className="pd-people__summary pd-goals-detail-header__summary"
            role="group"
            aria-label={`${active.name} goal totals`}
          >
            <div className="pd-people__summary-card">
              <span className="pd-people__summary-label">Goals</span>
              <span className="pd-people__summary-value">
                {!cycleMembershipReady ? 0 : activeGoals.goals.length}
              </span>
            </div>
            <div className="pd-people__summary-card">
              <span className="pd-people__summary-label">Total weight</span>
              <span className="pd-people__summary-value">{weightTotal}%</span>
            </div>
            <div className="pd-people__summary-card">
              <span className="pd-people__summary-label">Completion</span>
              <span className="pd-people__summary-value">{completion}%</span>
            </div>
          </div>
        ) : null}
        {!embedded ? (
          <Divider className="pd-goals-detail-header__divider" />
        ) : null}
      </header>

      {error ? <Notice tone="danger">{error}</Notice> : null}

      {myGoalsPanel}

      {showsReports || showsSubjectReview ? (
        <ManagerPanel
          snapshot={snapshot}
          reports={managerPanelReports}
          cascadeFromFor={cascadeFromFor}
          commentAuthorId={actor?.id}
          capabilitiesFor={capabilitiesFor}
          sendBackReason={sendBackReason}
          onSendBackReason={setSendBackReason}
          busy={busy}
          onSaveGoals={(id, goals) => void actions.saveGoals(id, goals)}
          onApprove={(id) => actions.approve(id)}
          onSendBack={(id) =>
            actions.sendBack(id, sendBackReason).then(() => {
              setSendBackReason("");
            })
          }
          openedGoalId={showsSubjectReview ? (activeGoalId ?? null) : undefined}
          onOpenedGoalChange={showsSubjectReview ? openGoal : undefined}
        />
      ) : null}
    </div>
  );
}

function reportCycleLock({
  cycle,
  cycleStatus,
  person,
  row,
  canEditDraft,
  canUpdateProgress,
  lineManager,
  skipLevelManager,
}: {
  cycle: GoalsSnapshot["cycle"];
  cycleStatus: GoalsSnapshot["cycleStatus"];
  person: GoalsSnapshot["people"][number];
  row: PersonGoals;
  canEditDraft: boolean;
  canUpdateProgress: boolean;
  lineManager?: { id?: string | null; name: string; avatarUrl?: string } | null;
  skipLevelManager?: { id?: string | null; name: string; avatarUrl?: string } | null;
}): { banner: ReactNode; spoken: string | null; preferLockBanner?: boolean } {
  const ineligibility = cycleIneligibilityReason(person, cycle, row.status);
  if (ineligibility) {
    const empty = cycleIneligibilityEmptyState(person.name, ineligibility);
    return {
      banner: (
        <CycleIneligibilityNotice
          layout="ribbon"
          personName={person.name}
          reason={ineligibility}
        />
      ),
      spoken: `${empty.title}. ${empty.description}`,
      preferLockBanner: true,
    };
  }
  if (canEditDraft) return { banner: null, spoken: null };
  const args = {
    cycle,
    cycleStatus,
    canUpdateProgress,
    status: row.status,
    postWindowApprovalStage: row.postWindowApprovalStage,
    subject: person,
    lineManagerName: lineManager?.name,
    skipLevelManagerName: skipLevelManager?.name ?? null,
  };
  const segments = goalEditLockSegments(args);
  if (!segments) return { banner: null, spoken: null };
  const spoken = speakGoalEditLockSegments(segments, args);
  return {
    banner: (
      <GoalEditLockNotice
        layout="ribbon"
        message={
          <GoalLockSegments
            segments={segments}
            lineManager={lineManager}
            skipLevelManager={skipLevelManager}
          />
        }
        spoken={spoken}
      />
    ),
    spoken,
  };
}

function ManagerReportGoalsTable({
  cycleId,
  person,
  row,
  canEditStructure,
  cascadeFromFor,
  cascadeRecipientsFor,
  actorId,
  deadlinePassed,
  goalCountPolicy,
  lockMessage,
  openGoalId,
  openMeasureKey,
  onOpen,
  onSaveGoals,
  onGoalDeleted,
  onGoalsSaved,
  busy = false,
}: {
  cycleId: string;
  person: GoalsSnapshot["people"][number];
  row: PersonGoals;
  canEditStructure: boolean;
  cascadeFromFor: (subjectId: string) => LineManagerCascade;
  cascadeRecipientsFor: (goalId: string) => CascadeRecipient[];
  actorId?: string;
  deadlinePassed: boolean;
  goalCountPolicy: GoalsSnapshot["cycle"]["goalCountPolicy"];
  lockMessage?: string | null;
  openGoalId: string | null;
  openMeasureKey?: string | null;
  onOpen: (goalId: string | null, measureKey?: string) => void;
  onSaveGoals: (id: string, goals: Goal[]) => void;
  onGoalDeleted?: () => void;
  onGoalsSaved?: () => void;
  busy?: boolean;
}) {
  const reportApprovers = cascadeApprovers(cascadeFromFor(person.id));
  const { requestGoalEdit, goalEditGuard } = useGoalEditGuard({
    personId: person.id,
    actorId,
    status: row.status,
    deadlinePassed,
    lineManager: reportApprovers.lineManager,
    skipLevelManager: reportApprovers.skipLevelManager,
  });
  const { goals, setGoals } = useGoalDraftState({
    personId: person.id,
    status: row.status,
    persistedGoals: row.goals,
  });
  const { schedule: schedulePersist, flush: flushPersist } = useDebouncedGoalSave(
    (next) => {
      onSaveGoals(person.id, next);
      onGoalsSaved?.();
    },
  );

  const persistNow = (next: Goal[], notify = false) => {
    flushPersist();
    setGoals(next);
    onSaveGoals(person.id, next);
    if (notify) onGoalsSaved?.();
  };
  const addGoal = () => {
    requestGoalEdit(() => {
      const next = appendGoalWithWeight(goals, blankGoal({ ownerId: person.id }));
      persistNow(next);
      onOpen(next[next.length - 1]?.id ?? null);
    });
  };
  const showSubmitIssues =
    canEditStructure &&
    (row.status === "draft" ||
      row.status === "sent_back" ||
      (row.status === "incomplete" && deadlinePassed));
  const submitCheck = canSubmitGoals(goals, goalCountPolicy);
  const submitBlockers = submitSetBlockers(submitCheck.blockers);
  const submitBlockNotice =
    showSubmitIssues && !submitCheck.ok && submitBlockers.length > 0 ? (
      <GoalSubmitBlockNotice
        layout="ribbon"
        blockers={submitBlockers}
        onOpenGoal={(goalId) => onOpen(goalId)}
        onAddGoal={canEditStructure ? addGoal : undefined}
        addGoalLabel={goals.length > 0 ? "Add Another Goal" : "Add A Goal"}
      />
    ) : null;
  const cascade = cascadeFromFor(person.id);
  const sendBackNotice =
    row.status === "sent_back" && row.sendBackReason ? (
      <GoalSendBackNotice
        layout={goals.length > 0 ? "ribbon" : "card"}
        reason={row.sendBackReason}
        author={
          row.sendBackBy ??
          (cascade.managerId && cascade.managerName
            ? {
              id: cascade.managerId,
              name: cascade.managerName,
              avatarUrl: cascade.managerAvatarUrl,
            }
            : undefined)
        }
      />
    ) : null;
  const viewerNotices = (
    <div className="pd-goals__notices">
      {goals.length === 0 ? sendBackNotice : null}
      {goals.length === 0 ? submitBlockNotice : null}
    </div>
  );

  if (goals.length === 0) {
    return (
      <>
        {goalEditGuard}
        {viewerNotices}
        <ReportGoalsEmpty
          personName={person.name}
          canAdd={canEditStructure}
          busy={busy}
          lockMessage={lockMessage}
          onAdd={canEditStructure ? addGoal : undefined}
        />
      </>
    );
  }

  return (
    <>
      {goalEditGuard}
      {viewerNotices}
      <GoalsTable
        label={`${person.name} goals`}
        leadBanner={sendBackNotice}
        banner={submitBlockNotice}
        cycleId={cycleId}
        subjectId={person.id}
        status={row.status}
        postWindowApprovalStage={row.postWindowApprovalStage}
        cascadeFrom={cascadeFromFor(person.id)}
        cascadeRecipientsFor={cascadeRecipientsFor}
        rows={goals.map((goal, index) => ({
          goal,
          title: goalTitle(goal, index),
          issue: showSubmitIssues
            ? submitIssueForGoal(goal.id, submitCheck.blockers)
            : undefined,
        }))}
        openGoalId={openGoalId}
        openMeasureKey={openMeasureKey}
        onOpen={onOpen}
        canEditWeight={canEditStructure}
        canRemove={canEditStructure}
        onWeightChange={
          canEditStructure
            ? (goalId, weight) => {
              requestGoalEdit(() => {
                setGoals((current) => {
                  const next = current.map((goal) =>
                    goal.id === goalId ? { ...goal, weight } : goal,
                  );
                  schedulePersist(next);
                  return next;
                });
              });
            }
            : undefined
        }
        onMeasureWeightChange={
          canEditStructure
            ? (goalId, measurements) => {
              requestGoalEdit(() => {
                setGoals((current) => {
                  const next = current.map((goal) =>
                    goal.id === goalId ? { ...goal, measurements } : goal,
                  );
                  schedulePersist(next);
                  return next;
                });
              });
            }
            : undefined
        }
        onDistributeWeights={
          canEditStructure
            ? (next) => {
              requestGoalEdit(() => persistNow(next, true));
            }
            : undefined
        }
        onRemove={
          canEditStructure
            ? (goalId) => {
              requestGoalEdit(() => {
                persistNow(removeGoalKeepingWeights(goals, goalId));
                if (openGoalId === goalId) onOpen(null);
                onGoalDeleted?.();
              });
            }
            : undefined
        }
      />
    </>
  );
}

function ManagerPanel({
  snapshot,
  reports,
  cascadeFromFor,
  commentAuthorId,
  capabilitiesFor,
  sendBackReason,
  onSendBackReason,
  busy,
  onApprove,
  onSendBack,
  onSaveGoals,
  openedGoalId,
  onOpenedGoalChange,
}: {
  snapshot: GoalsSnapshot;
  reports: { person: GoalsSnapshot["people"][number]; row: PersonGoals }[];
  cascadeFromFor: (subjectId: string) => LineManagerCascade;
  commentAuthorId?: string;
  capabilitiesFor: (subjectId: string) => GoalCapabilities | null;
  sendBackReason: string;
  onSendBackReason: (v: string) => void;
  busy: boolean;
  onApprove: (id: string) => void | Promise<void>;
  onSendBack: (id: string) => void | Promise<void>;
  onSaveGoals: (id: string, goals: Goal[]) => void;
  openedGoalId?: string | null;
  onOpenedGoalChange?: (goalId: string | null) => void;
}) {
  const orderedReports = reports;
  const cascadeRecipientsFor = useMemo(() => {
    const recipientsBySource = indexCascadeRecipients(snapshot);
    return (goalId: string) => recipientsBySource.get(goalId) ?? [];
  }, [snapshot]);

  const [localOpenGoalId, setLocalOpenGoalId] = useState<string | null>(null);
  const [openMeasureKey, setOpenMeasureKey] = useState<string | null>(null);
  const openGoalId =
    openedGoalId !== undefined ? openedGoalId : localOpenGoalId;
  const setOpenGoalId = (next: string | null, measureKey?: string) => {
    if (onOpenedGoalChange) onOpenedGoalChange(next);
    else setLocalOpenGoalId(next);
    setOpenMeasureKey(next ? (measureKey ?? null) : null);
  };
  const [sendBackFor, setSendBackFor] = useState<string | null>(null);
  const [toastNotice, setToastNotice] = useState<ReviewSaveNotice | null>(null);
  const showSuccessToast = (message: string) => {
    setToastNotice(successNotice(message));
  };
  const active =
    reports.find((r) => r.row.goals.some((goal) => goal.id === openGoalId)) ??
    null;

  if (reports.length === 0) {
    return (
      <EmptyState
        icon={Users}
        title="No Direct Reports"
        description="People who report to you will show up here with their goals."
      />
    );
  }

  const goals = active?.row.goals ?? [];
  const selectedIndex = goals.findIndex((goal) => goal.id === openGoalId);
  const selectedGoal = selectedIndex >= 0 ? goals[selectedIndex] : null;

  const table = (
    <>
      {orderedReports.map(({ person, row }) => {
        const reportCaps = capabilitiesFor(person.id);
        const skipLevel = cascadeFromFor(person.id);
        const reportApprovers = cascadeApprovers(skipLevel);
        const allowLateSubmissions =
          snapshot.cycle.phase === "hard_lock" &&
          !isGoalWindowOpenForPerson(snapshot.cycle, person) &&
          snapshot.cycle.postWindowGoalPolicy === "two_tier_approval";
        const canEditDraft = Boolean(reportCaps?.canEditStructure);
        const lock = reportCycleLock({
          cycle: snapshot.cycle,
          cycleStatus: snapshot.cycleStatus,
          person,
          row,
          canEditDraft,
          canUpdateProgress: Boolean(reportCaps?.canUpdateProgress),
          lineManager: reportApprovers.lineManager,
          skipLevelManager: reportApprovers.skipLevelManager,
        });
        return (
          <ReportGoalsCard
            key={person.id}
            person={person}
            cycleId={snapshot.cycle.id}
            status={row.status}
            postWindowApprovalStage={row.postWindowApprovalStage}
            allowLateSubmissions={allowLateSubmissions}
            deadlineMissedAt={resolveGoalDeadline(snapshot.cycle, person)}
            lateJustification={row.lateJustification}
            lineManager={reportApprovers.lineManager}
            skipLevelManager={reportApprovers.skipLevelManager}
            goalCount={row.goals.length}
            canApprove={Boolean(reportCaps?.canApprove)}
            canSendBack={Boolean(reportCaps?.canSendBack)}
            busy={busy}
            sendBackOpen={sendBackFor === person.id}
            sendBackReason={sendBackReason}
            onToggleSendBack={() =>
              setSendBackFor(sendBackFor === person.id ? null : person.id)
            }
            onSendBackReason={onSendBackReason}
            onApprove={() => {
              void Promise.resolve(onApprove(person.id)).then(() => {
                showSuccessToast("Goals approved.");
              });
            }}
            onSendBack={() => {
              void Promise.resolve(onSendBack(person.id)).then(() => {
                showSuccessToast("Goals sent back.");
                setSendBackFor(null);
              });
            }}
            activityFilters={{
              cycleId: snapshot.cycle.id,
              subjectEmployeeId: Number(person.id),
            }}
            lockBanner={lock.banner}
            preferLockBanner={lock.preferLockBanner}
          >
            <ManagerReportGoalsTable
              cycleId={snapshot.cycle.id}
              person={person}
              row={row}
              canEditStructure={canEditDraft}
              cascadeFromFor={cascadeFromFor}
              cascadeRecipientsFor={cascadeRecipientsFor}
              actorId={commentAuthorId}
              deadlinePassed={allowLateSubmissions}
              goalCountPolicy={snapshot.cycle.goalCountPolicy}
              lockMessage={lock.spoken}
              openGoalId={openGoalId}
              openMeasureKey={openMeasureKey}
              onOpen={setOpenGoalId}
              onSaveGoals={onSaveGoals}
              onGoalDeleted={() => showSuccessToast("Goal deleted.")}
              onGoalsSaved={() => showSuccessToast("Goal saved.")}
              busy={busy}
            />
          </ReportGoalsCard>
        );
      })}
    </>
  );

  const withToast = (
    <>
      <ReviewSaveBanner
        notice={toastNotice}
        onDismiss={() => setToastNotice(null)}
      />
      {table}
    </>
  );

  if (!active || !selectedGoal) return withToast;

  return (
    <>
      {withToast}
      <GoalsOverviewGoalPanel
        cycleId={snapshot.cycle.id}
        personId={active.person.id}
        goalId={selectedGoal.id}
        highlightMeasureKey={openMeasureKey}
        onClose={() => setOpenGoalId(null)}
        onGoalChange={setOpenGoalId}
      />
    </>
  );
}

function EmployeePanel({
  personName,
  personAvatarUrl,
  personId,
  cycleId,
  cycleLabel,
  goalCountPolicy,
  allowLateSubmissions,
  deadlineMissedAt,
  editLock,
  editLockContent,
  isCurrentCycle,
  row,
  membershipPending = false,
  ineligibility,
  canEditDraft,
  canUpdateProgress,
  canDuplicate,
  canCascade,
  cascadeTargets,
  canSubmit,
  isSelf: _isSelf,
  busy,
  openGoalId,
  commentAuthorName,
  commentAuthorId,
  commentAuthors,
  toolbarStart,
  toolbarOnly = false,
  ownerOptions,
  cascadeFrom,
  cascadeRecipientsFor,
  cascadeToOptionsFor,
  cascadeHref,
  resolveOwner,
  highlightMeasureKey,
  onOpenGoal,
  onPersistGoals,
  onPersistProgress,
  onAddComment,
  onUpdateComment,
  onRemoveComment,
  previousCycleLabel,
  onCopyPreviousGoals,
  onDuplicateGoal,
  duplicateCycles,
  onCascadeGoal,
  onLinkCascadeTo,
  onUnlinkCascadeTo,
  onSubmit,
}: {
  personName: string;
  personAvatarUrl?: string;
  personId: string;
  cycleId: string;
  cycleLabel: string;
  goalCountPolicy: GoalsSnapshot["cycle"]["goalCountPolicy"];
  allowLateSubmissions: boolean;
  deadlineMissedAt?: string;
  /** Explains why goal editing is unavailable in this cycle. */
  editLock: string | null;
  editLockContent?: ReactNode;
  isCurrentCycle: boolean;
  row: PersonGoals;
  membershipPending?: boolean;
  ineligibility: ReturnType<typeof cycleIneligibilityReason>;
  canEditDraft: boolean;
  canUpdateProgress: boolean;
  canDuplicate: boolean;
  canCascade: boolean;
  canSubmit: boolean;
  isSelf: boolean;
  busy: boolean;
  openGoalId?: string;
  commentAuthorName: string;
  commentAuthorId?: string;
  commentAuthors?: GoalOwnerOption[];
  toolbarStart?: ReactNode;
  /**
   * Renders the toolbar row without the goals below it. The panel stays mounted
   * while another section is on screen, so the section tabs inside `toolbarStart`
   * keep their sliding indicator instead of remounting on every switch.
   */
  toolbarOnly?: boolean;
  ownerOptions: GoalOwnerOption[];
  cascadeFrom: LineManagerCascade;
  cascadeRecipientsFor: (goalId: string) => CascadeRecipient[];
  cascadeToOptionsFor: (goalId: string) => CascadeToOption[];
  cascadeHref: (personId: string, goalId: string) => string;
  resolveOwner: (goal: Goal) => {
    id: string;
    name: string;
    title?: string;
    avatarUrl?: string;
  };
  highlightMeasureKey?: string | null;
  onOpenGoal: (
    goalId: string | null,
    measureKey?: string,
    cycleId?: string,
  ) => void;
  onPersistGoals: (goals: Goal[]) => void | Promise<boolean | void>;
  /** Progress-only updates never send goals back for approval. */
  onPersistProgress: (goals: Goal[]) => Promise<boolean> | boolean | void;
  onAddComment?: (goalId: string, text: string) => void;
  onUpdateComment?: (goalId: string, commentId: string, text: string) => void;
  onRemoveComment?: (goalId: string, commentId: string) => void;
  previousCycleLabel?: string;
  onCopyPreviousGoals: () => Promise<Goal | null>;
  onDuplicateGoal: (
    goalId: string,
    targetCycleId: string,
  ) => Promise<Goal | null>;
  cascadeTargets: {
    id: string;
    name: string;
    title?: string;
    avatarUrl?: string;
  }[];
  duplicateCycles: ReturnType<typeof duplicateCycleOptions>;
  onCascadeGoal: (goalId: string, reportIds: string[]) => Promise<void>;
  onLinkCascadeTo: (goalId: string, option: CascadeToOption) => Promise<void>;
  onUnlinkCascadeTo: (
    goalId: string,
    child: { personId: string; goalId: string },
  ) => Promise<void>;
  onSubmit: (goals: Goal[], lateJustification?: string) => Promise<boolean>;
}) {
  const { goals, setGoals, creatingIds, startCreating, stopCreating } =
    useGoalDraftState({
      personId,
      status: row.status,
      persistedGoals: row.goals,
    });
  const persistBaselineRef = useRef(row.goals);
  const [toastNotice, setToastNotice] = useState<ReviewSaveNotice | null>(
    null,
  );
  const showSuccessToast = (message: string) => {
    setToastNotice({
      variant: "success",
      message,
      shownAt: Date.now(),
    });
  };
  const ownerApprovers = cascadeApprovers(cascadeFrom);
  const { requestGoalEdit, goalEditGuard } = useGoalEditGuard({
    personId,
    actorId: commentAuthorId,
    status: row.status,
    deadlinePassed: allowLateSubmissions,
    lineManager: ownerApprovers.lineManager,
    skipLevelManager: ownerApprovers.skipLevelManager,
  });
  const { schedule: schedulePersist, flush: flushPersist } = useDebouncedGoalSave(
    (next) => {
      persistBaselineRef.current = next;
      void persistThenNotify(() => onPersistGoals(next), () => {
        showSuccessToast("Goal saved.");
      });
    },
  );

  const canManualSave =
    canEditDraft &&
    (row.status === "draft" ||
      row.status === "sent_back" ||
      (row.status === "incomplete" && allowLateSubmissions));
  const hasUnsavedChanges =
    canManualSave && hasPromptableUnsavedGoalDraft(goals, row.goals);
  const persistDraft = () => {
    flushPersist();
    const wasCreating = creatingIds.size > 0;
    persistBaselineRef.current = goals;
    void persistThenNotify(() => onPersistGoals(goals), () => {
      showSuccessToast(wasCreating ? "Goal created." : "Goal saved.");
    });
    for (const goalId of creatingIds) stopCreating(goalId);
  };
  const discardDraft = () => {
    setGoals(row.goals);
    for (const goalId of creatingIds) stopCreating(goalId);
  };
  const unsavedClose = useGoalUnsavedClose({
    dirty: hasUnsavedChanges,
    onSaveDraft: persistDraft,
    onDiscard: discardDraft,
  });

  const submitCheck = canSubmitGoals(goals, goalCountPolicy);
  const canSubmitBatch =
    canSubmit &&
    (row.status === "draft" ||
      row.status === "sent_back" ||
      (row.status === "incomplete" && allowLateSubmissions));
  const creatingGoalId = [...creatingIds][0] ?? null;
  const selectedGoalId = openGoalId ?? creatingGoalId;
  const selectedIndex = selectedGoalId
    ? goals.findIndex((goal) => goal.id === selectedGoalId)
    : -1;
  const selectedGoal = selectedIndex >= 0 ? goals[selectedIndex] : null;
  const selectedPersisted = selectedGoal
    ? row.goals.find((goal) => goal.id === selectedGoal.id)
    : undefined;
  const selectedHasUnsavedChanges = Boolean(
    selectedGoal &&
    (selectedPersisted
      ? isGoalDraftDirty(selectedPersisted, selectedGoal)
      : !isBlankGoalDraft(selectedGoal)),
  );

  const setAndPersist = (next: Goal[]) => {
    setGoals(next);
    persistBaselineRef.current = next;
    onPersistGoals(next);
  };

  const persistNamedGoals = (next: Goal[], message: string) => {
    setGoals(next);
    persistBaselineRef.current = next;
    void persistThenNotify(
      () => onPersistGoals(next),
      () => showSuccessToast(message),
    );
  };

  const addGoal = (okrPayload?: OkrGoalDropPayload) => {
    const next = okrPayload
      ? applyOkrPayloadToGoal(blankGoal({ ownerId: personId }), okrPayload)
      : blankGoal({ ownerId: personId });
    const updated = appendGoalWithWeight(goals, next);
    // OKR fill already has a name + measures — save immediately so close
    // does not ask to save draft (create mode has no Save button).
    if (okrPayload) {
      setGoals(updated);
      persistBaselineRef.current = updated;
      void persistThenNotify(() => onPersistGoals(updated), () => {
        showSuccessToast("Goal created.");
      });
      onOpenGoal(next.id);
      return;
    }
    startCreating(next.id);
    setGoals(updated);
  };

  const requestAddGoal = (okrPayload?: OkrGoalDropPayload) => {
    if (busy) return;
    requestGoalEdit(() => unsavedClose.requestLeave(() => addGoal(okrPayload)));
  };

  const copyPreviousGoals = async () => {
    const firstCopiedGoal = await onCopyPreviousGoals();
    if (!firstCopiedGoal) return;
    onOpenGoal(firstCopiedGoal.id);
    showSuccessToast("Goals copied.");
  };

  const ownerFor = (goal: Goal) => resolveOwner(goal);

  if (toolbarOnly && !toolbarStart) return null;

  if (!toolbarOnly && membershipPending) {
    return (
      <>
        <GoalsToolbar start={toolbarStart} />
        <div
          className="pd-goals__empty"
          aria-busy="true"
          aria-label="Loading goals"
        />
      </>
    );
  }

  if (!toolbarOnly && ineligibility && row.goals.length === 0) {
    const empty = cycleIneligibilityEmptyState(personName, ineligibility);
    return (
      <>
        <GoalsToolbar start={toolbarStart} />
        <EmptyState
          icon={Target}
          title={empty.title}
          description={empty.description}
        />
      </>
    );
  }

  let goalDrawer: ReactNode = null;

  if (!toolbarOnly && selectedGoal) {
    const isNew = creatingIds.has(selectedGoal.id);

    const closeGoal = () => {
      if (
        creatingIds.has(selectedGoal.id) &&
        isBlankGoalDraft(selectedGoal)
      ) {
        setGoals(removeGoalKeepingWeights(goals, selectedGoal.id));
      }
      stopCreating(selectedGoal.id);
      onOpenGoal(null);
    };

    const requestCloseGoal = () => {
      unsavedClose.requestLeave(closeGoal);
    };

    const discardNewGoal = () => {
      setGoals(removeGoalKeepingWeights(goals, selectedGoal.id));
      stopCreating(selectedGoal.id);
      onOpenGoal(null);
    };

    goalDrawer = (
      <GoalCreateDrawer
        label={isNew ? undefined : `View ${goalTitle(selectedGoal, selectedIndex)}`}
        closeLabel="Close Goal"
        sideSheet={okrSideSheetFor(personId, cycleLabel)}
        onClose={requestCloseGoal}
        ribbon={
          canSubmitBatch ? (
            <GoalSubmitBlockNotice
              layout="ribbon"
              nameTheGoal={false}
              blockers={submitBlockersForGoal(
                selectedGoal.id,
                submitCheck.blockers,
              )}
              onOpenGoal={onOpenGoal}
            />
          ) : ineligibility ? (
            <CycleIneligibilityNotice
              layout="ribbon"
              personName={personName}
              reason={ineligibility}
            />
          ) : !isNew && editLock && !canEditDraft ? (
            <GoalEditLockNotice
              layout="ribbon"
              message={editLockContent ?? editLock}
              spoken={editLock}
            />
          ) : null
        }
      >
        <GoalDetailView
          isNew={isNew}
          goal={selectedGoal}
          index={isNew ? 0 : selectedIndex}
          owner={ownerFor(selectedGoal)}
          highlightMeasureKey={highlightMeasureKey}
          cycleId={isNew ? undefined : cycleId}
          subjectId={personId}
          cascadeFrom={cascadeFrom}
          cascadedTo={cascadeRecipientsFor(selectedGoal.id)}
          cascadeToOptions={cascadeToOptionsFor(selectedGoal.id)}
          cascadeHref={cascadeHref}
          cycleLabel={cycleLabel}
          isCurrentCycle={isCurrentCycle}
          status={row.status}
          postWindowApprovalStage={
            isNew ? undefined : row.postWindowApprovalStage
          }
          commentAuthorName={commentAuthorName}
          commentAuthorId={commentAuthorId}
          commentAuthors={commentAuthors ?? ownerOptions}
          canEdit={canEditDraft}
          canUpdateProgress={canUpdateProgress}
          canRemove={canEditDraft}
          cascadeTargets={isNew ? [] : cascadeTargets}
          onRequestEdit={requestGoalEdit}
          manualSave={isNew || canManualSave}
          hasUnsavedChanges={selectedHasUnsavedChanges}
          onAddComment={
            isNew || !onAddComment
              ? undefined
              : (text) => {
                void persistThenNotify(
                  () => onAddComment(selectedGoal.id, text),
                  () => showSuccessToast("Comment added."),
                );
              }
          }
          onUpdateComment={
            isNew || !onUpdateComment
              ? undefined
              : (commentId, text) =>
                void persistThenNotify(
                  () =>
                    onUpdateComment(selectedGoal.id, commentId, text),
                  () => showSuccessToast("Comment updated."),
                )
          }
          onRemoveComment={
            isNew || !onRemoveComment
              ? undefined
              : (commentId) =>
                void persistThenNotify(
                  () => onRemoveComment(selectedGoal.id, commentId),
                  () => showSuccessToast("Comment deleted."),
                )
          }
          onDuplicate={
            isNew || !canDuplicate
              ? undefined
              : (targetCycleId) => {
                requestGoalEdit(() => {
                  void onDuplicateGoal(selectedGoal.id, targetCycleId).then(
                    (copy) => {
                      if (!copy) return;
                      onOpenGoal(copy.id, undefined, targetCycleId);
                      showSuccessToast("Goal duplicated.");
                    },
                  );
                });
              }
          }
          duplicateCycles={duplicateCycles}
          defaultDuplicateCycleId={cycleId}
          onCascade={
            isNew || !canCascade
              ? undefined
              : (reportIds) => {
                requestGoalEdit(() => {
                  void onCascadeGoal(selectedGoal.id, reportIds).then(() => {
                    showSuccessToast("Goal cascaded.");
                  });
                });
              }
          }
          onLinkCascadeTo={
            isNew || !canCascade
              ? undefined
              : (option) => {
                requestGoalEdit(() => {
                  void persistThenNotify(
                    () => onLinkCascadeTo(selectedGoal.id, option),
                    () => showSuccessToast("Goal cascaded."),
                  );
                });
              }
          }
          onUnlinkCascadeTo={
            isNew || !canCascade
              ? undefined
              : (recipient) => {
                requestGoalEdit(() => {
                  void persistThenNotify(
                    () =>
                      onUnlinkCascadeTo(selectedGoal.id, {
                        personId: recipient.personId,
                        goalId: recipient.goalId,
                      }),
                    () => showSuccessToast("Cascade removed."),
                  );
                });
              }
          }
          onChange={(next) => {
            const updated = goals.map((goal) =>
              goal.id === selectedGoal.id ? next : goal,
            );
            setGoals(updated);
            if (isNew) return;
            const progressGoals = progressOnlyGoals(row.goals, updated);
            if (progressGoals) {
              void persistThenNotify(
                () => onPersistProgress(progressGoals),
                () => showSuccessToast("Progress saved."),
              );
            }
          }}
          onSave={(next) => {
            const updated = goals.map((goal) =>
              goal.id === selectedGoal.id ? next : goal,
            );
            if (creatingIds.has(selectedGoal.id)) {
              setGoals(updated);
              persistBaselineRef.current = updated;
              void persistThenNotify(() => onPersistGoals(updated), () => {
                stopCreating(selectedGoal.id);
                onOpenGoal(selectedGoal.id);
                showSuccessToast("Goal created.");
              });
              return;
            }
            persistNamedGoals(updated, "Goal saved.");
          }}
          onRemove={
            canEditDraft
              ? isNew
                ? discardNewGoal
                : () => {
                  requestGoalEdit(() => {
                    const updated = removeGoalKeepingWeights(
                      goals,
                      selectedGoal.id,
                    );
                    setAndPersist(updated);
                    closeGoal();
                    showSuccessToast("Goal deleted.");
                  });
                }
              : undefined
          }
          onApplyOkrAsNewGoal={
            canEditDraft ? (payload) => requestAddGoal(payload) : undefined
          }
        />
      </GoalCreateDrawer>
    );
  }

  const showsGoals = !toolbarOnly;
  const sendBackReason =
    showsGoals && row.status === "sent_back" ? row.sendBackReason : undefined;
  const ownerActions =
    showsGoals && (canSubmitBatch || canEditDraft) ? (
      <div
        className="pd-people__toolbar"
        role="toolbar"
        aria-label="Goal actions"
      >
        {canSubmitBatch && goals.length > 0 ? (
          <GoalSubmitAllButton
            status={row.status}
            busy={busy}
            blockers={submitCheck.blockers}
            warning={submitCheck.warning}
            requiresLateJustification={allowLateSubmissions}
            initialLateJustification={row.lateJustification ?? ""}
            onSubmit={(lateJustification) => {
              const message =
                row.status === "sent_back"
                  ? "Goals resubmitted."
                  : "Goals submitted.";
              void onSubmit(goals, lateJustification).then((ok) => {
                if (!ok) return;
                showSuccessToast(message);
              });
            }}
          />
        ) : null}
        {canEditDraft && goals.length > 0 ? (
          <button
            type="button"
            className="pd-people__create-btn"
            disabled={busy}
            onClick={() => requestAddGoal()}
          >
            <Plus size={18} strokeWidth={2} aria-hidden />
            Add Goal
          </button>
        ) : null}
      </div>
    ) : undefined;

  const submitBlockers = submitSetBlockers(submitCheck.blockers);
  const submitBlockNotice =
    canSubmitBatch && !submitCheck.ok && submitBlockers.length > 0 ? (
      <GoalSubmitBlockNotice
        layout="ribbon"
        blockers={submitBlockers}
        onOpenGoal={onOpenGoal}
        onAddGoal={canEditDraft ? () => requestAddGoal() : undefined}
        addGoalLabel={goals.length > 0 ? 'Add Another Goal' : 'Add A Goal'}
      />
    ) : null;
  const sendBackNotice = sendBackReason ? (
    <GoalSendBackNotice
      layout={goals.length > 0 ? 'ribbon' : 'card'}
      reason={sendBackReason}
      author={
        row.sendBackBy ??
        (cascadeFrom.managerId && cascadeFrom.managerName
          ? {
            id: cascadeFrom.managerId,
            name: cascadeFrom.managerName,
            avatarUrl: cascadeFrom.managerAvatarUrl,
          }
          : undefined)
      }
    />
  ) : null;
  const lockBanner = ineligibility ? (
    <CycleIneligibilityNotice
      layout="ribbon"
      personName={personName}
      reason={ineligibility}
    />
  ) : editLock && !canEditDraft ? (
    <GoalEditLockNotice
      layout="ribbon"
      message={editLockContent ?? editLock}
      spoken={editLock}
    />
  ) : null;
  const ownerNotices = showsGoals ? (
    <div className="pd-goals__notices">
      {goals.length === 0 ? sendBackNotice : null}
      {goals.length === 0 ? submitBlockNotice : null}
    </div>
  ) : null;

  const countNotice =
    showsGoals &&
      canEditDraft &&
      canSubmitBatch &&
      goals.length > 0 &&
      submitCheck.ok &&
      submitCheck.warning ? (
      <GoalCountNotice message={submitCheck.warning} />
    ) : null;

  const emptyGoals = ownGoalsEmptyCopy(canEditDraft, editLock)
  const goalsBody =
    !showsGoals ? null : goals.length === 0 ? (
      <EmptyState
        className="pd-goals__empty"
        icon={Target}
        title={emptyGoals.title}
        description={emptyGoals.description}
        action={
          canEditDraft ? (
            <GoalEmptyActions
              busy={busy}
              previousCycleLabel={previousCycleLabel}
              onAdd={() => requestAddGoal()}
              onCopyPrevious={() => void copyPreviousGoals()}
            />
          ) : undefined
        }
      />
    ) : (
      <GoalsTable
        leadBanner={sendBackNotice}
        banner={submitBlockNotice}
        rows={goals.map((goal, index) => ({
          goal,
          title: goalTitle(goal, index),
          issue: canSubmitBatch
            ? submitIssueForGoal(goal.id, submitCheck.blockers)
            : undefined,
        }))}
        openGoalId={openGoalId}
        openMeasureKey={highlightMeasureKey}
        status={row.status}
        postWindowApprovalStage={row.postWindowApprovalStage}
        cycleId={cycleId}
        subjectId={personId}
        cascadeFrom={cascadeFrom}
        cascadeRecipientsFor={cascadeRecipientsFor}
        onOpen={(id, measureKey) => {
          unsavedClose.requestLeave(() => onOpenGoal(id, measureKey));
        }}
        canEditWeight={canEditDraft}
        canCascade={canCascade}
        canRemove={canEditDraft}
        cascadeTargets={cascadeTargets}
        duplicateCycles={duplicateCycles}
        onDuplicate={
          canDuplicate
            ? (goalId, targetCycleId) => {
              requestGoalEdit(() => {
                void onDuplicateGoal(goalId, targetCycleId).then((copy) => {
                  if (!copy) return;
                  onOpenGoal(copy.id, undefined, targetCycleId);
                  showSuccessToast("Goal duplicated.");
                });
              });
            }
            : undefined
        }
        onCascade={
          canCascade
            ? (goalId, reportIds) => {
              requestGoalEdit(() => {
                void onCascadeGoal(goalId, reportIds).then(() => {
                  showSuccessToast("Goal cascaded.");
                });
              });
            }
            : undefined
        }
        onRemove={
          canEditDraft
            ? (goalId) => {
              requestGoalEdit(() => {
                const updated = removeGoalKeepingWeights(goals, goalId);
                setAndPersist(updated);
                if (openGoalId === goalId) onOpenGoal(null);
                showSuccessToast("Goal deleted.");
              });
            }
            : undefined
        }
        onWeightChange={(goalId, weight) => {
          requestGoalEdit(() => {
            setGoals((current) => {
              const next = current.map((goal) =>
                goal.id === goalId ? { ...goal, weight } : goal,
              );
              schedulePersist(next);
              return next;
            });
          });
        }}
        onMeasureWeightChange={(goalId, measurements) => {
          requestGoalEdit(() => {
            setGoals((current) => {
              const next = current.map((goal) =>
                goal.id === goalId ? { ...goal, measurements } : goal,
              );
              schedulePersist(next);
              return next;
            });
          });
        }}
        onDistributeWeights={
          canEditDraft
            ? (next) => {
              requestGoalEdit(() => {
                setGoals(next);
                persistBaselineRef.current = next;
                void persistThenNotify(() => onPersistGoals(next), () => {
                  showSuccessToast("Goal saved.");
                });
              });
            }
            : undefined
        }
      />
    );

  return (
    <div
      className={
        toolbarOnly
          ? "pd-goals-shell pd-goals-shell--toolbar-only"
          : "pd-goals-shell"
      }
      aria-label={showsGoals ? "My Goals" : undefined}
    >
      {goalEditGuard}
      <GoalUnsavedCloseDialog
        open={unsavedClose.dialogOpen}
        onStay={unsavedClose.stay}
        onDiscard={unsavedClose.discard}
        onSaveDraft={unsavedClose.saveDraft}
      />
      <ReviewSaveBanner
        notice={toastNotice}
        onDismiss={() => setToastNotice(null)}
      />
      <GoalsToolbar start={toolbarStart} />

      {showsGoals ? (
        <ReportGoalsCard
          person={{ name: personName, avatarUrl: personAvatarUrl }}
          status={row.status}
          postWindowApprovalStage={row.postWindowApprovalStage}
          perspective="owner"
          allowLateSubmissions={allowLateSubmissions}
          deadlineMissedAt={deadlineMissedAt}
          lateJustification={row.lateJustification}
          lineManager={cascadeApprovers(cascadeFrom).lineManager}
          skipLevelManager={cascadeApprovers(cascadeFrom).skipLevelManager}
          goalCount={goals.length}
          actions={ownerActions}
          activityFilters={{
            cycleId,
            subjectEmployeeId: Number(personId),
          }}
          lockBanner={lockBanner}
          preferLockBanner={Boolean(ineligibility)}
        >
          {ownerNotices}
          {goalsBody}
          {countNotice}
        </ReportGoalsCard>
      ) : null}
      {goalDrawer}
    </div>
  );
}
