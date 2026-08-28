import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
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
        "People Foundation — Build leadership and structure that scales",
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
    const roleChip = screen.getAllByText("Responsible")[0]?.closest(".pd-okr-ref__role");
    expect(roleChip?.querySelector(".pd-okr-ref__role-avatar")).toBeTruthy();
    expect(
      screen.getByText("Build Performance Platform Phase 1").closest(".pd-okr-ref__item"),
    ).toHaveTextContent("Numeric");
  });

  it("keeps tracking details off the card until hover", () => {
    renderList(
      <GoalOkrReferenceList
        employeeId={871}
        scope={{ department: "Engineering", wing: "Platform" }}
        window={okrWindowFixture}
      />,
    );

    expect(screen.queryByText("On Track")).toBeNull();
    expect(screen.queryByText("20% → 100%")).toBeNull();
    expect(screen.queryByText(/Week 9/)).toBeNull();
    expect(screen.queryByText("Q3 Build, Q4 Testing, Q1 2027 Launch")).toBeNull();
  });

  it("shows the full KR in an organized hover panel", async () => {
    renderList(
      <GoalOkrReferenceList
        employeeId={871}
        scope={{ department: "Engineering", wing: "Platform" }}
        window={okrWindowFixture}
      />,
    );

    fireEvent.mouseEnter(
      screen.getByText("Build Performance Platform Phase 1").closest(".pd-tooltip")!,
    );

    const tip = await screen.findByRole("tooltip");
    expect(within(tip).getByText("Key result")).toBeInTheDocument();
    expect(within(tip).getByText("Q3 Build, Q4 Testing, Q1 2027 Launch")).toBeInTheDocument();
    expect(within(tip).getByText("On Track")).toBeInTheDocument();
    expect(within(tip).getByText("20% → 100%")).toBeInTheDocument();
    expect(within(tip).getByText("Week 9 · On Track · S.M. Fahim · 21 Aug")).toBeInTheDocument();
    expect(within(tip).getByText("Weekly update")).toBeInTheDocument();
    const profile = within(tip).getByRole("link", { name: "Saif from Directory" });
    expect(profile).toHaveAttribute("href", "/people/871");
    expect(within(profile).getByRole("img")).toBeInTheDocument();
    expect(within(tip).queryByText("Saif Ivna Alam")).toBeNull();
  });

  it("keeps the KR hover panel open while the pointer is over it", async () => {
    renderList(
      <GoalOkrReferenceList
        employeeId={871}
        scope={{ department: "Engineering", wing: "Platform" }}
        window={okrWindowFixture}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Wings" }));
    const trigger = screen
      .getByText("Keep dependencies and delivery risks visible")
      .closest(".pd-tooltip")!;
    fireEvent.mouseEnter(trigger);
    const tip = await screen.findByRole("tooltip");
    fireEvent.mouseEnter(tip);
    fireEvent.mouseLeave(trigger);

    expect(within(tip).getByText("Platform delivery")).toBeInTheDocument();
    expect(
      within(tip).getByRole("heading", { name: /R · Responsible/ }),
    ).toBeInTheDocument();
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
    ).toHaveTextContent("Milestone");

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
