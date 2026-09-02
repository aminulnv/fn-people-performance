import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { PlatformEmployee } from "@/lib/employees/types";
import { GoalOkrReferenceList } from "./GoalOkrReferenceList";
import { okrWindowFixture } from "./okrWindowFixture";

const directory: PlatformEmployee[] = [
  {
    employeeId: 871,
    fullName: "Saif from Directory",
    email: "saif.alam@nextventures.io",
    startDate: "2024-01-01",
    jobTitle: "Engineer",
    department: "Engineering",
    team: "Platform",
    division: "",
    reportsToName: "",
    departmentHeadName: "",
    hrbpName: "",
    jobGrade: "",
    site: "",
    avatarUrl: "https://cdn.example/saif.jpg",
    managerEmail: "",
    isActive: true,
    createdAt: "2024-01-01T00:00:00.000Z",
    updatedAt: "2024-01-01T00:00:00.000Z",
  },
];

vi.mock("@/lib/employees/useEmployees", () => ({
  useEmployees: () => ({ employees: directory }),
}));

afterEach(cleanup);

function renderList(ui: ReactNode) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <MemoryRouter>
      <QueryClientProvider client={client}>{ui}</QueryClientProvider>
    </MemoryRouter>,
  );
}

describe("GoalOkrReferenceList", () => {
  it("lists key results under their objective, not the objective as the title", () => {
    renderList(
      <GoalOkrReferenceList
        employeeId={871}
        scope={{ department: "Engineering", wing: "Platform" }}
        window={okrWindowFixture}
      />,
    );

    expect(
      screen.getByRole("heading", { name: "Key results" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "People Foundation - Build leadership and structure that scales",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Build Performance Platform Phase 1"),
    ).toBeInTheDocument();
    expect(
      screen.queryByText("Improve customer outcomes across Engineering"),
    ).toBeNull();
    expect(screen.queryByRole("heading", { name: "FundedNext company" })).toBeNull();
    expect(
      screen.getByText("Build Performance Platform Phase 1").closest(".pd-okr-ref__item"),
    ).toHaveAttribute("draggable", "true");
    expect(
      screen.getByText("Build Performance Platform Phase 1").closest(".pd-okr-ref__item"),
    ).toHaveTextContent("20%");
    expect(
      screen.getByText("Build Performance Platform Phase 1").closest(".pd-okr-ref__item"),
    ).toHaveTextContent("100%");
    expect(
      screen.getByText("Build Performance Platform Phase 1").closest(".pd-okr-ref__item")
        ?.querySelector(".pd-okr-ref__avatar"),
    ).toBeTruthy();
    expect(
      screen.getByText("Q3 Build, Q4 Testing, Q1 2027 Launch"),
    ).toBeInTheDocument();
  });

  it("collapses key results under an objective", () => {
    renderList(
      <GoalOkrReferenceList
        employeeId={871}
        scope={{ department: "Engineering", wing: "Platform" }}
        window={okrWindowFixture}
      />,
    );

    const objective = screen.getByRole("button", {
      name: /People Foundation - Build leadership and structure that scales/,
    });
    expect(objective).toHaveAttribute("aria-expanded", "true");
    expect(
      screen.getByText("Build Performance Platform Phase 1"),
    ).toBeInTheDocument();

    fireEvent.click(objective);
    expect(objective).toHaveAttribute("aria-expanded", "false");
    expect(
      screen.queryByText("Build Performance Platform Phase 1"),
    ).toBeNull();

    fireEvent.click(objective);
    expect(
      screen.getByText("Build Performance Platform Phase 1"),
    ).toBeInTheDocument();
  });

  it("expands and collapses every objective from the key results title", () => {
    renderList(
      <GoalOkrReferenceList
        employeeId={871}
        scope={{ department: "Engineering", wing: "Platform" }}
        window={okrWindowFixture}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Company" }));
    fireEvent.click(screen.getByRole("button", { name: "All" }));

    const collapseAll = screen.getByRole("button", { name: "Collapse all" });
    expect(collapseAll).toHaveAttribute("aria-expanded", "true");
    fireEvent.click(collapseAll);

    expect(screen.getByRole("button", { name: "Expand all" })).toHaveAttribute(
      "aria-expanded",
      "false",
    );
    expect(
      screen.queryByText("Build Performance Platform Phase 1"),
    ).toBeNull();
    expect(
      screen.queryByText("Improve customer outcomes across Engineering"),
    ).toBeNull();
    expect(
      screen.queryByText("Keep dependencies and delivery risks visible"),
    ).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Expand all" }));
    expect(screen.getByRole("button", { name: "Collapse all" })).toHaveAttribute(
      "aria-expanded",
      "true",
    );
    expect(
      screen.getByText("Build Performance Platform Phase 1"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Improve customer outcomes across Engineering"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Keep dependencies and delivery risks visible"),
    ).toBeInTheDocument();
  });

  it("keeps status and check-in details off the row until opened", () => {
    renderList(
      <GoalOkrReferenceList
        employeeId={871}
        scope={{ department: "Engineering", wing: "Platform" }}
        window={okrWindowFixture}
      />,
    );

    expect(screen.queryByText("On Track")).toBeNull();
    expect(screen.queryByText(/Week 9/)).toBeNull();
    expect(screen.queryByText("Numeric")).toBeNull();
  });

  it("opens the OKR-platform-style detail panel when a key result is clicked", () => {
    renderList(
      <GoalOkrReferenceList
        employeeId={871}
        scope={{ department: "Engineering", wing: "Platform" }}
        window={okrWindowFixture}
      />,
    );

    fireEvent.click(screen.getByText("Build Performance Platform Phase 1"));

    expect(
      screen.getByRole("complementary", { name: "Key result details" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Info" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getAllByText("Build Performance Platform Phase 1").length).toBeGreaterThan(0);
    expect(
      screen.getByText("People Foundation - Build leadership and structure that scales"),
    ).toBeInTheDocument();
    expect(screen.getAllByText("Q3 Build, Q4 Testing, Q1 2027 Launch").length).toBeGreaterThan(0);
    expect(screen.getByText("On Track")).toBeInTheDocument();
    expect(screen.getByText("T1")).toBeInTheDocument();
    expect(screen.getByText("Milestone")).toBeInTheDocument();
    expect(screen.getByText("Increase")).toBeInTheDocument();
    expect(
      screen.getByText("No milestones listed for this key result."),
    ).toBeInTheDocument();
    expect(screen.getAllByText("S.M. Fahim").length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: "Apply to goal" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Open in OKRs" })).toHaveAttribute(
      "href",
      "https://okr.nextventures.io/company/workspace?objectiveId=c2a30c75-0e03-4e3c-bbcd-49fab62b6c1a&keyResultId=5e569c65-60a0-4216-948b-a3010a023655&year=2026&quarter=3",
    );
  });

  it("returns to the OKR list from the detail back button", () => {
    renderList(
      <GoalOkrReferenceList
        employeeId={871}
        scope={{ department: "Engineering", wing: "Platform" }}
        window={okrWindowFixture}
      />,
    );

    fireEvent.click(screen.getByText("Build Performance Platform Phase 1"));
    fireEvent.click(screen.getByRole("button", { name: "Back to All" }));

    expect(
      screen.getByRole("heading", { name: "Key results" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("complementary", { name: "Key result details" }),
    ).toBeNull();
  });

  it("shows milestones in the detail info tab", () => {
    renderList(
      <GoalOkrReferenceList
        employeeId={871}
        scope={{ department: "Engineering", wing: "Platform" }}
        window={okrWindowFixture}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Wings" }));
    fireEvent.click(
      screen.getByText("Keep dependencies and delivery risks visible"),
    );

    expect(screen.getByText("Risk register live")).toBeInTheDocument();
    expect(screen.getByText("Weekly risk review")).toBeInTheDocument();
    expect(screen.getAllByText("50%").length).toBeGreaterThan(0);
    expect(screen.getByText("RACI")).toBeInTheDocument();
    expect(screen.getByText("Accountable")).toBeInTheDocument();
    expect(screen.getByText("Responsible")).toBeInTheDocument();
    expect(screen.getAllByText("Platform delivery").length).toBeGreaterThan(0);
    expect(screen.getByText("PMO")).toBeInTheDocument();
  });

  it("filters references by title and key result", () => {
    renderList(
      <GoalOkrReferenceList
        employeeId={871}
        scope={{ department: "Engineering", wing: "Platform" }}
        window={okrWindowFixture}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Wings" }));
    fireEvent.change(screen.getByRole("searchbox"), {
      target: { value: "dependencies" },
    });

    expect(
      screen.getByText("Keep dependencies and delivery risks visible"),
    ).toBeInTheDocument();
    expect(
      screen.queryByText("Improve customer outcomes across Engineering"),
    ).toBeNull();
  });

  it("copies an OKR title without collapsing the search", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });

    renderList(
      <GoalOkrReferenceList
        employeeId={871}
        scope={{ department: "Engineering", wing: "Platform" }}
        window={okrWindowFixture}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Wings" }));
    fireEvent.click(
      screen.getByRole("button", {
        name: "Copy Keep dependencies and delivery risks visible",
      }),
    );

    expect(writeText).toHaveBeenCalledWith(
      "Keep dependencies and delivery risks visible",
    );
    expect(await screen.findByRole("button", { name: "Copied" })).toBeInTheDocument();
  });

  it("switches the list between company, department, wings, and all", () => {
    renderList(
      <GoalOkrReferenceList
        employeeId={871}
        scope={{ department: "Engineering", wing: "Platform" }}
        window={okrWindowFixture}
      />,
    );

    expect(
      screen.getByText("Build Performance Platform Phase 1"),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Department" }));
    expect(
      screen.getByText("Improve customer outcomes across Engineering"),
    ).toBeInTheDocument();
    expect(
      screen.queryByText("Build Performance Platform Phase 1"),
    ).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Wings" }));
    expect(
      screen.getByText("Keep dependencies and delivery risks visible"),
    ).toBeInTheDocument();
    expect(
      screen
        .getByText("Keep dependencies and delivery risks visible")
        .closest(".pd-okr-ref__item"),
    ).toHaveTextContent("40%");

    fireEvent.click(screen.getByRole("button", { name: "All" }));
    expect(
      screen.getByText("Build Performance Platform Phase 1"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Improve customer outcomes across Engineering"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Keep dependencies and delivery risks visible"),
    ).toBeInTheDocument();
  });

  it("reports when nothing matches the search", () => {
    renderList(
      <GoalOkrReferenceList
        employeeId={871}
        scope={{ department: "Engineering", wing: "Platform" }}
        window={okrWindowFixture}
      />,
    );

    fireEvent.change(screen.getByRole("searchbox"), {
      target: { value: "payroll" },
    });

    expect(screen.getByText("No matching OKRs.")).toBeInTheDocument();
  });
});
