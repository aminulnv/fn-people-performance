import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { GoalOkrReferenceList } from "./GoalOkrReferenceList";

afterEach(cleanup);

describe("GoalOkrReferenceList", () => {
  it("groups references by company, department, and wing", () => {
    render(
      <GoalOkrReferenceList
        scope={{ department: "Engineering", wing: "Platform" }}
      />,
    );

    expect(
      screen.getByRole("heading", { name: "FundedNext company" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Engineering department" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Platform wing" }),
    ).toBeInTheDocument();
  });

  it("shows the RACI matrix on a key result", () => {
    render(
      <GoalOkrReferenceList
        scope={{ department: "Engineering", wing: "Platform" }}
      />,
    );

    expect(screen.getAllByText("RACI").length).toBeGreaterThan(0);
    expect(
      screen.getByText("Keep dependencies and delivery risks visible"),
    ).toBeInTheDocument();
    expect(screen.getByText("Platform delivery")).toBeInTheDocument();
    expect(screen.getAllByTitle("Responsible").length).toBeGreaterThan(0);
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
