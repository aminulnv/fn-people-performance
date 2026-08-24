import type { SystemPermission } from "@/lib/accessControl/types";
import type {
  GoalCountPolicy,
  GoalCycleExtension,
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
  /** Milestone task title at write time. Metric logs leave this unset. */
  label?: string;
};

export type Milestone = {
  id: string;
  kind: "milestone";
  /** Groups todo lists under one named measure row. */
  measureGroupId?: string;
  /** Top-level measure name shown in the progress table. */
  measureTitle?: string;
  /** Groups items into separate checklist cards on the same goal. */
  listId?: string;
  /** Named todo list within a measure (not a cycle). */
  listTitle?: string;
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
  /** Person who owns this goal; defaults to the page person when unset. */
  ownerId?: string;
  /** Longer free-text description (goal name lives in `description`). */
  details?: string;
  /** Line manager goal this one cascades from. */
  cascadedFromGoalId?: string;
  /** Snapshot title of the cascaded manager goal (survives if the source is gone). */
  linkedGoalLabel?: string;
  measurements: Measurement[];
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
  /** Set when the actor approved while delegated for this person's manager. */
  delegatingForName?: string;
  delegatingForAvatarUrl?: string;
  /** Historical API alias for delegatingForName. */
  coveringForName?: string;
  coveringForAvatarUrl?: string;
};

export type PersonGoals = {
  personId: string;
  status: SubmissionStatus;
  goals: Goal[];
  /** Server aggregate version. Zero/undefined means no submission row exists yet. */
  version?: number;
  /** Present only while a late submission is moving through two-tier approval. */
  postWindowApprovalStage?: "manager" | "manager_manager";
  sendBackReason?: string;
  /** Snapshot of who wrote the send-back note. */
  sendBackBy?: SendBackAuthor;
  /** Snapshot of who gave the final approval. */
  approvedBy?: SendBackAuthor;
  managerNote?: string;
  rating?: QuarterRating;
};

export type DemoPerson = {
  id: string;
  name: string;
  email: string;
  title: string;
  department: string;
  departmentId?: number;
  team?: string;
  teamId?: number;
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
  /** YYYY-MM-DD — eligibility Day 1 (cycle start) */
  day1: string;
  phase: DemoPhase;
  goalCountPolicy: GoalCountPolicy;
  postWindowGoalPolicy: PostWindowGoalPolicy;
  /** Explains to the employee when goal editing opens and closes. */
  goalWindow?: GoalWindow;
  goalExtensions?: GoalCycleExtension[];
  /**
   * Set when this cycle was resolved for a specific person.
   * `null` means they are not in a group and are not in the cycle.
   */
  assignedGroupId?: string | null;
};

/** Cycle status badge on the Goals cycle picker. */
export type GoalsCycleStatus = "future" | "current" | "previous" | "manual";

export type GoalsCycleOption = GoalsCycle & {
  status: GoalsCycleStatus;
};

export type GoalsSnapshot = {
  /** Active review/goal cycle (shared identity with Reviews). */
  cycle: GoalsCycle;
  cycleStatus: GoalsCycleStatus;
  /** All cycles available for goal setting. */
  availableCycles: GoalsCycleOption[];
  activePersonId: string;
  people: DemoPerson[];
  /** Goals for the active cycle only. */
  byPerson: Record<string, PersonGoals>;
};
