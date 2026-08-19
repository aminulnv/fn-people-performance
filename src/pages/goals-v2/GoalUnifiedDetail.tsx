import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Copy,
  GitFork,
  History,
  MoreHorizontal,
  Pencil,
  Send,
  Trash2,
} from "lucide-react";
import { Avatar, Badge } from "@/components/ui";
import { ActivityLogDrawer } from "@/components/activity/ActivityLogDrawer";
import { avatarStyle } from "@/lib/employees/avatar";
import { goalCompletion, newId } from "@/lib/goalsApi";
import "@/styles/layout-activity.css";
import {
  appendMilestoneList,
  appendMilestoneToList,
  appendTodoListToMeasure,
  blankMetric,
  measurementPanels,
  readMeasureGroupTitle,
  rebalanceMeasurementWeights,
  redistributeTodoMeasureWeight,
  removeMilestoneFromList,
  removeMilestoneList,
  removeTodoMeasure,
  replaceMilestoneList,
  patchMilestone,
  withMeasureTitle,
  withMilestoneListTitle,
  withMilestoneTitle,
} from "@/lib/goals/measurements";
import type {
  Goal,
  GoalProgressStatus,
  Measurement,
  Milestone,
  PersonGoals,
  SendBackAuthor,
} from "@/lib/goals/types";
import { sumMeasurementWeights } from "@/lib/goals/weightage";
import {
  formatRefreshAge,
  goalTitle,
  GOAL_PROGRESS_STATUS_OPTIONS,
  progressStatusClass,
  trackLabel,
  trackToneClass,
} from "@/pages/goals/goalHelpers";
import {
  approvalCopy,
  resolveApprovalPerson,
} from "@/pages/goals/approvalDisplay";
import { GoalAutosaveStatus } from "@/pages/goals/GoalAutosaveStatus";
import type { GoalDraftSaveState } from "@/pages/goals/useGoalDraftAutosave";
import type { RequestGoalEdit } from "@/pages/goals/useGoalEditGuard";
import type { OkrReferenceScope } from "@/lib/okr/reference";
import {
  MeasureEditList,
  MeasureListTable,
} from "./MeasurePanelSection";
import { isGoalDraftDirty, validateGoalDraft } from "./draftHelpers";
import { GoalOkrReferencePanel } from "@/pages/goals/GoalOkrReferencePanel";
import {
  GoalMetricReadout,
  GoalWeightReadout,
  formatWeightReadout,
  parseWeightInputValue,
  weightInputDisplayValue,
} from "@/pages/goals/GoalMeasurementReadout";
import { GoalProgressLog } from "@/pages/goals/GoalProgressLog";
import { MetricProgressUpdate } from "@/pages/goals/MetricProgressUpdate";
import { TodoMeasureViewCard } from "@/pages/goals/TodoMeasureViewCard";
import { TodoMeasureEditCard } from "@/pages/goals/TodoMeasureEditCard";
import { NumberMeasureEditCard } from "@/pages/goals/NumberMeasureEditCard";
import {
  recordMetricProgress,
  recordMilestoneProgress,
  latestProgressAt,
} from "@/lib/goals/progressLog";
import {
  EMPTY_LINE_MANAGER_CASCADE,
  CascadeLabel,
  GoalCascadeField,
  GoalCascadeFromReadout,
  GoalCascadedTo,
  type CascadeGoalHref,
} from "@/pages/goals/GoalCascadeField";
import {
  GoalCascadeTargetDialog,
  type CascadeTarget,
} from "@/pages/goals/GoalCascadeTargetDialog";
import type {
  CascadeRecipient,
  LineManagerCascade,
} from "@/lib/goals/operations";

export type GoalOwnerOption = {
  id: string;
  name: string;
  title?: string;
  avatarUrl?: string;
};

export type GoalUnifiedOwner = {
  name: string;
  avatarUrl?: string;
};

type GoalUnifiedDetailProps = {
  goal: Goal;
  index: number;
  total: number;
  /** True when this goal was just created and should open in edit mode. */
  isNew?: boolean;
  owner: GoalUnifiedOwner;
  defaultOwnerId: string;
  ownerOptions: GoalOwnerOption[];
  cascadeFrom?: LineManagerCascade;
  cascadedTo?: CascadeRecipient[];
  cascadeHref?: CascadeGoalHref;
  cycleId?: string;
  subjectId?: string;
  cycleLabel: string;
  isCurrentCycle?: boolean;
  status: PersonGoals["status"];
  postWindowApprovalStage?: PersonGoals["postWindowApprovalStage"];
  sendBackReason?: string;
  sendBackBy?: SendBackAuthor;
  approvedBy?: SendBackAuthor;
  commentAuthorName: string;
  commentAuthorId?: string;
  canEdit?: boolean;
  canUpdateProgress?: boolean;
  canRemove?: boolean;
  canCascade?: boolean;
  cascadeTargets?: CascadeTarget[];
  okrScope?: OkrReferenceScope;
  onRequestEdit?: RequestGoalEdit;
  /** Persist structural edits (save from edit mode). */
  onSave: (goal: Goal) => void;
  /** Keep an editable draft synchronized without leaving edit mode. */
  onDraftChange?: (goal: Goal) => void;
  /** Autosave state of the owning draft, shown in place of manual save hints. */
  saveState?: GoalDraftSaveState;
  /** Persist lightweight progress mutations while viewing. */
  onProgressChange: (goal: Goal) => void;
  onDuplicate?: () => void;
  onCascade?: (reportIds: string[]) => void;
  onRemove?: () => void;
  onSelectIndex: (index: number) => void;
  onBack: () => void;
  /** Discard an unsaved new goal and leave. */
  onDiscardNew?: () => void;
};

function touch(goal: Goal, partial: Partial<Goal>): Goal {
  return { ...goal, ...partial, updatedAt: new Date().toISOString() };
}

type MenuItem = {
  id: string;
  label: string;
  icon?: ReactNode;
  danger?: boolean;
  onSelect: () => void;
};

/** Compact overflow menu — keeps per-card actions out of the reading path. */
function CardMenu({ label, items }: { label: string; items: MenuItem[] }) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div ref={containerRef} className="pd-goal-v2__menu">
      <button
        type="button"
        className="pd-goal-v2__icon-btn"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((prev) => !prev)}
      >
        <MoreHorizontal size={16} strokeWidth={1.75} aria-hidden />
      </button>
      {open ? (
        <div className="pd-goal-v2__menu-panel" role="menu">
          {items.map((item) => (
            <button
              key={item.id}
              type="button"
              role="menuitem"
              className={`pd-goal-v2__menu-item${
                item.danger ? " pd-goal-v2__menu-item--danger" : ""
              }`}
              onClick={() => {
                setOpen(false);
                item.onSelect();
              }}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function OwnerSelect({
  ownerId,
  options,
  onChange,
}: {
  ownerId: string;
  options: GoalOwnerOption[];
  onChange: (ownerId: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const listId = useId();

  const selected =
    options.find((person) => person.id === ownerId) ?? options[0] ?? null;

  const filtered = (() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return options;
    return options.filter((person) => {
      const haystack = [person.name, person.title ?? ""]
        .join(" ")
        .toLowerCase();
      return haystack.includes(needle);
    });
  })();

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  useEffect(() => {
    if (!open) {
      setQuery("");
      return;
    }
    const frame = window.requestAnimationFrame(() => {
      searchRef.current?.focus();
    });
    return () => window.cancelAnimationFrame(frame);
  }, [open]);

  return (
    <div
      ref={containerRef}
      className={`pd-goal-v2__owner${open ? " is-open" : ""}`}
    >
      <button
        type="button"
        className="pd-goal-v2__owner-trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => setOpen((prev) => !prev)}
      >
        <span className="pd-goal-v2__owner-trigger-main">
          {selected ? (
            <>
              <Avatar
                name={selected.name}
                src={selected.avatarUrl}
                size="sm"
                style={avatarStyle(selected.name)}
              />
              <span>{selected.name}</span>
            </>
          ) : (
            <span className="pd-goal-v2__owner-placeholder">Select owner</span>
          )}
        </span>
        <ChevronDown size={16} strokeWidth={2} aria-hidden />
      </button>
      {open ? (
        <div className="pd-goal-v2__owner-menu" role="presentation">
          <label className="pd-goal-v2__owner-search">
            <span className="pd-sr-only">Search people</span>
            <input
              ref={searchRef}
              type="search"
              value={query}
              placeholder="Search people"
              aria-controls={listId}
              onChange={(event) => setQuery(event.target.value)}
            />
          </label>
          <div
            id={listId}
            className="pd-goal-v2__owner-list"
            role="listbox"
            aria-label="Owner"
          >
            {filtered.length === 0 ? (
              <p className="pd-goal-v2__owner-empty">No people found</p>
            ) : (
              filtered.map((person) => {
                const isSelected = person.id === selected?.id;
                return (
                  <button
                    key={person.id}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    className={`pd-goal-v2__owner-option${
                      isSelected ? " is-selected" : ""
                    }`}
                    onClick={() => {
                      onChange(person.id);
                      setOpen(false);
                    }}
                  >
                    <Avatar
                      name={person.name}
                      src={person.avatarUrl}
                      size="sm"
                      style={avatarStyle(person.name)}
                    />
                    <span className="pd-goal-v2__owner-option-copy">
                      <span>{person.name}</span>
                      {person.title ? <span>{person.title}</span> : null}
                    </span>
                    {isSelected ? (
                      <Check size={14} strokeWidth={2.5} aria-hidden />
                    ) : null}
                  </button>
                );
              })
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function GoalUnifiedDetail({
  goal,
  index,
  total,
  isNew = false,
  owner,
  defaultOwnerId,
  ownerOptions,
  cascadeFrom = EMPTY_LINE_MANAGER_CASCADE,
  cascadedTo = [],
  cascadeHref,
  cycleId,
  subjectId,
  cycleLabel,
  isCurrentCycle = false,
  status,
  postWindowApprovalStage,
  sendBackReason,
  sendBackBy,
  approvedBy,
  commentAuthorName,
  commentAuthorId,
  canEdit = false,
  canUpdateProgress = false,
  canRemove = false,
  canCascade = false,
  cascadeTargets = [],
  okrScope,
  onRequestEdit = (startEditing) => startEditing(),
  onSave,
  onDraftChange,
  saveState,
  onProgressChange,
  onDuplicate,
  onCascade,
  onRemove,
  onSelectIndex,
  onBack,
  onDiscardNew,
}: GoalUnifiedDetailProps) {
  const [mode, setMode] = useState<"view" | "edit">(isNew ? "edit" : "view");
  const [draft, setDraft] = useState(goal);
  const [baseline, setBaseline] = useState(goal);
  const [comment, setComment] = useState("");
  const [statusOpen, setStatusOpen] = useState(false);
  const [cascadeOpen, setCascadeOpen] = useState(false);
  const [activityOpen, setActivityOpen] = useState(false);
  const [showCascadeField, setShowCascadeField] = useState(
    Boolean(goal.linkedGoalLabel || goal.cascadedFromGoalId),
  );
  const [expandedMeasureKey, setExpandedMeasureKey] = useState<string | null>(
    null,
  );
  const [focusMilestoneId, setFocusMilestoneId] = useState<string | null>(
    null,
  );
  const [editingCascadeFrom, setEditingCascadeFrom] = useState(false);
  const statusRef = useRef<HTMLDivElement>(null);
  const editingRef = useRef(false);
  const onDraftChangeRef = useRef(onDraftChange);
  const commentFieldId = useId();
  const titleFieldId = useId();

  editingRef.current = mode === "edit";
  onDraftChangeRef.current = onDraftChange;

  const goalId = goal.id;
  useEffect(() => {
    setDraft(goal);
    setBaseline(goal);
    setShowCascadeField(
      Boolean(goal.linkedGoalLabel || goal.cascadedFromGoalId),
    );
    setEditingCascadeFrom(false);
    setExpandedMeasureKey(null);
    setMode(isNew ? "edit" : "view");
    // Reset only when the opened goal identity changes; content sync while
    // viewing is handled by the effect below so in-progress edits are kept.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- goalId/isNew gate
  }, [goalId, isNew]);

  useEffect(() => {
    if (editingRef.current) return;
    setDraft(goal);
    setBaseline(goal);
    setShowCascadeField(
      Boolean(goal.linkedGoalLabel || goal.cascadedFromGoalId),
    );
  }, [goal]);

  useEffect(() => {
    if (!statusOpen) return;
    const onPointerDown = (event: MouseEvent) => {
      if (
        statusRef.current &&
        !statusRef.current.contains(event.target as Node)
      ) {
        setStatusOpen(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setStatusOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [statusOpen]);

  const isEditing = mode === "edit";
  const activeGoal = isEditing ? draft : baseline;
  const completion = Math.round(goalCompletion(activeGoal));
  const track = trackLabel(status, completion, activeGoal.progressStatus);
  const approval = approvalCopy(status, postWindowApprovalStage);
  const approver = resolveApprovalPerson({
    status,
    postWindowApprovalStage,
    sendBackBy,
    approvedBy,
    cascadeFrom,
  });
  const title = goalTitle(activeGoal, index);
  const measurePanels = measurementPanels(activeGoal.measurements);
  const panels = measurePanels;
  const comments = activeGoal.comments ?? [];
  const canMutateProgress = canEdit || canUpdateProgress;
  const progressAuthor = {
    id: commentAuthorId,
    name: commentAuthorName,
  };
  const lastProgressAt = latestProgressAt(activeGoal);
  const dirty = isEditing && isGoalDraftDirty(baseline, draft);
  const validation = useMemo(() => validateGoalDraft(draft), [draft]);
  const measureWeight = sumMeasurementWeights(draft.measurements);
  const ownerId = draft.ownerId ?? defaultOwnerId;

  const commitDraft = (updater: (prev: Goal) => Goal) => {
    setDraft((prev) => {
      const next = updater(prev);
      if (isEditing) onDraftChangeRef.current?.(next);
      return next;
    });
  };

  const patchDraft = (partial: Partial<Goal>) => {
    commitDraft((prev) => touch(prev, partial));
  };

  const cascadeFromSelected = Boolean(
    activeGoal.cascadedFromGoalId || activeGoal.linkedGoalLabel,
  );

  const requestNav = (action: () => void) => {
    if (isEditing && (dirty || isNew)) {
      onSave(draft);
      setBaseline(draft);
      setMode("view");
    }
    action();
  };

  const cancelEdit = () => {
    setDraft(baseline);
    setExpandedMeasureKey(null);
    if (isNew) {
      onDiscardNew?.();
      onBack();
      return;
    }
    setMode("view");
  };

  const patchMeasurement = (id: string, next: Measurement) => {
    const apply = (source: Goal) =>
      touch(source, {
        measurements: source.measurements.map((item) =>
          item.id === id ? next : item,
        ),
      });
    if (isEditing) {
      commitDraft(apply);
      return;
    }
    onProgressChange(apply(goal));
  };

  const setMeasurements = (next: Measurement[]) => {
    patchDraft({
      measurements: next.length === 0 ? [] : rebalanceMeasurementWeights(next),
    });
  };

  const setProgressStatus = (next: GoalProgressStatus) => {
    if (isEditing) patchDraft({ progressStatus: next });
    else onProgressChange(touch(goal, { progressStatus: next }));
    setStatusOpen(false);
  };

  const submitComment = () => {
    const text = comment.trim();
    if (!text) return;
    onProgressChange(
      touch(goal, {
        comments: [
          ...comments,
          {
            id: newId("comment"),
            authorId: commentAuthorId,
            authorName: commentAuthorName,
            text,
            createdAt: new Date().toISOString(),
          },
        ],
      }),
    );
    setComment("");
  };

  const handleSave = () => {
    if (!validation.ok) return;
    onSave(draft);
    setBaseline(draft);
    setMode("view");
  };

  const draftPanels = measurementPanels(draft.measurements);

  const renderMeasurePanelEditor = (
    panel: ReturnType<typeof measurementPanels>[number],
  ) => {
    if (panel.kind === "metric") {
      return (
        <NumberMeasureEditCard
          metric={panel.metric}
          onChange={(next) => patchMeasurement(panel.metric.id, next)}
          cardClassName="pd-goal-view__card pd-goal-measure-card pd-goal-measure-card--edit"
          headClassName="pd-goal-view__card-head"
          titleClassName="pd-goal-view__card-title"
          metricsClassName="pd-goal-view__card-metrics"
          meta={
            cycleLabel ? (
              <span className="pd-measure-detail__tag">{cycleLabel}</span>
            ) : null
          }
        />
      );
    }

    return (
      <TodoMeasureEditCard
          panel={panel}
          measurements={draft.measurements}
          measureTitle={readMeasureGroupTitle(
            draft.measurements,
            panel.measureGroupId,
          )}
          canRemoveList={panel.lists.length > 1 || draftPanels.length > 1}
          cardClassName="pd-goal-view__card pd-goal-measure-card pd-goal-measure-card--edit"
          headClassName="pd-goal-view__card-head"
          todoListClassName="pd-goal-v2__todos"
          todoItemClassName="pd-goal-v2__todo"
          todoCheckClassName="pd-goal-v2__todo-check"
          addTodoClassName="pd-goal-v2__row-btn pd-goal-measure-card__add-todo"
          meta={
            cycleLabel ? (
              <span className="pd-measure-detail__tag">{cycleLabel}</span>
            ) : null
          }
        onChangeMeasureTitle={(measureTitle) =>
          commitDraft((prev) =>
            touch(prev, {
              measurements: withMeasureTitle(
                prev.measurements,
                panel.measureGroupId,
                measureTitle,
              ),
            }),
          )
        }
        onChangeListTitle={(listKey, listTitle) => {
          commitDraft((prev) => {
            const listTodos = prev.measurements.filter(
              (item): item is Milestone =>
                item.kind === "milestone" &&
                (item.listId ?? item.id) === listKey,
            );
            if (listTodos.length === 0) return prev;
            return touch(prev, {
              measurements: replaceMilestoneList(
                prev.measurements,
                listKey,
                withMilestoneListTitle(listTodos, listTitle),
              ),
            });
          });
        }}
        onChangeMilestoneTitle={(milestoneId, title) =>
          commitDraft((prev) =>
            touch(prev, {
              measurements: withMilestoneTitle(
                prev.measurements,
                milestoneId,
                title,
              ),
            }),
          )
        }
        onChangeMilestone={(milestoneId, patch) =>
          commitDraft((prev) =>
            touch(prev, {
              measurements: patchMilestone(prev.measurements, milestoneId, patch),
            }),
          )
        }
        onAddTodoList={() =>
          commitDraft((prev) =>
            touch(prev, {
              measurements: appendTodoListToMeasure(
                prev.measurements,
                panel.measureGroupId,
              ),
            }),
          )
        }
        onAddItem={(listKey) =>
          commitDraft((prev) => {
            const beforeIds = new Set(prev.measurements.map((item) => item.id));
            const measurements = appendMilestoneToList(
              prev.measurements,
              listKey,
            );
            const added = measurements.find((item) => !beforeIds.has(item.id));
            if (added) setFocusMilestoneId(added.id);
            return touch(prev, { measurements });
          })
        }
        onRemoveItem={(id) =>
          commitDraft((prev) =>
            touch(prev, {
              measurements: removeMilestoneFromList(prev.measurements, id),
            }),
          )
        }
        onRemoveList={(listKey) =>
          commitDraft((prev) =>
            touch(prev, {
              measurements: removeMilestoneList(prev.measurements, listKey),
            }),
          )
        }
        onChangeWeight={(weight) =>
          commitDraft((prev) =>
            touch(prev, {
              measurements: redistributeTodoMeasureWeight(
                prev.measurements,
                panel.measureGroupId,
                weight,
              ),
            }),
          )
        }
        focusMilestoneId={focusMilestoneId}
        onFocusMilestone={() => setFocusMilestoneId(null)}
      />
    );
  };

  const removeMeasurePanel = (panelKey: string) => {
    const panel = draftPanels.find((entry) => entry.key === panelKey);
    if (!panel) return;
    if (panel.kind === "metric") {
      setMeasurements(
        draft.measurements.filter((item) => item.id !== panel.metric.id),
      );
    } else {
      setMeasurements(removeTodoMeasure(draft.measurements, panel.measureGroupId));
    }
    if (expandedMeasureKey === panelKey) setExpandedMeasureKey(null);
  };

  const addMeasure = (next: Measurement[]) => {
    const balanced = rebalanceMeasurementWeights(next);
    patchDraft({ measurements: balanced });
    const nextPanels = measurementPanels(balanced);
    setExpandedMeasureKey(nextPanels[nextPanels.length - 1]?.key ?? null);
  };

  return (
    <div
      className={`pd-goal-v2${isEditing ? " is-editing" : ""}`}
      aria-label={title}
      data-mode={mode}
    >
      <header className="pd-goal-v2__header">
        <div className="pd-goal-v2__crumbs">
          <button
            type="button"
            className="pd-goal-v2__back"
            onClick={() => requestNav(onBack)}
          >
            <ChevronLeft size={16} strokeWidth={2.25} aria-hidden />
            Back
          </button>
          {total > 1 ? (
            <div className="pd-goal-v2__pager">
              <button
                type="button"
                className="pd-people__icon-btn"
                disabled={index <= 0}
                aria-label="Previous goal"
                onClick={() => requestNav(() => onSelectIndex(index - 1))}
              >
                <ChevronLeft size={18} strokeWidth={1.75} aria-hidden />
              </button>
              <span>
                {index + 1} / {total}
              </span>
              <button
                type="button"
                className="pd-people__icon-btn"
                disabled={index >= total - 1}
                aria-label="Next goal"
                onClick={() => requestNav(() => onSelectIndex(index + 1))}
              >
                <ChevronRight size={18} strokeWidth={1.75} aria-hidden />
              </button>
            </div>
          ) : null}
        </div>

        {isEditing ? (
          <div className="pd-goal-v2__title-row">
            <div className="pd-goal-v2__title-edit">
              <label className="pd-goal-v2__field-label" htmlFor={titleFieldId}>
                Goal title
              </label>
              <textarea
                id={titleFieldId}
                className="pd-goal-v2__title-input"
                value={draft.description}
                rows={1}
                placeholder="What should be achieved?"
                aria-invalid={Boolean(validation.nameError)}
                onChange={(event) =>
                  patchDraft({ description: event.target.value })
                }
              />
              {validation.nameError ? (
                <p className="pd-goal-v2__error" role="alert">
                  {validation.nameError}
                </p>
              ) : null}
            </div>
            <div className="pd-goal-v2__actions">
              {saveState ? null : (
                <span
                  className={`pd-goal-v2__dot${dirty ? " is-dirty" : ""}`}
                  title={dirty ? "Unsaved changes" : "Editing"}
                  aria-hidden
                />
              )}
              <button
                type="button"
                className="pd-people__ghost-btn"
                onClick={cancelEdit}
              >
                Cancel
              </button>
              <button
                type="button"
                className="pd-people__ghost-btn pd-people__ghost-btn--primary"
                disabled={!validation.ok || (!isNew && !dirty)}
                onClick={handleSave}
              >
                {isNew ? "Add Goal" : "Save Changes"}
              </button>
            </div>
          </div>
        ) : (
          <h1 className="pd-goal-v2__title">{title}</h1>
        )}

        <div className="pd-goal-v2__meta">
          {saveState ? <GoalAutosaveStatus state={saveState} /> : null}
          <p>
            {lastProgressAt
              ? `Updated ${formatRefreshAge(lastProgressAt)}`
              : "No progress updates yet"}
          </p>
        </div>
      </header>

      {isEditing ? null : (
        <div className="pd-goal-v2__actionbar">
          <div className="pd-goal-v2__actions">
            {canEdit ? (
              <button
                type="button"
                className="pd-people__ghost-btn"
                onClick={() => {
                  onRequestEdit(() => {
                    setDraft(baseline);
                    setExpandedMeasureKey(null);
                    setMode("edit");
                  });
                }}
              >
                <Pencil size={15} strokeWidth={1.75} aria-hidden />
                Edit
              </button>
            ) : null}
            {onDuplicate ? (
              <button
                type="button"
                className="pd-people__ghost-btn"
                onClick={onDuplicate}
              >
                <Copy size={15} strokeWidth={1.75} aria-hidden />
                Duplicate
              </button>
            ) : null}
            {onCascade ? (
              <button
                type="button"
                className="pd-people__ghost-btn"
                disabled={!canCascade}
                title={
                  canCascade
                    ? "Create a child goal for selected reports"
                    : "No direct reports to cascade to"
                }
                onClick={() => setCascadeOpen(true)}
              >
                <GitFork size={15} strokeWidth={1.75} aria-hidden />
                Cascade This Goal
              </button>
            ) : null}
            {(canRemove && onRemove) || cycleId ? (
              <CardMenu
                label="More actions"
                items={[
                  ...(cycleId
                    ? [
                        {
                          id: "activity",
                          label: "View activity",
                          icon: (
                            <History size={15} strokeWidth={1.75} aria-hidden />
                          ),
                          onSelect: () => setActivityOpen(true),
                        },
                      ]
                    : []),
                  ...(canRemove && onRemove
                    ? [
                        {
                          id: "remove",
                          label: "Remove Goal",
                          icon: (
                            <Trash2 size={15} strokeWidth={1.75} aria-hidden />
                          ),
                          danger: true,
                          onSelect: onRemove,
                        },
                      ]
                    : []),
                ]}
              />
            ) : null}
          </div>
        </div>
      )}

      <div
        className="pd-people__summary pd-goal-v2__summary"
        role="group"
        aria-label="Goal summary"
      >
        <div className="pd-people__summary-card">
          <span className="pd-people__summary-label">Cycle</span>
          <span className="pd-people__summary-value pd-goal-v2__cycle">
            {cycleLabel}
            {isCurrentCycle ? <Badge variant="completed">Current</Badge> : null}
          </span>
        </div>
        <div className="pd-people__summary-card">
          <span className="pd-people__summary-label">Status</span>
          {canUpdateProgress ? (
            <div ref={statusRef} className="pd-goal-v2__status">
              <button
                type="button"
                className={`pd-people__summary-value pd-goal-v2__status-btn ${trackToneClass(track.tone)}`}
                aria-haspopup="listbox"
                aria-expanded={statusOpen}
                onClick={() => setStatusOpen((open) => !open)}
              >
                {track.label}
                <ChevronDown size={14} strokeWidth={2.25} aria-hidden />
              </button>
              {statusOpen ? (
                <div
                  className="pd-goal-v2__status-menu"
                  role="listbox"
                  aria-label="Status"
                >
                  {GOAL_PROGRESS_STATUS_OPTIONS.map((option) => (
                    <button
                      key={option.id}
                      type="button"
                      role="option"
                      aria-selected={activeGoal.progressStatus === option.id}
                      className={`pd-goal-v2__status-option ${progressStatusClass(option.id)}`}
                      onClick={() => setProgressStatus(option.id)}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          ) : (
            <span
              className={`pd-people__summary-value pd-goal-v2__status-btn ${trackToneClass(track.tone)} is-static`}
            >
              {track.label}
            </span>
          )}
        </div>
        <div className="pd-people__summary-card">
          <span className="pd-people__summary-label">Goal weight</span>
          {isEditing ? (
            <span className="pd-people__summary-value pd-goal-v2__summary-edit">
              <input
                type="text"
                inputMode="numeric"
                value={weightInputDisplayValue(draft.weight)}
                aria-label="Goal weight percent"
                onChange={(event) =>
                  patchDraft({ weight: parseWeightInputValue(event.target.value) })
                }
              />
              <span aria-hidden>%</span>
            </span>
          ) : (
            <span className="pd-people__summary-value">
              {formatWeightReadout(activeGoal.weight)}
            </span>
          )}
        </div>
        <div className="pd-people__summary-card">
          <span className="pd-people__summary-label">Completion</span>
          <span className="pd-people__summary-value">{completion}%</span>
        </div>
      </div>

      <div className="pd-goal-v2__body">
        <div className="pd-goal-v2__main">
          {isEditing ? (
            <MeasureEditList
              panels={draftPanels}
              expandedKey={expandedMeasureKey}
              onExpandedKeyChange={setExpandedMeasureKey}
              measureWeight={measureWeight}
              onSplitEvenly={() =>
                patchDraft({
                  measurements: rebalanceMeasurementWeights(draft.measurements),
                })
              }
              onAddNumber={() =>
                addMeasure([...draft.measurements, blankMetric("increase")])
              }
              onAddMilestone={() =>
                addMeasure(appendMilestoneList(draft.measurements))
              }
              onRemovePanel={removeMeasurePanel}
              onAddTodoList={(panelKey) => {
                const panel = draftPanels.find((entry) => entry.key === panelKey);
                if (!panel || panel.kind !== "todo_measure") return;
                patchDraft({
                  measurements: appendTodoListToMeasure(
                    draft.measurements,
                    panel.measureGroupId,
                  ),
                });
                setExpandedMeasureKey(panelKey);
              }}
              renderExpandedPanel={renderMeasurePanelEditor}
              measureNameError={validation.measurementNameError}
              weightError={validation.measurementWeightError}
            />
          ) : (
            <>
              <div className="pd-goal-view__section-head">
                <h2>How to measure progress?</h2>
              </div>
              <MeasureListTable
                panels={panels}
                cycleLabel={cycleLabel}
                onEditPanel={(panelKey) => {
                  setExpandedMeasureKey(panelKey);
                  setMode("edit");
                }}
              />

              {canMutateProgress && panels.length > 0 ? (
                <section
                  className="pd-measure-view-progress"
                  aria-label="Update progress"
                >
                  <h3 className="pd-measure-view-progress__title">
                    Update progress
                  </h3>
                  {panels.map((panel) =>
                    panel.kind === "todo_measure" ? (
                      <TodoMeasureViewCard
                        key={panel.key}
                        panel={panel}
                        cardClassName="pd-goal-v2__card pd-goal-measure-card"
                        headClassName="pd-goal-v2__card-head"
                        titleClassName="pd-goal-view__card-title"
                        metricsClassName="pd-goal-view__card-metrics"
                        todoListClassName="pd-goal-v2__todos"
                        todoItemClassName="pd-goal-v2__todo"
                        renderTodoItem={(todo) => (
                          <>
                            <input
                              type="checkbox"
                              className="pd-goal-v2__todo-check"
                              checked={todo.complete}
                              aria-label={`Mark ${
                                todo.title.trim() || "milestone"
                              } complete`}
                              onChange={(event) =>
                                patchMeasurement(
                                  todo.id,
                                  recordMilestoneProgress(
                                    todo,
                                    event.target.checked,
                                    progressAuthor,
                                  ),
                                )
                              }
                            />
                            <p
                              className={`pd-goal-v2__todo-title${
                                todo.complete ? " is-done" : ""
                              }`}
                            >
                              {todo.title || "Untitled milestone"}
                            </p>
                          </>
                        )}
                      />
                    ) : (
                      <section
                        key={panel.key}
                        className="pd-goal-v2__card"
                        aria-label={panel.metric.title.trim() || "Measure"}
                      >
                        <div className="pd-goal-v2__card-head">
                          {panel.metric.title.trim() ? (
                            <h2>{panel.metric.title.trim()}</h2>
                          ) : null}
                          <GoalMetricReadout
                            metric={panel.metric}
                            track={track}
                            showWeight={false}
                          />
                          <div className="pd-goal-view__card-metrics">
                            <MetricProgressUpdate
                              metric={panel.metric}
                              goalTitle={title}
                              cycleLabel={cycleLabel}
                              onCommit={(nextValue) =>
                                patchMeasurement(
                                  panel.metric.id,
                                  recordMetricProgress(
                                    panel.metric,
                                    nextValue,
                                    progressAuthor,
                                  ),
                                )
                              }
                            />
                            <GoalWeightReadout weight={panel.metric.weight} />
                          </div>
                        </div>
                        <GoalProgressLog
                          entries={panel.metric.progressLog ?? []}
                        />
                      </section>
                    ),
                  )}
                </section>
              ) : null}

              <section className="pd-goal-v2__comments" aria-label="Comments">
                <h2>Comments</h2>
                {comments.length > 0 ? (
                  <ul className="pd-goal-v2__comment-list">
                    {comments.map((item) => (
                      <li key={item.id} className="pd-goal-v2__comment">
                        <Avatar
                          name={item.authorName}
                          src={
                            (
                              ownerOptions.find(
                                (person) => person.id === item.authorId,
                              ) ??
                              ownerOptions.find(
                                (person) => person.name === item.authorName,
                              )
                            )?.avatarUrl
                          }
                          size="sm"
                          className="pd-people__avatar"
                          style={avatarStyle(item.authorName)}
                        />
                        <div>
                          <p className="pd-goal-v2__comment-meta">
                            <strong>{item.authorName}</strong>
                            <span>{formatRefreshAge(item.createdAt)}</span>
                          </p>
                          <p className="pd-goal-v2__comment-text">
                            {item.text}
                          </p>
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : null}
                <label
                  className="pd-goal-v2__composer"
                  htmlFor={commentFieldId}
                >
                  <span className="pd-sr-only">Add comment</span>
                  <input
                    id={commentFieldId}
                    type="text"
                    value={comment}
                    placeholder="Add comment"
                    disabled={!canMutateProgress}
                    onChange={(event) => setComment(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        submitComment();
                      }
                    }}
                  />
                  <button
                    type="button"
                    className="pd-goal-v2__send"
                    aria-label="Send comment"
                    disabled={!canMutateProgress || !comment.trim()}
                    onClick={submitComment}
                  >
                    <Send size={16} strokeWidth={1.75} aria-hidden />
                  </button>
                </label>
              </section>
            </>
          )}
        </div>

        <aside className="pd-goal-v2__aside" aria-label="Goal details">
          {isEditing ? (
            <section
              className="pd-goal-v2__section"
              aria-labelledby="goal-v2-details"
            >
              <div className="pd-goal-v2__section-head">
                <h2 id="goal-v2-details">Details</h2>
              </div>

              <div className="pd-goal-v2__fields">
                <div className="pd-goal-v2__field">
                  <span className="pd-goal-v2__field-label">Owner</span>
                  <OwnerSelect
                    ownerId={ownerId}
                    options={ownerOptions}
                    onChange={(nextOwnerId) =>
                      patchDraft({ ownerId: nextOwnerId })
                    }
                  />
                </div>

                <label className="pd-goal-v2__field">
                  <span className="pd-goal-v2__field-label">Description</span>
                  <textarea
                    className="pd-goal-v2__description-input"
                    value={draft.details ?? ""}
                    rows={4}
                    placeholder="Why this matters and what success looks like"
                    onChange={(event) =>
                      patchDraft({ details: event.target.value || undefined })
                    }
                  />
                </label>

                {showCascadeField ||
                draft.linkedGoalLabel ||
                draft.cascadedFromGoalId ? (
                  <div className="pd-goal-v2__field">
                    <GoalCascadeField
                      goal={draft}
                      cascadeFrom={cascadeFrom}
                      onChange={(next) => patchDraft(next)}
                    />
                  </div>
                ) : cascadeFrom.managerName ? (
                  <button
                    type="button"
                    className="pd-goal-v2__quiet-btn"
                    onClick={() => setShowCascadeField(true)}
                  >
                    <GitFork size={15} strokeWidth={2} aria-hidden />
                    Add cascading from
                  </button>
                ) : null}
                <GoalCascadedTo recipients={cascadedTo} hrefFor={cascadeHref} />
              </div>
            </section>
          ) : (
            <>
              <div className="pd-goal-v2__facts">
                <div className="pd-goal-v2__fact">
                  <p className="pd-goal-v2__fact-label">Owner</p>
                  <div className="pd-goal-v2__owner-static">
                    <Avatar
                      name={owner.name}
                      src={owner.avatarUrl}
                      size="sm"
                      style={avatarStyle(owner.name)}
                    />
                    <p>{owner.name}</p>
                  </div>
                </div>
              </div>

              <div
                className={`pd-goal-v2__approval pd-goal-v2__approval--${approval.tone}`}
              >
                <span className="pd-goal-v2__approval-icon" aria-hidden>
                  <Check size={16} strokeWidth={2.5} />
                </span>
                <div>
                  <p className="pd-goal-v2__approval-title">{approval.title}</p>
                  {approver ? (
                    <div className="pd-goal-v2__approval-person">
                      <span className="pd-goal-v2__approval-prefix">
                        {approval.personPrefix}
                      </span>
                      <Avatar
                        name={approver.name}
                        src={approver.avatarUrl}
                        size="sm"
                        alt={`Approver ${approver.name}`}
                        style={avatarStyle(approver.name)}
                      />
                      <p className="pd-goal-v2__approval-sub">
                        {approver.name}
                      </p>
                    </div>
                  ) : (
                    <p className="pd-goal-v2__approval-sub">{approval.sub}</p>
                  )}
                </div>
                {status === "sent_back" && sendBackReason ? (
                  <p className="pd-goal-v2__approval-reason">
                    {sendBackReason}
                  </p>
                ) : null}
              </div>

              <div className="pd-goal-v2__facts">
                {activeGoal.details?.trim() ? (
                  <div className="pd-goal-v2__fact">
                    <p className="pd-goal-v2__fact-label">Description</p>
                    <p className="pd-goal-v2__description">
                      {activeGoal.details}
                    </p>
                  </div>
                ) : null}

                {canEdit &&
                (editingCascadeFrom ||
                  (showCascadeField && !cascadeFromSelected)) ? (
                  <div className="pd-goal-v2__field">
                    <GoalCascadeField
                      goal={activeGoal}
                      cascadeFrom={cascadeFrom}
                      onChange={(next) => {
                        onSave(touch(goal, next));
                        setShowCascadeField(
                          Boolean(
                            next.cascadedFromGoalId || next.linkedGoalLabel,
                          ),
                        );
                        setEditingCascadeFrom(false);
                      }}
                    />
                  </div>
                ) : cascadeFromSelected ? (
                  <div className="pd-goal-v2__fact">
                    <div className="pd-goal-view__section-head">
                      <CascadeLabel as="p" className="pd-goal-v2__fact-label">
                        Cascading from
                      </CascadeLabel>
                      {canEdit ? (
                        <button
                          type="button"
                          className="pd-goal-view__section-edit"
                          aria-label="Edit cascading from"
                          onClick={() =>
                            onRequestEdit(() => setEditingCascadeFrom(true))
                          }
                        >
                          <Pencil size={14} strokeWidth={1.75} aria-hidden />
                        </button>
                      ) : null}
                    </div>
                    <GoalCascadeFromReadout
                      goal={activeGoal}
                      cascadeFrom={cascadeFrom}
                      hrefFor={cascadeHref}
                    />
                  </div>
                ) : canEdit && cascadeFrom.managerName ? (
                  <button
                    type="button"
                    className="pd-goal-v2__quiet-btn"
                    onClick={() =>
                      onRequestEdit(() => setShowCascadeField(true))
                    }
                  >
                    <GitFork size={15} strokeWidth={2} aria-hidden />
                    Add cascading from
                  </button>
                ) : null}

                {cascadedTo.length > 0 ? (
                  <div className="pd-goal-v2__fact">
                    <GoalCascadedTo
                      recipients={cascadedTo}
                      hrefFor={cascadeHref}
                    />
                  </div>
                ) : null}
              </div>
            </>
          )}
          {isEditing && okrScope ? (
            <GoalOkrReferencePanel scope={okrScope} />
          ) : null}
        </aside>
      </div>

      {onCascade ? (
        <GoalCascadeTargetDialog
          open={cascadeOpen}
          targets={cascadeTargets}
          onClose={() => setCascadeOpen(false)}
          onConfirm={onCascade}
        />
      ) : null}
      {cycleId ? (
        <ActivityLogDrawer
          open={activityOpen}
          onClose={() => setActivityOpen(false)}
          title="Goal activity"
          filters={{
            goalId: goal.id,
            cycleId,
            subjectEmployeeId: subjectId ? Number(subjectId) : undefined,
          }}
        />
      ) : null}
    </div>
  );
}
