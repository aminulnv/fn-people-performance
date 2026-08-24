import { describe, expect, it } from "vitest";
import { DEFAULT_CYCLE_SETTINGS } from "@/lib/reviews/demoData";
import { describeGoalEditLock } from "./editWindow";
import type { DemoPhase, GoalsCycle } from "./types";

function cycle(phase: DemoPhase): GoalsCycle {
  return {
    id: "q2-2027",
    label: "Q2 2027",
    day1: "2027-04-01",
    phase,
    goalCountPolicy: { ...DEFAULT_CYCLE_SETTINGS.goalCountPolicy },
    postWindowGoalPolicy: "hard_stop",
    goalWindow: { startDate: "2027-03-07", endDate: "2027-04-01" },
  };
}

describe("describeGoalEditLock", () => {
  it("names the dates a future cycle opens and closes", () => {
    const lock = describeGoalEditLock({
      cycle: cycle("not_open"),
      cycleStatus: "future",
      canUpdateProgress: false,
    });

    expect(lock).toBe("Goal editing opens 7 Mar 2027 and closes 1 Apr 2027.");
  });

  it("says progress is still allowed after the window closes", () => {
    const lock = describeGoalEditLock({
      cycle: cycle("hard_lock"),
      cycleStatus: "current",
      canUpdateProgress: true,
    });

    expect(lock).toBe(
      "Goal editing closed 1 Apr 2027. Progress updates are still allowed.",
    );
  });

  it("explains that closed cycles are read-only", () => {
    const lock = describeGoalEditLock({
      cycle: cycle("closed"),
      cycleStatus: "previous",
      canUpdateProgress: false,
    });

    expect(lock).toBe("Q2 2027 is closed, so goals are read-only.");
  });

  it("explains late submissions after a soft deadline", () => {
    const lateCycle = {
      ...cycle("hard_lock"),
      postWindowGoalPolicy: "two_tier_approval" as const,
    };
    const lock = describeGoalEditLock({
      cycle: lateCycle,
      cycleStatus: "current",
      canUpdateProgress: true,
    });

    expect(lock).toContain(
      "Late submissions require approval from the direct manager and the skip-level manager",
    );
    expect(lock).not.toContain("You");
  });

  it("describes the subject submission state after the deadline", () => {
    const lateCycle = {
      ...cycle("hard_lock"),
      postWindowGoalPolicy: "two_tier_approval" as const,
    };

    expect(
      describeGoalEditLock({
        cycle: lateCycle,
        cycleStatus: "current",
        canUpdateProgress: true,
        status: "approved",
      }),
    ).toContain(
      "Changes to approved goals require renewed approval from the direct manager and the skip-level manager",
    );
    expect(
      describeGoalEditLock({
        cycle: lateCycle,
        cycleStatus: "current",
        canUpdateProgress: true,
        status: "submitted",
        postWindowApprovalStage: "manager_manager",
      }),
    ).toContain("awaiting final approval from the skip-level manager");
  });

  it("names the people who must approve a late change", () => {
    const lateCycle = {
      ...cycle("hard_lock"),
      postWindowGoalPolicy: "two_tier_approval" as const,
    };

    expect(
      describeGoalEditLock({
        cycle: lateCycle,
        cycleStatus: "current",
        canUpdateProgress: true,
        status: "approved",
        lineManagerName: "Api Singha",
        skipLevelManagerName: "Angie Ng Yun Ni",
      }),
    ).toContain(
      "require renewed approval from Api Singha and Angie Ng Yun Ni",
    );
  });

  it("omits skip-level wording when the person has no skip-level manager", () => {
    const lateCycle = {
      ...cycle("hard_lock"),
      postWindowGoalPolicy: "two_tier_approval" as const,
    };

    expect(
      describeGoalEditLock({
        cycle: lateCycle,
        cycleStatus: "current",
        canUpdateProgress: true,
        lineManagerName: "Api Singha",
        skipLevelManagerName: null,
      }),
    ).toBe(
      "The goal deadline passed 1 Apr 2027. Late submissions require approval from Api Singha.",
    );
    expect(
      describeGoalEditLock({
        cycle: lateCycle,
        cycleStatus: "current",
        canUpdateProgress: true,
        lineManagerName: "Api Singha",
        skipLevelManagerName: null,
      }),
    ).not.toContain("skip-level");
  });

  it("reports no lock while the window is open", () => {
    const lock = describeGoalEditLock({
      cycle: cycle("window_open"),
      cycleStatus: "current",
      canUpdateProgress: true,
    });

    expect(lock).toBeNull();
  });
});
