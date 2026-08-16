export type ReviewCycleType = "regular" | "ad-hoc";

export type ReviewCycleStatus = "future" | "current" | "previous" | "manual";

export type CycleSectionId =
  "goals" | "performance" | "calibration" | "results" | "settings";

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

/** Timeline row for the settings overview. */
export type CycleStageId =
  | "department_goals"
  | "team_goals"
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
  processMode: StageProcessMode;
  goals: {
    department: DateRange;
    team: DateRange;
    employee: DateRange;
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
  isTest?: boolean;
  createdAt: string;
};

export type ReviewsSnapshot = {
  cycles: ReviewCycle[];
};

export type CyclePeriodOption = {
  key: string;
  label: string;
  startDate: string;
  endDate: string;
};
