import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { GoalOkrReferencePanel } from "./GoalOkrReferencePanel";

afterEach(cleanup);

describe("GoalOkrReferencePanel", () => {
  it("names the scope the references are read from", () => {
    render(
      <GoalOkrReferencePanel
        scope={{ department: "Engineering", wing: "Platform" }}
      />,
    );

    expect(screen.getByText("Engineering / Platform")).toBeInTheDocument();
    expect(screen.getByText("Read-only reference")).toBeInTheDocument();
  });

  it("renders nothing without a department", () => {
    const { container } = render(
      <GoalOkrReferencePanel scope={{ department: " ", wing: "Platform" }} />,
    );

    expect(container).toBeEmptyDOMElement();
  });

  it("collapses when the layout allows it", () => {
    render(
      <GoalOkrReferencePanel
        scope={{ department: "Engineering", wing: "Platform" }}
        collapsible
      />,
    );

    fireEvent.click(
      screen.getByRole("button", { name: /department & wing okrs/i }),
    );

    expect(screen.queryByRole("searchbox")).toBeNull();
  });
});
