import { useEffect, useRef, useState } from "react";
import type { Goal } from "@/lib/goals/types";

const AUTOSAVE_DELAY_MS = 600;

/** Idle until the first edit, so a untouched draft shows no save chatter. */
export type GoalDraftSaveState = "idle" | "saving" | "saved";

export function useGoalDraftAutosave({
  enabled,
  goals,
  persistedGoals,
  onSave,
}: {
  enabled: boolean;
  goals: Goal[];
  persistedGoals: Goal[];
  onSave: (goals: Goal[]) => void;
}): GoalDraftSaveState {
  const onSaveRef = useRef(onSave);
  const awaitingSaveRef = useRef(false);
  const [settled, setSettled] = useState(false);
  onSaveRef.current = onSave;

  const unsaved =
    enabled && JSON.stringify(goals) !== JSON.stringify(persistedGoals);

  useEffect(() => {
    if (!unsaved) {
      if (awaitingSaveRef.current) {
        awaitingSaveRef.current = false;
        setSettled(true);
      }
      return;
    }

    awaitingSaveRef.current = true;
    setSettled(false);
    const timer = window.setTimeout(() => {
      onSaveRef.current(goals);
    }, AUTOSAVE_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [unsaved, goals]);

  if (unsaved) return "saving";
  return settled ? "saved" : "idle";
}
