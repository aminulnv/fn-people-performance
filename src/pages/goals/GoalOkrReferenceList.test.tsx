import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { GoalOkrReferenceList } from "./GoalOkrReferenceList";

afterEach(cleanup);

describe("GoalOkrReferenceList", () => {
  it("groups references by department and wing", () => {
    render(
      <GoalOkrReferenceList
        scope={{ department: "Engineering", wing: "Platform" }}
      />,
    );

    expect(
      screen.getByRole("heading", { name: "Engineering department" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Platform wing" }),
    ).toBeInTheDocument();
  });

  it("filters references by title and key result", () => {
    render(
      <GoalOkrReferenceList
        scope={{ department: "Engineering", wing: "Platform" }}
      />,
    );

    fireEvent.change(screen.getByRole("searchbox"), {
      target: { value: "dependencies" },
    });

    expect(
      screen.getByText("Deliver Platform priorities predictably"),
    ).toBeInTheDocument();
    expect(
      screen.queryByText("Improve customer outcomes across Engineering"),
    ).toBeNull();
  });

  it("reports when nothing matches the search", () => {
    render(
      <GoalOkrReferenceList
        scope={{ department: "Engineering", wing: "Platform" }}
      />,
    );

    fireEvent.change(screen.getByRole("searchbox"), {
      target: { value: "payroll" },
    });

    expect(screen.getByText("No matching OKRs.")).toBeInTheDocument();
  });
});
