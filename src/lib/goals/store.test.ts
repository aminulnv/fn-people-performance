import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { clearEmployees, createEmployee } from "@/lib/employees/store";
import {
  createReviewCycle,
  getReviewCycle,
  resetReviewsStoreForTests,
  updateCycleStagesConfig,
  updateCycleSettings,
} from "@/lib/reviews/store";
import {
  getNotificationFeed,
  resetNotificationsForTests,
} from "@/lib/notifications/store";
import {
  approveSubmission,
  copyPreviousCycleGoals,
  getGoalsSnapshot,
  resetGoalsDemo,
  savePersonGoals,
  sendBackSubmission,
  setActiveCycle,
  setActivePerson,
  setSignedInPerson,
  submitPersonGoals,
  updateGoalProgress,
  type GoalMutationContext,
} from "./store";
import type { Goal } from "./types";

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-06-15T12:00:00Z"));
  resetReviewsStoreForTests();
});

afterEach(() => {
  vi.useRealTimers();
});

async function seedDirectory() {
  const seniorManager = await createEmployee({
    employeeId: 4,
    fullName: "Senior Manager",
    email: "senior@example.com",
    startDate: "2024-01-01",
    jobTitle: "Senior Manager",
    department: "People",
    team: "",
    division: "",
    reportsToName: "",
    departmentHeadName: "",
    hrbpName: "",
    jobGrade: "",
    site: "",
    managerEmail: "",
  });
  if (!seniorManager.ok) throw new Error(seniorManager.error);

  const manager = await createEmployee({
    employeeId: 2,
    fullName: "Line Manager",
    email: "manager@example.com",
    startDate: "2024-01-01",
    jobTitle: "Manager",
    department: "People",
    team: "",
    division: "",
    reportsToName: "Senior Manager",
    departmentHeadName: "",
    hrbpName: "",
    jobGrade: "",
    site: "",
    managerEmail: "senior@example.com",
  });
  if (!manager.ok) throw new Error(manager.error);

  const report = await createEmployee({
    employeeId: 1,
    fullName: "Aminul Islam Borhan",
    email: "aminul@example.com",
    startDate: "2026-01-01",
    jobTitle: "Executive",
    department: "People",
    team: "",
    division: "",
    reportsToName: "Line Manager",
    departmentHeadName: "",
    hrbpName: "",
    jobGrade: "",
    site: "",
    managerEmail: "manager@example.com",
  });
  if (!report.ok) throw new Error(report.error);

  const peer = await createEmployee({
    employeeId: 3,
    fullName: "Peer Person",
    email: "peer@example.com",
    startDate: "2025-01-01",
    jobTitle: "Executive",
    department: "People",
    team: "",
    division: "",
    reportsToName: "Line Manager",
    departmentHeadName: "",
    hrbpName: "",
    jobGrade: "",
    site: "",
    managerEmail: "manager@example.com",
  });
  if (!peer.ok) throw new Error(peer.error);
}

function firstGoal(goals: Goal[]): Goal {
  const goal = goals[0];
  if (!goal) throw new Error("Expected a seeded goal");
  return goal;
}

function ctx(subjectId: string, actorId = subjectId): GoalMutationContext {
  return {
    cycleId: getGoalsSnapshot().cycle.id,
    actorId,
    subjectId,
  };
}

describe("goal snapshot reads", () => {
  beforeEach(async () => {
    localStorage.clear();
    resetNotificationsForTests();
    clearEmployees();
    await seedDirectory();
    setSignedInPerson("2");
    resetGoalsDemo();
  });

  afterEach(() => {
    clearEmployees();
  });

  it("does not rewrite storage when the active person is already selected", () => {
    const first = setActivePerson("1");
    const second = setActivePerson("1");
    expect(second.activePersonId).toBe("1");
    expect(second).toBe(first);
    expect(getGoalsSnapshot()).toBe(second);
  });

  it("stores drafts beyond the current browser session", () => {
    const snapshot = getGoalsSnapshot();
    const source = firstGoal(snapshot.byPerson["2"].goals);
    savePersonGoals(ctx("2"), [
      { ...source, description: "Draft retained for next session" },
    ]);

    const stored = localStorage.getItem("pd-goals-demo-v13");

    expect(stored).toContain("Draft retained for next session");
  });

  it("updates goal access immediately when cycle stage dates change", () => {
    const before = getGoalsSnapshot();
    expect(before.cycle.phase).toBe("window_open");
    const reviewCycle = getReviewCycle(before.cycle.id);
    if (!reviewCycle) throw new Error("Expected the active review cycle");
    const stages = structuredClone(reviewCycle.stagesConfig);
    stages.goals.employee.endDate = "2026-06-10";

    updateCycleStagesConfig(reviewCycle.id, stages);

    expect(getGoalsSnapshot().cycle.phase).toBe("hard_lock");
  });

  it("copies the nearest previous cycle into an empty draft", () => {
    vi.setSystemTime(new Date("2026-03-15T12:00:00Z"));
    createReviewCycle({ type: "regular", periodKey: "q1-2026" });
    createReviewCycle({ type: "regular", periodKey: "q2-2026" });
    setSignedInPerson("1");
    resetGoalsDemo();

    const previous = setActiveCycle("q1-2026");
    const source = firstGoal(previous.byPerson["1"].goals);

    vi.setSystemTime(new Date("2026-03-20T12:00:00Z"));
    setActiveCycle("q2-2026");
    savePersonGoals(ctx("1"), []);

    const copied = copyPreviousCycleGoals(ctx("1"));
    const firstCopy = firstGoal(copied.byPerson["1"].goals);

    expect(copied.byPerson["1"].status).toBe("draft");
    expect(firstCopy.description).toBe(source.description);
    expect(firstCopy.id).not.toBe(source.id);
    expect(firstCopy.comments).toEqual([]);
  });
});

describe("goal approval mutations", () => {
  beforeEach(async () => {
    localStorage.clear();
    resetNotificationsForTests();
    clearEmployees();
    await seedDirectory();
    // Manager is signed in so the report seeds as submitted.
    setSignedInPerson("2");
    resetGoalsDemo();
  });

  afterEach(() => {
    clearEmployees();
  });

  it("keeps approved goals approved after progress updates", () => {
    approveSubmission(ctx("1", "2"));
    const row = getGoalsSnapshot().byPerson["1"];
    const next = structuredClone(row.goals);
    firstGoal(next).progressStatus = "at_risk";

    const snapshot = updateGoalProgress(ctx("1", "2"), next);

    expect(snapshot.byPerson["1"].status).toBe("approved");
    expect(firstGoal(snapshot.byPerson["1"].goals).progressStatus).toBe(
      "at_risk",
    );
  });

  it("moves approved goals to pending after a structural edit", () => {
    approveSubmission(ctx("1", "2"));
    const next = structuredClone(getGoalsSnapshot().byPerson["1"].goals);
    firstGoal(next).description = "A revised goal title";

    const snapshot = savePersonGoals(ctx("1", "2"), next);

    expect(snapshot.byPerson["1"].status).toBe("submitted");
    expect(snapshot.byPerson["1"].managerNote).toBeUndefined();
  });

  it("keeps an owner's revision as a draft until they submit it", () => {
    const next = structuredClone(getGoalsSnapshot().byPerson["1"].goals);
    firstGoal(next).description = "An employee revision";

    const draft = savePersonGoals(ctx("1", "1"), next);

    expect(draft.byPerson["1"].status).toBe("draft");

    const submitted = submitPersonGoals(ctx("1", "1"));
    expect(submitted.byPerson["1"].status).toBe("submitted");
  });

  it("allows a manager to send approved goals back for revision", () => {
    approveSubmission(ctx("1", "2"));

    const snapshot = sendBackSubmission(ctx("1", "2"), "Revise the target.");

    expect(snapshot.byPerson["1"].status).toBe("sent_back");
    expect(snapshot.byPerson["1"].sendBackReason).toBe("Revise the target.");
    expect(snapshot.byPerson["1"].sendBackBy).toEqual({
      id: "2",
      name: "Line Manager",
    });
  });

  it("lets the owner resubmit after a send-back", () => {
    approveSubmission(ctx("1", "2"));
    sendBackSubmission(ctx("1", "2"), "Revise the target.");

    const snapshot = submitPersonGoals(ctx("1", "1"));

    expect(snapshot.byPerson["1"].status).toBe("submitted");
    expect(snapshot.byPerson["1"].sendBackReason).toBeUndefined();
    expect(snapshot.byPerson["1"].sendBackBy).toBeUndefined();
    expect(getNotificationFeed("2").items[0]).toMatchObject({
      title: "Aminul Islam Borhan resubmitted their goals",
      kind: "action",
      state: "unread",
    });
  });

  it("routes post-window submissions through manager and manager’s manager", () => {
    sendBackSubmission(ctx("1", "2"), "Submit this as an exception.");
    const cycle = getReviewCycle(getGoalsSnapshot().cycle.id);
    if (!cycle) throw new Error("Expected the active review cycle");
    const stages = structuredClone(cycle.stagesConfig);
    stages.goals.employee.endDate = "2026-06-10";
    updateCycleStagesConfig(cycle.id, stages);
    updateCycleSettings(cycle.id, {
      postWindowGoalPolicy: "two_tier_approval",
    });

    const submitted = submitPersonGoals(ctx("1", "1"));
    expect(submitted.byPerson["1"].postWindowApprovalStage).toBe("manager");

    const managerApproved = approveSubmission(ctx("1", "2"));
    expect(managerApproved.byPerson["1"].status).toBe("submitted");
    expect(managerApproved.byPerson["1"].postWindowApprovalStage).toBe(
      "manager_manager",
    );
    expect(getNotificationFeed("4").items[0]).toMatchObject({
      title: "Final goal approval needed for Aminul Islam Borhan",
      kind: "action",
    });

    const final = approveSubmission(ctx("1", "4"));
    expect(final.byPerson["1"].status).toBe("approved");
    expect(final.byPerson["1"].postWindowApprovalStage).toBeUndefined();
    expect(getNotificationFeed("1").items[0].title).toBe(
      "Your goals received final approval",
    );
  });

  it("blocks post-window input when the cycle uses a hard stop", () => {
    sendBackSubmission(ctx("1", "2"), "Revise after the deadline.");
    const cycle = getReviewCycle(getGoalsSnapshot().cycle.id);
    if (!cycle) throw new Error("Expected the active review cycle");
    const stages = structuredClone(cycle.stagesConfig);
    stages.goals.employee.endDate = "2026-06-10";
    updateCycleStagesConfig(cycle.id, stages);
    updateCycleSettings(cycle.id, { postWindowGoalPolicy: "hard_stop" });

    expect(() => submitPersonGoals(ctx("1", "1"))).toThrow(
      "permission to submit",
    );
  });

  it("keeps pending goals pending when progress changes", () => {
    const progress = structuredClone(getGoalsSnapshot().byPerson["1"].goals);
    firstGoal(progress).progressStatus = "on_hold";

    const snapshot = updateGoalProgress(ctx("1", "2"), progress);

    expect(snapshot.byPerson["1"].status).toBe("submitted");
  });

  it("rejects structural edits through the progress boundary", () => {
    const next = structuredClone(getGoalsSnapshot().byPerson["1"].goals);
    firstGoal(next).description = "A structural change";

    expect(() => updateGoalProgress(ctx("1", "2"), next)).toThrow(
      "Structural goal changes must use the goal editor.",
    );
  });

  it("rejects mutations from an unauthorized peer", () => {
    const next = structuredClone(getGoalsSnapshot().byPerson["1"].goals);
    firstGoal(next).description = "Peer edit";

    expect(() => savePersonGoals(ctx("1", "3"), next)).toThrow(
      "You do not have permission to edit these goals.",
    );
  });
});
