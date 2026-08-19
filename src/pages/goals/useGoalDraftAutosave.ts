import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { serializeGoalsDraft } from "@/lib/goals/draft";
import type { Goal } from "@/lib/goals/types";

const AUTOSAVE_DELAY_MS = 600;

/** Idle until the first edit, so an untouched draft shows no save chatter. */
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
  onSave: (goals: Goal[]) => void | Promise<void>;
}): GoalDraftSaveState {
  const onSaveRef = useRef(onSave);
  const goalsRef = useRef(goals);
  const persistedGoalsRef = useRef(persistedGoals);
  const inFlightRef = useRef(false);
  const pendingAfterFlightRef = useRef(false);
  const hadDirtyRef = useRef(false);
  const debounceTimerRef = useRef<number | null>(null);
  const [inFlight, setInFlight] = useState(false);
  const [settled, setSettled] = useState(false);

  onSaveRef.current = onSave;
  goalsRef.current = goals;
  persistedGoalsRef.current = persistedGoals;

  const goalsDraft = serializeGoalsDraft(goals);
  const persistedDraft = serializeGoalsDraft(persistedGoals);
  const matchesPersisted = goalsDraft === persistedDraft;
  const dirty = enabled && !matchesPersisted;

  const clearDebounce = useCallback(() => {
    if (debounceTimerRef.current === null) return;
    window.clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = null;
  }, []);

  const scheduleSave = useCallback((delayMs = AUTOSAVE_DELAY_MS) => {
    clearDebounce();
    debounceTimerRef.current = window.setTimeout(() => {
      debounceTimerRef.current = null;
      void flushSaveRef.current();
    }, delayMs);
  }, [clearDebounce]);

  const flushSaveRef = useRef<() => Promise<void>>(async () => {});

  flushSaveRef.current = async () => {
    if (inFlightRef.current) {
      pendingAfterFlightRef.current = true;
      return;
    }

    const latestGoals = goalsRef.current;
    const draftAtSave = serializeGoalsDraft(latestGoals);
    if (draftAtSave === serializeGoalsDraft(persistedGoalsRef.current)) {
      return;
    }

    inFlightRef.current = true;
    setInFlight(true);
    setSettled(false);

    try {
      await Promise.resolve(onSaveRef.current(latestGoals));
    } finally {
      inFlightRef.current = false;
      setInFlight(false);

      if (pendingAfterFlightRef.current) {
        pendingAfterFlightRef.current = false;
        await flushSaveRef.current();
        return;
      }

      const stillDirty =
        serializeGoalsDraft(goalsRef.current) !==
        serializeGoalsDraft(persistedGoalsRef.current);

      if (stillDirty) {
        scheduleSave();
        return;
      }

      hadDirtyRef.current = false;
      setSettled(true);
    }
  };

  useEffect(() => {
    if (inFlightRef.current && dirty) {
      pendingAfterFlightRef.current = true;
    }
  }, [dirty, goalsDraft]);

  useLayoutEffect(() => {
    if (!dirty && !inFlightRef.current && matchesPersisted && hadDirtyRef.current) {
      hadDirtyRef.current = false;
      setSettled(true);
    }
  }, [dirty, matchesPersisted]);

  useEffect(() => {
    if (dirty) {
      hadDirtyRef.current = true;
      setSettled(false);
      scheduleSave();
      return clearDebounce;
    }

    return undefined;
  }, [clearDebounce, dirty, goalsDraft, scheduleSave]);

  useEffect(() => () => clearDebounce(), [clearDebounce]);

  if (inFlight || dirty) return "saving";
  return settled ? "saved" : "idle";
}
