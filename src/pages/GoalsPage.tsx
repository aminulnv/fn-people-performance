import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link, useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  ArrowLeft,
  CircleAlert,
  CircleCheck,
  Clock3,
  FilePenLine,
  Plus,
  Search,
  Target,
  Undo2,
  Users,
} from "lucide-react";
import {
  Avatar,
  Button,
  CountBadge,
  Divider,
  EmptyState,
  PageHeader,
  Progress,
  ResizableTable,
  SegmentedControl,
  type ResizableColumn,
} from "@/components/ui";
import {
  canSubmitGoals,
  overallCompletion,
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
} from "@/lib/goals/draft";
import { blankGoal } from "@/lib/goals/measurements";
import {
  indexCascadeRecipients,
  type CascadeRecipient,
  type GoalOwnerOption,
  type LineManagerCascade,
} from "@/lib/goals/operations";
import {
  countPendingGoalApprovals,
  deriveGoalCapabilities,
  type GoalCapabilities,
} from "@/lib/goals/permissions";
import {
  countOwnGoalTodos,
  goalTodoBadgeLabel,
} from "@/lib/goals/todoCounts";
import { describeGoalEditLock } from "@/lib/goals/editWindow";
import {
  recordMetricProgress,
  recordMilestoneProgress,
} from "@/lib/goals/progressLog";
import { isGoalWindowOpenForPerson } from "@/lib/goals/goalExtensions";
import { useAuth } from "@/lib/auth";
import { hasSystemPermission } from "@/lib/accessControl/types";
import { avatarStyle } from "@/lib/employees/avatar";
import { getEmployee } from "@/lib/employees/store";
import type { OkrReferenceScope } from "@/lib/okr/reference";
import { setActiveCycle } from "@/lib/goals/store";
import { useSharedGoalsSnapshot } from "@/lib/goals/useSharedGoalsSnapshot";
import { DEMO_PHASES } from "@/lib/goals/phases";
import {
  GoalCascadeIndicator,
  GoalProgressAge,
  GoalsTable,
  MetricsCountBadge,
} from "./goals/GoalsTable";
import { GoalSendBackNotice } from "./goals/GoalSendBackNotice";
import { GoalSubmitBlockNotice } from "./goals/GoalSubmitBlockNotice";
import { GoalCountNotice } from "./goals/GoalCountNotice";
import {
  CycleIneligibilityNotice,
  GoalEditLockNotice,
} from "./goals/GoalEditLockNotice";
import { GoalSubmitAllButton } from "./goals/GoalSubmitAllButton";
import { GoalEmptyActions } from "./goals/GoalEmptyActions";
import { GoalUnsavedCloseDialog } from "./goals/GoalUnsavedCloseDialog";
import { useGoalDraftState } from "./goals/useGoalDraftState";
import { useDebouncedGoalSave } from "./goals/useDebouncedGoalSave";
import { useGoalEditGuard } from "./goals/useGoalEditGuard";
import { useGoalUnsavedClose } from "./goals/useGoalUnsavedClose";
import { GoalCreateDrawer } from "./goals/GoalCreateDrawer";
import {
  GoalOkrReferenceSheet,
  OKR_REFERENCE_SHEET_LABEL,
  OKR_REFERENCE_TAB_LABEL,
} from "./goals/GoalOkrReferenceSheet";
import { GoalDetailView } from "./goals/GoalDetailView";
import type { CascadeTarget } from "./goals/GoalCascadeTargetDialog";
import { ReportGoalsCard } from "./goals/ReportGoalsCard";
import { GoalsCycleSelect } from "./goals/GoalsCycleSelect";
import { useGoalsController } from "./goals/useGoalsController";
import {
  goalTitle,
  goalSectionLabels,
  goalsDetailPath,
  goalsGoalPath,
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
  describeEmptyGoalsList,
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
  cycleIneligibilityStatusLabel,
  statusLabel,
  submissionStatusLabel,
} from "./goals/statusLabels";
import { cycleIneligibilityReason } from "@/lib/goals/demoData";
import { goalsCycleForPerson } from "@/lib/goals/cyclesFromReviews";
import { cyclesListPath } from "@/lib/reviews/paths";
import { useReviewCyclesHydrated } from "@/lib/reviews/useReviews";
import "@/styles/layout-people.css";
import "@/styles/layout-goals.css";

function phaseLabel(phase: DemoPhase): string {
  return DEMO_PHASES.find((p) => p.id === phase)?.label ?? phase;
}
/** Designation and department — stacked under the owner name in the goals table. */
function personOwnerMetaParts(person: GoalsSnapshot["people"][number]): string[] {
  return [person.title, person.department].filter(Boolean);
}

/** Single-line role summary — mirrors the employee profile hero. */
function personMeta(person: GoalsSnapshot["people"][number]): string {
  const division = getEmployee(Number(person.id))?.division;
  return [person.title, person.department, division].filter(Boolean).join(" · ");
}

function okrScopeFor(personId: string): OkrReferenceScope | undefined {
  const employee = getEmployee(Number(personId));
  if (!employee?.department.trim()) return undefined;
  return {
    department: employee.department,
    wing: employee.team,
  };
}

/** Bookmark tab that pulls the read-only OKRs out from behind the goal drawer. */
function okrSideSheetFor(personId: string) {
  const scope = okrScopeFor(personId);
  if (!scope) return undefined;
  return {
    tabLabel: OKR_REFERENCE_TAB_LABEL,
    tabIcon: Target,
    label: OKR_REFERENCE_SHEET_LABEL,
    content: <GoalOkrReferenceSheet scope={scope} />,
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
  { id: "goals", label: "Goals", grow: true },
  { id: "weight", label: "Weight" },
  { id: "progress", label: "Progress" },
  { id: "metric", label: "Metrics" },
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
  personId: string;
  goalId: string;
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
  onGoalChange: (nextGoalId: string) => void;
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
    resolveOwner,
    actions,
  } = useGoalsController({
    cycleId,
    subjectId: personId,
    syncActiveSelection: false,
  });

  const personCycle = subjectCycle ?? snapshot?.cycle;
  const ineligibility =
    cycleMembershipReady && subject && personCycle
      ? cycleIneligibilityReason(subject, personCycle, subjectGoals?.status)
      : null;
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
  });

  if (!snapshot || !subject || !subjectGoals) return null;

  const goals = subjectGoals.goals;
  const selectedIndex = goals.findIndex((goal) => goal.id === goalId);
  const selectedGoal = selectedIndex >= 0 ? goals[selectedIndex] : null;
  if (!selectedGoal) return null;

  const canEditDraft = Boolean(capabilities?.canEditStructure);
  const canUpdateProgress = Boolean(capabilities?.canUpdateProgress);
  const canDuplicate = Boolean(capabilities?.canDuplicate);
  const canCascade = Boolean(capabilities?.canCascade);
  const isCurrentCycle = snapshot.cycleStatus === "current";
  const editLock = describeGoalEditLock({
    cycle: personCycle ?? snapshot.cycle,
    cycleStatus: snapshot.cycleStatus,
    canUpdateProgress,
    status: subjectGoals.status,
    postWindowApprovalStage: subjectGoals.postWindowApprovalStage,
    subject,
  });
  const lockMessage = ineligibility || canEditDraft ? null : editLock;
  const owner = resolveOwner(selectedGoal, subject.id) ?? {
    id: subject.id,
    name: subject.name,
    title: subject.title,
    avatarUrl: subject.avatarUrl,
  };
  const saveGoal = (next: Goal) => {
    void actions.saveGoals(
      personId,
      goals.map((goal) => (goal.id === next.id ? next : goal)),
    );
  };

  const saveProgressGoal = (next: Goal) => {
    void actions.saveProgress(
      personId,
      goals.map((goal) => (goal.id === next.id ? next : goal)),
    );
  };

  return (
    <GoalCreateDrawer
      label={`View ${goalTitle(selectedGoal, selectedIndex)}`}
      closeLabel="Close goal"
      sideSheet={okrSideSheetFor(personId)}
      onClose={onClose}
    >
      {goalEditGuard}
      {ineligibility ? (
        <CycleIneligibilityNotice
          personName={subject.name}
          reason={ineligibility}
        />
      ) : lockMessage ? (
        <GoalEditLockNotice message={lockMessage} />
      ) : null}
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
          cascadeHref={(pid, gid) =>
            goalsGoalPath(snapshot.cycle.id, pid, gid)
          }
          cycleLabel={snapshot.cycle.label}
          isCurrentCycle={isCurrentCycle}
          status={subjectGoals.status}
          postWindowApprovalStage={subjectGoals.postWindowApprovalStage}
          sendBackReason={subjectGoals.sendBackReason}
          sendBackBy={subjectGoals.sendBackBy}
          approvedBy={subjectGoals.approvedBy}
          commentAuthorName={actor?.name ?? subject.name}
          commentAuthorId={actor?.id ?? subject.id}
          commentAuthors={snapshot.people}
          canEdit={canEditDraft}
          canUpdateProgress={canUpdateProgress}
          canRemove={canEditDraft}
          canCascade={canCascade}
          cascadeTargets={cascadeTargetsFor(subject.reportIds, snapshot.people)}
          onRequestEdit={requestGoalEdit}
          onChange={saveProgressGoal}
          onAddComment={(text) => {
            void actions.addComment(personId, selectedGoal.id, text);
          }}
          onSave={(next) => requestGoalEdit(() => saveGoal(next))}
          onDuplicate={
            canDuplicate
              ? () => {
                requestGoalEdit(() => {
                  void actions.duplicateGoal(personId, selectedGoal.id).then((copy) => {
                    if (copy) onGoalChange(copy.id);
                  });
                });
              }
              : undefined
          }
          onCascade={
            canCascade
              ? (reportIds) => {
                requestGoalEdit(() => {
                  void actions.cascadeGoal(personId, selectedGoal.id, reportIds);
                });
              }
              : undefined
          }
          onRemove={
            canEditDraft
              ? () => {
                requestGoalEdit(() => {
                  void actions.saveGoals(
                    personId,
                    goals.filter((goal) => goal.id !== selectedGoal.id),
                  );
                  onClose();
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
    if (!personId || !goalId) return null;
    return { personId, goalId };
  }, [searchParams]);
  const [hoveredPersonId, setHoveredPersonId] = useState<string | null>(null);

  function setPanelSelection(next: OverviewPanelSelection | null) {
    const params = new URLSearchParams(searchParams);
    if (next) {
      params.set("person", next.personId);
      params.set("goal", next.goalId);
    } else {
      params.delete("person");
      params.delete("goal");
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
  const overviewScopes = OVERVIEW_SCOPES.filter((item) => {
    if (item.id === "reports") return Boolean(me?.reportIds.length);
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
  const scopedPeople = useMemo(
    () => peopleInScope(snapshot, viewer, visibleScope),
    [snapshot, viewer, visibleScope],
  );
  const viewerIneligibility = useMemo(() => {
    if (!me || !cycleMembershipReady) return null;
    return cycleIneligibilityReason(
      me,
      goalsCycleForPerson(snapshot.cycle, me.id),
      snapshot.byPerson[me.id]?.status,
    );
  }, [cycleMembershipReady, me, snapshot]);
  const ownCycleEmpty =
    me && viewerIneligibility
      ? cycleIneligibilityEmptyState(me.name, viewerIneligibility)
      : null;
  const ownGoalCount = me ? (snapshot.byPerson[me.id]?.goals.length ?? 0) : 0;
  const scopedRows = useMemo(
    () => (snapshot ? goalRows(snapshot, scopedPeople) : []),
    [scopedPeople, snapshot],
  );

  const counts = useMemo(
    () =>
      snapshot
        ? statusCounts(snapshot, scopedPeople)
        : {
          goals: 0,
          draft: 0,
          sentBack: 0,
          submitted: 0,
          approved: 0,
          incomplete: 0,
        },
    [scopedPeople, snapshot],
  );

  const filtered = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return scopedRows
      .filter((row) => {
        if (!matchesStatusFilter(row.status, statusFilter)) return false;
        if (!normalizedQuery) return true;
        return [
          row.title,
          row.person.name,
          row.person.title,
          row.person.department,
          statusLabel(row.status),
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
        return a.title.localeCompare(b.title, undefined, {
          sensitivity: "base",
        });
      });
  }, [query, scopedRows, statusFilter]);

  const tableRows = useMemo(
    () => withOwnerRowSpans(filtered),
    [filtered],
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
          ? peopleWithoutGoals(snapshot, scopedPeople, statusFilter).length
          : 0,
        hasQuery: query.trim().length > 0,
        statusFilter,
        canAddOwnGoals,
      }),
    [canAddOwnGoals, query, scopedPeople, snapshot, statusFilter, visibleScope],
  );

  useEffect(() => {
    if (!panelSelection) return;
    const row = snapshot.byPerson[panelSelection.personId];
    if (!row?.goals.some((goal) => goal.id === panelSelection.goalId)) {
      setPanelSelection(null);
    }
  }, [panelSelection, snapshot]);

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

  return (
    <div
      className="pd-page pd-page--pane pd-goals pd-goals-overview"
      aria-label="Goals"
    >
      <div
        className="pd-people__summary pd-people__summary--stretch"
        role="group"
        aria-label="Goal submission totals"
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
            cycles={snapshot.availableCycles}
            activeCycleId={snapshot.cycle.id}
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
            ? "My goals"
            : scope === "reports"
              ? "My Reports' goals"
              : "Everyone's goals"}
        </h2>
        {visibleScope === "mine" && !cycleMembershipReady && ownGoalCount === 0 ? (
          <div
            className="pd-people__empty-state"
            aria-busy="true"
            aria-label="Checking cycle membership"
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
                  const isSelected =
                    panelSelection?.personId === row.person.id &&
                    panelSelection?.goalId === row.goalId;
                  const isOwnerActive =
                    hoveredPersonId === row.person.id ||
                    panelSelection?.personId === row.person.id;
                  const ownerMetaLines = personOwnerMetaParts(row.person);
                  return (
                    <tr
                      key={row.key}
                      className={[
                        "pd-goals-overview__row",
                        isSelected ? "is-selected" : "",
                        row.isPersonEnd ? "pd-goals-overview__row--person-end" : "",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                      tabIndex={0}
                      aria-selected={isSelected}
                      onMouseEnter={() => setHoveredPersonId(row.person.id)}
                      onMouseLeave={() => setHoveredPersonId(null)}
                      onClick={(event) => {
                        const target = event.target as HTMLElement;
                        if (target.closest("a, button")) return;
                        setPanelSelection({
                          personId: row.person.id,
                          goalId: row.goalId,
                        });
                      }}
                      onKeyDown={(event) => {
                        if (event.key !== "Enter" && event.key !== " ") return;
                        event.preventDefault();
                        setPanelSelection({
                          personId: row.person.id,
                          goalId: row.goalId,
                        });
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
                                snapshot.cycle.id,
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
                                {ownerMetaLines.length > 0 ? (
                                  <span className="pd-goals-overview__owner-meta">
                                    {ownerMetaLines.map((line, index) => (
                                      <span
                                        key={`${index}-${line}`}
                                        className="pd-goals-overview__owner-meta-line"
                                      >
                                        {line}
                                      </span>
                                    ))}
                                  </span>
                                ) : null}
                              </div>
                            </Link>
                          </div>
                        </td>
                      ) : null}
                      <td data-col="goals">
                        <span
                          className="pd-goals-overview__goal"
                          title={row.title}
                        >
                          <GoalCascadeIndicator
                            goal={row}
                            cascadedTo={row.cascadedTo}
                            place="before"
                          />
                          <span className="pd-goals-overview__goal-text">
                            {row.title}
                          </span>
                          <GoalCascadeIndicator
                            goal={row}
                            cascadedTo={row.cascadedTo}
                            place="after"
                          />
                        </span>
                      </td>
                      <td data-col="weight">
                        <span className="pd-goals-overview__weight">
                          {row.weight}%
                        </span>
                      </td>
                      <td data-col="progress">
                        <div className="pd-goals-overview__progress">
                          <div className="pd-goals-overview__progress-meta">
                            <GoalProgressAge at={row.lastUpdatedAt} />
                            <span className="pd-goals-overview__progress-label">
                              {row.completion}%
                            </span>
                          </div>
                          <Progress value={row.completion} />
                        </div>
                      </td>
                      <td data-col="metric">
                        <MetricsCountBadge count={row.metricCount} />
                      </td>
                      <td data-col="approval">
                        <GoalApprovalStatus
                          status={row.status}
                          postWindowApprovalStage={row.postWindowApprovalStage}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </ResizableTable>
          </div>
        )}
      </section>
      {panelSelection ? (
        <GoalsOverviewGoalPanel
          cycleId={snapshot.cycle.id}
          personId={panelSelection.personId}
          goalId={panelSelection.goalId}
          onClose={() => setPanelSelection(null)}
          onGoalChange={(nextGoalId) =>
            setPanelSelection({
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
    capabilities,
    capabilitiesFor,
    resolveOwner,
    busy,
    error,
    actions,
  } = useGoalsController({ cycleId, subjectId: personId });
  const [sendBackReason, setSendBackReason] = useState("");
  const [embeddedManagerTab, setEmbeddedManagerTab] =
    useState<ManagerTab>("mine");
  const managerTab: ManagerTab = embedded
    ? embeddedManagerTab
    : goalId
      ? "mine"
      : managerTabFromHash(location.hash) ?? "mine";
  const [embeddedGoalId, setEmbeddedGoalId] = useState<string | null>(null);
  const [openMeasureKey, setOpenMeasureKey] = useState<string | null>(null);

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
  const hasReports = Boolean(active && active.reportIds.length > 0);

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
          setActiveCycle(nextCycleId);
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
          title="Cycle not found"
          description="That goal cycle is not available. Open All Goals and pick a current cycle."
          action={
            <Link to="/goals" className="pd-people__create-btn">
              Back to All Goals
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
          title="No goal cycles yet"
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
          title="No people yet"
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
          title="Goals not available"
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
  const pendingCount = countPendingGoalApprovals(reports);
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
    setActiveCycle(nextCycleId);
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
                count={pendingCount}
                aria-label={goalTodoBadgeLabel(pendingCount, "reports")}
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

  const openGoal = (nextGoalId: string | null, measureKey?: string) => {
    setOpenMeasureKey(nextGoalId ? (measureKey ?? null) : null);
    if (embedded) {
      setEmbeddedGoalId(nextGoalId);
      return;
    }
    if (nextGoalId) {
      navigate(goalsGoalPath(snapshot.cycle.id, personId, nextGoalId));
      return;
    }
    navigate({
      pathname: goalsDetailPath(snapshot.cycle.id, personId),
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
      editLock={
        ineligibility
          ? cycleIneligibilityEmptyState(active.name, ineligibility).description
          : describeGoalEditLock({
              cycle: personCycle,
              cycleStatus: snapshot.cycleStatus,
              canUpdateProgress: Boolean(capabilities?.canUpdateProgress),
              status: activeGoals.status,
              postWindowApprovalStage: activeGoals.postWindowApprovalStage,
              subject: active,
            })
      }
      isCurrentCycle={isCurrentCycle}
      row={activeGoals}
      membershipPending={!cycleMembershipReady}
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
      toolbarStart={
        <div className="pd-goals-toolbar__start">
          {cycleSelect}
          {hasReports ? managerTabs : null}
        </div>
      }
      toolbarOnly={showsReports || showsSubjectReview}
      ownerOptions={ownerOptions.filter((option) => option.id === active.id)}
      commentAuthors={ownerOptions}
      cascadeFrom={cascadeFrom}
      cascadeRecipientsFor={cascadeRecipientsFor}
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
      onPersistProgress={(goals) => {
        void actions.saveProgress(active.id, goals);
      }}
      onAddComment={(goalId, text) => {
        void actions.addComment(active.id, goalId, text);
      }}
      onDuplicateGoal={(goalId) => actions.duplicateGoal(active.id, goalId)}
      previousCycleLabel={previousCycle?.label}
      onCopyPreviousGoals={() => actions.copyPreviousGoals(active.id)}
      cascadeTargets={reports.map(({ person }) => ({
        id: person.id,
        name: person.name,
        title: person.title,
        avatarUrl: person.avatarUrl,
      }))}
      onCascadeGoal={(goalId, reportIds) =>
        actions.cascadeGoal(active.id, goalId, reportIds)
      }
      onSubmit={(goals) => void actions.saveAndSubmit(active.id, goals)}
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
              Back to All Goals
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
        <div
          className="pd-people__summary pd-goals-detail-header__summary"
          role="group"
          aria-label={`${active.name} goal totals`}
        >
          <div className="pd-people__summary-card">
            <span className="pd-people__summary-label">Status</span>
            <span className="pd-people__summary-value">
              {!cycleMembershipReady
                ? "—"
                : ineligibility
                  ? cycleIneligibilityStatusLabel(ineligibility)
                  : submissionStatusLabel(
                      activeGoals.status,
                      activeGoals.goals.length,
                    )}
            </span>
          </div>
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
        <Divider className="pd-goals-detail-header__divider" />
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
          onApprove={(id) => void actions.approve(id)}
          onSendBack={(id) =>
            void actions.sendBack(id, sendBackReason).then(() => {
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

function ManagerReportGoalsTable({
  cycleId,
  person,
  row,
  canEditStructure,
  cascadeRecipientsFor,
  actorId,
  deadlinePassed,
  openGoalId,
  onOpen,
  onSaveGoals,
}: {
  cycleId: string;
  person: GoalsSnapshot["people"][number];
  row: PersonGoals;
  canEditStructure: boolean;
  cascadeRecipientsFor: (goalId: string) => CascadeRecipient[];
  actorId?: string;
  deadlinePassed: boolean;
  openGoalId: string | null;
  onOpen: (goalId: string | null, measureKey?: string) => void;
  onSaveGoals: (id: string, goals: Goal[]) => void;
}) {
  const { requestGoalEdit, goalEditGuard } = useGoalEditGuard({
    personId: person.id,
    actorId,
    status: row.status,
    deadlinePassed,
  });
  const { goals, setGoals } = useGoalDraftState({
    personId: person.id,
    status: row.status,
    persistedGoals: row.goals,
  });
  const { schedule: schedulePersist, flush: flushPersist } = useDebouncedGoalSave(
    (next) => onSaveGoals(person.id, next),
  );

  const persistNow = (next: Goal[]) => {
    flushPersist();
    setGoals(next);
    onSaveGoals(person.id, next);
  };

  return (
    <>
      {goalEditGuard}
      <GoalsTable
        label={`${person.name} goals`}
        cycleId={cycleId}
        subjectId={person.id}
        status={row.status}
        postWindowApprovalStage={row.postWindowApprovalStage}
        cascadeRecipientsFor={cascadeRecipientsFor}
        rows={goals.map((goal, index) => ({
          goal,
          title: goalTitle(goal, index),
        }))}
        openGoalId={openGoalId}
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
                requestGoalEdit(() => persistNow(next));
              }
            : undefined
        }
        onRemove={
          canEditStructure
            ? (goalId) => {
                requestGoalEdit(() => {
                  persistNow(goals.filter((goal) => goal.id !== goalId));
                  if (openGoalId === goalId) onOpen(null);
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
  onApprove: (id: string) => void;
  onSendBack: (id: string) => void;
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
  const active =
    reports.find((r) => r.row.goals.some((goal) => goal.id === openGoalId)) ??
    null;

  if (reports.length === 0) {
    return (
      <EmptyState
        icon={Users}
        title="No direct reports"
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
        return (
          <ReportGoalsCard
            key={person.id}
            person={person}
            status={row.status}
            postWindowApprovalStage={row.postWindowApprovalStage}
            skipLevelManager={
              skipLevel.skipLevelManagerId && skipLevel.skipLevelManagerName
                ? {
                  id: skipLevel.skipLevelManagerId,
                  name: skipLevel.skipLevelManagerName,
                  avatarUrl: skipLevel.skipLevelManagerAvatarUrl,
                }
                : null
            }
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
            onApprove={() => onApprove(person.id)}
            onSendBack={() => {
              onSendBack(person.id);
              setSendBackFor(null);
            }}
            activityFilters={{
              cycleId: snapshot.cycle.id,
              subjectEmployeeId: Number(person.id),
            }}
          >
            {row.goals.length > 0 ? (
              <ManagerReportGoalsTable
                cycleId={snapshot.cycle.id}
                person={person}
                row={row}
                canEditStructure={Boolean(reportCaps?.canEditStructure)}
                cascadeRecipientsFor={cascadeRecipientsFor}
                actorId={commentAuthorId}
                deadlinePassed={
                  snapshot.cycle.phase === "hard_lock" &&
                  !isGoalWindowOpenForPerson(snapshot.cycle, person) &&
                  snapshot.cycle.postWindowGoalPolicy === "two_tier_approval"
                }
                openGoalId={openGoalId}
                onOpen={setOpenGoalId}
                onSaveGoals={onSaveGoals}
              />
            ) : (
              <p className="pd-goals-approval__empty">
                No goals added for this cycle yet.
              </p>
            )}
          </ReportGoalsCard>
        );
      })}
    </>
  );

  if (!active || !selectedGoal) return table;

  return (
    <>
      {table}
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
  editLock,
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
  cascadeHref,
  resolveOwner,
  highlightMeasureKey,
  onOpenGoal,
  onPersistGoals,
  onPersistProgress,
  onAddComment,
  previousCycleLabel,
  onCopyPreviousGoals,
  onDuplicateGoal,
  onCascadeGoal,
  onSubmit,
}: {
  personName: string;
  personAvatarUrl?: string;
  personId: string;
  cycleId: string;
  cycleLabel: string;
  goalCountPolicy: GoalsSnapshot["cycle"]["goalCountPolicy"];
  allowLateSubmissions: boolean;
  /** Explains why goal editing is unavailable in this cycle. */
  editLock: string | null;
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
  cascadeHref: (personId: string, goalId: string) => string;
  resolveOwner: (goal: Goal) => {
    id: string;
    name: string;
    title?: string;
    avatarUrl?: string;
  };
  highlightMeasureKey?: string | null;
  onOpenGoal: (goalId: string | null, measureKey?: string) => void;
  onPersistGoals: (goals: Goal[]) => void | Promise<boolean | void>;
  /** Progress-only updates never send goals back for approval. */
  onPersistProgress: (goals: Goal[]) => void;
  onAddComment?: (goalId: string, text: string) => void;
  previousCycleLabel?: string;
  onCopyPreviousGoals: () => Promise<Goal | null>;
  onDuplicateGoal: (goalId: string) => Promise<Goal | null>;
  cascadeTargets: {
    id: string;
    name: string;
    title?: string;
    avatarUrl?: string;
  }[];
  onCascadeGoal: (goalId: string, reportIds: string[]) => Promise<void>;
  onSubmit: (goals: Goal[]) => void;
}) {
  const { goals, setGoals, creatingIds, startCreating, stopCreating } =
    useGoalDraftState({
      personId,
      status: row.status,
      persistedGoals: row.goals,
    });
  const { requestGoalEdit, goalEditGuard } = useGoalEditGuard({
    personId,
    actorId: commentAuthorId,
    status: row.status,
    deadlinePassed: allowLateSubmissions,
  });
  const { schedule: schedulePersist, flush: flushPersist } = useDebouncedGoalSave(
    (next) => {
      void onPersistGoals(next);
    },
  );

  const canManualSave =
    canEditDraft && (row.status === "draft" || row.status === "sent_back");
  const hasUnsavedChanges =
    canManualSave && hasPromptableUnsavedGoalDraft(goals, row.goals);
  const persistDraft = () => {
    flushPersist();
    onPersistGoals(goals);
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
    onPersistGoals(next);
  };

  const addGoal = () => {
    const next = blankGoal({ ownerId: personId });
    startCreating(next.id);
    setGoals([...goals, next]);
  };

  const copyPreviousGoals = async () => {
    const firstCopiedGoal = await onCopyPreviousGoals();
    if (firstCopiedGoal) onOpenGoal(firstCopiedGoal.id);
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
          aria-label="Checking cycle membership"
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
        setGoals(goals.filter((goal) => goal.id !== selectedGoal.id));
      }
      stopCreating(selectedGoal.id);
      onOpenGoal(null);
    };

    const requestCloseGoal = () => {
      unsavedClose.requestLeave(closeGoal);
    };

    const discardNewGoal = () => {
      setGoals(goals.filter((goal) => goal.id !== selectedGoal.id));
      stopCreating(selectedGoal.id);
      onOpenGoal(null);
    };

    goalDrawer = (
      <GoalCreateDrawer
        label={isNew ? undefined : `View ${goalTitle(selectedGoal, selectedIndex)}`}
        closeLabel="Close goal"
        sideSheet={okrSideSheetFor(personId)}
        onClose={requestCloseGoal}
      >
        {!isNew && editLock && !canEditDraft ? (
          <GoalEditLockNotice message={editLock} />
        ) : null}
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
          cascadeHref={cascadeHref}
          cycleLabel={cycleLabel}
          isCurrentCycle={isCurrentCycle}
          status={row.status}
          postWindowApprovalStage={
            isNew ? undefined : row.postWindowApprovalStage
          }
          sendBackReason={isNew ? undefined : row.sendBackReason}
          sendBackBy={isNew ? undefined : row.sendBackBy}
          approvedBy={isNew ? undefined : row.approvedBy}
          commentAuthorName={commentAuthorName}
          commentAuthorId={commentAuthorId}
          commentAuthors={commentAuthors ?? ownerOptions}
          canEdit={canEditDraft}
          canUpdateProgress={canUpdateProgress}
          canRemove={canEditDraft}
          canCascade={isNew ? false : canCascade}
          cascadeTargets={isNew ? [] : cascadeTargets}
          onRequestEdit={requestGoalEdit}
          manualSave={isNew || canManualSave}
          hasUnsavedChanges={selectedHasUnsavedChanges}
          onAddComment={
            isNew || !onAddComment
              ? undefined
              : (text) => onAddComment(selectedGoal.id, text)
          }
          onDuplicate={
            isNew || !canDuplicate
              ? undefined
              : () => {
                  requestGoalEdit(() => {
                    void onDuplicateGoal(selectedGoal.id).then((copy) => {
                      if (copy) onOpenGoal(copy.id);
                    });
                  });
                }
          }
          onCascade={
            isNew || !canCascade
              ? undefined
              : (reportIds) => {
                  requestGoalEdit(() => {
                    void onCascadeGoal(selectedGoal.id, reportIds);
                  });
                }
          }
          onChange={(next) => {
            const updated = goals.map((goal) =>
              goal.id === selectedGoal.id ? next : goal,
            );
            setGoals(updated);
            if (!isNew && !canManualSave) onPersistProgress(updated);
          }}
          onSave={(next) => {
            const updated = goals.map((goal) =>
              goal.id === selectedGoal.id ? next : goal,
            );
            if (isNew) {
              void Promise.resolve(onPersistGoals(updated)).then((saved) => {
                if (saved === false) return;
                setGoals(updated);
                stopCreating(selectedGoal.id);
                onOpenGoal(selectedGoal.id);
              });
              return;
            }
            setAndPersist(updated);
          }}
          onRemove={
            canEditDraft
              ? isNew
                ? discardNewGoal
                : () => {
                    requestGoalEdit(() => {
                      const updated = goals.filter(
                        (goal) => goal.id !== selectedGoal.id,
                      );
                      setAndPersist(updated);
                      closeGoal();
                    });
                  }
              : undefined
          }
        />
      </GoalCreateDrawer>
    );
  }

  const showsGoals = !toolbarOnly;
  const sendBackReason =
    showsGoals && row.status === "sent_back" ? row.sendBackReason : undefined;
  const canSubmitBatch =
    canSubmit && (row.status === "draft" || row.status === "sent_back");
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
            reasons={submitCheck.reasons}
            warning={submitCheck.warning}
            onSubmit={() => onSubmit(goals)}
          />
        ) : null}
        {canEditDraft ? (
          <button
            type="button"
            className="pd-people__create-btn"
            disabled={busy}
            onClick={() =>
              requestGoalEdit(() => unsavedClose.requestLeave(addGoal))
            }
          >
            <Plus size={18} strokeWidth={2} aria-hidden />
            Add Goal
          </button>
        ) : null}
      </div>
    ) : undefined;

  const ownerNotices = showsGoals ? (
    <div className="pd-goals__notices">
      {sendBackReason ? (
        <GoalSendBackNotice
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
      ) : null}
      {canSubmitBatch && !submitCheck.ok ? (
        <GoalSubmitBlockNotice
          blockers={submitCheck.blockers}
          onOpenGoal={onOpenGoal}
        />
      ) : null}
      {canEditDraft &&
      canSubmitBatch &&
      goals.length > 0 &&
      submitCheck.ok &&
      submitCheck.warning ? (
        <GoalCountNotice message={submitCheck.warning} />
      ) : null}
      {ineligibility ? (
        <CycleIneligibilityNotice
          personName={personName}
          reason={ineligibility}
        />
      ) : editLock && !canEditDraft ? (
        <GoalEditLockNotice message={editLock} />
      ) : null}
      {row.status === "incomplete" ? (
        <Notice tone="danger">
          No submission by Day 30 — flagged incomplete. Quarter score is 0.
        </Notice>
      ) : null}
    </div>
  ) : null;

  const goalsBody =
    !showsGoals ? null : goals.length === 0 ? (
      <EmptyState
        className="pd-goals__empty"
        icon={Target}
        title="No goals yet"
        description={
          canEditDraft
            ? "Add a goal to get started. Each needs measurements, and weights must total 100%."
            : (editLock ?? "Goals cannot be added for this cycle right now.")
        }
        action={
          canEditDraft ? (
            <GoalEmptyActions
              busy={busy}
              previousCycleLabel={previousCycleLabel}
              showAdd={false}
              onAdd={() =>
                requestGoalEdit(() => unsavedClose.requestLeave(addGoal))
              }
              onCopyPrevious={() => void copyPreviousGoals()}
            />
          ) : undefined
        }
      />
    ) : (
      <GoalsTable
        rows={goals.map((goal, index) => ({
          goal,
          title: goalTitle(goal, index),
        }))}
        openGoalId={openGoalId}
        status={row.status}
        postWindowApprovalStage={row.postWindowApprovalStage}
        cycleId={cycleId}
        subjectId={personId}
        cascadeRecipientsFor={cascadeRecipientsFor}
        onOpen={(id, measureKey) => {
          unsavedClose.requestLeave(() => onOpenGoal(id, measureKey));
        }}
        canEditWeight={canEditDraft}
        canCascade={canCascade}
        canRemove={canEditDraft}
        cascadeTargets={cascadeTargets}
        onDuplicate={
          canDuplicate
            ? (goalId) => {
                requestGoalEdit(() => {
                  void onDuplicateGoal(goalId);
                });
              }
            : undefined
        }
        onCascade={
          canCascade
            ? (goalId, reportIds) => {
                requestGoalEdit(() => {
                  void onCascadeGoal(goalId, reportIds);
                });
              }
            : undefined
        }
        onRemove={
          canEditDraft
            ? (goalId) => {
                requestGoalEdit(() => {
                  const updated = goals.filter((goal) => goal.id !== goalId);
                  setAndPersist(updated);
                  if (openGoalId === goalId) onOpenGoal(null);
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
                  void onPersistGoals(next);
                });
              }
            : undefined
        }
        canLogProgress={canUpdateProgress || canEditDraft}
        onRecordMetricProgress={
          canUpdateProgress || canEditDraft
            ? (goalId, metricId, nextValue) => {
                const author = {
                  id: commentAuthorId,
                  name: commentAuthorName,
                };
                setGoals((current) => {
                  const next = current.map((goal) => {
                    if (goal.id !== goalId) return goal;
                    return {
                      ...goal,
                      measurements: goal.measurements.map((item) =>
                        item.kind === "metric" && item.id === metricId
                          ? recordMetricProgress(item, nextValue, author)
                          : item,
                      ),
                    };
                  });
                  if (canManualSave) schedulePersist(next);
                  else onPersistProgress(next);
                  return next;
                });
              }
            : undefined
        }
        onToggleMilestone={
          canUpdateProgress || canEditDraft
            ? (goalId, milestoneId, complete) => {
                const author = {
                  id: commentAuthorId,
                  name: commentAuthorName,
                };
                setGoals((current) => {
                  const next = current.map((goal) => {
                    if (goal.id !== goalId) return goal;
                    return {
                      ...goal,
                      measurements: goal.measurements.map((item) =>
                        item.kind === "milestone" && item.id === milestoneId
                          ? recordMilestoneProgress(item, complete, author)
                          : item,
                      ),
                    };
                  });
                  if (canManualSave) schedulePersist(next);
                  else onPersistProgress(next);
                  return next;
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
      aria-label={showsGoals ? "My goals" : undefined}
    >
      {goalEditGuard}
      <GoalUnsavedCloseDialog
        open={unsavedClose.dialogOpen}
        onStay={unsavedClose.stay}
        onDiscard={unsavedClose.discard}
        onSaveDraft={unsavedClose.saveDraft}
      />
      <GoalsToolbar start={toolbarStart} />

      {showsGoals ? (
        <ReportGoalsCard
          person={{ name: personName, avatarUrl: personAvatarUrl }}
          status={row.status}
          postWindowApprovalStage={row.postWindowApprovalStage}
          perspective="owner"
          allowLateSubmissions={allowLateSubmissions}
          lineManager={
            cascadeFrom.managerId && cascadeFrom.managerName
              ? {
                  id: cascadeFrom.managerId,
                  name: cascadeFrom.managerName,
                  avatarUrl: cascadeFrom.managerAvatarUrl,
                }
              : null
          }
          skipLevelManager={
            cascadeFrom.skipLevelManagerId && cascadeFrom.skipLevelManagerName
              ? {
                  id: cascadeFrom.skipLevelManagerId,
                  name: cascadeFrom.skipLevelManagerName,
                  avatarUrl: cascadeFrom.skipLevelManagerAvatarUrl,
                }
              : null
          }
          goalCount={goals.length}
          actions={ownerActions}
          activityFilters={{
            cycleId,
            subjectEmployeeId: Number(personId),
          }}
        >
          {ownerNotices}
          {goalsBody}
        </ReportGoalsCard>
      ) : null}
      {goalDrawer}
    </div>
  );
}
