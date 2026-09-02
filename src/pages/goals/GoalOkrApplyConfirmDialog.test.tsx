import type { ReactNode } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { GoalOkrApplyConfirmDialog } from "./GoalOkrApplyConfirmDialog";

vi.mock("@/components/ui", async () => {
  const actual = await vi.importActual<typeof import("@/components/ui")>(
    "@/components/ui",
  );
  return {
    ...actual,
    Modal: ({
      open,
      title,
      description,
      actions,
    }: {
      open: boolean;
      title: string;
      description?: string;
      actions?: ReactNode;
    }) =>
      open ? (
        <div role="dialog" aria-label={title}>
          {description}
          {actions}
        </div>
      ) : null,
  };
});

afterEach(cleanup);

describe("GoalOkrApplyConfirmDialog", () => {
  it("warns before replace and offers add new goal", () => {
    const onReplace = vi.fn();
    const onCreateNew = vi.fn();
    const onClose = vi.fn();
    render(
      <GoalOkrApplyConfirmDialog
        open
        onClose={onClose}
        onReplace={onReplace}
        onCreateNew={onCreateNew}
      />,
    );

    expect(
      screen.getByRole("dialog", { name: "Replace this goal?" }),
    ).toHaveTextContent("replace the current name, details, and measures");

    fireEvent.click(screen.getByRole("button", { name: "Add new goal" }));
    expect(onCreateNew).toHaveBeenCalledOnce();

    fireEvent.click(screen.getByRole("button", { name: "Replace goal" }));
    expect(onReplace).toHaveBeenCalledOnce();

    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("hides add new goal when that path is unavailable", () => {
    render(
      <GoalOkrApplyConfirmDialog
        open
        onClose={vi.fn()}
        onReplace={vi.fn()}
      />,
    );

    expect(
      screen.queryByRole("button", { name: "Add new goal" }),
    ).toBeNull();
    expect(
      screen.getByRole("button", { name: "Replace goal" }),
    ).toBeInTheDocument();
  });
});
