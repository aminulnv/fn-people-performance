import { useEffect, useId, useRef, useState } from "react";
import {
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  GitFork,
  Save,
  Trash2,
} from "lucide-react";
import { Avatar, Textarea } from "@/components/ui";
import { avatarStyle } from "@/lib/employees/avatar";
import type { Goal, PersonGoals } from "@/lib/goals/types";
import { validateGoalDraft } from "@/lib/goals/draft";
import type {
  CascadeRecipient,
  LineManagerCascade,
} from "@/lib/goals/operations";
import {
  EMPTY_LINE_MANAGER_CASCADE,
  GoalCascadeField,
  GoalCascadedTo,
  type CascadeGoalHref,
} from "./GoalCascadeField";
import { GoalProgressEditor } from "./GoalProgressEditor";
import { GoalSummaryCards } from "./GoalSummaryCards";
import { GoalAutosaveStatus } from "./GoalAutosaveStatus";
import type { GoalDraftSaveState } from "./useGoalDraftAutosave";
import { formatRefreshAge } from "./goalHelpers";

export type GoalOwnerOption = {
  id: string;
  name: string;
  title?: string;
  avatarUrl?: string;
};

type GoalCreateFormProps = {
  goal: Goal;
  index: number;
  total: number;
  isNew?: boolean;
  /** Fallback owner when the goal has no ownerId yet (page person). */
  defaultOwnerId: string;
  ownerOptions: GoalOwnerOption[];
  cascadeFrom?: LineManagerCascade;
  cascadedTo?: CascadeRecipient[];
  cascadeHref?: CascadeGoalHref;
  cycleLabel: string;
  isCurrentCycle?: boolean;
  status?: PersonGoals["status"];
  /** Autosave state of the owning draft, surfaced next to the header actions. */
  saveState?: GoalDraftSaveState;
  onChange: (goal: Goal) => void;
  onBack: () => void;
  onSave: () => void;
  onRemove?: () => void;
  onSelectIndex: (index: number) => void;
};

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
      className={`pd-goal-create__byline-owner${open ? " is-open" : ""}`}
    >
      <button
        type="button"
        className="pd-goal-create__byline-owner-trigger"
        aria-label={selected ? `Owner ${selected.name}` : "Select owner"}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => setOpen((prev) => !prev)}
      >
        {selected ? (
          <>
            <Avatar
              name={selected.name}
              src={selected.avatarUrl}
              size="sm"
              style={avatarStyle(selected.name)}
            />
            <span className="pd-goal-create__byline-owner-name">
              {selected.name}
            </span>
          </>
        ) : (
          <span className="pd-goal-create__byline-owner-placeholder">
            Select owner
          </span>
        )}
        <ChevronDown size={14} strokeWidth={2.25} aria-hidden />
      </button>

      {open ? (
        <div className="pd-goal-create__owner-menu" role="presentation">
          <label className="pd-goal-create__owner-search">
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
            className="pd-goal-create__owner-list"
            role="listbox"
            aria-label="Owner"
          >
            {filtered.length === 0 ? (
              <p className="pd-goal-create__owner-empty">No people found</p>
            ) : (
              filtered.map((person) => {
                const isSelected = person.id === selected?.id;
                return (
                  <button
                    key={person.id}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    className={`pd-goal-create__owner-option${
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
                    <span className="pd-goal-create__owner-option-copy">
                      <span className="pd-goal-create__owner-option-name">
                        {person.name}
                      </span>
                      {person.title ? (
                        <span className="pd-goal-create__owner-option-title">
                          {person.title}
                        </span>
                      ) : null}
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

export function GoalCreateForm({
  goal,
  index,
  total,
  isNew = false,
  defaultOwnerId,
  ownerOptions,
  cascadeFrom = EMPTY_LINE_MANAGER_CASCADE,
  cascadedTo = [],
  cascadeHref,
  cycleLabel,
  isCurrentCycle = false,
  status = "draft",
  saveState,
  onChange,
  onBack,
  onSave,
  onRemove,
  onSelectIndex,
}: GoalCreateFormProps) {
  const [showCascadeField, setShowCascadeField] = useState(
    Boolean(goal.linkedGoalLabel || goal.cascadedFromGoalId),
  );
  const titleFieldId = useId();
  const draftValidation = validateGoalDraft(goal);
  const nameError = Boolean(draftValidation.nameError);
  const ownerId = goal.ownerId ?? defaultOwnerId;
  const goalRef = useRef(goal);
  goalRef.current = goal;

  const patch = (partial: Partial<Goal>) =>
    onChange({ ...goalRef.current, ...partial });

  return (
    <div
      className="pd-goal-create"
      aria-label={isNew ? "Add goal" : "Edit goal"}
    >
      <header className="pd-goal-create__header">
        <div className="pd-goal-create__title-row">
          <div className="pd-goal-create__title-edit">
            <label className="pd-sr-only" htmlFor={titleFieldId}>
              Goal name
            </label>
            <textarea
              id={titleFieldId}
              className="pd-goal-create__title-input"
              value={goal.description}
              rows={1}
              placeholder={isNew ? "Name this goal" : "Goal name"}
              aria-invalid={nameError}
              onChange={(event) => patch({ description: event.target.value })}
            />
            {nameError ? (
              <p className="pd-goal-create__title-error" role="alert">
                Goal name is required
              </p>
            ) : null}
          </div>
          <div className="pd-goal-create__header-actions">
            {onRemove ? (
              <button
                type="button"
                className="pd-goal-create__icon-btn"
                aria-label="Remove goal"
                onClick={onRemove}
              >
                <Trash2 size={16} strokeWidth={1.75} aria-hidden />
              </button>
            ) : null}
            {total > 1 ? (
              <div className="pd-goal-create__pager">
                <button
                  type="button"
                  className="pd-goal-create__icon-btn"
                  disabled={index <= 0}
                  aria-label="Previous goal"
                  onClick={() => onSelectIndex(index - 1)}
                >
                  <ChevronLeft size={16} strokeWidth={1.75} aria-hidden />
                </button>
                <span>
                  {index + 1}/{total}
                </span>
                <button
                  type="button"
                  className="pd-goal-create__icon-btn"
                  disabled={index >= total - 1}
                  aria-label="Next goal"
                  onClick={() => onSelectIndex(index + 1)}
                >
                  <ChevronRight size={16} strokeWidth={1.75} aria-hidden />
                </button>
              </div>
            ) : null}
            <button
              type="button"
              className="pd-people__ghost-btn"
              onClick={onBack}
            >
              Cancel
            </button>
            <button
              type="button"
              className="pd-people__ghost-btn pd-people__ghost-btn--primary"
              disabled={!draftValidation.ok}
              onClick={onSave}
            >
              <Save size={15} strokeWidth={1.75} aria-hidden />
              {isNew ? "Add Goal" : "Save Changes"}
            </button>
          </div>
        </div>

        <div className="pd-goal-create__byline">
          <OwnerSelect
            ownerId={ownerId}
            options={ownerOptions}
            onChange={(nextOwnerId) => patch({ ownerId: nextOwnerId })}
          />
          {saveState ? (
            <div className="pd-goal-create__meta">
              <GoalAutosaveStatus state={saveState} />
              <p>
                {goal.updatedAt
                  ? `Updated ${formatRefreshAge(goal.updatedAt)}`
                  : "No updates yet"}
              </p>
            </div>
          ) : null}
        </div>

        <Textarea
          label="Description"
          value={goal.details ?? ""}
          placeholder="Add a description (optional)"
          rows={3}
          onChange={(event) =>
            patch({ details: event.target.value || undefined })
          }
        />

        {showCascadeField ? (
          <section
            className="pd-goal-view__description-card"
            aria-label="Cascading from"
          >
            <GoalCascadeField
              goal={goal}
              cascadeFrom={cascadeFrom}
              onChange={(next) => patch(next)}
            />
          </section>
        ) : cascadeFrom.managerName ? (
          <button
            type="button"
            className="pd-people__ghost-btn pd-goal-create__add-field"
            onClick={() => setShowCascadeField(true)}
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
        status={status}
        cycleLabel={cycleLabel}
        isCurrentCycle={isCurrentCycle}
        canChangeStatus
        onProgressStatus={(progressStatus) => patch({ progressStatus })}
        onWeightChange={(weight) => patch({ weight })}
      />

      <div className="pd-goal-create__stack">
        <GoalProgressEditor
          goal={goal}
          onChange={onChange}
          measureNameError={draftValidation.measurementNameError}
          measurementWeightError={draftValidation.measurementWeightError}
        />
      </div>
    </div>
  );
}
