import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  CircleAlert,
  CircleCheck,
  Clock3,
  Columns3,
  FilePenLine,
  MoreHorizontal,
  Plus,
  Search,
  Target,
  Undo2,
  Users,
} from "lucide-react";
import {
  Avatar,
  Button,
  EmptyState,
  PageHeader,
  Progress,
  ResizableTable,
  SegmentedControl,
  Tooltip,
  ListboxSelect,
  type ResizableColumn,
} from "@/components/ui";
import {
  canSubmitGoals,
  fetchGoalsSnapshot,
  goalCompletion,
  overallCompletion,
  sumGoalWeights,
  watchGoalsSnapshot,
  type DemoPhase,
  type Goal,
  type GoalsSnapshot,
  type PersonGoals,
} from "@/lib/goalsApi";
import type { GoalProgressStatus } from "@/lib/goals/types";
import { blankGoal } from "@/lib/goals/measurements";
import type {
  CascadeRecipient,
  GoalOwnerOption,
  LineManagerCascade,
} from "@/lib/goals/operations";
import {
  deriveGoalCapabilities,
  type GoalCapabilities,
} from "@/lib/goals/permissions";
import { describeGoalEditLock } from "@/lib/goals/editWindow";
import { isGoalWindowOpenForPerson } from "@/lib/goals/goalExtensions";
import { useAuth } from "@/lib/auth";
import { hasSystemPermission } from "@/lib/accessControl/types";
import { avatarStyle } from "@/lib/employees/avatar";
import { getEmployee } from "@/lib/employees/store";
import type { OkrReferenceScope } from "@/lib/okr/reference";
import { setActiveCycle } from "@/lib/goals/store";
import { DEMO_PHASES } from "@/lib/goals/phases";
import { GoalActionsMenu, hasGoalActions } from "./goals/GoalActionsMenu";
import { GoalSendBackNotice } from "./goals/GoalSendBackNotice";
import { GoalSubmitBlockNotice } from "./goals/GoalSubmitBlockNotice";
import { GoalCountNotice } from "./goals/GoalCountNotice";
import { GoalEditLockNotice } from "./goals/GoalEditLockNotice";
import { GoalLateApprovalNotice } from "./goals/GoalLateApprovalNotice";
import { GoalSubmitAllButton } from "./goals/GoalSubmitAllButton";
import { GoalEmptyActions } from "./goals/GoalEmptyActions";
import { useGoalDraftAutosave } from "./goals/useGoalDraftAutosave";
import { useGoalDraftState } from "./goals/useGoalDraftState";
import { useGoalEditGuard } from "./goals/useGoalEditGuard";
import { GoalCreateDrawer } from "./goals/GoalCreateDrawer";
import {
  GoalOkrReferenceSheet,
  OKR_REFERENCE_SHEET_LABEL,
  OKR_REFERENCE_TAB_LABEL,
} from "./goals/GoalOkrReferenceSheet";
import { GoalCreateForm } from "./goals/GoalCreateForm";
import { GoalDetailView } from "./goals/GoalDetailView";
import { GoalMetricTip, weightInputDisplayValue, parseWeightInputValue } from "./goals/GoalMeasurementReadout";
import type { CascadeTarget } from "./goals/GoalCascadeTargetDialog";
import { ReportGoalsCard } from "./goals/ReportGoalsCard";
import { GoalsCycleSelect } from "./goals/GoalsCycleSelect";
import {
  useGoalsController,
  subjectIsEligible,
} from "./goals/useGoalsController";
import {
  goalsV2DetailPath,
  goalsV2GoalPath,
} from "./goals-v2/paths";
import {
  goalTitle,
  goalSectionLabels,
  goalsDetailPath,
  goalsGoalPath,
  GOAL_PROGRESS_STATUS_OPTIONS,
  metricSummary,
  metricTipDetails,
  canViewPersonGoals,
  progressStatusClass,
  trackLabel,
  trackToneClass,
  type GoalsDirectoryScope,
} from "./goals/goalHelpers";
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
import { statusLabel, submissionStatusLabel } from "./goals/statusLabels";
import { cyclesListPath } from "@/lib/reviews/paths";
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

type ManagerTab = "mine" | "team";

const OVERVIEW_SCOPES: { id: GoalsDirectoryScope; label: string }[] = [
  { id: "mine", label: "My Goals" },
  { id: "reports", label: "My Reports" },
  { id: "all", label: "Everyone" },
];

const GOALS_COLUMNS: ResizableColumn[] = [
  { id: "owner", label: "Owner" },
  { id: "goals", label: "Goals", minWidth: 180 },
  { id: "weight", label: "Weight" },
  { id: "progress", label: "Progress" },
  { id: "metric", label: "Metric" },
  { id: "status", label: "Status" },
  { id: "approval", label: "Approval" },
];

export default function GoalsPage() {
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
  onClose,
  onGoalChange,
}: {
  cycleId: string;
  personId: string;
  goalId: string;
  onClose: () => void;
  onGoalChange: (nextGoalId: string) => void;
}) {
  const {
    snapshot,
    actor,
    subject,
    subjectGoals,
    capabilities,
    cascadeFrom,
    cascadeRecipientsFor,
    resolveOwner,
    actions,
  } = useGoalsController({ cycleId, subjectId: personId });

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
      <div className="pd-goals-review">
        <GoalDetailView
          goal={selectedGoal}
          index={selectedIndex}
          total={goals.length}
          owner={owner}
          cycleId={snapshot.cycle.id}
          subjectId={personId}
          fullViewHref={goalsV2GoalPath(cycleId, personId, goalId)}
          cascadeFrom={cascadeFrom}
          cascadedTo={cascadeRecipientsFor(selectedGoal.id)}
          cascadeHref={(pid, gid) =>
            goalsV2GoalPath(snapshot.cycle.id, pid, gid)
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
          cascadeTargets={[]}
          onChange={saveProgressGoal}
          onSave={saveGoal}
          onDuplicate={
            canDuplicate
              ? () => {
                void actions.duplicateGoal(personId, selectedGoal.id).then((copy) => {
                  if (copy) onGoalChange(copy.id);
                });
              }
              : undefined
          }
          onCascade={
            canCascade
              ? (reportIds) => {
                void actions.cascadeGoal(personId, selectedGoal.id, reportIds);
              }
              : undefined
          }
          onRemove={
            canEditDraft
              ? () => {
                void actions.saveGoals(
                  personId,
                  goals.filter((goal) => goal.id !== selectedGoal.id),
                );
                onClose();
              }
              : undefined
          }
          onSelectIndex={(nextIndex) => {
            const next = goals[nextIndex];
            if (next) onGoalChange(next.id);
          }}
        />
      </div>
    </GoalCreateDrawer>
  );
}

function GoalsOverview() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [snapshot, setSnapshot] = useState<GoalsSnapshot | null>(null);
  const [query, setQuery] = useState("");
  const [scope, setScope] = useState<GoalsDirectoryScope>("mine");
  const [statusFilter, setStatusFilter] = useState<GoalsListFilter | null>(null);
  const [panelSelection, setPanelSelection] =
    useState<OverviewPanelSelection | null>(null);
  const [hoveredPersonId, setHoveredPersonId] = useState<string | null>(null);

  function toggleStatusFilter(next: GoalsListFilter) {
    setStatusFilter((current) => (current === next ? null : next));
  }

  useEffect(() => {
    let isMounted = true;
    void fetchGoalsSnapshot().then((next) => {
      if (isMounted) setSnapshot(next);
    });
    const unsubscribe = watchGoalsSnapshot(() => {
      void fetchGoalsSnapshot().then((next) => {
        if (isMounted) setSnapshot(next);
      });
    });
    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

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
  const scopedPeople = useMemo(
    () => (snapshot ? peopleInScope(snapshot, viewer, scope) : []),
    [scope, snapshot, viewer],
  );
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
    if (!snapshot || !viewer) return false;
    const row = snapshot.byPerson[viewer.id];
    if (!row) return false;
    return deriveGoalCapabilities({
      actor: viewer,
      subject: viewer,
      row,
      cycle: snapshot.cycle,
      cycleStatus: snapshot.cycleStatus,
    }).canCreate;
  }, [snapshot, viewer]);

  const emptyList = useMemo(
    () =>
      describeEmptyGoalsList({
        scope,
        peopleInScope: scopedPeople.length,
        waitingPeople: snapshot
          ? peopleWithoutGoals(snapshot, scopedPeople, statusFilter).length
          : 0,
        hasQuery: query.trim().length > 0,
        statusFilter,
        canAddOwnGoals,
      }),
    [canAddOwnGoals, query, scope, scopedPeople, snapshot, statusFilter],
  );

  if (!snapshot) {
    return (
      <div className="pd-page pd-goals" aria-busy="true" aria-label="Goals" />
    );
  }

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
              options={OVERVIEW_SCOPES}
              value={scope}
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
          <button
            type="button"
            className="pd-people__icon-btn"
            aria-label="More actions"
            title="More actions"
          >
            <MoreHorizontal size={18} strokeWidth={1.75} aria-hidden />
          </button>
          <button type="button" className="pd-people__ghost-btn">
            <Columns3 size={16} strokeWidth={1.75} aria-hidden />
            Column Settings
          </button>
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
        {filtered.length === 0 ? (
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
                        goalsV2DetailPath(snapshot.cycle.id, me.id),
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
                  const track = trackLabel(
                    row.status,
                    row.completion,
                    row.progressStatus,
                  );
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
                          </div>
                        </td>
                      ) : null}
                      <td data-col="goals">
                        <span
                          className="pd-goals-overview__goal"
                          title={row.title}
                        >
                          <span
                            className="pd-goals-overview__goal-dot"
                            aria-hidden
                          />
                          <span className="pd-goals-overview__goal-text">
                            {row.title}
                          </span>
                        </span>
                      </td>
                      <td data-col="weight">
                        <span className="pd-goals-overview__weight">
                          {row.weight}%
                        </span>
                      </td>
                      <td data-col="progress">
                        <div className="pd-goals-overview__progress">
                          <span className="pd-goals-overview__progress-label">
                            {row.completion}%
                          </span>
                          <Progress value={row.completion} />
                        </div>
                      </td>
                      <td data-col="metric" className="pd-goals-overview__muted">{row.metric}</td>
                      <td data-col="status">
                        <span
                          className={`pd-goals-overview__track ${trackToneClass(track.tone)}`}
                        >
                          {track.label}
                        </span>
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
            setPanelSelection((current) =>
              current ? { ...current, goalId: nextGoalId } : current,
            )
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
  const [managerTab, setManagerTab] = useState<ManagerTab>("mine");
  const [embeddedGoalId, setEmbeddedGoalId] = useState<string | null>(null);

  useEffect(() => {
    if (!goalId || !activeGoals?.goals.some((goal) => goal.id === goalId))
      return;
    setManagerTab("mine");
  }, [goalId, activeGoals]);

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
          navigate(goalsDetailPath(nextCycleId, personId));
        }}
      />
    </div>
  );

  if (snapshot.availableCycles.length === 0) {
    return (
      <div className="pd-page pd-goals" aria-label="Goals">
        <PageHeader
          title="Goals"
          description="Select a performance cycle to set goals under it."
        />
        <EmptyState
          icon={Target}
          title="No goal cycles yet"
          description={
            canManageCycles
              ? "Add a performance cycle, then come back to set goals."
              : "Ask an administrator to add a performance cycle before setting goals."
          }
          action={
            canManageCycles ? (
              <Link
                to={cyclesListPath()}
                className="pd-people__create-btn"
              >
                <Plus size={18} strokeWidth={2} aria-hidden />
                Add Performance Cycle
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

  const eligible = subjectIsEligible(active, snapshot);
  const weightTotal = sumGoalWeights(activeGoals.goals);
  const completion = Math.round(overallCompletion(activeGoals.goals));
  const canEditDraft = Boolean(capabilities?.canEditStructure);
  const pendingCount = reports.filter(
    (r) => r.row.status === "submitted",
  ).length;

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
    navigate(goalsDetailPath(nextCycleId, personId));
  };

  const managerTabs = (
    <SegmentedControl
      className="pd-people__scope pd-goals__tabs"
      buttonClassName="pd-people__scope-btn"
      options={[
        { id: "mine", label: sectionLabels.goals },
        {
          id: "team",
          label: (
            <>
              {sectionLabels.reports}
              {pendingCount > 0 ? (
                <span
                  className="pd-segmented__badge"
                  aria-label={`${pendingCount} awaiting review`}
                >
                  {pendingCount}
                </span>
              ) : null}
            </>
          ),
        },
      ]}
      value={managerTab}
      onChange={(tab) => {
        setManagerTab(tab);
        if (embedded) {
          setEmbeddedGoalId(null);
        } else if (goalId) {
          navigate(goalsDetailPath(snapshot.cycle.id, personId));
        }
      }}
      aria-label="Goal sections"
    />
  );

  const openGoal = (nextGoalId: string | null) => {
    if (embedded) {
      setEmbeddedGoalId(nextGoalId);
      return;
    }
    if (nextGoalId) {
      navigate(goalsGoalPath(snapshot.cycle.id, personId, nextGoalId));
      return;
    }
    navigate(goalsDetailPath(snapshot.cycle.id, personId));
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
      personId={active.id}
      cycleId={snapshot.cycle.id}
      cycleLabel={snapshot.cycle.label}
      goalCountPolicy={snapshot.cycle.goalCountPolicy}
      allowLateSubmissions={
        snapshot.cycle.phase === "hard_lock" &&
        !isGoalWindowOpenForPerson(snapshot.cycle, active) &&
        snapshot.cycle.postWindowGoalPolicy === "two_tier_approval"
      }
      editLock={describeGoalEditLock({
        cycle: snapshot.cycle,
        cycleStatus: snapshot.cycleStatus,
        canUpdateProgress: Boolean(capabilities?.canUpdateProgress),
        status: activeGoals.status,
        postWindowApprovalStage: activeGoals.postWindowApprovalStage,
        subject: active,
      })}
      isCurrentCycle={isCurrentCycle}
      row={activeGoals}
      eligible={eligible}
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
      ownerOptions={ownerOptions}
      cascadeFrom={cascadeFrom}
      cascadeRecipientsFor={cascadeRecipientsFor}
      cascadeHref={(pid, gid) => goalsV2GoalPath(snapshot.cycle.id, pid, gid)}
      resolveOwner={(goal) =>
        resolveOwner(goal, active.id) ?? {
          id: active.id,
          name: active.name,
          avatarUrl: active.avatarUrl,
        }
      }
      onOpenGoal={openGoal}
      onPersistGoals={(goals) => actions.saveGoals(active.id, goals)}
      onPersistProgress={(goals) => {
        void actions.saveProgress(active.id, goals);
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
              {submissionStatusLabel(
                activeGoals.status,
                activeGoals.goals.length,
              )}
            </span>
          </div>
          <div className="pd-people__summary-card">
            <span className="pd-people__summary-label">Goals</span>
            <span className="pd-people__summary-value">
              {activeGoals.goals.length}
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
      </header>

      {error ? <Notice tone="danger">{error}</Notice> : null}

      {myGoalsPanel}

      {showsReports || showsSubjectReview ? (
        <ManagerPanel
          snapshot={snapshot}
          reports={managerPanelReports}
          cascadeFromFor={cascadeFromFor}
          cascadeRecipientsFor={cascadeRecipientsFor}
          commentAuthorName={actor?.name ?? ""}
          commentAuthorId={actor?.id}
          capabilitiesFor={capabilitiesFor}
          resolveOwner={resolveOwner}
          sendBackReason={sendBackReason}
          onSendBackReason={setSendBackReason}
          busy={busy}
          onSaveGoals={(id, goals) => void actions.saveGoals(id, goals)}
          onSaveProgress={(id, goals) => void actions.saveProgress(id, goals)}
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

function ManagerPanel({
  snapshot,
  reports,
  cascadeFromFor,
  cascadeRecipientsFor,
  commentAuthorName,
  commentAuthorId,
  capabilitiesFor,
  resolveOwner,
  sendBackReason,
  onSendBackReason,
  busy,
  onApprove,
  onSendBack,
  onSaveGoals,
  onSaveProgress,
  openedGoalId,
  onOpenedGoalChange,
}: {
  snapshot: GoalsSnapshot;
  reports: { person: GoalsSnapshot["people"][number]; row: PersonGoals }[];
  cascadeFromFor: (subjectId: string) => LineManagerCascade;
  cascadeRecipientsFor: (goalId: string) => CascadeRecipient[];
  commentAuthorName: string;
  commentAuthorId?: string;
  capabilitiesFor: (subjectId: string) => GoalCapabilities | null;
  resolveOwner: (
    goal: Goal,
    subjectId: string,
  ) => { id: string; name: string; title?: string; avatarUrl?: string } | null;
  sendBackReason: string;
  onSendBackReason: (v: string) => void;
  busy: boolean;
  onApprove: (id: string) => void;
  onSendBack: (id: string) => void;
  onSaveGoals: (id: string, goals: Goal[]) => void;
  onSaveProgress: (id: string, goals: Goal[]) => void;
  openedGoalId?: string | null;
  onOpenedGoalChange?: (goalId: string | null) => void;
}) {
  const orderedReports = reports;

  const [localOpenGoalId, setLocalOpenGoalId] = useState<string | null>(null);
  const openGoalId =
    openedGoalId !== undefined ? openedGoalId : localOpenGoalId;
  const setOpenGoalId = (next: string | null) => {
    if (onOpenedGoalChange) onOpenedGoalChange(next);
    else setLocalOpenGoalId(next);
  };
  const [sendBackFor, setSendBackFor] = useState<string | null>(null);

  if (reports.length === 0) {
    return (
      <EmptyState
        icon={Users}
        title="No direct reports"
        description="People who report to you will show up here with their goals."
      />
    );
  }

  const active =
    reports.find((r) => r.row.goals.some((goal) => goal.id === openGoalId)) ??
    null;
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
              <GoalsTable
                label={`${person.name} goals`}
                cycleId={snapshot.cycle.id}
                subjectId={person.id}
                rows={row.goals.map((goal, index) => ({
                  goal,
                  status: row.status,
                  postWindowApprovalStage: row.postWindowApprovalStage,
                  title: goalTitle(goal, index),
                }))}
                onOpen={setOpenGoalId}
                canEditStatus={Boolean(reportCaps?.canUpdateProgress)}
                canRemove={Boolean(reportCaps?.canEditStructure)}
                onRemove={
                  reportCaps?.canEditStructure
                    ? (goalId) => {
                      onSaveGoals(
                        person.id,
                        row.goals.filter((goal) => goal.id !== goalId),
                      );
                      if (openGoalId === goalId) setOpenGoalId(null);
                    }
                    : undefined
                }
                onStatusChange={
                  reportCaps?.canUpdateProgress
                    ? (goalId, progressStatus) => {
                      onSaveProgress(
                        person.id,
                        row.goals.map((goal) =>
                          goal.id === goalId
                            ? { ...goal, progressStatus }
                            : goal,
                        ),
                      );
                    }
                    : undefined
                }
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

  const caps = capabilitiesFor(active.person.id);
  const canEditReport = Boolean(caps?.canEditStructure);
  const canUpdateProgress = Boolean(caps?.canUpdateProgress);
  const owner = resolveOwner(selectedGoal, active.person.id) ?? {
    id: active.person.id,
    name: active.person.name,
    title: active.person.title,
    avatarUrl: active.person.avatarUrl,
  };

  const saveGoal = (next: Goal) => {
    onSaveGoals(
      active.person.id,
      goals.map((goal) => (goal.id === next.id ? next : goal)),
    );
  };

  const saveProgressGoal = (next: Goal) => {
    onSaveProgress(
      active.person.id,
      goals.map((goal) => (goal.id === next.id ? next : goal)),
    );
  };

  const closeDrawer = () => {
    setOpenGoalId(null);
  };

  return (
    <>
      {table}
      <GoalCreateDrawer
        label={`View ${goalTitle(selectedGoal, selectedIndex)}`}
        closeLabel="Close goal"
        sideSheet={okrSideSheetFor(active.person.id)}
        onClose={closeDrawer}
      >
        <div className="pd-goals-review">
          <GoalDetailView
            goal={selectedGoal}
            index={selectedIndex}
            total={goals.length}
            owner={owner}
            cycleId={snapshot.cycle.id}
            subjectId={active.person.id}
            fullViewHref={goalsV2GoalPath(
              snapshot.cycle.id,
              active.person.id,
              selectedGoal.id,
            )}
            cascadeFrom={cascadeFromFor(active.person.id)}
            cascadedTo={cascadeRecipientsFor(selectedGoal.id)}
            cascadeHref={(pid, gid) =>
              goalsV2GoalPath(snapshot.cycle.id, pid, gid)
            }
            cycleLabel={snapshot.cycle.label}
            isCurrentCycle={snapshot.cycleStatus === "current"}
            status={active.row.status}
            postWindowApprovalStage={active.row.postWindowApprovalStage}
            sendBackReason={active.row.sendBackReason}
            sendBackBy={active.row.sendBackBy}
            approvedBy={active.row.approvedBy}
            commentAuthorName={commentAuthorName}
            commentAuthorId={commentAuthorId}
            commentAuthors={snapshot.people}
            canEdit={canEditReport}
            canUpdateProgress={canUpdateProgress}
            canRemove={canEditReport}
            onChange={saveProgressGoal}
            onSave={saveGoal}
            onRemove={
              canEditReport
                ? () => {
                  onSaveGoals(
                    active.person.id,
                    goals.filter((goal) => goal.id !== selectedGoal.id),
                  );
                  closeDrawer();
                }
                : undefined
            }
            onSelectIndex={(nextIndex) => {
              const next = goals[nextIndex];
              if (next) setOpenGoalId(next.id);
            }}
          />

        </div>
      </GoalCreateDrawer>
    </>
  );
}

function EmployeePanel({
  personName,
  personId,
  cycleId,
  cycleLabel,
  goalCountPolicy,
  allowLateSubmissions,
  editLock,
  isCurrentCycle,
  row,
  eligible,
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
  toolbarStart,
  toolbarOnly = false,
  ownerOptions,
  cascadeFrom,
  cascadeRecipientsFor,
  cascadeHref,
  resolveOwner,
  onOpenGoal,
  onPersistGoals,
  onPersistProgress,
  previousCycleLabel,
  onCopyPreviousGoals,
  onDuplicateGoal,
  onCascadeGoal,
  onSubmit,
}: {
  personName: string;
  personId: string;
  cycleId: string;
  cycleLabel: string;
  goalCountPolicy: GoalsSnapshot["cycle"]["goalCountPolicy"];
  allowLateSubmissions: boolean;
  /** Explains why goal editing is unavailable in this cycle. */
  editLock: string | null;
  isCurrentCycle: boolean;
  row: PersonGoals;
  eligible: boolean;
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
  onOpenGoal: (goalId: string | null) => void;
  onPersistGoals: (goals: Goal[]) => void;
  /** Progress-only updates never send goals back for approval. */
  onPersistProgress: (goals: Goal[]) => void;
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

  const autosaveEnabled =
    canEditDraft && (row.status === "draft" || row.status === "sent_back");
  const saveState = useGoalDraftAutosave({
    enabled: autosaveEnabled,
    goals,
    persistedGoals: row.goals,
    onSave: onPersistGoals,
  });

  const submitCheck = canSubmitGoals(goals, goalCountPolicy);
  const creatingGoalId = [...creatingIds][0] ?? null;
  const selectedGoalId = openGoalId ?? creatingGoalId;
  const selectedIndex = selectedGoalId
    ? goals.findIndex((goal) => goal.id === selectedGoalId)
    : -1;
  const selectedGoal = selectedIndex >= 0 ? goals[selectedIndex] : null;

  const setLocal = (next: Goal[]) => setGoals(next);
  const setAndPersist = (next: Goal[]) => {
    setGoals(next);
    onPersistGoals(next);
  };

  const addGoal = () => {
    const next = blankGoal({ ownerId: personId });
    startCreating(next.id);
    setLocal([...goals, next]);
  };

  const copyPreviousGoals = async () => {
    const firstCopiedGoal = await onCopyPreviousGoals();
    if (firstCopiedGoal) onOpenGoal(firstCopiedGoal.id);
  };

  const ownerFor = (goal: Goal) => resolveOwner(goal);

  if (toolbarOnly && !toolbarStart) return null;

  if (!toolbarOnly && (!eligible || row.status === "not_eligible")) {
    return (
      <>
        {toolbarStart ? (
          <div className="pd-goals-toolbar">{toolbarStart}</div>
        ) : null}
        <EmptyState
          icon={Target}
          title="Not eligible this quarter"
          description={`${personName} joined after Day 1, so goal setting starts next quarter.`}
        />
      </>
    );
  }

  if (!toolbarOnly && row.status === "incomplete") {
    return (
      <>
        {toolbarStart ? (
          <div className="pd-goals-toolbar">{toolbarStart}</div>
        ) : null}
        <Notice tone="danger">
          No submission by Day 30 — flagged incomplete. Quarter score is 0.
        </Notice>
      </>
    );
  }

  let goalDrawer: ReactNode = null;

  if (!toolbarOnly && selectedGoal) {
    const isNew = creatingIds.has(selectedGoal.id);

    const closeGoal = () => {
      stopCreating(selectedGoal.id);
      onOpenGoal(null);
    };

    const replaceGoal = (next: Goal, persist: boolean) => {
      const updated = goals.map((g) => (g.id === selectedGoal.id ? next : g));
      if (persist) setAndPersist(updated);
      else setLocal(updated);
    };

    const discardNewGoal = () => {
      const remainingGoals = goals.filter(
        (goal) => goal.id !== selectedGoal.id,
      );
      setAndPersist(remainingGoals);
      stopCreating(selectedGoal.id);
      onOpenGoal(null);
    };

    const closeNewGoal = () => {
      onPersistGoals(goals);
      closeGoal();
    };

    if (isNew) {
      goalDrawer = (
        <GoalCreateDrawer
          closeLabel="Close goal and keep draft"
          sideSheet={okrSideSheetFor(personId)}
          onClose={closeNewGoal}
        >
          <GoalCreateForm
            goal={selectedGoal}
            index={0}
            total={1}
            isNew
            defaultOwnerId={personId}
            ownerOptions={ownerOptions}
            cascadeFrom={cascadeFrom}
            cascadedTo={cascadeRecipientsFor(selectedGoal.id)}
            cascadeHref={cascadeHref}
            cycleLabel={cycleLabel}
            isCurrentCycle={isCurrentCycle}
            status={row.status}
            saveState={autosaveEnabled ? saveState : undefined}
            onBack={discardNewGoal}
            onSave={() => {
              onPersistGoals(goals);
              stopCreating(selectedGoal.id);
            }}
            onSelectIndex={() => undefined}
            onChange={(next) => replaceGoal(next, false)}
            onRemove={canEditDraft ? discardNewGoal : undefined}
          />
        </GoalCreateDrawer>
      );
    } else {
      goalDrawer = (
        <GoalCreateDrawer
          label={`View ${goalTitle(selectedGoal, selectedIndex)}`}
          closeLabel="Close goal"
          sideSheet={okrSideSheetFor(personId)}
          onClose={closeGoal}
        >
          {editLock && !canEditDraft ? (
            <GoalEditLockNotice message={editLock} />
          ) : null}
          <GoalDetailView
            goal={selectedGoal}
            index={selectedIndex}
            total={goals.length}
            owner={ownerFor(selectedGoal)}
            cycleId={cycleId}
            subjectId={personId}
            fullViewHref={goalsV2GoalPath(cycleId, personId, selectedGoal.id)}
            cascadeFrom={cascadeFrom}
            cascadedTo={cascadeRecipientsFor(selectedGoal.id)}
            cascadeHref={cascadeHref}
            cycleLabel={cycleLabel}
            isCurrentCycle={isCurrentCycle}
            status={row.status}
            postWindowApprovalStage={row.postWindowApprovalStage}
            sendBackReason={row.sendBackReason}
            sendBackBy={row.sendBackBy}
            approvedBy={row.approvedBy}
            commentAuthorName={commentAuthorName}
            commentAuthorId={commentAuthorId}
            commentAuthors={ownerOptions}
            canEdit={canEditDraft}
            canUpdateProgress={canUpdateProgress}
            canRemove={canEditDraft}
            canCascade={canCascade}
            cascadeTargets={cascadeTargets}
            onRequestEdit={requestGoalEdit}
            saveState={autosaveEnabled ? saveState : undefined}
            onDuplicate={
              canDuplicate
                ? () => {
                  requestGoalEdit(() => {
                    void onDuplicateGoal(selectedGoal.id).then((copy) => {
                      if (copy) onOpenGoal(copy.id);
                    });
                  });
                }
                : undefined
            }
            onCascade={
              canCascade
                ? (reportIds) => {
                  requestGoalEdit(() => {
                    void onCascadeGoal(selectedGoal.id, reportIds);
                  });
                }
                : undefined
            }
            onSelectIndex={(nextIndex) => {
              const next = goals[nextIndex];
              if (next) onOpenGoal(next.id);
            }}
            onChange={(next) => {
              const updated = goals.map((goal) =>
                goal.id === selectedGoal.id ? next : goal,
              );
              setGoals(updated);
              onPersistProgress(updated);
            }}
            onSave={(next) => {
              const updated = goals.map((goal) =>
                goal.id === selectedGoal.id ? next : goal,
              );
              setAndPersist(updated);
            }}
            onRemove={
              canEditDraft
                ? () => {
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
  }

  const showsGoals = !toolbarOnly;

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
      {toolbarStart || (showsGoals && canEditDraft && goals.length > 0) ? (
        <div className="pd-goals-toolbar">
          {toolbarStart}
          {showsGoals && canEditDraft && goals.length > 0 ? (
            <div
              className="pd-people__toolbar"
              role="toolbar"
              aria-label="Goal actions"
            >
              {canSubmit &&
                (row.status === "draft" || row.status === "sent_back") ? (
                <GoalSubmitAllButton
                  status={row.status}
                  busy={busy}
                  reasons={submitCheck.reasons}
                  warning={submitCheck.warning}
                  onSubmit={() => onSubmit(goals)}
                />
              ) : null}
              <button
                type="button"
                className="pd-people__create-btn"
                disabled={busy}
                onClick={() => requestGoalEdit(addGoal)}
              >
                <Plus size={18} strokeWidth={2} aria-hidden />
                Add Goal
              </button>
            </div>
          ) : null}
        </div>
      ) : null}

      {showsGoals ? (
        <>
          {row.status === "submitted" && row.postWindowApprovalStage ? (
            <GoalLateApprovalNotice
              stage={row.postWindowApprovalStage}
              manager={
                cascadeFrom.managerName
                  ? {
                    id: cascadeFrom.managerId,
                    name: cascadeFrom.managerName,
                    avatarUrl: cascadeFrom.managerAvatarUrl,
                  }
                  : null
              }
              skipLevelManager={
                cascadeFrom.skipLevelManagerName
                  ? {
                    id: cascadeFrom.skipLevelManagerId,
                    name: cascadeFrom.skipLevelManagerName,
                    avatarUrl: cascadeFrom.skipLevelManagerAvatarUrl,
                  }
                  : null
              }
            />
          ) : null}
          {row.status === "sent_back" && row.sendBackReason ? (
            <GoalSendBackNotice
              reason={row.sendBackReason}
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
          {canSubmit &&
            (row.status === "draft" || row.status === "sent_back") &&
            !submitCheck.ok ? (
            <GoalSubmitBlockNotice
              blockers={submitCheck.blockers}
              onOpenGoal={onOpenGoal}
            />
          ) : null}
          {canEditDraft &&
            (row.status === "draft" || row.status === "sent_back") &&
            goals.length > 0 &&
            submitCheck.warning ? (
            <GoalCountNotice message={submitCheck.warning} />
          ) : null}
          {editLock && !canEditDraft ? (
            <GoalEditLockNotice message={editLock} />
          ) : null}

        </>
      ) : null}

      {!showsGoals ? null : goals.length === 0 ? (
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
                onAdd={() => requestGoalEdit(addGoal)}
                onCopyPrevious={() => void copyPreviousGoals()}
              />
            ) : undefined
          }
        />
      ) : (
        <GoalsTable
          rows={goals.map((goal, index) => ({
            goal,
            status: row.status,
            postWindowApprovalStage: row.postWindowApprovalStage,
            title: goalTitle(goal, index),
          }))}
          cycleId={cycleId}
          subjectId={personId}
          onOpen={(id) => onOpenGoal(id)}
          canEditWeight={canEditDraft}
          canEditStatus={canUpdateProgress}
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
              setAndPersist(
                goals.map((goal) =>
                  goal.id === goalId ? { ...goal, weight } : goal,
                ),
              );
            });
          }}
          onStatusChange={(goalId, progressStatus) => {
            const updated = goals.map((goal) =>
              goal.id === goalId ? { ...goal, progressStatus } : goal,
            );
            setGoals(updated);
            onPersistProgress(updated);
          }}
        />
      )}
      {goalDrawer}
    </div>
  );
}

const PROGRESS_STATUS_OPTIONS = GOAL_PROGRESS_STATUS_OPTIONS.map((option) => ({
  value: option.id,
  label: option.label,
  className: progressStatusClass(option.id),
}));

type GoalsTableRow = {
  goal: Goal;
  status: PersonGoals["status"];
  postWindowApprovalStage?: PersonGoals["postWindowApprovalStage"];
  title: string;
  /** Set only when the table spans several people, e.g. a manager's reports. */
  owner?: { id: string; name: string; avatarUrl?: string };
};

function GoalsTable({
  rows,
  onOpen,
  label = "All goals",
  cycleId,
  subjectId,
  canEditWeight = false,
  canEditStatus = false,
  canCascade = false,
  canRemove = false,
  cascadeTargets = [],
  onDuplicate,
  onCascade,
  onRemove,
  onWeightChange,
  onStatusChange,
}: {
  rows: GoalsTableRow[];
  onOpen: (id: string) => void;
  label?: string;
  cycleId?: string;
  subjectId?: string;
  canEditWeight?: boolean;
  canEditStatus?: boolean;
  canCascade?: boolean;
  canRemove?: boolean;
  cascadeTargets?: CascadeTarget[];
  onDuplicate?: (goalId: string) => void;
  onCascade?: (goalId: string, reportIds: string[]) => void;
  onRemove?: (goalId: string) => void;
  onWeightChange?: (goalId: string, weight: number) => void;
  onStatusChange?: (
    goalId: string,
    progressStatus: GoalProgressStatus | undefined,
  ) => void;
}) {
  const showOwner = rows.some((row) => row.owner);
  const showActions = hasGoalActions({
    onDuplicate,
    onCascade,
    onRemove,
    canRemove,
    onViewActivity: Boolean(cycleId),
  });
  return (
    <div
      className={`pd-goals-table${showOwner ? " pd-goals-table--with-owner" : ""}${showActions ? " pd-goals-table--with-actions" : ""
        }`}
      role="table"
      aria-label={label}
    >
      <div className="pd-goals-table__head" role="row">
        {showOwner ? <div role="columnheader">Owner</div> : null}
        <div role="columnheader">Goals</div>
        <div role="columnheader">Weight</div>
        <div role="columnheader">Progress</div>
        <div role="columnheader">Metric</div>
        <div role="columnheader">Progress Status</div>
        <div role="columnheader">Approval</div>
        {showActions ? (
          <div role="columnheader">
            <span className="pd-sr-only">Actions</span>
          </div>
        ) : null}
      </div>
      {rows.map(({ goal, status, postWindowApprovalStage, title, owner }) => {
        const completion = Math.round(goalCompletion(goal));
        const track = trackLabel(status, completion, goal.progressStatus);
        const metricTip = metricTipDetails(goal);
        const metricLabel = metricSummary(goal);
        const openGoal = () => onOpen(goal.id);
        return (
          <div
            key={goal.id}
            className="pd-goals-table__row"
            role="row"
            tabIndex={0}
            onClick={openGoal}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                openGoal();
              }
            }}
          >
            {owner ? (
              <div className="pd-goals-table__owner" role="cell">
                <Avatar
                  name={owner.name}
                  src={owner.avatarUrl || undefined}
                  size="sm"
                />
                <span className="pd-goals-table__owner-name">{owner.name}</span>
              </div>
            ) : null}
            <div className="pd-goals-table__goal" role="cell">
              <span className="pd-goals-table__title">{title}</span>
            </div>
            <div className="pd-goals-table__weight" role="cell">
              {canEditWeight && onWeightChange ? (
                <div
                  className="pd-goals-table__weight-edit"
                  onClick={(event) => event.stopPropagation()}
                  onKeyDown={(event) => event.stopPropagation()}
                >
                  <input
                    type="text"
                    inputMode="numeric"
                    className="pd-goals-table__weight-input"
                    value={weightInputDisplayValue(goal.weight)}
                    aria-label={`Weight for ${title}`}
                    onChange={(event) => {
                      onWeightChange(goal.id, parseWeightInputValue(event.target.value));
                    }}
                  />
                  <span className="pd-goals-table__weight-suffix" aria-hidden>
                    %
                  </span>
                </div>
              ) : (
                <span className="pd-goals-table__weight-pill">
                  {goal.weight ? `${goal.weight}%` : ''}
                </span>
              )}
            </div>
            <div className="pd-goals-table__progress" role="cell">
              <span className="pd-goals-table__progress-label">
                {completion}%
              </span>
              <Progress value={completion} />
            </div>
            <div className="pd-goals-table__metric" role="cell">
              {metricTip ? (
                <Tooltip
                  side="left"
                  delayMs={80}
                  content={<GoalMetricTip tip={metricTip} track={track} />}
                >
                  <span className="pd-goals-table__metric-value">
                    {metricLabel}
                  </span>
                </Tooltip>
              ) : (
                metricLabel
              )}
            </div>
            <div className="pd-goals-table__status" role="cell">
              {canEditStatus && onStatusChange ? (
                <div
                  className={`pd-goals-table__status-edit ${progressStatusClass(
                    goal.progressStatus ?? "on_track",
                  )}`}
                  onClick={(event) => event.stopPropagation()}
                  onKeyDown={(event) => event.stopPropagation()}
                >
                  <ListboxSelect
                    className="pd-goals-table__status-listbox"
                    value={goal.progressStatus ?? "on_track"}
                    aria-label={`Progress status for ${title}`}
                    allowEmpty={false}
                    options={PROGRESS_STATUS_OPTIONS}
                    onValueChange={(next) => {
                      onStatusChange(goal.id, next as GoalProgressStatus);
                    }}
                  />
                </div>
              ) : (
                <span
                  className={`pd-goals-table__track ${trackToneClass(track.tone)}`}
                >
                  <span className="pd-goals-table__track-label">
                    {track.label}
                  </span>
                </span>
              )}
            </div>
            <div className="pd-goals-table__approval" role="cell">
              <GoalApprovalStatus
                status={status}
                postWindowApprovalStage={postWindowApprovalStage}
                checkClassName="pd-goals-table__check"
              />
            </div>
            {showActions ? (
              <div
                className="pd-goals-table__actions"
                role="cell"
                onClick={(event) => event.stopPropagation()}
                onKeyDown={(event) => event.stopPropagation()}
              >
                <GoalActionsMenu
                  label={`More actions for ${title}`}
                  canCascade={canCascade}
                  canRemove={canRemove}
                  cascadeTargets={cascadeTargets}
                  activityFilters={
                    cycleId
                      ? {
                        goalId: goal.id,
                        cycleId,
                        subjectEmployeeId: subjectId
                          ? Number(subjectId)
                          : owner?.id
                            ? Number(owner.id)
                            : undefined,
                      }
                      : undefined
                  }
                  onDuplicate={
                    onDuplicate ? () => onDuplicate(goal.id) : undefined
                  }
                  onCascade={
                    onCascade
                      ? (reportIds) => onCascade(goal.id, reportIds)
                      : undefined
                  }
                  onRemove={onRemove ? () => onRemove(goal.id) : undefined}
                />
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
