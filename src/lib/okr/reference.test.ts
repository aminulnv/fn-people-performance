import { describe, expect, it } from "vitest";
import {
  formatOkrRole,
  levelFromTier,
  mapEmployeeOkrPayload,
  okrHrEmployeeId,
  okrStatusTone,
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
        },
      ],
      specialProjects: [
        {
          id: "sp-1",
          shortTitle: "Establish the DAR Operating Model by end of Q3",
          title: "Establish the DAR Operating Model by end of Q3 — longer",
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
    expect(keyResult?.lastCheckIn?.authorName).toBe("Api Singha");
    expect(keyResult?.level).toBe("wing");
  });

  it("maps special projects onto the same list", () => {
    const special = mapEmployeeOkrPayload(payload).items[1];
    expect(special?.kind).toBe("special_project");
    expect(special?.description).toBe(
      "Establish the DAR Operating Model by end of Q3 — longer",
    );
    expect(special?.level).toBe("company");
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
});
