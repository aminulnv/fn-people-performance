import { CloudCheck, Loader2 } from "lucide-react";
import type { GoalDraftSaveState } from "./useGoalDraftAutosave";

const LABELS: Record<Exclude<GoalDraftSaveState, "idle">, string> = {
  saving: "Saving…",
  saved: "Saved",
};

export function GoalAutosaveStatus({ state }: { state: GoalDraftSaveState }) {
  if (state === "idle") {
    return (
      <span
        className="pd-goals-autosave"
        title="Changes are saved automatically"
      >
        <CloudCheck size={15} strokeWidth={1.8} aria-hidden />
        Auto-save on
      </span>
    );
  }

  return (
    <span
      className={`pd-goals-autosave pd-goals-autosave--${state}`}
      role="status"
      aria-live="polite"
    >
      {state === "saving" ? (
        <Loader2
          className="pd-goals-autosave__spinner"
          size={15}
          strokeWidth={2}
          aria-hidden
        />
      ) : (
        <CloudCheck size={15} strokeWidth={1.8} aria-hidden />
      )}
      {LABELS[state]}
    </span>
  );
}
