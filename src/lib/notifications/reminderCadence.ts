/**
 * Fixed lead times for reminder notifications. Labels and evaluators must
 * share these — never use vague copy like “a few days”.
 */

/** Manager review reminders fire when this many days (or fewer) remain. */
export const REVIEW_DUE_SOON_DAYS = 3

/** Calibration reminders fire when this many days (or fewer) remain. */
export const CALIBRATION_DUE_SOON_DAYS = 3

/** Goal results reminder opens this many days before cycle end. */
export const GOAL_RESULTS_REMINDER_DAYS = 14

/** Team stale-progress summary: no progress update for this many days. */
export const GOAL_STALE_PROGRESS_DAYS = 14
