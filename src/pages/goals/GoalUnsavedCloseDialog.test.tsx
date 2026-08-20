import type { ReactNode } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { GoalUnsavedCloseDialog } from "./GoalUnsavedCloseDialog";

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

describe("GoalUnsavedCloseDialog", () => {
  it("lets the owner save as draft or discard", () => {
    const onSaveDraft = vi.fn();
    const onDiscard = vi.fn();
    const onStay = vi.fn();
    render(
      <GoalUnsavedCloseDialog
        open
        onStay={onStay}
        onDiscard={onDiscard}
        onSaveDraft={onSaveDraft}
      />,
    );

    expect(
      screen.getByRole("dialog", { name: "Unsaved changes" }),
    ).toHaveTextContent("Save this goal as a draft");

    fireEvent.click(screen.getByRole("button", { name: "Save as draft" }));
    expect(onSaveDraft).toHaveBeenCalledOnce();

    fireEvent.click(screen.getByRole("button", { name: "Discard" }));
    expect(onDiscard).toHaveBeenCalledOnce();
    expect(onStay).not.toHaveBeenCalled();
  });
});
