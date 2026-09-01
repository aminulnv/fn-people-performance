import {
  blankMetric,
  blankMilestone,
  DEFAULT_TASK_LIST_TITLE,
  rebalanceMeasurementWeights,
} from "@/lib/goals/measurements";
import type { Goal, Measurement, Metric, MetricUnit } from "@/lib/goals/types";
import type { OkrWorkItem } from "./reference";

export const OKR_GOAL_DRAG_TYPE = "application/x-okr-goal-fill";

export type OkrGoalDropMilestone = {
  title: string;
  status: string;
};

export type OkrGoalDropPayload = {
  title: string;
  description: string;
  unit: string;
  currentValue: number | null;
  targetValue: number | null;
  progressPercent: number | null;
  milestones: OkrGoalDropMilestone[];
};

function okrMilestoneIsComplete(status: string): boolean {
  const value = status.trim().toLowerCase();
  return value === "done" || value === "completed" || value === "complete";
}

export function okrGoalDropPayload(item: OkrWorkItem): OkrGoalDropPayload {
  return {
    title: item.shortTitle.trim() || item.title.trim(),
    description: item.description.trim() || item.objectiveTitle.trim(),
    unit: item.unit,
    currentValue: item.currentValue,
    targetValue: item.targetValue,
    progressPercent: item.progressPercent,
    milestones: item.milestones
      .map((milestone) => ({
        title: milestone.title.trim(),
        status: milestone.status,
      }))
      .filter((milestone) => milestone.title),
  };
}

export function mapOkrUnit(unit: string): MetricUnit {
  const value = unit.trim().toLowerCase();
  if (!value) return "number";
  if (value === "%" || value.includes("percent")) return "%";
  if (
    value.includes("currency") ||
    value === "usd" ||
    value === "$" ||
    value.includes("dollar")
  ) {
    return "currency";
  }
  if (value.includes("second")) return "seconds";
  if (value.includes("minute")) return "minutes";
  if (value.includes("hour")) return "hours";
  if (value.includes("day")) return "days";
  return "number";
}

export function metricFromOkrPayload(payload: OkrGoalDropPayload): Metric {
  const unit = mapOkrUnit(payload.unit);
  let current = payload.currentValue;
  let target = payload.targetValue;
  if (current == null && target == null && payload.progressPercent != null) {
    current = payload.progressPercent;
    target = unit === "%" ? 100 : null;
  }
  const direction =
    current != null && target != null && target < current
      ? "decrease"
      : "increase";
  return {
    ...blankMetric(direction, 100),
    title: payload.title,
    unit,
    startValue: 0,
    currentValue: current ?? 0,
    targetValue: target ?? undefined,
  };
}

function measurementsFromOkrPayload(payload: OkrGoalDropPayload): Measurement[] {
  const milestones = payload.milestones.filter((item) => item.title.trim());
  if (milestones.length === 0) {
    return rebalanceMeasurementWeights([metricFromOkrPayload(payload)]);
  }

  const measureTitle = payload.title.trim();
  const seed = blankMilestone(0, {
    listTitle: DEFAULT_TASK_LIST_TITLE,
    measureTitle,
  });
  const listId = seed.listId;
  const measureGroupId = seed.measureGroupId;
  return rebalanceMeasurementWeights(
    milestones.map((milestone, index) => ({
      ...(index === 0
        ? seed
        : blankMilestone(0, {
            listId,
            measureGroupId,
            listTitle: DEFAULT_TASK_LIST_TITLE,
            measureTitle,
          })),
      title: milestone.title.trim(),
      complete: okrMilestoneIsComplete(milestone.status),
    })),
  );
}

export function applyOkrPayloadToGoal(
  goal: Goal,
  payload: OkrGoalDropPayload,
): Goal {
  const title = payload.title.trim();
  const details = payload.description.trim();
  return {
    ...goal,
    description: title || goal.description,
    details: details || undefined,
    measurements: measurementsFromOkrPayload(payload),
    updatedAt: new Date().toISOString(),
  };
}

export function readOkrGoalDropPayload(
  dataTransfer: DataTransfer | null,
): OkrGoalDropPayload | null {
  if (!dataTransfer) return null;
  const raw = dataTransfer.getData(OKR_GOAL_DRAG_TYPE);
  if (!raw.trim()) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<OkrGoalDropPayload>;
    if (!parsed || typeof parsed !== "object") return null;
    if (typeof parsed.title !== "string" || !parsed.title.trim()) return null;
    return {
      title: parsed.title,
      description:
        typeof parsed.description === "string" ? parsed.description : "",
      unit: typeof parsed.unit === "string" ? parsed.unit : "",
      currentValue:
        typeof parsed.currentValue === "number" ? parsed.currentValue : null,
      targetValue:
        typeof parsed.targetValue === "number" ? parsed.targetValue : null,
      progressPercent:
        typeof parsed.progressPercent === "number"
          ? parsed.progressPercent
          : null,
      milestones: Array.isArray(parsed.milestones)
        ? parsed.milestones.flatMap((milestone) => {
            if (!milestone || typeof milestone !== "object") return [];
            const title =
              typeof milestone.title === "string" ? milestone.title.trim() : "";
            if (!title) return [];
            return [
              {
                title,
                status:
                  typeof milestone.status === "string" ? milestone.status : "",
              },
            ];
          })
        : [],
    };
  } catch {
    return null;
  }
}

export function dataTransferHasOkrGoal(dataTransfer: DataTransfer | null) {
  const types = dataTransfer?.types;
  if (!types) return false;
  return Array.from(types).includes(OKR_GOAL_DRAG_TYPE);
}

/** Dispatched when the OKR sheet asks the open goal form to apply a KR fill. */
export const OKR_APPLY_TO_GOAL_EVENT = "pd-okr-apply-to-goal";

export function requestApplyOkrToGoal(payload: OkrGoalDropPayload) {
  window.dispatchEvent(
    new CustomEvent(OKR_APPLY_TO_GOAL_EVENT, { detail: payload }),
  );
}

export function isOkrApplyToGoalEvent(
  event: Event,
): event is CustomEvent<OkrGoalDropPayload> {
  return (
    event instanceof CustomEvent &&
    event.type === OKR_APPLY_TO_GOAL_EVENT &&
    event.detail != null &&
    typeof event.detail === "object"
  );
}
