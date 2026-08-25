import { useEffect, useId, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronRight, CornerDownRight, CornerLeftDown, Pencil, Save, Send, Target } from "lucide-react";
import { Avatar, Badge, type DropdownMenuItem } from "@/components/ui";
import { avatarStyle } from "@/lib/employees/avatar";
import { newId } from "@/lib/goalsApi";
import {
  appendMilestoneList,
  blankMetric,
  measurementPanels,
  rebalanceMeasurementWeights,
} from "@/lib/goals/measurements";
import type {
  Goal,
  Measurement,
  PersonGoals,
} from "@/lib/goals/types";
import { validateGoalDraft } from "@/lib/goals/draft";
import { editorGoalTitle, isBlankGoalTitle } from "@/lib/goals/weightage";
import { formatRefreshAge, goalTitle } from "./goalHelpers";
import {
  latestProgressAt,
  recordMetricProgress,
  recordMilestoneProgress,
} from "@/lib/goals/progressLog";
import { GoalSummaryCards } from "./GoalSummaryCards";
import type { RequestGoalEdit } from "./useGoalEditGuard";
import {
  EMPTY_LINE_MANAGER_CASCADE,
  GoalCascadeField,
  GoalCascadeFromReadout,
  GoalCascadeToField,
  GoalCascadedTo,
  type CascadeGoalHref,
} from "./GoalCascadeField";
import { GoalActionsMenu, hasGoalActions } from "./GoalActionsMenu";
import type { CascadeTarget } from "./GoalCascadeTargetDialog";
import { GoalEmptyMeasures } from "./GoalEmptyMeasures";
import { GoalProgressEditor } from "./GoalProgressEditor";
import { NumberMeasureViewCard } from "./NumberMeasureViewCard";
import { TodoMeasureViewCard } from "./TodoMeasureViewCard";
import { GoalTodoCheck } from "./GoalTodoCheck";
import { GoalStatusBadge } from "./GoalStatusBadge";
import { statusLabel } from "./statusLabels";
import type {
  CascadeRecipient,
  CascadeToOption,
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
  owner: GoalOwner;
  cascadeFrom?: LineManagerCascade;
  cascadedTo?: CascadeRecipient[];
  cascadeToOptions?: CascadeToOption[];
  cascadeHref?: CascadeGoalHref;
  cycleLabel: string;
  isCurrentCycle?: boolean;
  status: PersonGoals["status"];
  postWindowApprovalStage?: PersonGoals["postWindowApprovalStage"];
  commentAuthorName: string;
  commentAuthorId?: string;
  commentAuthors?: CommentAuthor[];
  /** New unsaved goal — same form as edit, without comments or approval chrome. */
  isNew?: boolean;
  canEdit?: boolean;
  canUpdateProgress?: boolean;
  canRemove?: boolean;
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
  onLinkCascadeTo?: (option: CascadeToOption) => void;
  onUnlinkCascadeTo?: (recipient: CascadeRecipient) => void;
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
  cascadeToOptions = [],
  cascadeHref,
  cycleLabel,
  status,
  postWindowApprovalStage,
  commentAuthorName,
  commentAuthorId,
  commentAuthors = [],
  isNew = false,
  canEdit = false,
  canUpdateProgress = false,
  canRemove = false,
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
  onLinkCascadeTo,
  onUnlinkCascadeTo,
  onRemove,
  highlightMeasureKey,
}: GoalDetailViewProps) {
  const [flashingMeasureKey, setFlashingMeasureKey] = useState<string | null>(
    () => highlightMeasureKey ?? null,
  );
  const [comment, setComment] = useState("");
  const [editing, setEditing] = useState(isNew);
  const [nameTouched, setNameTouched] = useState(false);
  const [cascadeFromOpen, setCascadeFromOpen] = useState(false);
  const [cascadeToOpen, setCascadeToOpen] = useState(false);
  const [titleDraft, setTitleDraft] = useState(() => editorGoalTitle(goal));
  const [detailsDraft, setDetailsDraft] = useState(goal.details ?? "");
  const titleRef = useRef<HTMLTextAreaElement>(null);
  const titleFocusedRef = useRef(false);
  const detailsFocusedRef = useRef(false);
  const editSnapshotRef = useRef<Goal | null>(null);
  const goalRef = useRef(goal);
  const commentFieldId = useId();
  const titleFieldId = useId();
  const detailsFieldId = useId();
  goalRef.current = goal;
  const isEditing = canEdit && editing;
  const canLogProgress = canUpdateProgress || canEdit;
  const canMutate = canEdit || canUpdateProgress;

  useEffect(() => {
    setCascadeFromOpen(false);
    setCascadeToOpen(false);
    setNameTouched(isNew);
    setTitleDraft(editorGoalTitle(goal));
    setDetailsDraft(goal.details ?? "");
    setEditing(isNew);
    editSnapshotRef.current = null;
  }, [goal.id, isNew]);

  useEffect(() => {
    if (!highlightMeasureKey) {
      setFlashingMeasureKey(null);
      return;
    }
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
  const goalNamed = !isBlankGoalTitle({ description: titleDraft });
  const draftValidation = validateGoalDraft({
    ...goal,
    description: titleDraft,
    details: detailsDraft || undefined,
  });
  const textDraftDirty =
    titleDraft !== goal.description || detailsDraft !== (goal.details ?? "");
  const saveEnabled = (hasUnsavedChanges || textDraftDirty) && goalNamed;
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
    setCascadeToOpen(false);
    setNameTouched(false);
    setEditing(true);
  };

  const beginEditingWithMeasures = (measurements: Measurement[]) => {
    onRequestEdit(() => {
      startEditing();
      persistStructure(touch(goalRef.current, { measurements }));
    });
  };

  const stopEditing = () => {
    setEditing(false);
    setCascadeFromOpen(false);
    setCascadeToOpen(false);
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

  const cascadeFromControl =
    isEditing && goalNamed && (cascadeFromOpen || cascadeFromSelected) ? (
      <section className="pd-goal-view__header-cascade" aria-label="Cascading from">
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
      <section className="pd-goal-view__header-cascade" aria-label="Cascading from">
        <GoalCascadeFromReadout
          goal={goal}
          cascadeFrom={cascadeFrom}
          hrefFor={cascadeHref}
        />
      </section>
    ) : isEditing && cascadeFrom.managerName ? (
      <button
        type="button"
        className="pd-goal-create__add-field"
        disabled={!goalNamed}
        title={!goalNamed ? "Name the goal first" : undefined}
        onClick={() => setCascadeFromOpen(true)}
      >
        <CornerLeftDown size={11} strokeWidth={2.25} aria-hidden />
        Add cascading from
      </button>
    ) : null;

  const canOfferCascadeTo = Boolean(
    isEditing && !isNew && (onLinkCascadeTo || onCascade),
  );
  const canEditCascadeTo = Boolean(canOfferCascadeTo && goalNamed);
  const hasCascadeToChoices =
    cascadeToOptions.length > 0 ||
    Boolean(onCascade && cascadeTargets.length > 0);
  const cascadeToControl =
    canEditCascadeTo && (cascadeToOpen || cascadedTo.length > 0) ? (
      <section className="pd-goal-view__header-cascade" aria-label="Cascaded to">
        <GoalCascadeToField
          recipients={cascadedTo}
          options={cascadeToOptions}
          targets={cascadeTargets}
          hrefFor={cascadeHref}
          onLink={
            onLinkCascadeTo
              ? (option) => {
                  onLinkCascadeTo(option);
                  setCascadeToOpen(false);
                }
              : undefined
          }
          onUnlink={onUnlinkCascadeTo}
          onCreate={
            onCascade
              ? (reportIds) => {
                  onCascade(reportIds);
                  setCascadeToOpen(false);
                }
              : undefined
          }
        />
      </section>
    ) : canOfferCascadeTo && hasCascadeToChoices ? (
      <button
        type="button"
        className="pd-goal-create__add-field"
        disabled={!goalNamed}
        title={!goalNamed ? "Name the goal first" : undefined}
        onClick={() => setCascadeToOpen(true)}
      >
        <CornerDownRight size={11} strokeWidth={2.25} aria-hidden />
        Add cascading to
      </button>
    ) : cascadedTo.length > 0 ? (
      <section className="pd-goal-view__header-cascade" aria-label="Cascaded to">
        <GoalCascadedTo recipients={cascadedTo} hrefFor={cascadeHref} />
      </section>
    ) : null;

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

  const sessionActions: DropdownMenuItem[] = [];
  if (canEdit && !isEditing) {
    sessionActions.push({
      id: "edit",
      label: "Edit",
      icon: <Pencil size={16} strokeWidth={1.75} />,
      onSelect: () => onRequestEdit(startEditing),
    });
  }
  if (isEditing && !isNew) {
    sessionActions.push({
      id: "cancel",
      label: "Cancel",
      onSelect: cancelEditing,
    });
  }
  if (isEditing) {
    sessionActions.push({
      id: "save",
      label: "Save",
      icon: <Save size={16} strokeWidth={1.75} />,
      disabled: !saveEnabled,
      onSelect: () => onRequestEdit(saveDraft),
    });
  }
  const showActions = hasGoalActions({
    onDuplicate,
    onRemove,
    canRemove,
    onViewActivity: Boolean(cycleId),
    fullViewHref,
    extraItems: sessionActions,
  });
  const actionsMenu = showActions ? (
    <GoalActionsMenu
      variant="menu"
      label="Goal actions"
      canRemove={canRemove}
      extraItems={sessionActions}
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
      onDuplicate={goalNamed ? onDuplicate : undefined}
      onRemove={onRemove}
    />
  ) : null;
  const statusText =
    status === "submitted" && postWindowApprovalStage === "manager_manager"
      ? "Pending final approval"
      : statusLabel(status);
  const statusBadge = (
    <GoalStatusBadge status={status} className="pd-goal-view__title-status">
      {statusText}
    </GoalStatusBadge>
  );

  return (
    <div className="pd-goal-view" aria-label={isNew ? "Add goal" : title}>
      <header className="pd-goal-view__header">
        <div className="pd-goal-view__window-title">
          <p>
            <Target size={16} strokeWidth={2.25} aria-hidden />
            Goal
            <Badge variant="neutral" className="pd-goal-view__cycle">
              {cycleLabel}
            </Badge>
          </p>
          {isNew && !actionsMenu ? null : (
            <div className="pd-goal-view__window-meta">
              {isNew ? null : (
                <>
                  <p className="pd-goal-view__updated">
                    {lastProgressAt
                      ? `Updated ${formatRefreshAge(lastProgressAt)}`
                      : "No updates yet"}
                  </p>
                  {statusBadge}
                </>
              )}
              {actionsMenu}
            </div>
          )}
        </div>
        {cascadeFromControl}
        <div className="pd-goal-view__chrome">
          {isEditing ? (
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
              {(nameTouched || !goalNamed) && draftValidation.nameError ? (
                <p className="pd-goal-create__title-error" role="alert">
                  {draftValidation.nameError}
                </p>
              ) : null}
            </div>
          ) : (
            <h1 className="pd-goal-view__title">{title}</h1>
          )}
        </div>
        {cascadeToControl}

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
              isEditing && goalNamed
                ? (weight) => patchStructure({ weight })
                : undefined
            }
          />
        </div>
      </header>

      <div className="pd-goal-view__panel">
          {goal.details?.trim() || isEditing ? (
            <details
              key={isEditing ? "edit" : "view"}
              className="pd-goal-view__note"
              open={isEditing || undefined}
            >
              <summary
                className={
                  isEditing
                    ? "pd-goal-view__note-label is-static"
                    : "pd-goal-view__note-label"
                }
                onClick={
                  isEditing
                    ? (event) => {
                        event.preventDefault();
                      }
                    : undefined
                }
              >
                Description
                {isEditing ? null : (
                  <ChevronRight
                    size={12}
                    strokeWidth={2.25}
                    className="pd-goal-view__note-chevron"
                    aria-hidden
                  />
                )}
              </summary>
              {isEditing ? (
                <textarea
                  id={detailsFieldId}
                  className="pd-goal-view__description-input"
                  value={detailsDraft}
                  placeholder="Add a description (optional)"
                  rows={3}
                  aria-label="Description"
                  disabled={!goalNamed}
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
            </details>
          ) : null}

          {isEditing ? (
            <div className="pd-goal-create">
              <div className="pd-goal-create__stack">
                <GoalProgressEditor
                  goal={goal}
                  onChange={persistStructure}
                  progressAuthor={progressAuthor}
                  cycleLabel={cycleLabel}
                  locked={!goalNamed}
                />
              </div>
            </div>
          ) : (
            <div className="pd-goal-view__body">
              <div className="pd-goal-view__main">
                {panels.length === 0 ? (
                  <GoalEmptyMeasures
                    canAdd={canEdit}
                    onAddMilestones={() =>
                      beginEditingWithMeasures(
                        appendMilestoneList(goalRef.current.measurements),
                      )
                    }
                    onAddNumber={() =>
                      beginEditingWithMeasures(
                        rebalanceMeasurementWeights([
                          ...goalRef.current.measurements,
                          blankMetric("increase"),
                        ]),
                      )
                    }
                  />
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

      {!isNew ? (
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
              disabled={!canMutate || (isEditing && !goalNamed)}
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
              disabled={!canMutate || (isEditing && !goalNamed) || !comment.trim()}
              onClick={submitComment}
            >
              <Send size={16} strokeWidth={1.75} aria-hidden />
            </button>
          </label>
        </section>
      ) : null}
    </div>
  );
}
