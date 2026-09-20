import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { apiFetch } from "@/lib/apiClient";
import { GoalOkrReferenceList } from "./GoalOkrReferenceList";

vi.mock("@/lib/employees/useEmployees", () => ({
  useEmployees: () => ({ employees: [] }),
}));

vi.mock("@/lib/apiClient", () => ({
  ApiError: class ApiError extends Error {
    status: number;
    body: unknown;
    constructor(message: string, status: number, body: unknown = null) {
      super(message);
      this.name = "ApiError";
      this.status = status;
      this.body = body;
    }
  },
  apiFetch: vi.fn(),
}));

afterEach(() => {
  cleanup();
  vi.mocked(apiFetch).mockReset();
});

function renderList(ui: ReactNode) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>{ui}</QueryClientProvider>,
  );
}

describe("GoalOkrReferenceList when OKR is not connected", () => {
  it("hides the search", async () => {
    vi.mocked(apiFetch).mockResolvedValue({ configured: false });
    const { container } = renderList(
      <GoalOkrReferenceList employeeId={871} />,
    );

    await waitFor(() => {
      expect(screen.queryByText("Loading OKRs…")).not.toBeInTheDocument();
    });
    expect(screen.queryByPlaceholderText("Search OKRs")).not.toBeInTheDocument();
    expect(container).toBeEmptyDOMElement();
  });

  it("tells an admin the connection is not set up", async () => {
    vi.mocked(apiFetch).mockResolvedValue({ configured: false });
    renderList(
      <GoalOkrReferenceList employeeId={871} showDisconnectedNote />,
    );

    expect(await screen.findByText("OKR is not connected.")).toBeInTheDocument();
    expect(screen.queryByPlaceholderText("Search OKRs")).not.toBeInTheDocument();
  });

  it("keeps the search when the connection is set up", async () => {
    vi.mocked(apiFetch).mockImplementation(async (path: string) => {
      if (path.includes("/okr/status")) return { configured: true };
      return { quarters: [] };
    });
    renderList(<GoalOkrReferenceList employeeId={871} />);

    expect(await screen.findByPlaceholderText("Search OKRs")).toBeInTheDocument();
  });
});
