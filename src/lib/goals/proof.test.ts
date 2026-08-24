import { describe, expect, it } from "vitest";
import { normalizeProofUrl, proofLinkLabel } from "./proof";

describe("normalizeProofUrl", () => {
  it("returns undefined for a blank value", () => {
    expect(normalizeProofUrl("   ")).toBeUndefined();
  });

  it("adds https when the protocol is missing", () => {
    expect(normalizeProofUrl("example.com/report")).toBe(
      "https://example.com/report",
    );
  });

  it("keeps http and https links", () => {
    expect(normalizeProofUrl("http://intranet.fn/proof")).toBe(
      "http://intranet.fn/proof",
    );
  });

  it("rejects non-http schemes", () => {
    expect(normalizeProofUrl("javascript:alert(1)")).toBeUndefined();
  });
});

describe("proofLinkLabel", () => {
  it("shows the host and path", () => {
    expect(proofLinkLabel("https://www.example.com/dash/")).toBe(
      "example.com/dash",
    );
  });
});
