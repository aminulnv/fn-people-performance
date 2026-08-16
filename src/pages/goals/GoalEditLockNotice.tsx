import { Lock } from "lucide-react";

export function GoalEditLockNotice({
  message,
}: {
  message: string;
}) {
  return (
    <p className="pd-goals-lock" role="status">
      <Lock size={14} strokeWidth={2} aria-hidden />
      {message}
    </p>
  );
}
