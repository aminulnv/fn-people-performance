import { afterEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import type { ComponentProps } from "react";
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
    leave: false,
    packetId: "pkt-q1",
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
    leave: false,
    packetId: "pkt-q2",
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
    leave: false,
    packetId: "pkt-q3",
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
    leave: false,
    packetId: "pkt-q4",
    kind: "progress",
    grade: null,
    progressPercent: 40,
    goalCount: 1,
  },
];

function renderQuarters(
  props: Partial<ComponentProps<typeof AnnualGoalsQuarters>> = {},
) {
  return render(
    <MemoryRouter>
      <AnnualGoalsQuarters
        rows={rows}
        goalsByCycleId={{
          "q1-2026": [
            {
              id: "g-q1",
              description: "Ship Q1 foundation",
              weight: 100,
              measurements: [],
            },
          ],
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
        {...props}
      />
    </MemoryRouter>,
  );
}

describe("AnnualGoalsQuarters", () => {
  it("shows quarter bars with grades and expands one goals table at a time", () => {
    renderQuarters();

    expect(screen.getByRole("heading", { name: "Goals" })).toBeTruthy();
    expect(screen.getByRole("button", { name: /Q1 2026/ })).toHaveAttribute(
      "aria-expanded",
      "false",
    );
    expect(screen.getByRole("button", { name: /Q4 2026/ })).toHaveAttribute(
      "aria-expanded",
      "true",
    );

    expect(screen.getByLabelText("Q1 2026 grade")).toHaveTextContent("Performing");
    expect(screen.getByLabelText("Q2 2026 grade")).toHaveTextContent("Exceeding");
    expect(screen.getByLabelText("Q3 2026 grade")).toHaveTextContent(
      "Unsatisfactory",
    );

    expect(screen.getByText("Finish the year plan")).toBeTruthy();
    expect(screen.queryByText("Ship Q1 foundation")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: /Q1 2026/ }));
    expect(screen.getByRole("button", { name: /Q1 2026/ })).toHaveAttribute(
      "aria-expanded",
      "true",
    );
    expect(screen.getByText("Ship Q1 foundation")).toBeTruthy();
    expect(screen.queryByText("Finish the year plan")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: /Q1 2026/ }));
    expect(screen.getByRole("button", { name: /Q1 2026/ })).toHaveAttribute(
      "aria-expanded",
      "false",
    );
    expect(screen.queryByText("Ship Q1 foundation")).toBeNull();
  });

  it("lets the employee set one overall annual Goals grade", () => {
    renderQuarters({
      annualGoalsGrade: "performing",
      onAnnualGoalsGradeChange: () => undefined,
      goalsWeight: 50,
    });

    expect(screen.getByText("Overall grade")).toBeTruthy();
    expect(
      screen.getByRole("button", { name: "Overall grade (50%)" }),
    ).toBeTruthy();
    expect(screen.queryByLabelText("Q4 Goals Grading")).toBeNull();
  });

  it("keeps Q4 grading for the manager only", () => {
    renderQuarters({
      q4Grade: "exceeding",
      onQ4GradeChange: () => undefined,
    });

    expect(screen.getByRole("button", { name: "Q4 Goals Grading" })).toBeTruthy();
    expect(screen.queryByLabelText("Goals (50%)")).toBeNull();
  });
});
