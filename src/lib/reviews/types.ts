export type ReviewCycleType = "regular" | "ad-hoc";

export type CyclePurpose = "quarterly_checkin" | "annual_appraisal" | "custom";

export type ReviewCycleStatus = "future" | "current" | "previous" | "manual";

export type CycleSectionId = "settings";

/** Stored field. Stages always advance on configured dates; `"manual"` is coerced to `"schedule"`. */
export type StageProcessMode = "schedule" | "manual";

export type DateRange = {
  startDate: string;
  endDate: string;
};

export type DateTimeValue = {
  date: string;
  /** 24h `HH:mm` in UTC. */
  time: string;
};

export type GoalCycleExtensionScope =
  | {
      type: "department";
      departmentId: number;
      departmentName: string;
    }
  | {
      type: "team";
      teamId: number;
      teamName: string;
      departmentName: string;
    }
  | {
      type: "people";
      employeeIds: number[];
    };

export type GoalCycleExtension = {
  id: string;
  /** Population-specific employee goal deadline (YYYY-MM-DD). */
  endDate: string;
  scope: GoalCycleExtensionScope;
};

/** Timeline row for the settings overview. */
export type CycleStageId =
  | "employee_goals"
  | "performance_review"
  | "self_review"
  | "manager_review"
  | "calibration"
  | "calibration_hod_hrbp"
  | "calibration_slt"
  | "publish_managers"
  | "publish_employees"
  | "appeal";

export type ReviewStageId =
  | "goals"
  | "self_review"
  | "manager_review"
  | "calibration_hod_hrbp"
  | "calibration_slt"
  | "publish_managers"
  | "publish_employees"
  | "appeal";

export type ReviewStageConfig = {
  id: ReviewStageId;
  enabled: boolean;
  start?: DateTimeValue;
  end?: DateTimeValue;
};

export type CycleStage = {
  id: CycleStageId;
  label: string;
  startDate: string;
  endDate?: string;
};

export type CycleStagesConfig = {
  /** Always `"schedule"` after load; stages open and close on the dates below. */
  processMode: StageProcessMode;
  goals: {
    employee: DateRange;
    /** Exceptions to the employee goal deadline. Latest matching date wins. */
    extensions?: GoalCycleExtension[];
  };
  performance: {
    employeeStart: DateTimeValue;
    employeeEnd: DateTimeValue;
    managerStart: DateTimeValue;
    managerEnd: DateTimeValue;
  };
  calibration: {
    enabled: boolean;
    start: DateTimeValue;
    end: DateTimeValue;
    /** Shown on the stages timeline when process mode is manual. */
    manualStart: DateTimeValue;
  };
  publish: {
    toManager: DateTimeValue;
    toAll: DateTimeValue;
  };
  /**
   * Source of truth for which review windows run.
   * Legacy goals/performance/calibration/publish stay in sync so Goals is unchanged.
   */
  reviewStages?: ReviewStageConfig[];
};

export type ReviewTypeId =
  "line_manager" | "self" | "upwards" | "peer" | "functional_manager";

export type GoalCountPolicy = {
  /** Submission is blocked below this number. */
  minimumRequired: number;
  /** A non-blocking warning is shown outside this recommended range. */
  recommendedMinimum: number;
  recommendedMaximum: number;
  /** Submission is blocked above this number. Null means no hard maximum. */
  maximumAllowed: number | null;
};

export type PostWindowGoalPolicy = "hard_stop" | "two_tier_approval";

export type ScorecardPillarKind =
  | "goals"
  | "skills"
  | "values"
  | "leadership"
  | "custom";

export type ScorecardPillar = {
  id: string;
  kind: ScorecardPillarKind;
  label: string;
  enabled: boolean;
  weight: number;
  pullLinkedQuarters: boolean;
};

export type ReviewQuestionVisibility = "employee" | "manager" | "calibrators";

export type ReviewQuestion = {
  id: string;
  prompt: string;
  enabled: boolean;
  required: boolean;
  visibility: ReviewQuestionVisibility[];
};

export type GradeBandDefinition = {
  id: GradeBandId;
  label: string;
  sort: number;
};

export type ReviewPolicy = {
  selfReview: {
    ratePillars: boolean;
    rateOverall: boolean;
    visibility: "blinded" | "visible_first" | "sequential";
    latePolicy: "proceed" | "block" | "ptr_unblock";
  };
  managerReview: {
    narrative: "off" | "overall" | "per_pillar";
    gapCommentTiers: number;
    goalsScoreEdit: "read_only" | "override_with_reason";
    finalGradeEdit: "confirm_only" | "override_with_reason";
    gradeSuggestion: "none" | "completion_reference" | "weighted_suggest";
    latePolicy: "escalate" | "extend" | "ptr_delegate";
    escalationRoles: Array<"hod" | "slt" | "ptr">;
  };
  calibration: {
    editors: "hod" | "hrbp" | "hod_and_hrbp";
    distribution: "off" | "guidance" | "enforced";
  };
  release: {
    mode:
      | "batch_ptr"
      | "manager_then_deadline"
      | "window_then_auto"
      | "immediate_on_submit";
    acknowledgement: "none" | "first_view" | "acknowledge_button";
  };
  appeal: {
    mode: "record_only" | "can_change_with_ptr";
    days: number;
  };
  eligibility: {
    excludeNoticePeriod: boolean;
    excludeProbation: boolean;
    excludePip: boolean;
  };
  scorecard: {
    pillars: ScorecardPillar[];
    questions: ReviewQuestion[];
    bands: GradeBandDefinition[];
    extraGradeFields: Array<"contribution" | "impact">;
  };
};

export type CycleSourceLink = {
  sourceCycleId: string;
  weightPercent: number;
  excluded: boolean;
  transitionGrade?: GradeBandId | null;
};

export type CycleSettings = {
  reviewTypes: Record<ReviewTypeId, boolean>;
  goalCountPolicy: GoalCountPolicy;
  /** Controls whether the goal deadline blocks input or allows late submission. */
  postWindowGoalPolicy: PostWindowGoalPolicy;
  /** Employee IDs excluded from automatic grade publishing. */
  excludedEmployeeIds: number[];
  autoScorecardGeneration: boolean;
  reviewPolicy?: ReviewPolicy;
};

export type GradeBandId =
  "exceptional" | "exceeding" | "performing" | "developing" | "unsatisfactory";

export type CalibrationModeId = "manual" | "department" | "central";

export type GradeRecommendationId = "none" | "manager_average" | "weighted";

export type CalibrationLogic = {
  calibrationMode: CalibrationModeId;
  gradeRecommendation: GradeRecommendationId;
  gradeDistribution: Record<GradeBandId, number>;
};

export type CycleGroup = {
  id: string;
  cycleId: string;
  name: string;
  memberIds: number[];
  stagesConfig: CycleStagesConfig;
  settings: CycleSettings;
  calibration: CalibrationLogic;
  createdAt: string;
  updatedAt?: string;
  version?: number;
};

export type CyclePolicyResolution = {
  settings: CycleSettings;
  stagesConfig: CycleStagesConfig;
  calibration: CalibrationLogic;
  /** Null when the person is not listed in any group and is not in the cycle. */
  groupId: string | null;
};

export type ReviewCycle = {
  id: string;
  name: string;
  type: ReviewCycleType;
  purpose?: CyclePurpose;
  startDate: string;
  endDate: string;
  periodKey?: string;
  yearKey?: string;
  sourceLinks?: CycleSourceLink[];
  stagesConfig: CycleStagesConfig;
  settings: CycleSettings;
  calibration: CalibrationLogic;
  /** Named groups. Goal/review/calibration rules apply only to listed members. */
  groups?: CycleGroup[];
  isTest?: boolean;
  createdAt: string;
  updatedAt?: string;
  /** Optimistic concurrency token from the server. */
  version?: number;
};

export type ReviewPacketStatus =
  | "not_started"
  | "self_in_progress"
  | "self_submitted"
  | "manager_in_progress"
  | "manager_submitted"
  | "in_calibration"
  | "calibrated"
  | "released_to_managers"
  | "released_to_employees"
  | "appealed";

export type ReviewActorRole = "self" | "manager";

export type ReviewAnswer = {
  questionId: string;
  actorRole: ReviewActorRole;
  body: string;
};

export type ReviewPillarScore = {
  pillarId: string;
  actorRole: ReviewActorRole;
  grade: GradeBandId | null;
  comment: string;
};

export type ReviewCalibrationEvent = {
  id: string;
  stageId: ReviewStageId;
  fromGrade: GradeBandId | null;
  toGrade: GradeBandId;
  reason: string;
  actorEmployeeId: number | null;
  actorName: string;
  createdAt: string;
};

export type ReviewAppeal = {
  id: string;
  body: string;
  status: "open" | "recorded" | "resolved";
  createdAt: string;
  createdByEmployeeId: number | null;
};

export type ReviewPacket = {
  id: string;
  cycleId: string;
  groupId: string | null;
  employeeId: number;
  managerEmployeeId: number | null;
  status: ReviewPacketStatus;
  selfOverallGrade: GradeBandId | null;
  managerOverallGrade: GradeBandId | null;
  calibratedOverallGrade: GradeBandId | null;
  publishedOverallGrade: GradeBandId | null;
  managerOverrideReason: string;
  goalsComponent: Record<string, unknown> | null;
  answers: ReviewAnswer[];
  pillarScores: ReviewPillarScore[];
  calibrationEvents: ReviewCalibrationEvent[];
  appeals: ReviewAppeal[];
  firstViewedAt?: string;
  releasedToManagerAt?: string;
  releasedToEmployeeAt?: string;
  version: number;
  updatedAt?: string;
};

export type ReviewsMutationError = {
  cycleId: string;
  message: string;
};

export type ReviewsSnapshot = {
  cycles: ReviewCycle[];
  mutationError?: ReviewsMutationError | null;
};

export type CyclePeriodOption = {
  key: string;
  label: string;
  startDate: string;
  endDate: string;
};
