import { useEffect, useId, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  GitFork,
  Pencil,
  Send,
} from "lucide-react";
import { Avatar, Textarea } from "@/components/ui";
import { avatarStyle } from "@/lib/employees/avatar";
import { newId } from "@/lib/goalsApi";
import {
  measurementPanels,
} from "@/lib/goals/measurements";
import type {
  Goal,
  Measurement,
  PersonGoals,
  SendBackAuthor,
} from "@/lib/goals/types";
import { formatRefreshAge, goalTitle } from "./goalHelpers";
import {
  latestProgressAt,
  recordMetricProgress,
  recordMilestoneProgress,
} from "@/lib/goals/progressLog";
import { GoalSummaryCards } from "./GoalSummaryCards";
import { approvalCopy, resolveApprovalPerson } from "./approvalDisplay";
import { GoalAutosaveStatus } from "./GoalAutosaveStatus";
import type { GoalDraftSaveState } from "./useGoalDraftAutosave";
import type { RequestGoalEdit } from "./useGoalEditGuard";
import {
  EMPTY_LINE_MANAGER_CASCADE,
  CascadeLabel,
  GoalCascadeField,
  GoalCascadeFromReadout,
  GoalCascadedTo,
  type CascadeGoalHref,
} from "./GoalCascadeField";
import { GoalActionsMenu, hasGoalActions } from "./GoalActionsMenu";
import type { CascadeTarget } from "./GoalCascadeTargetDialog";
import { GoalProgressEditor } from "./GoalProgressEditor";
import { GoalMetricReadout, GoalWeightReadout } from "./GoalMeasurementReadout";
import { GoalProgressLog } from "./GoalProgressLog";
import { MetricProgressUpdate } from "./MetricProgressUpdate";
import { TodoMeasureViewCard } from "./TodoMeasureViewCard";
import type {
  CascadeRecipient,
  LineManagerCascade,
} from "@/lib/goals/operations";

export type GoalOwner = {
  id?: string;
  name: string;
  avatarUrl?: string;
};

type CommentAuthor = {
  id: string;
  name: string;
  avatarUrl?: string;
};

function commentAuthor(
  comment: { authorId?: string; authorName: string },
  authors: CommentAuthor[],
): CommentAuthor | undefined {
  return (
    authors.find((person) => person.id === comment.authorId) ??
    authors.find((person) => person.name === comment.authorName)
  );
}

type GoalDetailViewProps = {
  goal: Goal;
  index: number;
  total: number;
  owner: GoalOwner;
  cascadeFrom?: LineManagerCascade;
  cascadedTo?: CascadeRecipient[];
  cascadeHref?: CascadeGoalHref;
  cycleLabel: string;
  isCurrentCycle?: boolean;
  status: PersonGoals["status"];
  postWindowApprovalStage?: PersonGoals["postWindowApprovalStage"];
  sendBackReason?: string;
  sendBackBy?: SendBackAuthor;
  approvedBy?: SendBackAuthor;
  commentAuthorName: string;
  commentAuthorId?: string;
  commentAuthors?: CommentAuthor[];
  canEdit?: boolean;
  canUpdateProgress?: boolean;
  canRemove?: boolean;
  canCascade?: boolean;
  cascadeTargets?: CascadeTarget[];
  /** Used for the quiet Activity log entry in the overflow menu. */
  cycleId?: string;
  subjectId?: string;
  /** Opens the unified goal detail page from the overflow menu. */
  fullViewHref?: string;
  onRequestEdit?: RequestGoalEdit;
  /** Autosave state of the owning draft, surfaced next to the goal title. */
  saveState?: GoalDraftSaveState;
  onChange: (goal: Goal) => void;
  /** Structural edits (title, description, measurements) persist as a full save. */
  onSave?: (goal: Goal) => void;
  onDuplicate?: () => void;
  onCascade?: (reportIds: string[]) => void;
  onRemove?: () => void;
  onSelectIndex: (index: number) => void;
};

function touch(goal: Goal, partial: Partial<Goal>): Goal {
  return { ...goal, ...partial, updatedAt: new Date().toISOString() };
}

type EditableSection = "title" | "description" | "progress";

function SectionEditButton({
  label,
  onClick,
}: {
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className="pd-goal-view__section-edit"
      aria-label={label}
      onClick={onClick}
    >
      <Pencil size={14} strokeWidth={1.75} aria-hidden />
    </button>
  );
}

export function GoalDetailView({
  goal,
  index,
  total,
  owner,
  cascadeFrom = EMPTY_LINE_MANAGER_CASCADE,
  cascadedTo = [],
  cascadeHref,
  cycleLabel,
  isCurrentCycle = false,
  status,
  postWindowApprovalStage,
  sendBackReason,
  sendBackBy,
  approvedBy,
  commentAuthorName,
  commentAuthorId,
  commentAuthors = [],
  canEdit = false,
  canUpdateProgress = false,
  canRemove = false,
  canCascade = false,
  cascadeTargets = [],
  cycleId,
  subjectId,
  fullViewHref,
  onRequestEdit = (startEditing) => startEditing(),
  saveState,
  onChange,
  onSave,
  onDuplicate,
  onCascade,
  onRemove,
  onSelectIndex,
}: GoalDetailViewProps) {
  const [comment, setComment] = useState("");
  const [editingSection, setEditingSection] = useState<EditableSection | null>(
    null,
  );
  const [cascadeFromOpen, setCascadeFromOpen] = useState(false);
  const titleRef = useRef<HTMLTextAreaElement>(null);
  const commentFieldId = useId();
  const titleFieldId = useId();

  useEffect(() => {
    setEditingSection(null);
    setCascadeFromOpen(false);
  }, [goal.id]);

  useEffect(() => {
    if (editingSection === "title") titleRef.current?.focus();
  }, [editingSection]);

  const approval = approvalCopy(status, postWindowApprovalStage);
  const approver = resolveApprovalPerson({
    status,
    postWindowApprovalStage,
    sendBackBy,
    approvedBy,
    cascadeFrom,
  });
  const title = goalTitle(goal, index);
  const panels = measurementPanels(goal.measurements);
  const comments = goal.comments ?? [];
  const canMutate = canEdit || canUpdateProgress;
  const progressAuthor = {
    id: commentAuthorId,
    name: commentAuthorName,
  };
  const lastProgressAt = latestProgressAt(goal);
  const cascadeFromSelected = Boolean(
    goal.cascadedFromGoalId || goal.linkedGoalLabel,
  );

  const persistStructure = (next: Goal) => {
    if (onSave) onSave(next);
    else onChange(next);
  };

  const patchStructure = (partial: Partial<Goal>) => {
    persistStructure(touch(goal, partial));
  };

  const patchMeasurement = (id: string, next: Measurement) => {
    onChange(
      touch(goal, {
        measurements: goal.measurements.map((item) =>
          item.id === id ? next : item,
        ),
      }),
    );
  };

  const submitComment = () => {
    const text = comment.trim();
    if (!text) return;
    onChange(
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

  const hasOverflowMenu = hasGoalActions({
    onDuplicate,
    onCascade,
    onRemove,
    canRemove,
    onViewActivity: Boolean(cycleId),
    fullViewHref,
  });

  return (
    <>
      <div className="pd-goal-view" aria-label={title}>
        <header className="pd-goal-view__header">
          <div className="pd-goal-view__chrome">
            {editingSection === "title" ? (
              <div className="pd-goal-create__title-edit">
                <label className="pd-sr-only" htmlFor={titleFieldId}>
                  Goal name
                </label>
                <textarea
                  id={titleFieldId}
                  ref={titleRef}
                  className="pd-goal-create__title-input"
                  value={goal.description}
                  rows={1}
                  placeholder="Goal name"
                  onChange={(event) =>
                    patchStructure({ description: event.target.value })
                  }
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      setEditingSection(null);
                    }
                    if (event.key === "Escape") setEditingSection(null);
                  }}
                  onBlur={() => setEditingSection(null)}
                />
              </div>
            ) : (
              <h1 className="pd-goal-view__title">
                <span>{title}</span>
                {canEdit ? (
                  <SectionEditButton
                    label="Edit title"
                    onClick={() =>
                      onRequestEdit(() => setEditingSection("title"))
                    }
                  />
                ) : null}
              </h1>
            )}

            {total > 1 ? (
              <div className="pd-goal-view__pager">
                <button
                  type="button"
                  className="pd-people__icon-btn"
                  disabled={index <= 0}
                  aria-label="Previous goal"
                  onClick={() => onSelectIndex(index - 1)}
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
                  onClick={() => onSelectIndex(index + 1)}
                >
                  <ChevronRight size={18} strokeWidth={1.75} aria-hidden />
                </button>
              </div>
            ) : null}

            {hasOverflowMenu ? (
              <div className="pd-goal-view__actions">
                <GoalActionsMenu
                  canCascade={canCascade}
                  canRemove={canRemove}
                  cascadeTargets={cascadeTargets}
                  fullViewHref={fullViewHref}
                  activityFilters={
                    cycleId
                      ? {
                          goalId: goal.id,
                          cycleId,
                          subjectEmployeeId: subjectId
                            ? Number(subjectId)
                            : owner.id
                              ? Number(owner.id)
                              : undefined,
                        }
                      : undefined
                  }
                  onDuplicate={onDuplicate}
                  onCascade={onCascade}
                  onRemove={onRemove}
                />
              </div>
            ) : null}
          </div>

          <div className="pd-goal-view__byline">
            {owner.id ? (
              <Link
                to={`/people/${owner.id}`}
                className="pd-goal-view__owner pd-goal-view__owner--link"
                aria-label={`Open ${owner.name}'s profile`}
              >
                <Avatar
                  name={owner.name}
                  src={owner.avatarUrl}
                  size="sm"
                  style={avatarStyle(owner.name)}
                />
                <p>{owner.name}</p>
              </Link>
            ) : (
              <div
                className="pd-goal-view__owner"
                aria-label={`Owner ${owner.name}`}
              >
                <Avatar
                  name={owner.name}
                  src={owner.avatarUrl}
                  size="sm"
                  style={avatarStyle(owner.name)}
                />
                <p>{owner.name}</p>
              </div>
            )}
            <div className="pd-goal-view__meta">
              {saveState ? <GoalAutosaveStatus state={saveState} /> : null}
              <p>
                {lastProgressAt
                  ? `Updated ${formatRefreshAge(lastProgressAt)}`
                  : "No progress updates yet"}
              </p>
            </div>
          </div>

          <div
            className={`pd-goal-view__approval pd-goal-view__approval--${approval.tone}`}
          >
            <span className="pd-goal-view__approval-icon" aria-hidden>
              <Check size={16} strokeWidth={2.5} />
            </span>
            <div className="pd-goal-view__approval-copy">
              <p className="pd-goal-view__approval-title">{approval.title}</p>
              {approver ? (
                <div className="pd-goal-view__approval-person">
                  <span className="pd-goal-view__approval-prefix">
                    {approval.personPrefix}
                  </span>
                  <Avatar
                    name={approver.name}
                    src={approver.avatarUrl}
                    size="sm"
                    alt={`Approver ${approver.name}`}
                    style={avatarStyle(approver.name)}
                  />
                  <p className="pd-goal-view__approval-sub">{approver.name}</p>
                </div>
              ) : (
                <p className="pd-goal-view__approval-sub">{approval.sub}</p>
              )}
            </div>
            {status === "sent_back" && sendBackReason ? (
              <p className="pd-goal-view__approval-reason">{sendBackReason}</p>
            ) : null}
          </div>

          {goal.details?.trim() || canEdit ? (
            <section
              className="pd-goal-view__description-card"
              aria-label="Description"
            >
              <div className="pd-goal-view__section-head">
                <p className="pd-goal-view__description-label">Description</p>
                {canEdit && editingSection !== "description" ? (
                  <SectionEditButton
                    label="Edit description"
                    onClick={() =>
                      onRequestEdit(() => setEditingSection("description"))
                    }
                  />
                ) : null}
              </div>
              {editingSection === "description" ? (
                <Textarea
                  value={goal.details ?? ""}
                  placeholder="Add a description (optional)"
                  rows={3}
                  autoFocus
                  onChange={(event) =>
                    patchStructure({
                      details: event.target.value || undefined,
                    })
                  }
                  onBlur={() => setEditingSection(null)}
                />
              ) : (
                <p
                  className={`pd-goal-view__description${
                    goal.details?.trim() ? "" : " is-empty"
                  }`}
                >
                  {goal.details?.trim() || "Add a description"}
                </p>
              )}
            </section>
          ) : null}

          {canEdit && cascadeFromOpen ? (
            <section
              className="pd-goal-view__description-card"
              aria-label="Cascading from"
            >
              <GoalCascadeField
                goal={goal}
                cascadeFrom={cascadeFrom}
                onChange={(next) => {
                  patchStructure(next);
                  setCascadeFromOpen(false);
                }}
              />
            </section>
          ) : cascadeFromSelected ? (
            <section
              className="pd-goal-view__description-card"
              aria-label="Cascading from"
            >
              <div className="pd-goal-view__section-head">
                <CascadeLabel
                  as="p"
                  className="pd-goal-view__description-label"
                >
                  Cascading from
                </CascadeLabel>
                {canEdit ? (
                  <SectionEditButton
                    label="Edit cascading from"
                    onClick={() =>
                      onRequestEdit(() => setCascadeFromOpen(true))
                    }
                  />
                ) : null}
              </div>
              <GoalCascadeFromReadout
                goal={goal}
                cascadeFrom={cascadeFrom}
                hrefFor={cascadeHref}
              />
            </section>
          ) : canEdit && cascadeFrom.managerName ? (
            <button
              type="button"
              className="pd-people__ghost-btn pd-goal-create__add-field"
              onClick={() =>
                onRequestEdit(() => setCascadeFromOpen(true))
              }
            >
              <GitFork size={16} strokeWidth={2} aria-hidden />
              Add cascading from
            </button>
          ) : null}

          {cascadedTo.length > 0 ? (
            <section
              className="pd-goal-view__description-card"
              aria-label="Cascaded to"
            >
              <GoalCascadedTo recipients={cascadedTo} hrefFor={cascadeHref} />
            </section>
          ) : null}
        </header>

        <GoalSummaryCards
          goal={goal}
          cycleLabel={cycleLabel}
          isCurrentCycle={isCurrentCycle}
        />

        {editingSection === "progress" ? (
          <div className="pd-goal-create">
            <div className="pd-goal-create__stack">
              <GoalProgressEditor
                goal={goal}
                onChange={persistStructure}
                onDone={() => setEditingSection(null)}
              />
            </div>
          </div>
        ) : (
          <div className="pd-goal-view__body">
            <div className="pd-goal-view__main">
              <div className="pd-goal-view__section-head">
                <h2>Metrics</h2>
                {canEdit ? (
                  <SectionEditButton
                    label="Edit how to measure progress"
                    onClick={() =>
                      onRequestEdit(() => setEditingSection("progress"))
                    }
                  />
                ) : null}
              </div>
              {panels.length === 0 ? (
                <section className="pd-goal-view__card" aria-label="Milestones">
                  <div className="pd-goal-view__card-head">
                    <div className="pd-goal-view__card-title">
                      <h2>Milestones</h2>
                    </div>
                  </div>
                  <p className="pd-goal-view__empty">
                    No milestones on this goal yet.
                  </p>
                </section>
              ) : (
                panels.map((panel) =>
                  panel.kind === "todo_measure" ? (
                    <TodoMeasureViewCard
                      key={panel.key}
                      panel={panel}
                      renderTodoItem={(todo) => (
                        <>
                          <input
                            type="checkbox"
                            className="pd-goal-v2__todo-check pd-goal-todo__check"
                            checked={todo.complete}
                            disabled={!canMutate}
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
                            className={`pd-goal-view__todo-title${
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
                      className="pd-goal-view__card"
                      aria-label={panel.metric.title.trim() || "Measure"}
                    >
                      <div className="pd-goal-view__card-head">
                        <div className="pd-goal-view__card-title">
                          {panel.metric.title.trim() ? (
                            <h2>{panel.metric.title.trim()}</h2>
                          ) : null}
                        </div>
                        <GoalMetricReadout
                          metric={panel.metric}
                          showWeight={false}
                        />
                        <div className="pd-goal-view__card-metrics">
                          {canUpdateProgress ? (
                            <MetricProgressUpdate
                              metric={panel.metric}
                              goalTitle={goalTitle(goal, index)}
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
                          ) : null}
                          <GoalWeightReadout weight={panel.metric.weight} />
                        </div>
                      </div>
                      <GoalProgressLog
                        entries={panel.metric.progressLog ?? []}
                      />
                    </section>
                  ),
                )
              )}
            </div>
          </div>
        )}

        <section className="pd-goal-view__comments" aria-label="Comments">
          <h2>Comments</h2>
          {comments.length > 0 ? (
            <ul className="pd-goal-view__comment-list">
              {comments.map((item) => (
                <li key={item.id} className="pd-goal-view__comment">
                  <Avatar
                    name={item.authorName}
                    src={commentAuthor(item, commentAuthors)?.avatarUrl}
                    size="sm"
                    className="pd-people__avatar"
                    style={avatarStyle(item.authorName)}
                  />
                  <div>
                    <p className="pd-goal-view__comment-meta">
                      <strong>{item.authorName}</strong>
                      <span>{formatRefreshAge(item.createdAt)}</span>
                    </p>
                    <p className="pd-goal-view__comment-text">{item.text}</p>
                  </div>
                </li>
              ))}
            </ul>
          ) : null}
          <label className="pd-goal-view__composer" htmlFor={commentFieldId}>
            <span className="pd-sr-only">Add comment</span>
            <input
              id={commentFieldId}
              type="text"
              value={comment}
              placeholder="Add comment"
              disabled={!canMutate}
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
              className="pd-goal-view__send"
              aria-label="Send comment"
              disabled={!canMutate || !comment.trim()}
              onClick={submitComment}
            >
              <Send size={16} strokeWidth={1.75} aria-hidden />
            </button>
          </label>
        </section>
      </div>
    </>
  );
}
