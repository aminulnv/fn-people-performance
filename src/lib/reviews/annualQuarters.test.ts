import { describe, expect, it } from "vitest";
import {
  buildDefaultStagesConfig,
  DEFAULT_CALIBRATION,
  DEFAULT_CYCLE_SETTINGS,
} from "./demoData";
import {
  buildAnnualQuarterRows,
  gradeFromLinkedPacket,
  usesAnnualLinkedQuarters,
} from "./annualQuarters";
import type { ReviewCycle, ReviewPacket } from "./types";

function cycle(
  partial: Pick<ReviewCycle, "id" | "name" | "periodKey"> &
    Partial<ReviewCycle>,
): ReviewCycle {
  return {
    type: "regular",
    purpose: "quarterly_checkin",
    startDate: "2026-01-01",
    endDate: "2026-03-31",
    yearKey: "2026",
    sourceLinks: [],
    stagesConfig: buildDefaultStagesConfig("2026-01-01", "2026-03-31"),
    settings: { ...DEFAULT_CYCLE_SETTINGS },
    calibration: { ...DEFAULT_CALIBRATION },
    createdAt: "2026-01-01T00:00:00.000Z",
    ...partial,
  };
}

function packet(partial: Partial<ReviewPacket> = {}): ReviewPacket {
  return {
    id: "pkt",
    cycleId: "q2-2026",
    groupId: null,
    employeeId: 1,
    managerEmployeeId: 2,
    status: "released_to_employees",
    selfOverallGrade: null,
    managerOverallGrade: "exceeding",
    calibratedOverallGrade: null,
    publishedOverallGrade: null,
    managerOverrideReason: "",
    goalsComponent: null,
    answers: [],
    pillarScores: [],
    calibrationEvents: [],
    appeals: [],
    version: 1,
    ...partial,
  };
}

describe("usesAnnualLinkedQuarters", () => {
  it("is only true for an annual cycle with included source links", () => {
    const annual = cycle({
      id: "annual-2026",
      name: "Annual 2026",
      periodKey: "annual-2026",
      purpose: "annual_appraisal",
      sourceLinks: [
        { sourceCycleId: "q1-2026", weightPercent: 25, excluded: false },
      ],
    });
    expect(usesAnnualLinkedQuarters(annual)).toBe(true);
    expect(
      usesAnnualLinkedQuarters({ ...annual, sourceLinks: [] }),
    ).toBe(false);
    expect(
      usesAnnualLinkedQuarters({ ...annual, purpose: "quarterly_checkin" }),
    ).toBe(false);
    expect(
      usesAnnualLinkedQuarters(
        { ...annual, sourceLinks: [] },
        true,
        [cycle({ id: "q1-2026", name: "Q1 2026", periodKey: "q1-2026" })],
      ),
    ).toBe(true);
  });
});

describe("gradeFromLinkedPacket", () => {
  it("prefers the published grade, then manager, then the goals pillar", () => {
    expect(
      gradeFromLinkedPacket(
        packet({ publishedOverallGrade: "performing", managerOverallGrade: "exceeding" }),
      ),
    ).toBe("performing");
    expect(gradeFromLinkedPacket(packet())).toBe("exceeding");
    expect(
      gradeFromLinkedPacket(
        packet({
          managerOverallGrade: null,
          pillarScores: [
            { pillarId: "goals", actorRole: "manager", grade: "developing", comment: "" },
          ],
        }),
      ),
    ).toBe("developing");
  });
});

describe("buildAnnualQuarterRows", () => {
  const cycles = [
    cycle({ id: "q1-2026", name: "Q1 2026", periodKey: "q1-2026" }),
    cycle({ id: "q2-2026", name: "Q2 2026", periodKey: "q2-2026" }),
    cycle({ id: "q3-2026", name: "Q3 2026", periodKey: "q3-2026" }),
    cycle({ id: "q4-2026", name: "Q4 2026", periodKey: "q4-2026" }),
  ];

  it("locks Q1–Q3 as grades and keeps Q4 as progress only", () => {
    const rows = buildAnnualQuarterRows({
      links: [
        { sourceCycleId: "q1-2026", weightPercent: 25, excluded: false },
        { sourceCycleId: "q2-2026", weightPercent: 25, excluded: false },
        { sourceCycleId: "q3-2026", weightPercent: 25, excluded: false },
        { sourceCycleId: "q4-2026", weightPercent: 25, excluded: false },
      ],
      cycles,
      packetsByCycleId: {
        "q1-2026": packet({
          cycleId: "q1-2026",
          managerOverallGrade: "performing",
        }),
        "q2-2026": packet({ cycleId: "q2-2026" }),
        "q3-2026": packet({
          cycleId: "q3-2026",
          managerOverallGrade: "performing",
        }),
        "q4-2026": packet({
          cycleId: "q4-2026",
          managerOverallGrade: "exceptional",
        }),
      },
      goalsByCycleId: {
        "q4-2026": [
          {
            id: "g1",
            description: "Ship Q4",
            weight: 100,
            measurements: [
              {
                id: "m1",
                kind: "metric",
                title: "Done",
                weight: 100,
                unit: "number",
                direction: "increase",
                startValue: 0,
                targetValue: 10,
                currentValue: 4,
              },
            ],
          },
        ],
      },
    });

    expect(rows.map((row) => row.kind)).toEqual([
      "graded",
      "graded",
      "graded",
      "progress",
    ]);
    expect(rows[0]?.grade).toBe("performing");
    expect(rows[1]?.grade).toBe("exceeding");
    expect(rows[2]?.grade).toBe("performing");
    expect(rows[3]).toMatchObject({
      grade: null,
      progressPercent: 40,
      goalCount: 1,
    });
  });
});
