import { describe, expect, it } from "vitest";
import { listOkrReferences } from "./reference";

describe("OKR references", () => {
  it("returns only department references when the person has no wing", () => {
    const references = listOkrReferences({
      department: "Engineering",
      wing: "",
    });

    expect(references).toHaveLength(2);
    expect(references.every((reference) => reference.level === "department")).toBe(
      true,
    );
  });

  it("returns department and wing references for the person's org path", () => {
    const references = listOkrReferences({
      department: "Engineering",
      wing: "Platform",
    });

    expect(references.map((reference) => reference.level)).toEqual([
      "department",
      "department",
      "wing",
      "wing",
    ]);
    expect(references[2].ownerLabel).toBe("Platform wing");
  });
});
