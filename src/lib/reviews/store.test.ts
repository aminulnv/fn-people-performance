import { beforeEach, describe, expect, it, vi } from "vitest";
import { createInitialReviewsSnapshot } from "./demoData";
import { buildPeriod, formatDateRange } from "./periods";
import { updateReviewCycleRemote } from "./remoteApi";
import { resolveCycleStatus } from "./status";
import {
  clearReviewsMutationError,
  createCycleGroup,
  createReviewCycle,
  createTestCycle,
  deleteReviewCycle,
  getReviewCycle,
  getReviewsSnapshot,
  resetReviewsStoreForTests,
  setReviewsLocalModeForTests,
  sortCyclesForList,
  updateCycleSettings,
  updateCycleStagesConfig,
  updateReviewCycle,
} from "./store";

vi.mock("./remoteApi", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./remoteApi")>();
  return {
    ...actual,
    updateReviewCycleRemote: vi.fn(),
  };
});

beforeEach(() => {
  resetReviewsStoreForTests();
});

describe("resolveCycleStatus", () => {
  it("marks ad-hoc cycles as manual", () => {
    expect(
      resolveCycleStatus(
        {
          type: "ad-hoc",
          startDate: "2026-01-01",
          endDate: "2026-03-31",
        },
        new Date("2026-08-13"),
      ),
    ).toBe("manual");
  });

  it("classifies regular cycles by timeframe", () => {
    const today = new Date("2026-08-13");
    expect(
      resolveCycleStatus(
        { type: "regular", startDate: "2026-07-01", endDate: "2026-09-30" },
        today,
      ),
    ).toBe("current");
    expect(
      resolveCycleStatus(
        { type: "regular", startDate: "2027-01-01", endDate: "2027-03-31" },
        today,
      ),
    ).toBe("future");
    expect(
      resolveCycleStatus(
        { type: "regular", startDate: "2026-01-01", endDate: "2026-03-31" },
        today,
      ),
    ).toBe("previous");
  });
});

describe("formatDateRange", () => {
  it("formats a quarter range with a shared year", () => {
    expect(formatDateRange("2027-01-01", "2027-03-31")).toBe(
      "1 Jan - 31 Mar 2027",
    );
  });
});

describe("reviews store", () => {
  it("seeds demo cycles and creates a regular cycle", async () => {
    const seeded = createInitialReviewsSnapshot();
    expect(seeded.cycles).toHaveLength(1);
    expect(seeded.cycles[0]?.id).toBe("q3-2026");

    const period = buildPeriod(2028, 2);
    // Use unique period unlikely in seed
    const created = await createReviewCycle({
      type: "regular",
      periodKey: period.key,
    });
    expect(created.name).toBe("Q2 2028");
    expect(getReviewCycle(created.id)?.id).toBe(created.id);
  });

  it("creates an annual appraisal with year stages and linked quarters", async () => {
    const created = await createReviewCycle({
      type: "regular",
      purpose: "annual_appraisal",
      periodKey: "annual-2028",
    });
    expect(created.purpose).toBe("annual_appraisal");
    expect(created.id).toBe("annual-2028");
    expect(created.startDate).toBe("2029-01-01");
    expect(created.endDate).toBe("2029-02-15");
    const enabled = (created.stagesConfig.reviewStages ?? [])
      .filter((stage) => stage.enabled)
      .map((stage) => stage.id);
    expect(enabled).toContain("self_review");
    expect(enabled).toContain("manager_review");
    expect(enabled).not.toContain("goals");
  });

  it("creates Q4 as a goals-only cycle", async () => {
    const created = await createReviewCycle({
      type: "regular",
      purpose: "quarterly_checkin",
      periodKey: "q4-2028",
    });
    const enabled = (created.stagesConfig.reviewStages ?? [])
      .filter((stage) => stage.enabled)
      .map((stage) => stage.id);
    expect(enabled).toEqual(["goals"]);
  });

  it("honours module overrides when creating a cycle", async () => {
    const created = await createReviewCycle({
      type: "regular",
      purpose: "quarterly_checkin",
      periodKey: "q4-2029",
      modules: { goals: true, reviews: true },
    });
    const enabled = (created.stagesConfig.reviewStages ?? [])
      .filter((stage) => stage.enabled)
      .map((stage) => stage.id);
    expect(enabled).toContain("goals");
    expect(enabled).toContain("manager_review");
  });

  it("lets an annual period be created again after it was deleted", async () => {
    const first = await createReviewCycle({
      type: "regular",
      purpose: "annual_appraisal",
      periodKey: "annual-2029",
    });
    await deleteReviewCycle(first.id);
    expect(getReviewCycle(first.id)).toBeNull();

    const second = await createReviewCycle({
      type: "regular",
      purpose: "annual_appraisal",
      periodKey: "annual-2029",
    });
    expect(second.periodKey).toBe("annual-2029");
    expect(getReviewCycle(second.id)?.name).toBe("Annual 2029");
  });

  it("creates a test cycle from an existing one", async () => {
    const source = await createReviewCycle({
      type: "ad-hoc",
      name: "Source",
      startDate: "2026-01-01",
      endDate: "2026-02-01",
    });
    const test = await createTestCycle(source.id);
    expect(test.isTest).toBe(true);
    expect(test.name).toContain("(Test)");
    expect(test.type).toBe("ad-hoc");
  });

  it("deletes a cycle", async () => {
    const created = await createReviewCycle({
      type: "ad-hoc",
      name: "To delete",
      startDate: "2026-01-01",
      endDate: "2026-02-01",
    });
    await deleteReviewCycle(created.id);
    expect(getReviewCycle(created.id)).toBeNull();
  });

  it("sorts cycles with current before previous", () => {
    const cycles = [
      {
        id: "a",
        name: "Prev",
        type: "regular" as const,
        startDate: "2026-01-01",
        endDate: "2026-03-31",
      },
      {
        id: "b",
        name: "Current",
        type: "regular" as const,
        startDate: "2026-07-01",
        endDate: "2026-09-30",
      },
    ];
    const sorted = sortCyclesForList(cycles as never, (c) =>
      resolveCycleStatus(c, new Date("2026-08-13")),
    );
    expect(sorted[0].id).toBe("b");
    expect(sorted[1].id).toBe("a");
  });

  it("rejects invalid goal windows before saving cycle stages", async () => {
    const cycle = createInitialReviewsSnapshot().cycles[0];
    if (!cycle) throw new Error("Expected seeded cycle");
    const invalid = structuredClone(cycle.stagesConfig);
    invalid.goals.employee = {
      startDate: "2026-07-10",
      endDate: "2026-07-01",
    };

    await expect(updateCycleStagesConfig(cycle.id, invalid)).rejects.toThrow(
      "Goal setting must end on or after its start date.",
    );
  });

  it("saves and validates a cycle-specific goal-count policy", async () => {
    const cycle = createInitialReviewsSnapshot().cycles[0];
    if (!cycle) throw new Error("Expected seeded cycle");

    const updated = await updateCycleSettings(cycle.id, {
      goalCountPolicy: {
        minimumRequired: 1,
        recommendedMinimum: 2,
        recommendedMaximum: 7,
        maximumAllowed: 8,
      },
    });
    expect(updated.settings.goalCountPolicy).toEqual({
      minimumRequired: 1,
      recommendedMinimum: 2,
      recommendedMaximum: 7,
      maximumAllowed: 8,
    });

    await expect(
      updateCycleSettings(cycle.id, {
        goalCountPolicy: {
          minimumRequired: 3,
          recommendedMinimum: 2,
          recommendedMaximum: 7,
          maximumAllowed: null,
        },
      }),
    ).rejects.toThrow("Recommended minimum cannot be lower");
  });

  it("saves the post-window goal policy per cycle", async () => {
    const cycle = createInitialReviewsSnapshot().cycles[0];
    if (!cycle) throw new Error("Expected seeded cycle");

    const updated = await updateCycleSettings(cycle.id, {
      postWindowGoalPolicy: "hard_stop",
    });

    expect(updated.settings.postWindowGoalPolicy).toBe("hard_stop");
  });

  it("coerces string population ids when saving deadline extensions", async () => {
    const cycle = createInitialReviewsSnapshot().cycles[0];
    if (!cycle) throw new Error("Expected seeded cycle");
    const stages = structuredClone(cycle.stagesConfig);
    stages.goals.extensions = [
      {
        id: "product-extension",
        endDate: "2026-08-01",
        scope: {
          type: "department",
          departmentId: "16" as unknown as number,
          departmentName: "Product",
        },
      },
    ];

    const updated = await updateCycleStagesConfig(cycle.id, stages);

    expect(updated.stagesConfig.goals.extensions).toEqual([
      {
        id: "product-extension",
        endDate: "2026-08-01",
        scope: {
          type: "department",
          departmentId: 16,
          departmentName: "Product",
        },
      },
    ]);
  });

  it("saves population-specific goal deadline extensions", async () => {
    const cycle = createInitialReviewsSnapshot().cycles[0];
    if (!cycle) throw new Error("Expected seeded cycle");
    const stages = structuredClone(cycle.stagesConfig);
    stages.goals.extensions = [
      {
        id: "product-extension",
        endDate: "2026-08-01",
        scope: {
          type: "department",
          departmentId: 4,
          departmentName: "Product",
        },
      },
    ];

    const updated = await updateCycleStagesConfig(cycle.id, stages);

    expect(updated.stagesConfig.goals.extensions).toEqual(
      stages.goals.extensions,
    );
  });

  it("saves settings and stages in one local commit", async () => {
    const cycle = createInitialReviewsSnapshot().cycles[0];
    if (!cycle) throw new Error("Expected seeded cycle");

    const stages = structuredClone(cycle.stagesConfig);
    stages.goals.employee.endDate = "2026-07-20";

    const updated = await updateReviewCycle(cycle.id, {
      settings: { postWindowGoalPolicy: "hard_stop" },
      stagesConfig: stages,
    });

    expect(updated.version).toBe((cycle.version ?? 1) + 1);
    expect(updated.settings.postWindowGoalPolicy).toBe("hard_stop");
    expect(updated.stagesConfig.goals.employee.endDate).toBe("2026-07-20");
  });

  it("rejects an invalid combined patch synchronously", () => {
    const cycle = createInitialReviewsSnapshot().cycles[0];
    if (!cycle) throw new Error("Expected seeded cycle");
    expect(getReviewCycle(cycle.id)).not.toBeNull();

    expect(() =>
      updateReviewCycle(cycle.id, {
        settings: {
          goalCountPolicy: {
            minimumRequired: 3,
            recommendedMinimum: 2,
            recommendedMaximum: 7,
            maximumAllowed: null,
          },
        },
      }),
    ).toThrow("Recommended minimum cannot be lower");
  });

  it("applies a remote save locally before the request settles", async () => {
    const cycle = createInitialReviewsSnapshot().cycles[0];
    if (!cycle) throw new Error("Expected seeded cycle");
    expect(getReviewCycle(cycle.id)).not.toBeNull();

    let resolveRemote!: (value: ReturnType<typeof getReviewCycle>) => void;
    vi.mocked(updateReviewCycleRemote).mockReturnValue(
      new Promise((resolve) => {
        resolveRemote = resolve;
      }),
    );
    setReviewsLocalModeForTests(false);

    const pending = updateReviewCycle(cycle.id, { name: "Optimistic name" });
    expect(getReviewCycle(cycle.id)?.name).toBe("Optimistic name");

    resolveRemote({
      ...getReviewCycle(cycle.id)!,
      name: "Server name",
      version: 4,
    });
    await expect(pending).resolves.toMatchObject({
      name: "Server name",
      version: 4,
    });
  });

  it("reverts an optimistic save and surfaces the mutation error", async () => {
    const cycle = createInitialReviewsSnapshot().cycles[0];
    if (!cycle) throw new Error("Expected seeded cycle");
    expect(getReviewCycle(cycle.id)).not.toBeNull();

    vi.mocked(updateReviewCycleRemote).mockRejectedValue(
      new Error("Cycle was updated by someone else. Reload and try again."),
    );
    setReviewsLocalModeForTests(false);

    const pending = updateReviewCycle(cycle.id, { name: "Optimistic name" });
    expect(getReviewCycle(cycle.id)?.name).toBe("Optimistic name");

    await expect(pending).rejects.toThrow("updated by someone else");
    expect(getReviewCycle(cycle.id)?.name).toBe(cycle.name);
    expect(getReviewsSnapshot().mutationError).toEqual({
      cycleId: cycle.id,
      message: "Cycle was updated by someone else. Reload and try again.",
    });

    clearReviewsMutationError();
    expect(getReviewsSnapshot().mutationError).toBeNull();
  });

  it("skips a local write when the cycle patch is unchanged", async () => {
    const cycle = createInitialReviewsSnapshot().cycles[0];
    if (!cycle) throw new Error("Expected seeded cycle");

    const updated = await updateReviewCycle(cycle.id, {
      name: cycle.name,
      settings: cycle.settings,
      stagesConfig: cycle.stagesConfig,
    });

    expect(updated.version).toBe(cycle.version);
    expect(updated.updatedAt).toBe(cycle.updatedAt);
  });

  it("rejects extensions that reach the performance stage", async () => {
    const cycle = createInitialReviewsSnapshot().cycles[0];
    if (!cycle) throw new Error("Expected seeded cycle");
    const stages = structuredClone(cycle.stagesConfig);
    stages.goals.extensions = [
      {
        id: "invalid-extension",
        endDate: stages.performance.employeeStart.date,
        scope: { type: "people", employeeIds: [101] },
      },
    ];

    await expect(
      updateCycleStagesConfig(cycle.id, stages),
    ).rejects.toThrow("before performance review starts");
  });

  it("creates a people group that clones the current cycle settings", async () => {
    const cycle = createInitialReviewsSnapshot().cycles[0];
    if (!cycle) throw new Error("Expected seeded cycle");

    const group = await createCycleGroup(cycle.id, {
      name: "Leadership",
      memberIds: [101],
    });

    expect(group.name).toBe("Leadership");
    expect(group.settings).toEqual(cycle.settings);
    expect(group.stagesConfig).toEqual(cycle.stagesConfig);
    expect(group.calibration).toEqual(cycle.calibration);
    expect(getReviewCycle(cycle.id)?.groups).toEqual([group]);
  });

  it("moves a person when they are added to a second group", async () => {
    const cycle = createInitialReviewsSnapshot().cycles[0];
    if (!cycle) throw new Error("Expected seeded cycle");

    const first = await createCycleGroup(cycle.id, {
      name: "Leadership",
      memberIds: [101, 102],
    });
    await createCycleGroup(cycle.id, {
      name: "Senior leadership",
      memberIds: [101],
    });

    const stored = getReviewCycle(cycle.id);
    expect(stored?.groups?.find((group) => group.id === first.id)?.memberIds).toEqual(
      [102],
    );
    expect(
      stored?.groups?.find((group) => group.name === "Senior leadership")
        ?.memberIds,
    ).toEqual([101]);
  });

  it("copies groups onto a test cycle with new ids", async () => {
    const source = await createReviewCycle({
      type: "ad-hoc",
      name: "Source",
      startDate: "2026-01-01",
      endDate: "2026-02-01",
    });
    const group = await createCycleGroup(source.id, {
      name: "Leadership",
      memberIds: [9],
    });
    const test = await createTestCycle(source.id);
    expect(test.groups).toHaveLength(1);
    expect(test.groups?.[0]?.id).not.toBe(group.id);
    expect(test.groups?.[0]?.cycleId).toBe(test.id);
    expect(test.groups?.[0]?.name).toBe("Leadership");
    expect(test.groups?.[0]?.memberIds).toEqual([9]);
  });

  it("leaves existing cycles with no groups unchanged", async () => {
    const cycle = createInitialReviewsSnapshot().cycles[0];
    if (!cycle) throw new Error("Expected seeded cycle");
    expect(cycle.groups ?? []).toEqual([]);

    const updated = await updateReviewCycle(cycle.id, {
      settings: cycle.settings,
      stagesConfig: cycle.stagesConfig,
    });
    expect(updated.groups ?? []).toEqual([]);
  });
});
