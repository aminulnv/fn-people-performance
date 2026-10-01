-- Required rules cannot be turned off in Settings → Notifications.
-- They still honour channel config (email/ClickUp stay silent until credentials).

ALTER TABLE platform.notification_rules
  ADD COLUMN IF NOT EXISTS required BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN platform.notification_rules.required IS
  'When true, admins cannot disable the rule; in-app delivery stays on.';

-- Seed critical workflow keys (idempotent). Matches NOTIFICATION_RULE_DEFAULTS.required.
UPDATE platform.notification_rules
SET required = TRUE
WHERE event_key IN (
  'goal.submitted',
  'goal.resubmitted',
  'goal.late_submitted',
  'goal.sent_back',
  'goal.final_sent_back',
  'goal.final_sent_back.manager',
  'goal.approved',
  'goal.final_approved',
  'goal.final_approved.manager',
  'goal.final_approval_requested',
  'goal.pending_final_approval',
  'goal.manager_edited',
  'goal.changes_require_approval',
  'goal.deadline.closed',
  'goal.deadline.exceptions',
  'goal.team.pending_summary',
  'goal.reminder.manual',
  'review.self.submitted',
  'review.results_published',
  'review.results_for_managers',
  'review.result_corrected',
  'access.granted',
  'access.removed'
);
