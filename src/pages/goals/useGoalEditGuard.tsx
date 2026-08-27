import { useEffect, useRef, useState, type ReactNode } from "react";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import type { PersonGoals } from "@/lib/goals/types";
import { ApproverPair, type MentionPerson } from "./PersonMention";

export type RequestGoalEdit = (startEditing: () => void) => void;

export function goalEditGuardDescription({
  deadlinePassed,
  isSelf,
  lineManager,
  skipLevelManager,
}: {
  deadlinePassed: boolean;
  isSelf: boolean;
  lineManager?: MentionPerson | null;
  skipLevelManager?: MentionPerson | null;
}): ReactNode {
  const approvers = (
    <ApproverPair
      lineManager={lineManager}
      skipLevelManager={skipLevelManager}
    />
  );

  if (deadlinePassed) {
    return isSelf ? (
      <>
        These changes will return the goal set to draft. Submit it again for
        approval from {approvers} when ready.
      </>
    ) : (
      <>
        Changing this approved or submitted goal set will require approval from{" "}
        {approvers} again.
      </>
    );
  }

  if (lineManager || skipLevelManager) {
    return isSelf ? (
      <>
        These changes will return the goal set to draft. Submit it again for
        approval from {approvers} when ready.
      </>
    ) : (
      <>
        Changing this approved or submitted goal set will require approval from{" "}
        {approvers} again.
      </>
    );
  }

  return isSelf
    ? "These changes will return the goal set to draft. Submit it again for approval when ready."
    : "Changing this approved or submitted goal set will require approval again.";
}

export function useGoalEditGuard({
  personId,
  actorId,
  status,
  deadlinePassed,
  lineManager,
  skipLevelManager,
}: {
  personId: string;
  actorId?: string;
  status: PersonGoals["status"];
  deadlinePassed: boolean;
  lineManager?: MentionPerson | null;
  skipLevelManager?: MentionPerson | null;
}): {
  requestGoalEdit: RequestGoalEdit;
  goalEditGuard: ReactNode;
} {
  const [isOpen, setIsOpen] = useState(false);
  const [hasAcknowledged, setHasAcknowledged] = useState(false);
  const pendingEditRef = useRef<(() => void) | null>(null);
  const isSelf = actorId === personId;
  const needsReapproval =
    status === "submitted" || status === "approved";

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
        description={goalEditGuardDescription({
          deadlinePassed,
          isSelf,
          lineManager,
          skipLevelManager,
        })}
        confirmLabel="Continue Editing"
        cancelLabel="Keep Current Goals"
      />
    ),
  };
}
