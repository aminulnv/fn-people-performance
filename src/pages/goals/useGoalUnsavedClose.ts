import { useRef, useState } from "react";

export function useGoalUnsavedClose({
  dirty,
  onSaveDraft,
  onDiscard,
}: {
  dirty: boolean;
  onSaveDraft: () => void;
  onDiscard: () => void;
}) {
  const [open, setOpen] = useState(false);
  const pendingLeaveRef = useRef<(() => void) | null>(null);

  const requestLeave = (afterLeave: () => void) => {
    if (!dirty) {
      afterLeave();
      return;
    }
    pendingLeaveRef.current = afterLeave;
    setOpen(true);
  };

  const stay = () => {
    pendingLeaveRef.current = null;
    setOpen(false);
  };

  const finish = (apply: () => void) => {
    const afterLeave = pendingLeaveRef.current;
    pendingLeaveRef.current = null;
    setOpen(false);
    apply();
    afterLeave?.();
  };

  return {
    dialogOpen: open,
    requestLeave,
    stay,
    saveDraft: () => finish(onSaveDraft),
    discard: () => finish(onDiscard),
  };
}
