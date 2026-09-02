import { describe, expect, it } from "vitest";
import {
  applyOkrPayloadToGoal,
  mapOkrUnit,
  metricFromOkrPayload,
  okrApplyWouldOverwriteGoal,
  okrGoalDropPayload,
} from "./applyToGoal";
import type { OkrWorkItem } from "./reference";

const item: OkrWorkItem = {
  id: "key_result:kr-1",
  keyResultId: "kr-1",
  objectiveId: "obj-1",
  kind: "key_result",
  level: "company",
  quarter: "2026-Q3",
  quarterLabel: "Q3 2026",
  title: "Build Performance Platform Phase 1",
  shortTitle: "Build Performance Platform Phase 1",
  description: "Q3 Build, Q4 Testing, Q1 2027 Launch",
  objectiveTitle: "People Foundation",
  ownerLabel: "S.M. Fahim",
  status: "on_track",
  statusLabel: "On Track",
  roles: ["responsible"],
  unit: "%",
  trackType: "percent",
  direction: "increase",
  startValue: 0,
  currentValue: 20,
  targetValue: 100,
  progressPercent: 20,
  lastCheckIn: null,
  raci: { accountable: [], responsible: [], consulted: [], informed: [] },
  milestones: [],
  linkedKrs: [],
  tierLabel: "T1",
};

describe("apply OKR to goal", () => {
  it("maps percent units and fills title, description, and metric", () => {
    expect(mapOkrUnit("%")).toBe("%");
    expect(mapOkrUnit("days")).toBe("days");
    expect(mapOkrUnit("NPS")).toBe("number");

    const next = applyOkrPayloadToGoal(
      { id: "goal-1", description: "", weight: 0, measurements: [] },
      okrGoalDropPayload(item),
    );

    expect(next.description).toBe("Build Performance Platform Phase 1");
    expect(next.details).toBe("Q3 Build, Q4 Testing, Q1 2027 Launch");
    expect(next.measurements).toHaveLength(1);
    expect(next.measurements[0]).toMatchObject({
      kind: "metric",
      title: "Build Performance Platform Phase 1",
      unit: "%",
      startValue: 0,
      currentValue: 20,
      targetValue: 100,
      direction: "increase",
      weight: 100,
    });
  });

  it("uses progress percent when current and target are missing", () => {
    const metric = metricFromOkrPayload({
      title: "Coverage",
      description: "",
      unit: "%",
      trackType: "percent",
      startValue: null,
      currentValue: null,
      targetValue: null,
      progressPercent: 40,
      milestones: [],
    });
    expect(metric).toMatchObject({
      unit: "%",
      startValue: 0,
      currentValue: 40,
      targetValue: 100,
    });
  });

  it("carries the OKR start value onto numeric metrics", () => {
    const metric = metricFromOkrPayload({
      title: "NPS",
      description: "",
      unit: "number",
      trackType: "percent",
      startValue: 35,
      currentValue: 48,
      targetValue: 60,
      progressPercent: null,
      milestones: [],
    });
    expect(metric).toMatchObject({
      startValue: 35,
      currentValue: 48,
      targetValue: 60,
    });
  });

  it("maps milestone OKRs onto a todo measure", () => {
    const next = applyOkrPayloadToGoal(
      { id: "goal-1", description: "", weight: 0, measurements: [] },
      okrGoalDropPayload({
        ...item,
        kind: "special_project",
        shortTitle: "Establish the DAR Operating Model",
        description: "Stand up the operating model this quarter",
        unit: "",
        trackType: "percent",
        currentValue: null,
        targetValue: null,
        progressPercent: 0,
        milestones: [
          { id: "ms-1", title: "Draft operating model", status: "completed", weight: 20 },
          { id: "ms-2", title: "Socialize with leads", status: "on_track", weight: 80 },
        ],
      }),
    );

    expect(next.description).toBe("Establish the DAR Operating Model");
    expect(next.details).toBe("Stand up the operating model this quarter");
    expect(next.measurements).toEqual([
      expect.objectContaining({
        kind: "milestone",
        title: "Draft operating model",
        complete: true,
        measureTitle: "Establish the DAR Operating Model",
      }),
      expect.objectContaining({
        kind: "milestone",
        title: "Socialize with leads",
        complete: false,
        measureTitle: "Establish the DAR Operating Model",
      }),
    ]);
  });

  it("uses trackType milestone when the checklist is empty", () => {
    const next = applyOkrPayloadToGoal(
      { id: "goal-1", description: "", weight: 0, measurements: [] },
      okrGoalDropPayload({
        ...item,
        trackType: "milestone",
        milestones: [],
      }),
    );

    expect(next.measurements).toEqual([
      expect.objectContaining({
        kind: "milestone",
        title: "Build Performance Platform Phase 1",
        complete: false,
      }),
    ]);
  });

  it("uses decrease when the target is below the current value", () => {
    expect(
      metricFromOkrPayload({
        title: "Defects",
        description: "",
        unit: "number",
        trackType: "percent",
        startValue: null,
        currentValue: 12,
        targetValue: 4,
        progressPercent: null,
        milestones: [],
      }).direction,
    ).toBe("decrease");
  });

  it("detects when apply would overwrite existing goal content", () => {
    expect(
      okrApplyWouldOverwriteGoal({
        description: "",
        details: undefined,
        measurements: [],
      }),
    ).toBe(false);
    expect(
      okrApplyWouldOverwriteGoal({
        description: "Ship platform",
        details: undefined,
        measurements: [],
      }),
    ).toBe(true);
    expect(
      okrApplyWouldOverwriteGoal({
        description: "",
        details: "Notes",
        measurements: [],
      }),
    ).toBe(true);
    expect(
      okrApplyWouldOverwriteGoal({
        description: "",
        details: undefined,
        measurements: [
          {
            id: "m1",
            kind: "metric",
            title: "Progress",
            weight: 100,
            unit: "number",
            direction: "increase",
            startValue: 0,
            currentValue: 0,
          },
        ],
      }),
    ).toBe(true);
  });
});
