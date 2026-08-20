import { describe, expect, it } from "vitest";
import {
  deriveGoalCapabilities,
  isDirectManager,
  countPendingGoalApprovals,
  countPendingGoalApprovalsForManager,
  orderManagerReports,
  selectManagerApprovalQueue,
  selectManagerReports,
} from "./permissions";
import { DEFAULT_CYCLE_SETTINGS } from "@/lib/reviews/demoData";
import type { DemoPerson, GoalsCycle, PersonGoals } from "./types";

const cycle: GoalsCycle = {
  id: "c1",
  label: "Q3 2026",
  day1: "2026-07-01",
  phase: "window_open",
  goalCountPolicy: { ...DEFAULT_CYCLE_SETTINGS.goalCountPolicy },
  postWindowGoalPolicy: DEFAULT_CYCLE_SETTINGS.postWindowGoalPolicy,
};

function person(
  partial: Partial<DemoPerson> & Pick<DemoPerson, "id" | "name">,
): DemoPerson {
  return {
    email: `${partial.id}@example.com`,
    title: "Engineer",
    department: "Product",
    joinDate: "2025-01-01",
    reportIds: [],
    avatarHue: 1,
    blurb: "",
    ...partial,
  };
}

function row(
  personId: string,
  status: PersonGoals["status"] = "draft",
): PersonGoals {
  return { personId, status, goals: [] };
}

describe("isDirectManager", () => {
  it("matches managerId or reportIds", () => {
    const manager = person({ id: "m1", name: "Manager", reportIds: ["e1"] });
    const report = person({ id: "e1", name: "Report", managerId: "m1" });
    const peer = person({ id: "e2", name: "Peer" });
    expect(isDirectManager(manager, report)).toBe(true);
    expect(isDirectManager(manager, peer)).toBe(false);
  });
});

describe("deriveGoalCapabilities", () => {
  const actor = person({
    id: "m1",
    name: "Manager",
    reportIds: ["e1"],
  });
  const subject = person({ id: "e1", name: "Report", managerId: "m1" });

  it("lets a manager edit a report on the current open cycle", () => {
    const caps = deriveGoalCapabilities({
      actor,
      subject,
      row: row("e1", "draft"),
      cycle,
      cycleStatus: "current",
    });
    expect(caps.canEditStructure).toBe(true);
    expect(caps.canUpdateProgress).toBe(true);
    expect(caps.canApprove).toBe(false);
  });

  it("lets the owner resubmit sent-back goals", () => {
    const caps = deriveGoalCapabilities({
      actor: subject,
      subject,
      row: row("e1", "sent_back"),
      cycle,
      cycleStatus: "current",
    });
    expect(caps.canSubmit).toBe(true);
    expect(caps.canEditStructure).toBe(true);
  });

  it("lets a manager approve submitted goals", () => {
    const caps = deriveGoalCapabilities({
      actor,
      subject,
      row: row("e1", "submitted"),
      cycle,
      cycleStatus: "current",
    });
    expect(caps.canApprove).toBe(true);
    expect(caps.canSendBack).toBe(true);
  });

  it("blocks structural edits on previous cycles", () => {
    const caps = deriveGoalCapabilities({
      actor: subject,
      subject,
      row: row("e1", "draft"),
      cycle,
      cycleStatus: "previous",
    });
    expect(caps.canEditStructure).toBe(false);
    expect(caps.canUpdateProgress).toBe(false);
  });

  it("does not grant peer edit rights from a forged subject role", () => {
    const peer = person({ id: "e2", name: "Peer" });
    const caps = deriveGoalCapabilities({
      actor: peer,
      subject,
      row: row("e1", "draft"),
      cycle,
      cycleStatus: "current",
    });
    expect(caps.canEditStructure).toBe(false);
    expect(caps.canApprove).toBe(false);
  });

  it("only allows cascade for the actor editing their own goals with reports", () => {
    const capsSelf = deriveGoalCapabilities({
      actor,
      subject: actor,
      row: row("m1", "draft"),
      cycle,
      cycleStatus: "current",
    });
    const capsReport = deriveGoalCapabilities({
      actor,
      subject,
      row: row("e1", "draft"),
      cycle,
      cycleStatus: "current",
    });
    expect(capsSelf.canCascade).toBe(true);
    expect(capsReport.canCascade).toBe(false);
  });

  it("gives a read-only admin visibility without mutation rights", () => {
    const admin = person({
      id: "a1",
      name: "Read admin",
      permissions: ["platform.read_all"],
    });
    const caps = deriveGoalCapabilities({
      actor: admin,
      subject,
      row: row("e1", "submitted"),
      cycle,
      cycleStatus: "current",
    });
    expect(caps.canViewAsManager).toBe(true);
    expect(caps.canEditStructure).toBe(false);
    expect(caps.canApprove).toBe(false);
  });

  it("gives a read + write admin full goal mutation rights", () => {
    const admin = person({
      id: "a1",
      name: "Write admin",
      permissions: ["platform.read_all", "platform.write_all", "access.manage"],
    });
    const caps = deriveGoalCapabilities({
      actor: admin,
      subject,
      row: row("e1", "submitted"),
      cycle,
      cycleStatus: "current",
    });
    expect(caps.canViewAsManager).toBe(true);
    expect(caps.canEditStructure).toBe(true);
    expect(caps.canApprove).toBe(true);
    expect(caps.canSendBack).toBe(true);
  });

  it("does not grant review access from an HR job title alone", () => {
    const hrbp = person({
      id: "h1",
      name: "HR Business Partner",
      title: "HR Business Partner",
    });
    const caps = deriveGoalCapabilities({
      actor: hrbp,
      subject,
      row: row("e1", "submitted"),
      cycle,
      cycleStatus: "current",
    });
    expect(caps.canViewAsManager).toBe(false);
  });

  it("allows post-window input when exception approval is configured", () => {
    const caps = deriveGoalCapabilities({
      actor: subject,
      subject,
      row: row("e1", "draft"),
      cycle: {
        ...cycle,
        phase: "hard_lock",
        postWindowGoalPolicy: "two_tier_approval",
      },
      cycleStatus: "current",
    });

    expect(caps.canEditStructure).toBe(true);
    expect(caps.canSubmit).toBe(true);
  });

  it("routes final exception approval to the manager’s manager", () => {
    const seniorManager = person({
      id: "s1",
      name: "Senior Manager",
      reportIds: ["m1"],
    });
    const pending = {
      ...row("e1", "submitted"),
      postWindowApprovalStage: "manager_manager" as const,
    };

    expect(
      deriveGoalCapabilities({
        actor,
        subject,
        row: pending,
        cycle,
        cycleStatus: "current",
      }).canApprove,
    ).toBe(false);
    expect(
      deriveGoalCapabilities({
        actor: seniorManager,
        subject,
        row: pending,
        cycle,
        cycleStatus: "current",
      }).canApprove,
    ).toBe(true);
  });
});

describe("selectManagerReports", () => {
  it("returns only the actor direct reports", () => {
    const actor = person({ id: "m1", name: "Manager", reportIds: ["e1"] });
    const e1 = person({ id: "e1", name: "One", managerId: "m1" });
    const e2 = person({ id: "e2", name: "Two" });
    const reports = selectManagerReports(actor, [actor, e1, e2], {
      e1: row("e1", "submitted"),
      e2: row("e2", "draft"),
    });
    expect(reports).toHaveLength(1);
    expect(reports[0].person.id).toBe("e1");
  });

  it("orders pending reports first", () => {
    const ordered = orderManagerReports([
      { row: row("a", "draft") },
      { row: row("b", "submitted") },
      { row: row("c", "approved") },
    ]);
    expect(ordered.map((item) => item.row.personId)).toEqual(["b", "a", "c"]);
  });

  it("puts skip-level final approvals above other pending reports", () => {
    const ordered = orderManagerReports([
      { row: row("direct", "submitted") },
      {
        row: {
          ...row("late", "submitted"),
          postWindowApprovalStage: "manager_manager",
        },
      },
      { row: row("draft", "draft") },
      {
        row: {
          ...row("first-stage", "submitted"),
          postWindowApprovalStage: "manager",
        },
      },
    ]);
    expect(ordered.map((item) => item.row.personId)).toEqual([
      "late",
      "direct",
      "first-stage",
      "draft",
    ]);
  });
});

describe("selectManagerApprovalQueue", () => {
  it("adds only skip-level exceptions awaiting final approval", () => {
    const senior = person({
      id: "s1",
      name: "Senior",
      reportIds: ["m1"],
    });
    const manager = person({ id: "m1", name: "Manager", managerId: "s1" });
    const employee = person({ id: "e1", name: "Employee", managerId: "m1" });
    const result = orderManagerReports(
      selectManagerApprovalQueue(
        senior,
        [senior, manager, employee],
        {
          m1: row("m1", "submitted"),
          e1: {
            ...row("e1", "submitted"),
            postWindowApprovalStage: "manager_manager",
          },
        },
      ),
    );

    expect(result.map(({ person: item }) => item.id)).toEqual(["e1", "m1"]);
  });
});

describe("countPendingGoalApprovals", () => {
  it("counts submitted reports in the manager approval queue", () => {
    const senior = person({
      id: "s1",
      name: "Senior",
      reportIds: ["m1"],
    });
    const manager = person({ id: "m1", name: "Manager", managerId: "s1" });
    const employee = person({ id: "e1", name: "Employee", managerId: "m1" });
    const people = [senior, manager, employee];
    const byPerson = {
      m1: row("m1", "submitted"),
      e1: {
        ...row("e1", "submitted"),
        postWindowApprovalStage: "manager_manager" as const,
      },
    };

    expect(
      countPendingGoalApprovals(
        selectManagerApprovalQueue(senior, people, byPerson),
      ),
    ).toBe(2);
    expect(
      countPendingGoalApprovalsForManager(senior, people, byPerson),
    ).toBe(2);
  });

  it("ignores reports that are not submitted", () => {
    expect(
      countPendingGoalApprovals([
        { row: row("a", "draft") },
        { row: row("b", "approved") },
        { row: row("c", "submitted") },
      ]),
    ).toBe(1);
  });
});
