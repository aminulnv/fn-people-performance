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
import type {
  CascadeRecipient,
  GoalOwnerOption,
  LineManagerCascade,
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
import { isGoalWindowOpenForPerson } from "@/lib/goals/goalExtensions";
import { useAuth } from "@/lib/auth";
import { hasSystemPermission } from "@/lib/accessControl/types";
import { avatarStyle } from "@/lib/employees/avatar";
import { getEmployee } from "@/lib/employees/store";
import type { OkrReferenceScope } from "@/lib/okr/reference";
import { setActiveCycle } from "@/lib/goals/store";
import { useSharedGoalsSnapshot } from "@/lib/goals/useSharedGoalsSnapshot";
import { DEMO_PHASES } from "@/lib/goals/phases";
import { GoalProgressAge, GoalsTable, MetricsCountBadge } from "./goals/GoalsTable";
import { GoalSendBackNotice } from "./goals/GoalSendBackNotice";
import { GoalSubmitBlockNotice } from "./goals/GoalSubmitBlockNotice";
import { GoalCountNotice } from "./goals/GoalCountNotice";
import { GoalEditLockNotice } from "./goals/GoalEditLockNotice";
import { GoalLateApprovalNotice } from "./goals/GoalLateApprovalNotice";
import { GoalSubmitAllButton } from "./goals/GoalSubmitAllButton";
import { GoalEmptyActions } from "./goals/GoalEmptyActions";
import { GoalUnsavedCloseDialog } from "./goals/GoalUnsavedCloseDialog";
import { useGoalDraftState } from "./goals/useGoalDraftState";
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
import { GoalApprovalCard } from "./goals/GoalApprovalCard";
import { GoalApprovalStatus } from "./goals/GoalApprovalStatus";
import {
  cycleIneligibilityEmptyState,
  cycleIneligibilityStatusLabel,
  statusLabel,
  submissionStatusLabel,
} from "./goals/statusLabels";
import { cycleIneligibilityReason } from "@/lib/goals/demoData";
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
  { id: "owner", label: "Owner", minWidth: 220 },
  { id: "goals", label: "Goals", minWidth: 180 },
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

  const { requestGoalEdit, goalEditGuard } = useGoalEditGuard({
    personId,
    actorId: actor?.id,
    status: subjectGoals?.status ?? "draft",
    deadlinePassed: Boolean(
      snapshot &&
        subject &&
        snapshot.cycle.phase === "hard_lock" &&
        !isGoalWindowOpenForPerson(snapshot.cycle, subject) &&
        snapshot.cycle.postWindowGoalPolicy === "two_tier_approval",
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
      <div className="pd-goals-review">
        <GoalDetailView
          goal={selectedGoal}
          index={selectedIndex}
          owner={owner}
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

  const ineligibility = cycleIneligibilityReason(
    active,
    snapshot.cycle,
    activeGoals.status,
  );
  const weightTotal = ineligibility ? 0 : sumGoalWeights(activeGoals.goals);
  const completion = ineligibility
    ? 0
    : Math.round(overallCompletion(activeGoals.goals));
  const canEditDraft = Boolean(capabilities?.canEditStructure);
  const pendingCount = countPendingGoalApprovals(reports);
  const ownTodoCount = countOwnGoalTodos(activeGoals, snapshot.cycle, {
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

  const openGoal = (nextGoalId: string | null) => {
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
              {ineligibility
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
              {ineligibility ? 0 : activeGoals.goals.length}
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
          onAddComment={(id, goalId, text) => {
            void actions.addComment(id, goalId, text);
          }}
          onDuplicateGoal={(id, goalId) => actions.duplicateGoal(id, goalId)}
          onCascadeGoal={(id, goalId, reportIds) =>
            actions.cascadeGoal(id, goalId, reportIds)
          }
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
  onAddComment,
  onDuplicateGoal,
  onCascadeGoal,
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
  onAddComment?: (subjectId: string, goalId: string, text: string) => void;
  onDuplicateGoal?: (subjectId: string, goalId: string) => Promise<Goal | null>;
  onCascadeGoal?: (
    subjectId: string,
    goalId: string,
    reportIds: string[],
  ) => Promise<void>;
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
  const active =
    reports.find((r) => r.row.goals.some((goal) => goal.id === openGoalId)) ??
    null;
  const { requestGoalEdit, goalEditGuard } = useGoalEditGuard({
    personId: active?.person.id ?? "",
    actorId: commentAuthorId,
    status: active?.row.status ?? "draft",
    deadlinePassed:
      snapshot.cycle.phase === "hard_lock" &&
      active != null &&
      !isGoalWindowOpenForPerson(snapshot.cycle, active.person) &&
      snapshot.cycle.postWindowGoalPolicy === "two_tier_approval",
  });

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
              <GoalsTable
                label={`${person.name} goals`}
                cycleId={snapshot.cycle.id}
                subjectId={person.id}
                rows={row.goals.map((goal, index) => ({
                  goal,
                  title: goalTitle(goal, index),
                }))}
                onOpen={setOpenGoalId}
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
      {goalEditGuard}
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
            owner={owner}
            cycleId={snapshot.cycle.id}
            subjectId={active.person.id}
            fullViewHref={goalsGoalPath(
              snapshot.cycle.id,
              active.person.id,
              selectedGoal.id,
            )}
            cascadeFrom={cascadeFromFor(active.person.id)}
            cascadedTo={cascadeRecipientsFor(selectedGoal.id)}
            cascadeHref={(pid, gid) =>
              goalsGoalPath(snapshot.cycle.id, pid, gid)
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
            canCascade={Boolean(caps?.canCascade)}
            cascadeTargets={cascadeTargetsFor(
              active.person.reportIds,
              snapshot.people,
            )}
            onRequestEdit={requestGoalEdit}
            onChange={saveProgressGoal}
            onAddComment={
              onAddComment
                ? (text) => onAddComment(active.person.id, selectedGoal.id, text)
                : undefined
            }
            onSave={(next) => requestGoalEdit(() => saveGoal(next))}
            onDuplicate={
              caps?.canDuplicate && onDuplicateGoal
                ? () => {
                    requestGoalEdit(() => {
                      void onDuplicateGoal(
                        active.person.id,
                        selectedGoal.id,
                      ).then((copy) => {
                        if (copy) setOpenGoalId(copy.id);
                      });
                    });
                  }
                : undefined
            }
            onCascade={
              caps?.canCascade && onCascadeGoal
                ? (reportIds) => {
                    requestGoalEdit(() => {
                      void onCascadeGoal(
                        active.person.id,
                        selectedGoal.id,
                        reportIds,
                      );
                    });
                  }
                : undefined
            }
            onRemove={
              canEditReport
                ? () => {
                  requestGoalEdit(() => {
                    onSaveGoals(
                      active.person.id,
                      goals.filter((goal) => goal.id !== selectedGoal.id),
                    );
                    closeDrawer();
                  });
                }
                : undefined
            }
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
  personId: string;
  cycleId: string;
  cycleLabel: string;
  goalCountPolicy: GoalsSnapshot["cycle"]["goalCountPolicy"];
  allowLateSubmissions: boolean;
  /** Explains why goal editing is unavailable in this cycle. */
  editLock: string | null;
  isCurrentCycle: boolean;
  row: PersonGoals;
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
  onOpenGoal: (goalId: string | null) => void;
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

  const canManualSave =
    canEditDraft && (row.status === "draft" || row.status === "sent_back");
  const hasUnsavedChanges =
    canManualSave && hasPromptableUnsavedGoalDraft(goals, row.goals);
  const persistDraft = () => {
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

  if (!toolbarOnly && ineligibility) {
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
  const lateStage =
    showsGoals && row.status === "submitted"
      ? row.postWindowApprovalStage
      : undefined;
  const sendBackReason =
    showsGoals && row.status === "sent_back" ? row.sendBackReason : undefined;

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
      <GoalsToolbar
        start={toolbarStart}
        actions={
          showsGoals && canEditDraft && goals.length > 0 ? (
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
                onClick={() =>
                  requestGoalEdit(() => unsavedClose.requestLeave(addGoal))
                }
              >
                <Plus size={18} strokeWidth={2} aria-hidden />
                Add Goal
              </button>
            </div>
          ) : undefined
        }
      />

      {showsGoals ? (
        <div className="pd-goals__notices">
          {!lateStage &&
          !sendBackReason &&
          row.status !== "draft" &&
          row.status !== "incomplete" &&
          row.status !== "not_eligible" ? (
            <GoalApprovalCard
              status={row.status}
              postWindowApprovalStage={row.postWindowApprovalStage}
              sendBackReason={row.sendBackReason}
              sendBackBy={row.sendBackBy}
              approvedBy={row.approvedBy}
              cascadeFrom={cascadeFrom}
            />
          ) : null}
          {lateStage ? (
            <GoalLateApprovalNotice
              stage={lateStage}
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
            submitCheck.ok &&
            submitCheck.warning ? (
            <GoalCountNotice message={submitCheck.warning} />
          ) : null}
          {editLock && !canEditDraft ? (
            <GoalEditLockNotice message={editLock} />
          ) : null}
          {row.status === "incomplete" ? (
            <Notice tone="danger">
              No submission by Day 30 — flagged incomplete. Quarter score is 0.
            </Notice>
          ) : null}
        </div>
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
          cycleId={cycleId}
          subjectId={personId}
          onOpen={(id) => unsavedClose.requestLeave(() => onOpenGoal(id))}
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
              const updated = goals.map((goal) =>
                goal.id === goalId ? { ...goal, weight } : goal,
              );
              setGoals(updated);
              if (canManualSave) {
                void onPersistGoals(
                  row.goals.map((goal) =>
                    goal.id === goalId ? { ...goal, weight } : goal,
                  ),
                );
                return;
              }
              void onPersistGoals(updated);
            });
          }}
        />
      )}
      {goalDrawer}
    </div>
  );
}
