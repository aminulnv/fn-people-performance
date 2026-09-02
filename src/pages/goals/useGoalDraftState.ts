import { useEffect, useRef, useState, type Dispatch, type SetStateAction } from "react";
import { mergePersistedGoals } from "@/lib/goals/draft";
import type { Goal, SubmissionStatus } from "@/lib/goals/types";

export type GoalDraftState = {
  /** Persisted goals plus any goal still being created locally. */
  goals: Goal[];
  setGoals: Dispatch<SetStateAction<Goal[]>>;
  /** Goals opened in create mode, so the panel knows to render the create form. */
  creatingIds: ReadonlySet<string>;
  startCreating: (goalId: string) => void;
  stopCreating: (goalId: string) => void;
};

/**
 * Editing state for one person's goals, kept in step with the persisted rows.
 *
 * A refresh hands back a brand new `persistedGoals` array, and a goal the user
 * just added is not in it until the first save - so that goal is carried over
 * instead of being replaced away mid-edit.
 */
export function useGoalDraftState({
  personId,
  status,
  persistedGoals,
}: {
  personId: string;
  status: SubmissionStatus;
  persistedGoals: Goal[];
}): GoalDraftState {
  const [goals, setGoals] = useState(persistedGoals);
  const [creatingIds, setCreatingIds] = useState<Set<string>>(
    () => new Set<string>(),
  );
  const creatingIdsRef = useRef(creatingIds);
  const savedIdsRef = useRef(new Set(persistedGoals.map((goal) => goal.id)));
  const syncedPersonIdRef = useRef(personId);
  creatingIdsRef.current = creatingIds;

  useEffect(() => {
    if (syncedPersonIdRef.current !== personId) {
      syncedPersonIdRef.current = personId;
      savedIdsRef.current = new Set(persistedGoals.map((goal) => goal.id));
      creatingIdsRef.current = new Set();
      setCreatingIds(new Set());
      setGoals(persistedGoals);
      return;
    }

    for (const goal of persistedGoals) savedIdsRef.current.add(goal.id);
    const isUnsaved = (goalId: string) =>
      creatingIdsRef.current.has(goalId) && !savedIdsRef.current.has(goalId);

    setGoals((current) => {
      const unsavedGoals = current.filter((goal) => isUnsaved(goal.id));
      const merged = mergePersistedGoals(current, persistedGoals);
      return unsavedGoals.length === 0
        ? merged
        : [...merged, ...unsavedGoals];
    });
    setCreatingIds((current) => {
      const next = new Set(
        [...current].filter(
          (goalId) =>
            isUnsaved(goalId) ||
            persistedGoals.some((goal) => goal.id === goalId),
        ),
      );
      return next.size === current.size ? current : next;
    });
  }, [personId, status, persistedGoals]);

  const startCreating = (goalId: string) => {
    setCreatingIds((current) => new Set(current).add(goalId));
  };

  const stopCreating = (goalId: string) => {
    setCreatingIds((current) => {
      if (!current.has(goalId)) return current;
      const next = new Set(current);
      next.delete(goalId);
      return next;
    });
  };

  return { goals, setGoals, creatingIds, startCreating, stopCreating };
}
