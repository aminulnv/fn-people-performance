import { useEffect, useId, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { GitFork, Pencil, Save, Send } from "lucide-react";
import {
  Avatar,
  Badge,
  CountBadge,
  SegmentedControl,
} from "@/components/ui";
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
import { validateGoalDraft } from "@/lib/goals/draft";
import { editorGoalTitle } from "@/lib/goals/weightage";
import { formatRefreshAge, goalTitle } from "./goalHelpers";
import {
  latestProgressAt,
  recordMetricProgress,
  recordMilestoneProgress,
} from "@/lib/goals/progressLog";
import { GoalSummaryCards } from "./GoalSummaryCards";
import { GoalApprovalCard } from "./GoalApprovalCard";
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
import { NumberMeasureViewCard } from "./NumberMeasureViewCard";
import { TodoMeasureViewCard } from "./TodoMeasureViewCard";
import { GoalTodoCheck } from "./GoalTodoCheck";
import { statusLabel, statusVariant } from "./statusLabels";
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

type GoalViewTab = "details" | "measure" | "discuss";

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
  /** New unsaved goal — same form as edit, without discuss/approval chrome. */
  isNew?: boolean;
  canEdit?: boolean;
  canUpdateProgress?: boolean;
  canRemove?: boolean;
  canCascade?: boolean;
  cascadeTargets?: CascadeTarget[];
  /** Used for the quiet Activity log entry in the toolbar. */
  cycleId?: string;
  subjectId?: string;
  /** Opens the unified goal detail page from the toolbar. */
  fullViewHref?: string;
  onRequestEdit?: RequestGoalEdit;
  /**
   * Kept for callers. Edit-session fields stay local until Save;
   * progress logging always goes through `onChange`.
   */
  manualSave?: boolean;
  /** Enables Save when the parent draft differs from what is persisted. */
  hasUnsavedChanges?: boolean;
  onChange: (goal: Goal) => void;
  /** Persist a comment immediately, even while structural edits stay local. */
  onAddComment?: (text: string) => void;
  /** Persist the edit session and return to view. */
  onSave?: (goal: Goal) => void;
  onDuplicate?: () => void;
  onCascade?: (reportIds: string[]) => void;
  onRemove?: () => void;
  /** Measure that opened this window — flashes that card for a few seconds. */
  highlightMeasureKey?: string | null;
};

function touch(goal: Goal, partial: Partial<Goal>): Goal {
  return { ...goal, ...partial, updatedAt: new Date().toISOString() };
}

export function GoalDetailView({
  goal,
  index,
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
  isNew = false,
  canEdit = false,
  canUpdateProgress = false,
  canRemove = false,
  canCascade = false,
  cascadeTargets = [],
  cycleId,
  subjectId,
  fullViewHref,
  onRequestEdit = (startEditing) => startEditing(),
  hasUnsavedChanges = false,
  onChange,
  onAddComment,
  onSave,
  onDuplicate,
  onCascade,
  onRemove,
  highlightMeasureKey,
}: GoalDetailViewProps) {
  const [tab, setTab] = useState<GoalViewTab>("measure");
  const [flashingMeasureKey, setFlashingMeasureKey] = useState<string | null>(
    () => highlightMeasureKey ?? null,
  );
  const [comment, setComment] = useState("");
  const [editing, setEditing] = useState(isNew);
  const [nameTouched, setNameTouched] = useState(false);
  const [cascadeFromOpen, setCascadeFromOpen] = useState(false);
  const [titleDraft, setTitleDraft] = useState(() => editorGoalTitle(goal));
  const [detailsDraft, setDetailsDraft] = useState(goal.details ?? "");
  const titleRef = useRef<HTMLTextAreaElement>(null);
  const titleFocusedRef = useRef(false);
  const detailsFocusedRef = useRef(false);
  const editSnapshotRef = useRef<Goal | null>(null);
  const goalRef = useRef(goal);
  const commentFieldId = useId();
  const titleFieldId = useId();
  goalRef.current = goal;
  const isEditing = canEdit && editing;
  const canLogProgress = canUpdateProgress || canEdit;
  const canMutate = canEdit || canUpdateProgress;

  useEffect(() => {
    setCascadeFromOpen(false);
    setNameTouched(false);
    setTitleDraft(editorGoalTitle(goal));
    setDetailsDraft(goal.details ?? "");
    setTab("measure");
    setEditing(isNew);
    editSnapshotRef.current = null;
  }, [goal.id, isNew]);

  useEffect(() => {
    if (!highlightMeasureKey) {
      setFlashingMeasureKey(null);
      return;
    }
    setTab("measure");
    setFlashingMeasureKey(highlightMeasureKey);
    const timeout = window.setTimeout(() => setFlashingMeasureKey(null), 2800);
    return () => window.clearTimeout(timeout);
  }, [highlightMeasureKey]);

  useEffect(() => {
    if (!flashingMeasureKey) return;
    const node = document.querySelector(
      `[data-measure-panel="${CSS.escape(flashingMeasureKey)}"]`,
    );
    node?.scrollIntoView?.({ block: "nearest", behavior: "smooth" });
  }, [flashingMeasureKey]);

  useEffect(() => {
    if (titleFocusedRef.current) return;
    setTitleDraft(editorGoalTitle(goal));
  }, [goal.description]);

  useEffect(() => {
    if (detailsFocusedRef.current) return;
    setDetailsDraft(goal.details ?? "");
  }, [goal.details]);

  useEffect(() => {
    if (!isEditing) return;
    titleRef.current?.focus();
  }, [isEditing, goal.id]);

  const title = goalTitle({ ...goal, description: titleDraft }, index);
  const draftValidation = validateGoalDraft({
    ...goal,
    description: titleDraft,
    details: detailsDraft || undefined,
  });
  const textDraftDirty =
    titleDraft !== goal.description || detailsDraft !== (goal.details ?? "");
  const saveEnabled = hasUnsavedChanges || textDraftDirty;
  const panels = measurementPanels(goal.measurements);
  const comments = goal.comments ?? [];
  const progressAuthor = {
    id: commentAuthorId,
    name: commentAuthorName,
  };
  const lastProgressAt = latestProgressAt(goal);
  const cascadeFromSelected = Boolean(
    goal.cascadedFromGoalId || goal.linkedGoalLabel,
  );

  const persistStructure = (next: Goal) => {
    goalRef.current = next;
    onChange(next);
  };

  const goalWithTextDrafts = (base: Goal): Goal => {
    let next = base;
    if (titleDraft !== base.description) {
      next = touch(next, { description: titleDraft });
    }
    if (detailsDraft !== (base.details ?? "")) {
      next = touch(next, { details: detailsDraft || undefined });
    }
    return next;
  };

  const startEditing = () => {
    editSnapshotRef.current = goalRef.current;
    setTitleDraft(editorGoalTitle(goalRef.current));
    setDetailsDraft(goalRef.current.details ?? "");
    setCascadeFromOpen(false);
    setNameTouched(false);
    setEditing(true);
  };

  const stopEditing = () => {
    setEditing(false);
    setCascadeFromOpen(false);
    setNameTouched(false);
    editSnapshotRef.current = null;
  };

  const saveDraft = () => {
    const next = goalWithTextDrafts(goalRef.current);
    goalRef.current = next;
    if (onSave) onSave(next);
    else onChange(next);
    if (!isNew) stopEditing();
  };

  const cancelEditing = () => {
    const snapshot = editSnapshotRef.current;
    if (snapshot) {
      goalRef.current = snapshot;
      onChange(snapshot);
      setTitleDraft(editorGoalTitle(snapshot));
      setDetailsDraft(snapshot.details ?? "");
    }
    stopEditing();
  };

  const commitTitleDraft = () => {
    if (titleDraft === goalRef.current.description) return;
    persistStructure(touch(goalRef.current, { description: titleDraft }));
  };

  const commitDetailsDraft = () => {
    if ((goalRef.current.details ?? "") === detailsDraft) return;
    persistStructure(
      touch(goalRef.current, { details: detailsDraft || undefined }),
    );
  };

  const patchStructure = (partial: Partial<Goal>) => {
    persistStructure(touch(goalRef.current, partial));
  };

  const patchMeasurement = (id: string, next: Measurement) => {
    const updated = touch(goalRef.current, {
      measurements: goalRef.current.measurements.map((item) =>
        item.id === id ? next : item,
      ),
    });
    goalRef.current = updated;
    onChange(updated);
  };

  const submitComment = () => {
    const text = comment.trim();
    if (!text) return;
    if (onAddComment) {
      onAddComment(text);
      setComment("");
      return;
    }
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
  const showToolbar = hasOverflowMenu || canEdit;
  const statusText =
    status === "submitted" && postWindowApprovalStage === "manager_manager"
      ? "Pending final approval"
      : statusLabel(status);
  const statusBadge = (
    <Badge
      variant={statusVariant(status)}
      className="pd-goal-view__title-status"
    >
      {statusText}
    </Badge>
  );

  return (
    <div className="pd-goal-view" aria-label={isNew ? "Add goal" : title}>
      <SegmentedControl
        className="pd-goal-view__tabs"
        aria-label="Goal sections"
        value={tab}
        onChange={setTab}
        options={[
          { id: "details", label: "Details" },
          { id: "measure", label: "Measure" },
          ...(isNew
            ? []
            : [
                {
                  id: "discuss" as const,
                  label: (
                    <>
                      Discuss
                      <CountBadge count={comments.length} tone="muted" />
                    </>
                  ),
                },
              ]),
        ]}
      />

      <header className="pd-goal-view__header">
        <div className="pd-goal-view__chrome">
          {isEditing ? (
            <>
              <div className="pd-goal-create__title-edit">
                <label className="pd-sr-only" htmlFor={titleFieldId}>
                  Goal name
                </label>
                <textarea
                  id={titleFieldId}
                  ref={titleRef}
                  className="pd-goal-create__title-input"
                  value={titleDraft}
                  rows={1}
                  placeholder={isNew ? "Name this goal" : "Goal name"}
                  aria-invalid={Boolean(draftValidation.nameError)}
                  onFocus={() => {
                    titleFocusedRef.current = true;
                  }}
                  onChange={(event) => setTitleDraft(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      titleFocusedRef.current = false;
                      commitTitleDraft();
                      titleRef.current?.blur();
                    }
                    if (event.key === "Escape") {
                      setTitleDraft(goal.description);
                      titleFocusedRef.current = false;
                      titleRef.current?.blur();
                    }
                  }}
                  onBlur={() => {
                    titleFocusedRef.current = false;
                    setNameTouched(true);
                    commitTitleDraft();
                  }}
                />
                {nameTouched && draftValidation.nameError ? (
                  <p className="pd-goal-create__title-error" role="alert">
                    {draftValidation.nameError}
                  </p>
                ) : null}
              </div>
              {isNew ? null : statusBadge}
            </>
          ) : (
            <h1 className="pd-goal-view__title">
              {title}
              {statusBadge}
            </h1>
          )}
        </div>

        <div className="pd-goal-view__byline">
          <div className="pd-goal-view__byline-start">
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
          </div>
          <GoalSummaryCards
            goal={goal}
            onWeightChange={
              isEditing ? (weight) => patchStructure({ weight }) : undefined
            }
          />
        </div>
        {status === "sent_back" && sendBackReason ? (
          <p className="pd-goal-view__status-reason">{sendBackReason}</p>
        ) : null}
      </header>

      {tab === "details" ? (
        <div className="pd-goal-view__panel">
          {isNew ? null : (
            <GoalApprovalCard
              status={status}
              postWindowApprovalStage={postWindowApprovalStage}
              sendBackReason={sendBackReason}
              sendBackBy={sendBackBy}
              approvedBy={approvedBy}
              cascadeFrom={cascadeFrom}
            />
          )}

          {isNew ? null : (
            <p className="pd-goal-view__updated">
              <span className="pd-goal-view__cycle">
                {cycleLabel}
                {isCurrentCycle ? (
                  <Badge variant="completed">Current</Badge>
                ) : null}
              </span>
              <span>
                {lastProgressAt
                  ? `Updated ${formatRefreshAge(lastProgressAt)}`
                  : "No progress updates yet"}
              </span>
            </p>
          )}

          {goal.details?.trim() || isEditing ? (
            <section
              className="pd-goal-view__description-card"
              aria-label="Description"
            >
              <p className="pd-goal-view__description-label">Description</p>
              {isEditing ? (
                <textarea
                  className="pd-goal-view__description-input"
                  value={detailsDraft}
                  placeholder="Add a description (optional)"
                  rows={3}
                  onFocus={() => {
                    detailsFocusedRef.current = true;
                  }}
                  onChange={(event) => setDetailsDraft(event.target.value)}
                  onBlur={() => {
                    detailsFocusedRef.current = false;
                    commitDetailsDraft();
                  }}
                />
              ) : (
                <p className="pd-goal-view__description">
                  {goal.details?.trim()}
                </p>
              )}
            </section>
          ) : null}

          {isEditing && (cascadeFromOpen || cascadeFromSelected) ? (
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
              <CascadeLabel
                as="p"
                className="pd-goal-view__description-label"
              >
                Cascading from
              </CascadeLabel>
              <GoalCascadeFromReadout
                goal={goal}
                cascadeFrom={cascadeFrom}
                hrefFor={cascadeHref}
              />
            </section>
          ) : isEditing && cascadeFrom.managerName ? (
            <button
              type="button"
              className="pd-people__ghost-btn pd-goal-create__add-field"
              onClick={() => setCascadeFromOpen(true)}
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
        </div>
      ) : null}

      {tab === "measure" ? (
        <div className="pd-goal-view__panel">
          {isEditing ? (
            <div className="pd-goal-create">
              <div className="pd-goal-create__stack">
                <GoalProgressEditor
                  goal={goal}
                  onChange={persistStructure}
                  measureNameError={draftValidation.measurementNameError}
                  measurementWeightError={draftValidation.measurementWeightError}
                  progressAuthor={progressAuthor}
                  cycleLabel={cycleLabel}
                />
              </div>
            </div>
          ) : (
            <div className="pd-goal-view__body">
              <div className="pd-goal-view__main">
                {panels.length === 0 ? (
                  <section className="pd-goal-view__fold" aria-label="Measures">
                    <p className="pd-goal-view__empty">
                      No measures on this goal yet.
                    </p>
                  </section>
                ) : (
                  panels.map((panel) =>
                    panel.kind === "todo_measure" ? (
                      <TodoMeasureViewCard
                        key={panel.key}
                        panel={panel}
                        highlighted={flashingMeasureKey === panel.key}
                        renderTodoItem={(todo) => (
                          <>
                            <GoalTodoCheck
                              checked={todo.complete}
                              disabled={!canLogProgress}
                              ariaLabel={`Mark ${
                                todo.title.trim() || "task"
                              } complete`}
                              onChange={(complete) =>
                                patchMeasurement(
                                  todo.id,
                                  recordMilestoneProgress(
                                    todo,
                                    complete,
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
                              {todo.title || "Untitled task"}
                            </p>
                          </>
                        )}
                      />
                    ) : (
                      <NumberMeasureViewCard
                        key={panel.key}
                        metric={panel.metric}
                        highlighted={flashingMeasureKey === panel.key}
                        goalTitle={goalTitle(goal, index)}
                        cycleLabel={cycleLabel}
                        onLogProgress={
                          canLogProgress
                            ? (nextValue) =>
                                patchMeasurement(
                                  panel.metric.id,
                                  recordMetricProgress(
                                    panel.metric,
                                    nextValue,
                                    progressAuthor,
                                  ),
                                )
                            : undefined
                        }
                      />
                    ),
                  )
                )}
              </div>
            </div>
          )}
        </div>
      ) : null}

      {tab === "discuss" && !isNew ? (
        <section className="pd-goal-view__comments" aria-label="Comments">
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
          ) : (
            <p className="pd-goal-view__empty">No comments yet.</p>
          )}
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
      ) : null}

      {showToolbar ? (
        <footer className="pd-goal-view__toolbar">
          {canEdit && !isEditing ? (
            <button
              type="button"
              className="pd-people__ghost-btn"
              aria-label="Edit goal"
              onClick={() => onRequestEdit(startEditing)}
            >
              <Pencil size={16} strokeWidth={1.75} aria-hidden />
              Edit
            </button>
          ) : null}
          {isEditing && !isNew ? (
            <button
              type="button"
              className="pd-people__ghost-btn"
              onClick={cancelEditing}
            >
              Cancel
            </button>
          ) : null}
          {isEditing ? (
            <button
              type="button"
              className="pd-people__ghost-btn pd-people__ghost-btn--primary"
              aria-label="Save as draft"
              disabled={!saveEnabled}
              onClick={() => onRequestEdit(saveDraft)}
            >
              <Save size={16} strokeWidth={1.75} aria-hidden />
              Save
            </button>
          ) : null}
          {hasOverflowMenu ? (
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
          ) : null}
        </footer>
      ) : null}

    </div>
  );
}
