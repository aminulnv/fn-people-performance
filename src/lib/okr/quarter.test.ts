import { describe, expect, it } from "vitest";
import { okrQuarterFromLabel } from "./quarter";

describe("okrQuarterFromLabel", () => {
  it("accepts the OKR platform formats used by goals cycles", () => {
    expect(okrQuarterFromLabel("2026-Q3")).toBe("2026-Q3");
    expect(okrQuarterFromLabel("Q3 2026")).toBe("2026-Q3");
    expect(okrQuarterFromLabel("q3-2026")).toBe("2026-Q3");
  });

  it("returns nothing for annual or unknown cycle names", () => {
    expect(okrQuarterFromLabel("Annual 2026")).toBeUndefined();
    expect(okrQuarterFromLabel("")).toBeUndefined();
    expect(okrQuarterFromLabel(null)).toBeUndefined();
  });
});
