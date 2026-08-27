import { describe, expect, it } from "vitest";
import { normalizeProofUrl, proofLinkLabel, proofParts } from "./proof";

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

  it("rejects incomplete or punctuation hosts", () => {
    expect(normalizeProofUrl("https://,\\")).toBeUndefined();
    expect(normalizeProofUrl("https://")).toBeUndefined();
    expect(normalizeProofUrl("https://dash")).toBeUndefined();
    expect(normalizeProofUrl("not a url")).toBeUndefined();
  });

  it("keeps localhost and dotted hosts", () => {
    expect(normalizeProofUrl("http://localhost:3000/proof")).toBe(
      "http://localhost:3000/proof",
    );
    expect(normalizeProofUrl("dash.fn/nps")).toBe("https://dash.fn/nps");
  });
});

describe("proofParts", () => {
  it("treats a url or note as proof", () => {
    expect(proofParts("example.com").hasProof).toBe(true);
    expect(proofParts(undefined, "Q2 screenshot").hasProof).toBe(true);
    expect(proofParts("  ", "").hasProof).toBe(false);
  });
});

describe("proofLinkLabel", () => {
  it("shows the host and path", () => {
    expect(proofLinkLabel("https://www.example.com/dash/")).toBe(
      "example.com/dash",
    );
  });
});
