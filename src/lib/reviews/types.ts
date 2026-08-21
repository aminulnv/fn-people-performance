export type ReviewCycleType = "regular" | "ad-hoc";

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
  | "calibration"
  | "publish_managers"
  | "publish_employees";

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

export type CycleSettings = {
  reviewTypes: Record<ReviewTypeId, boolean>;
  goalCountPolicy: GoalCountPolicy;
  /** Controls whether the goal deadline blocks input or allows late submission. */
  postWindowGoalPolicy: PostWindowGoalPolicy;
  /** Employee IDs excluded from automatic grade publishing. */
  excludedEmployeeIds: number[];
  autoScorecardGeneration: boolean;
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
  startDate: string;
  endDate: string;
  periodKey?: string;
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
