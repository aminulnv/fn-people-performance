import { Button, Modal } from "@/components/ui";

export function GoalOkrApplyConfirmDialog({
  open,
  onClose,
  onReplace,
  onCreateNew,
}: {
  open: boolean;
  onClose: () => void;
  onReplace: () => void;
  onCreateNew?: () => void;
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      className="pd-okr-apply-modal"
      title="Replace this goal?"
      description="Applying this key result will replace the current name, details, and measures. Add a new goal if you want to keep what you have."
      actions={
        <>
          <Button variant="secondary" size="sm" onClick={onClose}>
            Cancel
          </Button>
          {onCreateNew ? (
            <Button variant="secondary" size="sm" onClick={onCreateNew}>
              Add new goal
            </Button>
          ) : null}
          <Button variant="danger" size="sm" onClick={onReplace}>
            Replace goal
          </Button>
        </>
      }
    />
  );
}
