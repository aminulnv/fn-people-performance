import {
  useEffect,
  useId,
  useRef,
  useState,
  type DragEvent,
  type PointerEvent,
} from "react";
import { Link } from "react-router-dom";
import { ChevronLeft, ChevronRight, CornerDownRight, CornerLeftDown, MoreHorizontal, Pencil, Send, Target, Trash2 } from "lucide-react";
import {
  Avatar,
  Badge,
  Button,
  ConfirmDialog,
  DropdownMenu,
  type DropdownMenuItem,
} from "@/components/ui";
import { avatarStyle } from "@/lib/employees/avatar";
import { newId } from "@/lib/goalsApi";
import {
  appendMilestoneList,
  blankMetric,
  measurementPanels,
  rebalanceMeasurementWeights,
  withMeasureProof,
} from "@/lib/goals/measurements";
import type {
  Goal,
  GoalComment,
  Measurement,
  PersonGoals,
} from "@/lib/goals/types";
import type { MentionablePerson } from "@/lib/goals/mentions";
import { isOwnGoalComment } from "@/lib/goals/operations";
import { GoalCommentField } from "./GoalCommentField";
import { GoalCommentText } from "./GoalCommentText";
import { validateGoalDraft } from "@/lib/goals/draft";
import { editorGoalTitle, isBlankGoalTitle } from "@/lib/goals/weightage";
import {
  applyOkrPayloadToGoal,
  dataTransferHasOkrGoal,
  readOkrGoalDropPayload,
} from "@/lib/okr/applyToGoal";
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

type CommentAuthor = MentionablePerson & {
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

function GoalCommentItem({
  item,
  authors,
  canManage,
  onUpdate,
  onRemove,
}: {
  item: GoalComment;
  authors: CommentAuthor[];
  canManage: boolean;
  onUpdate: (commentId: string, text: string) => void;
  onRemove: (commentId: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(item.text);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const fieldId = useId();

  const startEditing = () => {
    setDraft(item.text);
    setEditing(true);
  };

  const cancelEditing = () => {
    setDraft(item.text);
    setEditing(false);
  };

  const saveEdit = () => {
    const trimmed = draft.trim();
    if (!trimmed || trimmed === item.text) {
      cancelEditing();
      return;
    }
    onUpdate(item.id, trimmed);
    setEditing(false);
  };

  return (
    <li className="pd-goal-view__comment">
      <Avatar
        name={item.authorName}
        src={commentAuthor(item, authors)?.avatarUrl}
        size="sm"
        className="pd-people__avatar"
        style={avatarStyle(item.authorName)}
      />
      <div className="pd-goal-view__comment-body">
        <div className="pd-goal-view__comment-main">
          <p className="pd-goal-view__comment-meta">
            <strong>{item.authorName}</strong>
            <span>{formatRefreshAge(item.createdAt)}</span>
          </p>
          {editing ? (
            <div className="pd-goal-view__comment-edit">
              <GoalCommentField
                id={fieldId}
                value={draft}
                onChange={setDraft}
                people={authors}
                label="Edit Comment"
                onSubmit={saveEdit}
                onCancel={cancelEditing}
              />
              <div className="pd-goal-view__comment-edit-actions">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={cancelEditing}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  disabled={!draft.trim() || draft.trim() === item.text}
                  onClick={saveEdit}
                >
                  Save
                </Button>
              </div>
            </div>
          ) : (
            <GoalCommentText text={item.text} people={authors} />
          )}
        </div>
        {canManage && !editing ? (
          <DropdownMenu
            label="Comment actions"
            align="end"
            trigger={
              <MoreHorizontal size={16} strokeWidth={1.75} aria-hidden />
            }
            triggerProps={{
              className: "pd-people__icon-btn",
              "aria-label": "Comment actions",
            }}
            items={[
              {
                id: "edit",
                label: "Edit",
                icon: <Pencil size={16} strokeWidth={1.75} />,
                onSelect: startEditing,
              },
              {
                id: "delete",
                label: "Delete",
                danger: true,
                icon: <Trash2 size={16} strokeWidth={1.75} />,
                onSelect: () => setConfirmRemove(true),
              },
            ]}
          />
        ) : null}
      </div>
      <ConfirmDialog
        open={confirmRemove}
        onClose={() => setConfirmRemove(false)}
        onConfirm={() => {
          setConfirmRemove(false);
          onRemove(item.id);
        }}
        title="Delete this comment?"
        description="This comment will be removed. This cannot be undone."
        confirmLabel="Delete Comment"
        cancelLabel="Keep Comment"
        confirmVariant="danger"
      />
    </li>
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
   * Kept for callers. Named structural commits go through `onSave`;
   * progress logging always goes through `onChange`.
   */
  manualSave?: boolean;
  /** Kept for callers. Field commits persist on blur when named. */
  hasUnsavedChanges?: boolean;
  onChange: (goal: Goal) => void;
  /** Persist a comment immediately. */
  onAddComment?: (text: string) => void;
  onUpdateComment?: (commentId: string, text: string) => void;
  onRemoveComment?: (commentId: string) => void;
  /** Persist a named structural commit (field blur or discrete action). */
  onSave?: (goal: Goal) => void;
  onDuplicate?: () => void;
  onCascade?: (reportIds: string[]) => void;
  onLinkCascadeTo?: (option: CascadeToOption) => void;
  onUnlinkCascadeTo?: (recipient: CascadeRecipient) => void;
  onRemove?: () => void;
  /** Measure that opened this window — keeps that card highlighted. */
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
  hasUnsavedChanges: _hasUnsavedChanges = false,
  onChange,
  onAddComment,
  onUpdateComment,
  onRemoveComment,
  onSave,
  onDuplicate,
  onCascade,
  onLinkCascadeTo,
  onUnlinkCascadeTo,
  onRemove,
  highlightMeasureKey,
}: GoalDetailViewProps) {
  const [measureWindowKey, setMeasureWindowKey] = useState<string | null>(
    () => highlightMeasureKey ?? null,
  );
  const [comment, setComment] = useState("");
  const [editing, setEditing] = useState(isNew);
  const [nameTouched, setNameTouched] = useState(false);
  const [cascadeFromOpen, setCascadeFromOpen] = useState(false);
  const [cascadeToOpen, setCascadeToOpen] = useState(false);
  const [titleDraft, setTitleDraft] = useState(() => editorGoalTitle(goal));
  const [detailsDraft, setDetailsDraft] = useState(goal.details ?? "");
  const [okrDropActive, setOkrDropActive] = useState(false);
  const titleRef = useRef<HTMLTextAreaElement>(null);
  const titleFocusedRef = useRef(false);
  const detailsFocusedRef = useRef(false);
  const skipTitleCommitRef = useRef(false);
  const skipDetailsCommitRef = useRef(false);
  const lastMeasureClickRef = useRef<{ key: string; at: number } | null>(
    null,
  );
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
    setNameTouched(false);
    setTitleDraft(editorGoalTitle(goal));
    setDetailsDraft(goal.details ?? "");
    setEditing(isNew);
    // First persist flips isNew on the same id — stay in the edit session.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- goal.id
  }, [goal.id]);

  useEffect(() => {
    setMeasureWindowKey(highlightMeasureKey ?? null);
  }, [highlightMeasureKey]);

  useEffect(() => {
    if (!highlightMeasureKey) return;
    const node = document.querySelector(
      `[data-measure-panel="${CSS.escape(highlightMeasureKey)}"]`,
    );
    node?.scrollIntoView?.({ block: "nearest", behavior: "smooth" });
  }, [highlightMeasureKey]);

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
  const nameInvalid = nameTouched && Boolean(draftValidation.nameError);
  const panels = measurementPanels(goal.measurements);
  const measureWindowPanels = measureWindowKey
    ? panels.filter((panel) => panel.key === measureWindowKey)
    : panels;
  const canFocusMeasure = !measureWindowKey && panels.length > 1;
  const openMeasureWindow = (key: string) => {
    lastMeasureClickRef.current = null;
    setMeasureWindowKey(key);
  };
  const armMeasureWindow = (key: string) => {
    const now = Date.now();
    const last = lastMeasureClickRef.current;
    if (last && last.key === key && now - last.at < 500) {
      openMeasureWindow(key);
      return;
    }
    lastMeasureClickRef.current = { key, at: now };
  };
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
    const named = !isBlankGoalTitle({ description: next.description });
    if (named && onSave) {
      onSave(next);
      return;
    }
    onChange(next);
  };

  const applyDroppedOkr = (event: DragEvent<HTMLDivElement>) => {
    if (!canEdit) return;
    const payload = readOkrGoalDropPayload(event.dataTransfer);
    if (!payload) return;
    event.preventDefault();
    setOkrDropActive(false);
    onRequestEdit(() => {
      const next = applyOkrPayloadToGoal(goalRef.current, payload);
      setTitleDraft(next.description);
      setDetailsDraft(next.details ?? "");
      setEditing(true);
      persistStructure(next);
    });
  };

  const startEditing = () => {
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
  };

  const markNameTouchedIfLeaving = (
    event: PointerEvent<HTMLDivElement>,
  ) => {
    if (!isEditing || goalNamed) return;
    const target = event.target;
    if (!(target instanceof Node)) return;
    const titleEdit = titleRef.current?.closest(".pd-goal-create__title-edit");
    if (titleEdit?.contains(target) || titleRef.current?.contains(target)) {
      return;
    }
    setNameTouched(true);
  };

  const cancelEditing = () => {
    setTitleDraft(editorGoalTitle(goalRef.current));
    setDetailsDraft(goalRef.current.details ?? "");
    stopEditing();
  };

  const commitTitleDraft = () => {
    if (titleDraft === goalRef.current.description) return;
    if (isBlankGoalTitle({ description: titleDraft })) return;
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
        Add Cascading From
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
        Add Cascading To
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

  const persistCommentText = (commentId: string, text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    if (onUpdateComment) {
      onUpdateComment(commentId, trimmed);
      return;
    }
    onChange(
      touch(goal, {
        comments: comments.map((item) =>
          item.id === commentId ? { ...item, text: trimmed } : item,
        ),
      }),
    );
  };

  const persistCommentRemoval = (commentId: string) => {
    if (onRemoveComment) {
      onRemoveComment(commentId);
      return;
    }
    onChange(
      touch(goal, {
        comments: comments.filter((item) => item.id !== commentId),
      }),
    );
  };

  const canManageComments = canMutate && !(isEditing && !goalNamed);

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
    <div
      className={okrDropActive ? "pd-goal-view is-okr-drop" : "pd-goal-view"}
      aria-label={isNew ? "Add Goal" : title}
      onPointerDownCapture={markNameTouchedIfLeaving}
      onDragEnter={(event) => {
        if (!canEdit || !dataTransferHasOkrGoal(event.dataTransfer)) return;
        event.preventDefault();
        setOkrDropActive(true);
      }}
      onDragOver={(event) => {
        if (!canEdit || !dataTransferHasOkrGoal(event.dataTransfer)) return;
        event.preventDefault();
        event.dataTransfer.dropEffect = "copy";
      }}
      onDragLeave={(event) => {
        if (event.currentTarget.contains(event.relatedTarget as Node)) return;
        setOkrDropActive(false);
      }}
      onDrop={applyDroppedOkr}
    >
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
                autoFocus={isNew}
                data-autofocus={isNew ? true : undefined}
                aria-invalid={nameInvalid || undefined}
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
                    skipTitleCommitRef.current = true;
                    setTitleDraft(goalRef.current.description);
                    titleFocusedRef.current = false;
                    titleRef.current?.blur();
                  }
                }}
                onBlur={() => {
                  titleFocusedRef.current = false;
                  setNameTouched(true);
                  if (skipTitleCommitRef.current) {
                    skipTitleCommitRef.current = false;
                    return;
                  }
                  commitTitleDraft();
                }}
              />
              {nameInvalid ? (
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
                onKeyDown={(event) => {
                  if (event.key === "Escape") {
                    skipDetailsCommitRef.current = true;
                    setDetailsDraft(goalRef.current.details ?? "");
                    detailsFocusedRef.current = false;
                    event.currentTarget.blur();
                  }
                }}
                onBlur={() => {
                  detailsFocusedRef.current = false;
                  if (skipDetailsCommitRef.current) {
                    skipDetailsCommitRef.current = false;
                    return;
                  }
                  commitDetailsDraft();
                }}
              />
            ) : (
              <p
                className={
                  goal.details?.trim()
                    ? "pd-goal-view__description"
                    : "pd-goal-view__description is-empty"
                }
              >
                {goal.details?.trim() || "No description"}
              </p>
            )}
          </details>

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
              {measureWindowKey && panels.length > 1 ? (
                <Button
                  size="sm"
                  variant="ghost"
                  className="pd-goal-view__metrics-back"
                  onClick={() => setMeasureWindowKey(null)}
                >
                  <ChevronLeft size={14} strokeWidth={2.25} aria-hidden />
                  All Metrics
                </Button>
              ) : null}
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
                measureWindowPanels.map((panel) =>
                  panel.kind === "todo_measure" ? (
                    <TodoMeasureViewCard
                      key={panel.key}
                      panel={panel}
                      highlighted={
                        highlightMeasureKey === panel.key ||
                        measureWindowKey === panel.key
                      }
                      open
                      onActivateMeasure={
                        canFocusMeasure
                          ? () => armMeasureWindow(panel.key)
                          : undefined
                      }
                      onFocusMeasure={
                        canFocusMeasure
                          ? () => openMeasureWindow(panel.key)
                          : undefined
                      }
                      onProofChange={
                        canLogProgress
                          ? (next) => {
                            const updated = touch(goalRef.current, {
                              measurements: withMeasureProof(
                                goalRef.current.measurements,
                                panel.measureGroupId,
                                next,
                              ),
                            });
                            goalRef.current = updated;
                            onChange(updated);
                          }
                          : undefined
                      }
                      renderTodoItem={(todo) => (
                        <>
                          <GoalTodoCheck
                            checked={todo.complete}
                            disabled={!canLogProgress}
                            ariaLabel={`Mark ${todo.title.trim() || "task"} complete`}
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
                            className={`pd-goal-view__todo-title${todo.complete ? " is-done" : ""
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
                      highlighted={
                        highlightMeasureKey === panel.key ||
                        measureWindowKey === panel.key
                      }
                      open
                      onActivateMeasure={
                        canFocusMeasure
                          ? () => armMeasureWindow(panel.key)
                          : undefined
                      }
                      onFocusMeasure={
                        canFocusMeasure
                          ? () => openMeasureWindow(panel.key)
                          : undefined
                      }
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
                      onProofChange={
                        canLogProgress
                          ? (next) =>
                            patchMeasurement(panel.metric.id, {
                              ...panel.metric,
                              ...next,
                            })
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
                <GoalCommentItem
                  key={item.id}
                  item={item}
                  authors={commentAuthors}
                  canManage={
                    canManageComments &&
                    isOwnGoalComment(item, {
                      id: commentAuthorId,
                      name: commentAuthorName,
                    })
                  }
                  onUpdate={persistCommentText}
                  onRemove={persistCommentRemoval}
                />
              ))}
            </ul>
          ) : (
            <p className="pd-goal-view__empty">No comments yet.</p>
          )}
          <GoalCommentField
            id={commentFieldId}
            value={comment}
            onChange={setComment}
            people={commentAuthors}
            placeholder="Add a comment. Use @ to tag someone"
            disabled={!canMutate || (isEditing && !goalNamed)}
            label="Add Comment"
            onSubmit={submitComment}
          >
            <button
              type="button"
              className="pd-goal-view__send"
              aria-label="Send Comment"
              disabled={!canMutate || (isEditing && !goalNamed) || !comment.trim()}
              onClick={submitComment}
            >
              <Send size={16} strokeWidth={1.75} aria-hidden />
            </button>
          </GoalCommentField>
        </section>
      ) : null}
    </div>
  );
}
