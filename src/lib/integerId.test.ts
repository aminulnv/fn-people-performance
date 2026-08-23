import { describe, expect, it } from "vitest";
import { isIntegerId, toIntegerId } from "./integerId";

describe("toIntegerId", () => {
  it("keeps whole numbers", () => {
    expect(toIntegerId(16)).toBe(16);
    expect(toIntegerId(0)).toBe(0);
    expect(toIntegerId(-1)).toBe(-1);
  });

  it("parses numeric strings from postgres", () => {
    expect(toIntegerId("16")).toBe(16);
    expect(toIntegerId(" 67 ")).toBe(67);
  });

  it("rejects values that are not whole numbers", () => {
    expect(toIntegerId("")).toBeUndefined();
    expect(toIntegerId("16.5")).toBeUndefined();
    expect(toIntegerId("product")).toBeUndefined();
    expect(toIntegerId(16.5)).toBeUndefined();
    expect(toIntegerId(null)).toBeUndefined();
    expect(isIntegerId("16")).toBe(true);
    expect(isIntegerId("")).toBe(false);
  });
});
