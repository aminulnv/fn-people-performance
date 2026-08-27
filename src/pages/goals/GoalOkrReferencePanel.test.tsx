import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it } from "vitest";
import { GoalOkrReferencePanel } from "./GoalOkrReferencePanel";
import { okrWindowFixture } from "./okrWindowFixture";

afterEach(cleanup);

function renderPanel(ui: ReactNode) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>{ui}</QueryClientProvider>,
  );
}

describe("GoalOkrReferencePanel", () => {
  it("names the scope the references are read from", () => {
    renderPanel(
      <GoalOkrReferencePanel
        employeeId={871}
        quarter="2026-Q3"
        scope={{ department: "Engineering", wing: "Platform" }}
        window={okrWindowFixture}
      />,
    );

    expect(
      screen.getByText("FundedNext / Engineering / Platform / 2026-Q3"),
    ).toBeInTheDocument();
  });

  it("renders nothing without an employee", () => {
    const { container } = renderPanel(
      <GoalOkrReferencePanel
        scope={{ department: "Engineering", wing: "Platform" }}
        window={okrWindowFixture}
      />,
    );

    expect(container).toBeEmptyDOMElement();
  });

  it("collapses when the layout allows it", () => {
    renderPanel(
      <GoalOkrReferencePanel
        employeeId={871}
        scope={{ department: "Engineering", wing: "Platform" }}
        window={okrWindowFixture}
        collapsible
      />,
    );

    fireEvent.click(
      screen.getByRole("button", { name: /your okrs/i }),
    );

    expect(screen.queryByRole("searchbox")).toBeNull();
  });
});
