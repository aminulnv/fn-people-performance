import { describe, expect, it } from "vitest";
import {
  formatOkrDirection,
  formatOkrMilestoneStatus,
  formatOkrRole,
  formatOkrTrackingKind,
  levelFromTier,
  mapEmployeeOkrPayload,
  okrHrEmployeeId,
  okrLinkedKrPlatformUrl,
  okrMilestoneStatusTone,
  okrWorkItemPlatformUrl,
  okrStatusTone,
  okrTrackingKind,
  partyLabel,
  resolveRaciParty,
} from "./reference";

const payload = {
  employee: {
    displayName: "Saif Ivna Alam",
    email: "saif.alam@nextventures.io",
  },
  filter: { quarter: "2026-Q3" },
  quarters: [
    {
      name: "Q3 2026",
      quarter: "2026-Q3",
      keyResults: [
        {
          id: "kr-1",
          title: "Deliver 2 HR AI Training Sessions by Q3",
          shortTitle: "Deliver 2 HR AI Training Sessions by Q3",
          tier: "t4_wing",
          status: "on_track",
          statusLabel: "On Track",
          roles: ["responsible"],
          trackType: "milestone",
          direction: "increase",
          unit: "%",
          startValue: 0,
          progressPercent: 50,
          raci: {
            accountable: [
              { kind: "user", employeeId: 100, name: "Api Singha" },
            ],
            responsible: [
              {
                kind: "user",
                employeeId: "NXT871",
                displayName: "Saif Ivna Alam",
                email: "saif.alam@nextventures.io",
              },
              { kind: "org_unit", name: "People" },
            ],
            consulted: [{ kind: "label", label: "Legal" }],
            informed: [],
          },
          objective: {
            id: "obj-hr-1",
            shortTitle: "HR Digital Transformation",
            owner: { name: "Api Singha" },
          },
          lastCheckIn: {
            weekNumber: 8,
            statusLabel: "On Track",
            note: "Session is scheduled",
            submittedAt: "2026-08-21T09:18:42.548Z",
            author: { name: "Api Singha" },
          },
          linkedKrs: [
            {
              id: "linked-1",
              shortTitle: "Critical Hiring",
              tier: "t3_department",
              weight: 100,
              objective: {
                id: "obj-linked-1",
                title: "Build a High-Performance Organisation",
                owner: { name: "bhaskar" },
              },
            },
            {
              id: "linked-2",
              shortTitle: "Maintain 90% Workforce Capacity",
              tier: "t4_wing",
              weight: 100,
              objective: {
                id: "obj-linked-2",
                title: "Workforce & Capability Building",
                owner: { name: "Ong Choon Khai" },
              },
            },
          ],
        },
      ],
      specialProjects: [
        {
          id: "sp-1",
          shortTitle: "Establish the DAR Operating Model by end of Q3",
          title: "Establish the DAR Operating Model by end of Q3 - longer",
          tier: "t1_company",
          status: "at_risk",
          statusLabel: "At Risk",
          roles: ["responsible"],
          progressPercent: 0,
          owner: { name: "Api Singha" },
          raci: { accountable: [], responsible: [], consulted: [], informed: [] },
          lastCheckIn: null,
          milestones: [
            { id: "ms-1", title: "Draft operating model", status: "completed", weight: 20 },
          ],
        },
      ],
    },
  ],
};

describe("OKR window mapping", () => {
  it("counts key results and special projects as one work list", () => {
    const window = mapEmployeeOkrPayload(payload);
    expect(window.total).toBe(2);
    expect(window.items).toHaveLength(2);
    expect(window.employeeName).toBe("Saif Ivna Alam");
    expect(window.quarterLabel).toBe("2026-Q3");
  });

  it("keeps RACI employee ids for directory matching", () => {
    const [keyResult] = mapEmployeeOkrPayload(payload).items;
    expect(keyResult?.raci.accountable).toEqual([
      { employeeId: 100, email: "", label: "Api Singha" },
    ]);
    expect(keyResult?.raci.responsible).toEqual([
      {
        employeeId: 871,
        email: "saif.alam@nextventures.io",
        label: "Saif Ivna Alam",
      },
      { employeeId: null, email: "", label: "People" },
    ]);
    expect(keyResult?.raci.consulted).toEqual([
      { employeeId: null, email: "", label: "Legal" },
    ]);
    expect(keyResult?.objectiveTitle).toBe("HR Digital Transformation");
    expect(keyResult?.objectiveId).toBe("obj-hr-1");
    expect(keyResult?.keyResultId).toBe("kr-1");
    expect(keyResult?.lastCheckIn?.authorName).toBe("Api Singha");
    expect(keyResult?.level).toBe("wing");
    expect(keyResult?.tierLabel).toBe("T4");
  });

  it("maps special projects onto the same list", () => {
    const special = mapEmployeeOkrPayload(payload).items[1];
    expect(special?.kind).toBe("special_project");
    expect(special?.description).toBe(
      "Establish the DAR Operating Model by end of Q3 - longer",
    );
    expect(special?.level).toBe("company");
    expect(special?.tierLabel).toBe("T1");
    expect(special?.milestones).toEqual([
      {
        id: "ms-1",
        title: "Draft operating model",
        status: "completed",
        weight: 20,
      },
    ]);
  });
});

describe("OKR display helpers", () => {
  it("uses directory names when the HR employee id matches", () => {
    expect(okrHrEmployeeId("NXT871")).toBe(871);
    expect(
      resolveRaciParty(
        { employeeId: 871, email: "", label: "Saif" },
        [
          {
            employeeId: 871,
            fullName: "Saif Ivna Alam",
            email: "saif.alam@nextventures.io",
            avatarUrl: "https://cdn.example/saif.jpg",
          },
        ],
      ),
    ).toEqual({
      employeeId: 871,
      name: "Saif Ivna Alam",
      avatarUrl: "https://cdn.example/saif.jpg",
      linked: true,
    });
  });

  it("reads names from users, org units, and unresolved labels", () => {
    expect(partyLabel({ kind: "user", displayName: "Api Singha" })).toBe(
      "Api Singha",
    );
    expect(partyLabel({ kind: "org_unit", name: "Legal" })).toBe("Legal");
    expect(partyLabel({ kind: "label", label: "Legal" })).toBe("Legal");
  });

  it("maps tiers onto the company / department / wing groups", () => {
    expect(levelFromTier("t1_company")).toBe("company");
    expect(levelFromTier("t3_department")).toBe("department");
    expect(levelFromTier("t4_wing")).toBe("wing");
  });

  it("formats the viewer's role and status tone", () => {
    expect(formatOkrRole("responsible")).toBe("Responsible");
    expect(okrStatusTone("on_track")).toBe("ok");
    expect(okrStatusTone("at_risk")).toBe("warn");
    expect(okrStatusTone("behind")).toBe("danger");
    expect(okrStatusTone("deprioritized")).toBe("muted");
  });

  it("labels an OKR as milestone or numeric from its tracking shape", () => {
    expect(okrTrackingKind({ milestones: [] })).toBe("numeric");
    expect(
      okrTrackingKind({ milestones: [{ title: "Draft operating model" }] }),
    ).toBe("milestone");
    expect(
      okrTrackingKind({ trackType: "milestone", milestones: [] }),
    ).toBe("milestone");
    expect(formatOkrTrackingKind("numeric")).toBe("Numeric");
    expect(formatOkrTrackingKind("milestone")).toBe("Milestone");
    expect(formatOkrDirection("increase")).toBe("Increase");
    expect(formatOkrDirection("")).toBe("·");
    expect(formatOkrMilestoneStatus("completed")).toBe("Completed");
    expect(formatOkrMilestoneStatus("in_progress")).toBe("In progress");
    expect(formatOkrMilestoneStatus("not_started")).toBe("Not started");
    expect(okrMilestoneStatusTone("completed")).toBe("ok");
    expect(okrMilestoneStatusTone("in_progress")).toBe("warn");
    expect(okrMilestoneStatusTone("not_started")).toBe("muted");
  });

  it("maps trackType and milestones from the employee-krs payload", () => {
    const window = mapEmployeeOkrPayload(payload);
    expect(window.items[0]?.trackType).toBe("milestone");
    expect(window.items[0]?.direction).toBe("increase");
    expect(okrTrackingKind(window.items[0]!)).toBe("milestone");
    expect(window.items[1]?.milestones).toEqual([
      {
        id: "ms-1",
        title: "Draft operating model",
        status: "completed",
        weight: 20,
      },
    ]);
  });

  it("maps start, current, and target values from the payload", () => {
    const window = mapEmployeeOkrPayload({
      ...payload,
      quarters: [
        {
          ...payload.quarters![0]!,
          keyResults: [
            {
              ...payload.quarters![0]!.keyResults![0]!,
              startValue: 0,
              currentValue: 20,
              targetValue: 100,
              measurement: {
                startValue: 5,
                currentValue: 25,
                targetValue: 90,
              },
            },
          ],
        },
      ],
    });
    expect(window.items[0]?.startValue).toBe(0);
    expect(window.items[0]?.currentValue).toBe(20);
    expect(window.items[0]?.targetValue).toBe(100);
  });

  it("maps linked KRs for the Info tab list", () => {
    const [keyResult] = mapEmployeeOkrPayload(payload).items;
    expect(keyResult?.linkedKrs).toEqual([
      {
        keyResultId: "linked-1",
        objectiveId: "obj-linked-1",
        title: "Critical Hiring",
        objectiveTitle: "Build a High-Performance Organisation",
        ownerLabel: "bhaskar",
        weight: 100,
        tierLabel: "T3",
        level: "department",
      },
      {
        keyResultId: "linked-2",
        objectiveId: "obj-linked-2",
        title: "Maintain 90% Workforce Capacity",
        objectiveTitle: "Workforce & Capability Building",
        ownerLabel: "Ong Choon Khai",
        weight: 100,
        tierLabel: "T4",
        level: "wing",
      },
    ]);
  });

  it("builds the OKR platform workspace URL for a work item", () => {
    const [item] = mapEmployeeOkrPayload(payload).items;
    expect(item).toBeDefined();
    expect(okrWorkItemPlatformUrl(item!)).toBe(
      "https://okr.nextventures.io/wing/workspace?objectiveId=obj-hr-1&keyResultId=kr-1&year=2026&quarter=3",
    );
    expect(okrLinkedKrPlatformUrl(item!.linkedKrs[0]!, item!)).toBe(
      "https://okr.nextventures.io/department/workspace?objectiveId=obj-linked-1&keyResultId=linked-1&year=2026&quarter=3",
    );
  });
});
