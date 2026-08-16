import type { SystemPermission } from "@/lib/accessControl/types";
import type {
  GoalCountPolicy,
  PostWindowGoalPolicy,
} from "@/lib/reviews/types";

export type MetricUnit =
  "%" | "number" | "seconds" | "minutes" | "hours" | "days" | "currency";

/**
 * Revolut-style strategies for numeric metrics.
 * Legacy aliases (`greater_than`, `less_than`, `within_range`) remain valid for
 * stored / demo data and normalize to the matching modern strategy.
 */
export type MetricStrategy =
  "increase" | "decrease" | "between" | "keep_above" | "keep_below";

export type MetricDirection =
  MetricStrategy | "greater_than" | "less_than" | "within_range";

export type SubmissionStatus =
  | "not_eligible"
  | "draft"
  | "submitted"
  | "sent_back"
  | "approved"
  | "incomplete";

export type DemoPhase =
  "not_open" | "window_open" | "hard_lock" | "check_in" | "closed";

/** One committed progress change on a measurement. */
export type ProgressLogEntry = {
  id: string;
  recordedAt: string;
  authorId?: string;
  authorName: string;
  from?: number;
  to: number;
  /** Milestone title at write time, so the log still reads after a rename. */
  label?: string;
};

export type Milestone = {
  id: string;
  kind: "milestone";
  title: string;
  weight: number;
  complete: boolean;
  proofUrl?: string;
  comment?: string;
  progressLog?: ProgressLogEntry[];
};

export type Metric = {
  id: string;
  kind: "metric";
  title: string;
  weight: number;
  unit: MetricUnit;
  direction: MetricDirection;
  /** Unset while drafting a new metric in the create/edit form. */
  startValue?: number;
  targetValue?: number;
  currentValue?: number;
  rangeMin?: number;
  rangeMax?: number;
  proofUrl?: string;
  comment?: string;
  progressLog?: ProgressLogEntry[];
};

export type Measurement = Milestone | Metric;

export type GoalType = "outcome" | "output";

export type ProcessType = "okr" | "bau" | "pi";

export type GoalPriority = "high" | "medium" | "low";

export type GoalProgressStatus =
  "on_track" | "at_risk" | "off_track" | "on_hold" | "complete";

export type GoalComment = {
  id: string;
  /** Authenticated actor who wrote the comment. */
  authorId?: string;
  /** Display snapshot of the author name at write time. */
  authorName: string;
  text: string;
  createdAt: string;
};

export type Goal = {
  id: string;
  description: string;
  weight: number;
  /** Outcome vs output — required at save and submit. */
  goalType: GoalType;
  /** OKR, BAU, or performance improvement. */
  processType: ProcessType;
  priority: GoalPriority;
  /** Person who owns this goal; defaults to the page person when unset. */
  ownerId?: string;
  /** Longer free-text description (goal name lives in `description`). */
  details?: string;
  /** Line manager goal this one cascades from. */
  cascadedFromGoalId?: string;
  /** Snapshot title of the cascaded manager goal (survives if the source is gone). */
  linkedGoalLabel?: string;
  measurements: Measurement[];
  /** Optional override for the computed on-track / off-track label. */
  progressStatus?: GoalProgressStatus;
  comments?: GoalComment[];
  updatedAt?: string;
};

export type QuarterRating = {
  tier: 1 | 2 | 3 | 4 | 5;
  comment: string;
  submittedAt: string;
};

export type SendBackAuthor = {
  id: string;
  name: string;
  avatarUrl?: string;
};

export type PersonGoals = {
  personId: string;
  status: SubmissionStatus;
  goals: Goal[];
  /** Present only while a late submission is moving through two-tier approval. */
  postWindowApprovalStage?: "manager" | "manager_manager";
  sendBackReason?: string;
  /** Snapshot of who wrote the send-back note. */
  sendBackBy?: SendBackAuthor;
  managerNote?: string;
  rating?: QuarterRating;
};

export type DemoPerson = {
  id: string;
  name: string;
  email: string;
  title: string;
  department: string;
  /** Explicit platform-wide access. Org relationships remain separate. */
  permissions?: SystemPermission[];
  /** ISO date — eligible if on/before quarter Day 1 */
  joinDate: string;
  managerId?: string;
  reportIds: string[];
  avatarHue: number;
  avatarUrl?: string;
  blurb: string;
};

/** Employee goal-setting window from the cycle stage dates (YYYY-MM-DD). */
export type GoalWindow = {
  startDate: string;
  endDate: string;
};

export type GoalsCycle = {
  id: string;
  label: string;
  /** YYYY-MM-DD — eligibility Day 1 (review cycle start) */
  day1: string;
  phase: DemoPhase;
  goalCountPolicy: GoalCountPolicy;
  postWindowGoalPolicy: PostWindowGoalPolicy;
  /** Explains to the employee when goal editing opens and closes. */
  goalWindow?: GoalWindow;
};

/** Review-cycle status badge on the Goals cycle picker. */
export type GoalsCycleStatus = "future" | "current" | "previous" | "manual";

export type GoalsCycleOption = GoalsCycle & {
  status: GoalsCycleStatus;
};

export type GoalsSnapshot = {
  /** Active review/goal cycle (shared identity with Reviews). */
  cycle: GoalsCycle;
  cycleStatus: GoalsCycleStatus;
  /** All review cycles available for goal setting. */
  availableCycles: GoalsCycleOption[];
  activePersonId: string;
  people: DemoPerson[];
  /** Goals for the active cycle only. */
  byPerson: Record<string, PersonGoals>;
};
