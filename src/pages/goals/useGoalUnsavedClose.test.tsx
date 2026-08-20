import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useGoalUnsavedClose } from "./useGoalUnsavedClose";

describe("useGoalUnsavedClose", () => {
  it("leaves immediately when nothing is dirty", () => {
    const afterLeave = vi.fn();
    const { result } = renderHook(() =>
      useGoalUnsavedClose({
        dirty: false,
        onSaveDraft: () => undefined,
        onDiscard: () => undefined,
      }),
    );

    act(() => result.current.requestLeave(afterLeave));

    expect(afterLeave).toHaveBeenCalledOnce();
    expect(result.current.dialogOpen).toBe(false);
  });

  it("saves as draft then continues the leave", () => {
    const onSaveDraft = vi.fn();
    const afterLeave = vi.fn();
    const { result } = renderHook(() =>
      useGoalUnsavedClose({
        dirty: true,
        onSaveDraft,
        onDiscard: () => undefined,
      }),
    );

    act(() => result.current.requestLeave(afterLeave));
    expect(result.current.dialogOpen).toBe(true);
    expect(afterLeave).not.toHaveBeenCalled();

    act(() => result.current.saveDraft());

    expect(onSaveDraft).toHaveBeenCalledOnce();
    expect(afterLeave).toHaveBeenCalledOnce();
    expect(result.current.dialogOpen).toBe(false);
  });

  it("discards then continues the leave", () => {
    const onDiscard = vi.fn();
    const afterLeave = vi.fn();
    const { result } = renderHook(() =>
      useGoalUnsavedClose({
        dirty: true,
        onSaveDraft: () => undefined,
        onDiscard,
      }),
    );

    act(() => result.current.requestLeave(afterLeave));
    act(() => result.current.discard());

    expect(onDiscard).toHaveBeenCalledOnce();
    expect(afterLeave).toHaveBeenCalledOnce();
  });

  it("keeps the draft when the owner stays", () => {
    const onSaveDraft = vi.fn();
    const onDiscard = vi.fn();
    const afterLeave = vi.fn();
    const { result } = renderHook(() =>
      useGoalUnsavedClose({
        dirty: true,
        onSaveDraft,
        onDiscard,
      }),
    );

    act(() => result.current.requestLeave(afterLeave));
    act(() => result.current.stay());

    expect(onSaveDraft).not.toHaveBeenCalled();
    expect(onDiscard).not.toHaveBeenCalled();
    expect(afterLeave).not.toHaveBeenCalled();
    expect(result.current.dialogOpen).toBe(false);
  });
});
