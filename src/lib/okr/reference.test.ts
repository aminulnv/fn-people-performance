import { describe, expect, it } from "vitest";
import {
  canViewOkrReference,
  listOkrReferences,
  listVisibleOkrReferences,
} from "./reference";

describe("OKR references", () => {
  it("always includes company references", () => {
    const references = listOkrReferences({
      department: "",
      wing: "",
    });

    expect(references.every((reference) => reference.level === "company")).toBe(
      true,
    );
    expect(references.some((reference) => reference.audience === "admins")).toBe(
      true,
    );
    expect(references[0]?.keyResults[0]?.raci.accountable.length).toBeGreaterThan(
      0,
    );
  });

  it("returns company and department references when the person has no wing", () => {
    const references = listOkrReferences({
      department: "Engineering",
      wing: "",
    });

    expect(references.map((reference) => reference.level)).toEqual([
      "company",
      "company",
      "company",
      "department",
      "department",
    ]);
  });

  it("returns company, department, and wing references for the person's org path", () => {
    const references = listOkrReferences({
      department: "Engineering",
      wing: "Platform",
    });

    expect(references.map((reference) => reference.level)).toEqual([
      "company",
      "company",
      "company",
      "department",
      "department",
      "wing",
      "wing",
    ]);
    expect(references.at(-1)?.ownerLabel).toBe("Platform wing");
  });
});

describe("OKR reference RBAC", () => {
  const scope = { department: "Engineering", wing: "Platform" };

  it("hides admin-only OKRs from people without all-read access", () => {
    const visible = listVisibleOkrReferences(scope, {
      department: "Engineering",
      wing: "Platform",
    });

    expect(
      visible.some((reference) => reference.audience === "admins"),
    ).toBe(false);
    expect(
      visible.some((reference) => reference.level === "company"),
    ).toBe(true);
    expect(
      visible.some((reference) => reference.level === "department"),
    ).toBe(true);
  });

  it("hides another department's OKRs from a viewer outside that department", () => {
    const visible = listVisibleOkrReferences(scope, {
      department: "Sales",
      wing: "Enterprise",
    });

    expect(visible.every((reference) => reference.level === "company")).toBe(
      true,
    );
    expect(
      visible.some((reference) => reference.audience === "admins"),
    ).toBe(false);
  });

  it("lets all-read viewers see the leadership-only company OKR", () => {
    const restricted = listOkrReferences(scope).find(
      (reference) => reference.audience === "admins",
    );
    expect(restricted).toBeTruthy();
    expect(
      canViewOkrReference(restricted!, {
        department: "Sales",
        wing: "",
        permissions: ["platform.read_all"],
      }),
    ).toBe(true);
  });
});
