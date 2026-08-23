import { describe, expect, it } from "vitest";
import { DEFAULT_CYCLE_SETTINGS } from "@/lib/reviews/demoData";
import {
  isGoalWindowOpenForPerson,
  resolveGoalDeadline,
} from "./goalExtensions";
import type { DemoPerson, GoalsCycle } from "./types";

const person: DemoPerson = {
  id: "101",
  name: "Amin",
  email: "amin@example.com",
  title: "Engineer",
  department: "Product",
  departmentId: 4,
  team: "Platform",
  teamId: 9,
  joinDate: "2025-01-01",
  reportIds: [],
  avatarHue: 1,
  blurb: "",
};

const cycle: GoalsCycle = {
  id: "q3-2026",
  label: "Q3 2026",
  day1: "2026-07-01",
  phase: "hard_lock",
  goalCountPolicy: { ...DEFAULT_CYCLE_SETTINGS.goalCountPolicy },
  postWindowGoalPolicy: "hard_stop",
  goalWindow: { startDate: "2026-06-01", endDate: "2026-07-01" },
  goalExtensions: [
    {
      id: "department",
      endDate: "2026-08-20",
      scope: {
        type: "department",
        departmentId: 4,
        departmentName: "Product",
      },
    },
    {
      id: "person",
      endDate: "2026-08-31",
      scope: { type: "people", employeeIds: [101] },
    },
  ],
};

describe("goal cycle extensions", () => {
  it("uses the latest deadline when scopes overlap", () => {
    expect(resolveGoalDeadline(cycle, person)).toBe("2026-08-31");
  });

  it("matches a department when ids arrive as strings", () => {
    expect(
      resolveGoalDeadline(
        { ...cycle, goalExtensions: [cycle.goalExtensions![0]] },
        { ...person, id: "202", departmentId: "4" as unknown as number },
      ),
    ).toBe("2026-08-20");
  });

  it("keeps only matching populations open", () => {
    expect(
      isGoalWindowOpenForPerson(cycle, person, "2026-08-25"),
    ).toBe(true);
    expect(
      isGoalWindowOpenForPerson(
        cycle,
        { ...person, id: "202", departmentId: 8, teamId: 12 },
        "2026-08-25",
      ),
    ).toBe(false);
  });
});
