import { describe, expect, it } from "vitest";
import {
  approvalCopy,
  batchStatusLabel,
  resolveApprovalPerson,
} from "./approvalDisplay";

describe("approvalCopy", () => {
  it("names the skip-level wait state for late final approval", () => {
    expect(approvalCopy("submitted", "manager_manager")).toMatchObject({
      title: "Pending final approval",
      sub: "Waiting on skip-level manager",
    });
    expect(approvalCopy("submitted", "manager")).toMatchObject({
      title: "Pending approval",
      sub: "Waiting on manager",
    });
  });
});

describe("resolveApprovalPerson", () => {
  const cascadeFrom = {
    managerName: "Line Manager",
    managerAvatarUrl: "manager.png",
    skipLevelManagerName: "Skip Level",
    skipLevelManagerAvatarUrl: "skip.png",
    options: [],
  };

  it("shows the line manager while first-stage late approval is pending", () => {
    expect(
      resolveApprovalPerson({
        status: "submitted",
        postWindowApprovalStage: "manager",
        cascadeFrom,
      }),
    ).toEqual({
      name: "Line Manager",
      avatarUrl: "manager.png",
    });
  });

  it("shows the skip-level manager while final late approval is pending", () => {
    expect(
      resolveApprovalPerson({
        status: "submitted",
        postWindowApprovalStage: "manager_manager",
        cascadeFrom,
      }),
    ).toEqual({
      name: "Skip Level",
      avatarUrl: "skip.png",
    });
  });

  it("shows the actual final approver instead of guessing from the org chart", () => {
    expect(
      resolveApprovalPerson({
        status: "approved",
        approvedBy: { name: "Final Approver", avatarUrl: "final.png" },
        cascadeFrom,
      }),
    ).toEqual({
      name: "Final Approver",
      avatarUrl: "final.png",
    });
    expect(approvalCopy("approved").sub).toBe("Approval complete");
  });
});

describe("batchStatusLabel", () => {
  it("uses the submission status without a goal count", () => {
    expect(batchStatusLabel("draft", 3)).toBe("Draft");
    expect(batchStatusLabel("draft", 0)).toBe("Not started");
    expect(batchStatusLabel("sent_back", 3)).toBe("Sent back");
    expect(batchStatusLabel("approved", 3)).toBe("Approved");
  });

  it("names the skip-level wait while late final approval is pending", () => {
    expect(batchStatusLabel("submitted", 3)).toBe("Pending approval");
    expect(batchStatusLabel("submitted", 3, "manager_manager")).toBe(
      "Pending final approval",
    );
  });
});
