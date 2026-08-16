import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { blankGoal } from "@/lib/goals/measurements";
import { useGoalDraftAutosave } from "./useGoalDraftAutosave";

afterEach(() => {
  vi.useRealTimers();
});

describe("useGoalDraftAutosave", () => {
  it("saves the latest changed draft after a short pause", () => {
    vi.useFakeTimers();
    const persistedGoals = [blankGoal({ ownerId: "p1" })];
    const onSave = vi.fn();
    const { rerender } = renderHook(
      ({ goals }) =>
        useGoalDraftAutosave({
          enabled: true,
          goals,
          persistedGoals,
          onSave,
        }),
      { initialProps: { goals: persistedGoals } },
    );

    const firstEdit = [{ ...persistedGoals[0], description: "First title" }];
    const latestEdit = [{ ...persistedGoals[0], description: "Latest title" }];
    rerender({ goals: firstEdit });
    rerender({ goals: latestEdit });

    act(() => vi.advanceTimersByTime(600));

    expect(onSave).toHaveBeenCalledOnce();
    expect(onSave).toHaveBeenCalledWith(latestEdit);
  });

  it("does not save when the draft matches persisted goals", () => {
    vi.useFakeTimers();
    const goals = [blankGoal({ ownerId: "p1" })];
    const onSave = vi.fn();
    renderHook(() =>
      useGoalDraftAutosave({
        enabled: true,
        goals,
        persistedGoals: goals,
        onSave,
      }),
    );

    act(() => vi.runAllTimers());

    expect(onSave).not.toHaveBeenCalled();
  });

  it("reports saving while an edit is pending and saved once it lands", () => {
    vi.useFakeTimers();
    const persistedGoals = [blankGoal({ ownerId: "p1" })];
    const edited = [{ ...persistedGoals[0], description: "Renamed" }];
    const { result, rerender } = renderHook(
      (props: {
        goals: typeof persistedGoals;
        persisted: typeof persistedGoals;
      }) =>
        useGoalDraftAutosave({
          enabled: true,
          goals: props.goals,
          persistedGoals: props.persisted,
          onSave: () => undefined,
        }),
      { initialProps: { goals: persistedGoals, persisted: persistedGoals } },
    );

    expect(result.current).toBe("idle");

    rerender({ goals: edited, persisted: persistedGoals });
    expect(result.current).toBe("saving");

    rerender({ goals: edited, persisted: edited });
    expect(result.current).toBe("saved");
  });
});
