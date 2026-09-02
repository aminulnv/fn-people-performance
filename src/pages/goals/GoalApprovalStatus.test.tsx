import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { GoalApprovalStatus } from "./GoalApprovalStatus";

afterEach(cleanup);

describe("GoalApprovalStatus", () => {
  it("shows Sent back instead of a blank dash", () => {
    render(<GoalApprovalStatus status="sent_back" />);
    expect(screen.getByText("Sent back")).toBeInTheDocument();
    expect(screen.getByText("Sent back").closest(".pd-badge")?.querySelector("svg")).toBeTruthy();
    expect(screen.queryByText("-")).not.toBeInTheDocument();
  });

  it("shows Draft as a status chip", () => {
    render(<GoalApprovalStatus status="draft" />);
    expect(screen.getByText("Draft")).toBeInTheDocument();
    expect(screen.queryByText("-")).not.toBeInTheDocument();
  });

  it("shows pending and approved marks", () => {
    const { rerender } = render(<GoalApprovalStatus status="submitted" />);
    expect(screen.getByText("Pending")).toBeInTheDocument();
    rerender(<GoalApprovalStatus status="approved" />);
    expect(screen.getByLabelText("Approved")).toBeInTheDocument();
  });

  it("labels approved when used as a chip", () => {
    render(<GoalApprovalStatus status="approved" labeled />);
    expect(screen.getByText("Approved")).toBeInTheDocument();
  });

  it("uses the full pending label on a chip", () => {
    render(<GoalApprovalStatus status="submitted" labeled />);
    expect(screen.getByText("Pending approval")).toBeInTheDocument();
  });

  it("names the final approval stage for a late submission", () => {
    render(
      <GoalApprovalStatus
        status="submitted"
        postWindowApprovalStage="manager_manager"
      />,
    );

    expect(screen.getByText("Final pending")).toBeInTheDocument();
  });
});
