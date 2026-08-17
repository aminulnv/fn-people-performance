import { useEffect, useRef, useState, type ReactNode } from "react";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import type { PersonGoals } from "@/lib/goals/types";

export type RequestGoalEdit = (startEditing: () => void) => void;

export function useGoalEditGuard({
  personId,
  actorId,
  status,
  deadlinePassed,
}: {
  personId: string;
  actorId?: string;
  status: PersonGoals["status"];
  deadlinePassed: boolean;
}): {
  requestGoalEdit: RequestGoalEdit;
  goalEditGuard: ReactNode;
} {
  const [isOpen, setIsOpen] = useState(false);
  const [hasAcknowledged, setHasAcknowledged] = useState(false);
  const pendingEditRef = useRef<(() => void) | null>(null);
  const isSelf = actorId === personId;
  const needsReapproval =
    (status === "submitted" || status === "approved");

  useEffect(() => {
    setIsOpen(false);
    setHasAcknowledged(false);
    pendingEditRef.current = null;
  }, [personId, status]);

  const close = () => {
    pendingEditRef.current = null;
    setIsOpen(false);
  };

  const requestGoalEdit: RequestGoalEdit = (startEditing) => {
    if (!needsReapproval || hasAcknowledged) {
      startEditing();
      return;
    }
    pendingEditRef.current = startEditing;
    setIsOpen(true);
  };

  const confirm = () => {
    const startEditing = pendingEditRef.current;
    pendingEditRef.current = null;
    setHasAcknowledged(true);
    setIsOpen(false);
    startEditing?.();
  };

  return {
    requestGoalEdit,
    goalEditGuard: (
      <ConfirmDialog
        open={isOpen}
        onClose={close}
        onConfirm={confirm}
        title={
          deadlinePassed
            ? "The goal deadline has passed"
            : "These goals need approval again"
        }
        description={
          deadlinePassed
            ? isSelf
              ? "These changes will return the goal set to draft. Submit it again for direct manager and skip-level manager approval when ready."
              : "Changing this approved or submitted goal set will require direct manager and skip-level manager approval again."
            : isSelf
              ? "These changes will return the goal set to draft. Submit it again for approval when ready."
              : "Changing this approved or submitted goal set will require approval again."
        }
        confirmLabel="Continue editing"
        cancelLabel="Keep current goals"
      />
    ),
  };
}
