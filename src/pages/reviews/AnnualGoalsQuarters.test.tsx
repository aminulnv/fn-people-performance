import { afterEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import type { AnnualQuarterRow } from "@/lib/reviews/annualQuarters";
import { AnnualGoalsQuarters } from "./AnnualGoalsQuarters";

afterEach(() => {
  cleanup();
});

const rows: AnnualQuarterRow[] = [
  {
    sourceCycleId: "q1-2026",
    label: "Q1 2026",
    periodKey: "q1-2026",
    excluded: false,
    kind: "graded",
    grade: "performing",
    progressPercent: 0,
    goalCount: 0,
  },
  {
    sourceCycleId: "q2-2026",
    label: "Q2 2026",
    periodKey: "q2-2026",
    excluded: false,
    kind: "graded",
    grade: "exceeding",
    progressPercent: 0,
    goalCount: 0,
  },
  {
    sourceCycleId: "q3-2026",
    label: "Q3 2026",
    periodKey: "q3-2026",
    excluded: false,
    kind: "graded",
    grade: "unsatisfactory",
    progressPercent: 0,
    goalCount: 0,
  },
  {
    sourceCycleId: "q4-2026",
    label: "Q4 2026",
    periodKey: "q4-2026",
    excluded: false,
    kind: "progress",
    grade: null,
    progressPercent: 40,
    goalCount: 1,
  },
];

function renderQuarters() {
  return render(
    <MemoryRouter>
      <AnnualGoalsQuarters
        rows={rows}
        goalsByCycleId={{
          "q4-2026": [
            {
              id: "g1",
              description: "Finish the year plan",
              weight: 100,
              measurements: [],
            },
          ],
        }}
        personId="1"
      />
    </MemoryRouter>,
  );
}

describe("AnnualGoalsQuarters", () => {
  it("shows one quarter table and opens on Q4 progress", () => {
    renderQuarters();

    expect(screen.getByRole("heading", { name: "Goals" })).toBeTruthy();
    expect(screen.queryByRole("heading", { name: "Q4 2026" })).toBeNull();
    expect(screen.getByRole("button", { name: "Goal quarter: Q4 2026" })).toBeTruthy();
    expect(screen.getByText("Finish the year plan")).toBeTruthy();
    expect(screen.getAllByText("40% complete").length).toBeGreaterThan(0);
    expect(screen.queryByText("Finish the year plan")).toBeTruthy();
    expect(screen.queryByRole("button", { name: /grade/i })).toBeNull();
    expect(screen.getByRole("button", { name: "Next quarter" })).toBeDisabled();
  });

  it("moves between quarters with previous and next arrows", () => {
    renderQuarters();

    fireEvent.click(screen.getByRole("button", { name: "Previous quarter" }));
    expect(screen.getByRole("button", { name: "Goal quarter: Q3 2026" })).toBeTruthy();
    expect(screen.getByText("Unsatisfactory")).toBeTruthy();
    expect(screen.queryByText("This quarter’s grade stays as it was.")).toBeNull();
    expect(screen.queryByText("Finish the year plan")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Next quarter" }));
    expect(screen.getByRole("button", { name: "Goal quarter: Q4 2026" })).toBeTruthy();
    expect(screen.getByText("Finish the year plan")).toBeTruthy();
  });

  it("lets the dropdown jump to a quarter", () => {
    renderQuarters();

    fireEvent.click(screen.getByRole("button", { name: "Goal quarter: Q4 2026" }));
    fireEvent.click(screen.getByRole("option", { name: /Q1 2026/ }));
    expect(screen.getByRole("button", { name: "Goal quarter: Q1 2026" })).toBeTruthy();
    expect(screen.getByText("Performing")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Previous quarter" })).toBeDisabled();
  });
});
