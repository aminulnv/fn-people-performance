import { Button, Modal } from "@/components/ui";

export function GoalUnsavedCloseDialog({
  open,
  onStay,
  onDiscard,
  onSaveDraft,
}: {
  open: boolean;
  onStay: () => void;
  onDiscard: () => void;
  onSaveDraft: () => void;
}) {
  return (
    <Modal
      open={open}
      onClose={onStay}
      title="Unsaved Changes"
      description="Save this goal as a draft to keep your work, or discard the changes."
      actions={
        <>
          <Button variant="secondary" onClick={onDiscard}>
            Discard
          </Button>
          <Button variant="primary" onClick={onSaveDraft}>
            Save As Draft
          </Button>
        </>
      }
    />
  );
}
