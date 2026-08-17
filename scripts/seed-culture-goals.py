#!/usr/bin/env python3
"""Generate SQL to seed Q3 2026 goals for People & Culture with rich status variations."""

from __future__ import annotations

import json
import sys
from copy import deepcopy
from textwrap import dedent

CYCLE_ID = "q3-2026"

TEAM_GOAL_SETS: dict[str, list[dict]] = {
    "Talent Acquisition": [
        {
            "description": "Reduce average time-to-fill for priority roles",
            "goal_type": "outcome",
            "process_type": "okr",
            "priority": "high",
            "weight": 40,
            "measurements": [
                {
                    "kind": "metric",
                    "title": "Average days to fill priority roles",
                    "weight": 100,
                    "unit": "days",
                    "direction": "decrease",
                    "start_value": 45,
                    "target_value": 35,
                }
            ],
        },
        {
            "description": "Improve offer acceptance rate for critical hires",
            "goal_type": "outcome",
            "process_type": "okr",
            "priority": "high",
            "weight": 35,
            "measurements": [
                {
                    "kind": "metric",
                    "title": "Offer acceptance rate",
                    "weight": 100,
                    "unit": "%",
                    "direction": "increase",
                    "start_value": 72,
                    "target_value": 85,
                }
            ],
        },
        {
            "description": "Build a qualified pipeline for hard-to-fill roles",
            "goal_type": "output",
            "process_type": "bau",
            "priority": "medium",
            "weight": 25,
            "measurements": [
                {
                    "kind": "milestone",
                    "title": "Publish sourcing plan for top 5 critical roles",
                    "weight": 50,
                },
                {
                    "kind": "milestone",
                    "title": "Maintain at least 3 qualified candidates per open critical role",
                    "weight": 50,
                },
            ],
        },
    ],
    "People Experience": [
        {
            "description": "Improve employee engagement survey participation and scores",
            "goal_type": "outcome",
            "process_type": "okr",
            "priority": "high",
            "weight": 40,
            "measurements": [
                {
                    "kind": "metric",
                    "title": "Engagement survey participation rate",
                    "weight": 50,
                    "unit": "%",
                    "direction": "increase",
                    "start_value": 78,
                    "target_value": 90,
                },
                {
                    "kind": "metric",
                    "title": "Overall engagement score",
                    "weight": 50,
                    "unit": "number",
                    "direction": "increase",
                    "start_value": 7.2,
                    "target_value": 7.8,
                },
            ],
        },
        {
            "description": "Strengthen the new joiner onboarding experience",
            "goal_type": "output",
            "process_type": "bau",
            "priority": "medium",
            "weight": 35,
            "measurements": [
                {
                    "kind": "milestone",
                    "title": "Launch refreshed 30-60-90 onboarding checklist",
                    "weight": 60,
                },
                {
                    "kind": "metric",
                    "title": "New joiner onboarding satisfaction",
                    "weight": 40,
                    "unit": "number",
                    "direction": "increase",
                    "start_value": 4.0,
                    "target_value": 4.5,
                },
            ],
        },
        {
            "description": "Reduce HR service ticket resolution time",
            "goal_type": "outcome",
            "process_type": "bau",
            "priority": "medium",
            "weight": 25,
            "measurements": [
                {
                    "kind": "metric",
                    "title": "Median ticket resolution time",
                    "weight": 100,
                    "unit": "days",
                    "direction": "decrease",
                    "start_value": 5,
                    "target_value": 3,
                }
            ],
        },
    ],
    "Performance & Total Rewards": [
        {
            "description": "Support Q3 performance review cycle execution",
            "goal_type": "output",
            "process_type": "bau",
            "priority": "high",
            "weight": 40,
            "measurements": [
                {
                    "kind": "milestone",
                    "title": "Complete calibration prep for assigned population",
                    "weight": 50,
                },
                {
                    "kind": "metric",
                    "title": "Review completion rate in assigned population",
                    "weight": 50,
                    "unit": "%",
                    "direction": "increase",
                    "start_value": 0,
                    "target_value": 95,
                },
            ],
        },
        {
            "description": "Advance compensation benchmarking for key job families",
            "goal_type": "output",
            "process_type": "okr",
            "priority": "medium",
            "weight": 35,
            "measurements": [
                {
                    "kind": "milestone",
                    "title": "Deliver benchmark analysis for priority job families",
                    "weight": 100,
                }
            ],
        },
        {
            "description": "Increase OKR adoption across supported teams",
            "goal_type": "outcome",
            "process_type": "okr",
            "priority": "medium",
            "weight": 25,
            "measurements": [
                {
                    "kind": "metric",
                    "title": "Employees with approved goals in supported teams",
                    "weight": 100,
                    "unit": "%",
                    "direction": "increase",
                    "start_value": 55,
                    "target_value": 80,
                }
            ],
        },
    ],
    "HRBP": [
        {
            "description": "Partner with business units on Q3 workforce planning",
            "goal_type": "output",
            "process_type": "bau",
            "priority": "high",
            "weight": 40,
            "measurements": [
                {
                    "kind": "milestone",
                    "title": "Complete workforce plan review with each assigned BU lead",
                    "weight": 100,
                }
            ],
        },
        {
            "description": "Reduce regrettable attrition in assigned departments",
            "goal_type": "outcome",
            "process_type": "okr",
            "priority": "high",
            "weight": 35,
            "measurements": [
                {
                    "kind": "metric",
                    "title": "Regrettable attrition rate",
                    "weight": 100,
                    "unit": "%",
                    "direction": "decrease",
                    "start_value": 12,
                    "target_value": 8,
                }
            ],
        },
        {
            "description": "Improve manager capability through targeted enablement",
            "goal_type": "output",
            "process_type": "bau",
            "priority": "medium",
            "weight": 25,
            "measurements": [
                {
                    "kind": "metric",
                    "title": "Managers completing people leadership training",
                    "weight": 60,
                    "unit": "%",
                    "direction": "increase",
                    "start_value": 40,
                    "target_value": 75,
                },
                {
                    "kind": "milestone",
                    "title": "Run quarterly manager roundtable for assigned teams",
                    "weight": 40,
                },
            ],
        },
    ],
    "Core": [
        {
            "description": "Define and communicate H2 people strategy priorities",
            "goal_type": "outcome",
            "process_type": "okr",
            "priority": "high",
            "weight": 40,
            "measurements": [
                {
                    "kind": "milestone",
                    "title": "Publish H2 people strategy memo to leadership",
                    "weight": 100,
                }
            ],
        },
        {
            "description": "Strengthen leadership bench and succession readiness",
            "goal_type": "outcome",
            "process_type": "okr",
            "priority": "high",
            "weight": 35,
            "measurements": [
                {
                    "kind": "metric",
                    "title": "Critical roles with identified successors",
                    "weight": 100,
                    "unit": "%",
                    "direction": "increase",
                    "start_value": 50,
                    "target_value": 75,
                }
            ],
        },
        {
            "description": "Drive culture initiatives aligned to company values",
            "goal_type": "output",
            "process_type": "bau",
            "priority": "medium",
            "weight": 25,
            "measurements": [
                {
                    "kind": "milestone",
                    "title": "Launch Q3 culture activation campaign",
                    "weight": 50,
                },
                {
                    "kind": "milestone",
                    "title": "Complete values workshop with executive team",
                    "weight": 50,
                },
            ],
        },
    ],
}

DEFAULT_TEAM = "People Experience"

SEND_BACK_REASONS = [
    "Please tighten measurement targets and rebalance weightage to 100%.",
    "Goal descriptions need more specificity — add measurable outcomes.",
    "One goal reads like a task list. Reframe it as a measurable result.",
    "Measurement weights within a goal must total 100%. Please fix before resubmitting.",
    "The priority mix looks off — adjust to reflect your real focus areas this quarter.",
    "Add proof links or clearer milestones for the output goals before resubmitting.",
]

MANAGER_NOTES = [
    "Solid set — approved for Q3.",
    "Good goals. Keep an eye on the at-risk metric through mid-quarter.",
    "Approved. Strong alignment with team priorities.",
    "Clear outcomes and sensible weighting — good to go.",
    "Approved after our 1:1 tweaks. Execute with focus.",
]

RATING_COMMENTS = [
    "Strong goal clarity going into the quarter.",
    "Ambitious but achievable — well structured.",
    "Good mix of outcomes and outputs.",
    "Needs close check-ins on the at-risk goal.",
    "Excellent progress on milestones so far.",
]

# Each profile drives submission status, per-goal progress labels, and measurement progress.
PROFILES: list[dict] = [
    {
        "label": "draft_fresh",
        "status": "draft",
        "progress": ["on_track", "on_track", "on_track"],
        "fractions": [0.08, 0.05, 0.0],
        "milestones": [[False, False], [False, False], [False]],
    },
    {
        "label": "draft_in_progress",
        "status": "draft",
        "progress": ["on_track", "at_risk", "on_track"],
        "fractions": [0.35, 0.25, 0.15],
        "milestones": [[True, False], [False], [False, False]],
    },
    {
        "label": "submitted_early",
        "status": "submitted",
        "progress": ["on_track", "on_track", "on_track"],
        "fractions": [0.45, 0.4, 0.3],
        "milestones": [[True, False], [True, False], [False]],
        "submitted_days_ago": 4,
    },
    {
        "label": "submitted_mixed",
        "status": "submitted",
        "progress": ["on_track", "at_risk", "off_track"],
        "fractions": [0.55, 0.2, 0.1],
        "milestones": [[True, True], [False], [False, False]],
        "submitted_days_ago": 2,
    },
    {
        "label": "submitted_on_hold",
        "status": "submitted",
        "progress": ["on_track", "on_hold", "on_track"],
        "fractions": [0.5, 0.0, 0.35],
        "milestones": [[True, False], [False, False], [True, False]],
        "submitted_days_ago": 6,
    },
    {
        "label": "sent_back_weights",
        "status": "sent_back",
        "progress": ["on_track", "off_track", "at_risk"],
        "fractions": [0.4, 0.15, 0.25],
        "milestones": [[False, False], [False], [False, False]],
        "submitted_days_ago": 8,
        "send_back_reason_idx": 0,
    },
    {
        "label": "sent_back_clarity",
        "status": "sent_back",
        "progress": ["at_risk", "on_track", "on_track"],
        "fractions": [0.2, 0.3, 0.2],
        "milestones": [[False, False], [True, False], [False]],
        "submitted_days_ago": 5,
        "send_back_reason_idx": 1,
    },
    {
        "label": "sent_back_priorities",
        "status": "sent_back",
        "progress": ["on_track", "on_track", "off_track"],
        "fractions": [0.3, 0.35, 0.05],
        "milestones": [[True, False], [False], [False, False]],
        "submitted_days_ago": 7,
        "send_back_reason_idx": 4,
    },
    {
        "label": "approved_strong",
        "status": "approved",
        "progress": ["on_track", "on_track", "on_track"],
        "fractions": [0.65, 0.6, 0.5],
        "milestones": [[True, True], [True, False], [True, False]],
        "submitted_days_ago": 14,
        "approved_days_ago": 10,
        "manager_note_idx": 0,
        "rating_tier": 4,
        "rating_comment_idx": 0,
    },
    {
        "label": "approved_with_complete",
        "status": "approved",
        "progress": ["complete", "at_risk", "on_track"],
        "fractions": [1.0, 0.35, 0.55],
        "milestones": [[True, True], [True, False], [True, True]],
        "submitted_days_ago": 12,
        "approved_days_ago": 9,
        "manager_note_idx": 1,
        "rating_tier": 3,
        "rating_comment_idx": 3,
    },
    {
        "label": "approved_mid_cycle",
        "status": "approved",
        "progress": ["on_track", "on_track", "at_risk"],
        "fractions": [0.4, 0.45, 0.2],
        "milestones": [[True, False], [False], [False, False]],
        "submitted_days_ago": 11,
        "approved_days_ago": 8,
        "manager_note_idx": 2,
        "rating_tier": 5,
        "rating_comment_idx": 2,
    },
    {
        "label": "approved_all_complete",
        "status": "approved",
        "progress": ["complete", "complete", "complete"],
        "fractions": [1.0, 1.0, 1.0],
        "milestones": [[True, True], [True, True], [True, True]],
        "submitted_days_ago": 20,
        "approved_days_ago": 15,
        "manager_note_idx": 3,
        "rating_tier": 5,
        "rating_comment_idx": 4,
    },
    {
        "label": "approved_off_track",
        "status": "approved",
        "progress": ["off_track", "at_risk", "on_track"],
        "fractions": [0.15, 0.25, 0.7],
        "milestones": [[False, False], [False], [True, True]],
        "submitted_days_ago": 13,
        "approved_days_ago": 11,
        "manager_note_idx": 4,
        "rating_tier": 2,
        "rating_comment_idx": 1,
    },
    {
        "label": "incomplete_late",
        "status": "incomplete",
        "progress": ["off_track", "on_hold", "at_risk"],
        "fractions": [0.05, 0.0, 0.1],
        "milestones": [[False, False], [False, False], [False]],
    },
]


def sql_str(value: str) -> str:
    return "'" + value.replace("'", "''") + "'"


def sql_num(value: float | int | None) -> str:
    if value is None:
        return "NULL"
    return str(value)


def sql_bool(value: bool | None) -> str:
    if value is None:
        return "NULL"
    return "TRUE" if value else "FALSE"


def profile_for(index: int) -> dict:
    """Cycle through profiles so every variation appears across the department."""
    return PROFILES[index % len(PROFILES)]


def metric_current(start: float, target: float, direction: str, fraction: float) -> float:
    fraction = max(0.0, min(1.0, fraction))
    if direction == "decrease":
        return round(start - (start - target) * fraction, 2)
    return round(start + (target - start) * fraction, 2)


def apply_profile_to_goal(goal: dict, profile: dict, goal_index: int) -> dict:
    goal = deepcopy(goal)
    fraction = profile["fractions"][goal_index]
    milestone_flags = profile["milestones"][goal_index]
    milestone_idx = 0

    for measurement in goal["measurements"]:
        if measurement["kind"] == "metric":
            start = measurement["start_value"]
            target = measurement["target_value"]
            direction = measurement["direction"]
            measurement["current_value"] = metric_current(start, target, direction, fraction)
        else:
            complete = milestone_flags[milestone_idx] if milestone_idx < len(milestone_flags) else False
            measurement["complete"] = complete
            milestone_idx += 1

    return goal


def render_submission(
    employee_id: int,
    profile: dict,
    manager_id: int | None,
    manager_name: str | None,
) -> str:
    status = profile["status"]
    send_back_reason = "NULL"
    send_back_by_id = "NULL"
    send_back_by_name = "NULL"
    manager_note = "NULL"
    approved_by_id = "NULL"
    approved_by_name = "NULL"
    submitted_at = "NULL"
    approved_at = "NULL"

    if status == "sent_back":
        reason_idx = profile.get("send_back_reason_idx", 0) % len(SEND_BACK_REASONS)
        send_back_reason = sql_str(SEND_BACK_REASONS[reason_idx])
        if manager_id:
            send_back_by_id = str(manager_id)
            send_back_by_name = sql_str(manager_name or "")
        submitted_days = profile.get("submitted_days_ago", 5)
        submitted_at = f"(now() - interval '{submitted_days} days')"
    elif status in ("submitted", "approved"):
        submitted_days = profile.get("submitted_days_ago", 3)
        submitted_at = f"(now() - interval '{submitted_days} days')"
    if status == "approved":
        note_idx = profile.get("manager_note_idx", 0) % len(MANAGER_NOTES)
        manager_note = sql_str(MANAGER_NOTES[note_idx])
        if manager_id:
            approved_by_id = str(manager_id)
            approved_by_name = sql_str(manager_name or "")
        approved_days = profile.get("approved_days_ago", 5)
        approved_at = f"(now() - interval '{approved_days} days')"

    return dedent(
        f"""
        INSERT INTO platform.goal_submissions (
          cycle_id, employee_id, status,
          send_back_reason, send_back_by_employee_id, send_back_by_name,
          manager_note, approved_by_employee_id, approved_by_name,
          submitted_at, approved_at
        ) VALUES (
          {sql_str(CYCLE_ID)}, {employee_id}, {sql_str(status)},
          {send_back_reason}, {send_back_by_id}, {send_back_by_name},
          {manager_note}, {approved_by_id}, {approved_by_name},
          {submitted_at}, {approved_at}
        )
        ON CONFLICT (cycle_id, employee_id) DO UPDATE SET
          status = EXCLUDED.status,
          send_back_reason = EXCLUDED.send_back_reason,
          send_back_by_employee_id = EXCLUDED.send_back_by_employee_id,
          send_back_by_name = EXCLUDED.send_back_by_name,
          manager_note = EXCLUDED.manager_note,
          approved_by_employee_id = EXCLUDED.approved_by_employee_id,
          approved_by_name = EXCLUDED.approved_by_name,
          submitted_at = EXCLUDED.submitted_at,
          approved_at = EXCLUDED.approved_at,
          updated_at = now();
        """
    ).strip()


def render_rating(
    employee_id: int,
    profile: dict,
    manager_id: int | None,
) -> str | None:
    tier = profile.get("rating_tier")
    if profile["status"] != "approved" or tier is None:
        return None
    comment_idx = profile.get("rating_comment_idx", 0) % len(RATING_COMMENTS)
    submitted_by = str(manager_id) if manager_id else "NULL"
    return dedent(
        f"""
        INSERT INTO platform.goal_ratings (
          cycle_id, employee_id, tier, comment, submitted_by_employee_id, submitted_at
        ) VALUES (
          {sql_str(CYCLE_ID)}, {employee_id}, {tier},
          {sql_str(RATING_COMMENTS[comment_idx])},
          {submitted_by},
          now() - interval '{profile.get("approved_days_ago", 5)} days'
        )
        ON CONFLICT (cycle_id, employee_id) DO UPDATE SET
          tier = EXCLUDED.tier,
          comment = EXCLUDED.comment,
          submitted_by_employee_id = EXCLUDED.submitted_by_employee_id,
          submitted_at = EXCLUDED.submitted_at;
        """
    ).strip()


def render_measurement(
    goal_id: str,
    employee_id: int,
    position: int,
    measurement: dict,
    profile: dict,
    goal_index: int,
) -> list[str]:
    measurement_id = f"seed-{employee_id}-{goal_id.split('-')[-1]}-m{position}"
    lines = [
        dedent(
            f"""
            INSERT INTO platform.goal_measurements (
              measurement_id, goal_id, kind, title, weight, position, unit, direction,
              start_value, target_value, current_value, range_min, range_max, complete
            ) VALUES (
              {sql_str(measurement_id)},
              {sql_str(goal_id)},
              {sql_str(measurement['kind'])},
              {sql_str(measurement['title'])},
              {measurement['weight']},
              {position},
              {sql_str(measurement['unit']) if measurement.get('unit') else 'NULL'},
              {sql_str(measurement['direction']) if measurement.get('direction') else 'NULL'},
              {sql_num(measurement.get('start_value'))},
              {sql_num(measurement.get('target_value'))},
              {sql_num(measurement.get('current_value'))},
              NULL,
              NULL,
              {sql_bool(measurement.get('complete'))}
            )
            ON CONFLICT (measurement_id) DO UPDATE SET
              current_value = EXCLUDED.current_value,
              complete = EXCLUDED.complete,
              updated_at = now();
            """
        ).strip()
    ]

    if measurement.get("kind") == "metric" and measurement.get("current_value") is not None:
        start = measurement.get("start_value")
        current = measurement.get("current_value")
        if start is not None and current != start:
            entry_id = f"seed-{employee_id}-g{goal_index + 1}-m{position}-log"
            midpoint = metric_current(
                start,
                measurement["target_value"],
                measurement["direction"],
                profile["fractions"][goal_index] / 2,
            )
            lines.append(
                dedent(
                    f"""
                    INSERT INTO platform.goal_progress_entries (
                      entry_id, goal_id, measurement_id,
                      actor_employee_id, actor_name, measurement_label,
                      from_value, to_value, recorded_at
                    ) VALUES (
                      {sql_str(entry_id)},
                      {sql_str(goal_id)},
                      {sql_str(measurement_id)},
                      {employee_id},
                      'Owner',
                      {sql_str(measurement['title'])},
                      {sql_num(start)},
                      {sql_num(midpoint)},
                      now() - interval '{14 - goal_index} days'
                    )
                    ON CONFLICT (entry_id) DO NOTHING;

                    INSERT INTO platform.goal_progress_entries (
                      entry_id, goal_id, measurement_id,
                      actor_employee_id, actor_name, measurement_label,
                      from_value, to_value, recorded_at
                    ) VALUES (
                      {sql_str(entry_id + '-2')},
                      {sql_str(goal_id)},
                      {sql_str(measurement_id)},
                      {employee_id},
                      'Owner',
                      {sql_str(measurement['title'])},
                      {sql_num(midpoint)},
                      {sql_num(current)},
                      now() - interval '{7 - goal_index} days'
                    )
                    ON CONFLICT (entry_id) DO NOTHING;
                    """
                ).strip()
            )

    return lines


def render_employee_goals(
    employee_id: int,
    team: str,
    profile: dict,
    manager_id: int | None,
    manager_name: str | None,
) -> str:
    lines = [
        f"-- Employee {employee_id} ({team or DEFAULT_TEAM}) — profile {profile['label']}",
        render_submission(employee_id, profile, manager_id, manager_name),
    ]

    rating_sql = render_rating(employee_id, profile, manager_id)
    if rating_sql:
        lines.append(rating_sql)

    goals = TEAM_GOAL_SETS.get(team or DEFAULT_TEAM, TEAM_GOAL_SETS[DEFAULT_TEAM])

    for goal_position, base_goal in enumerate(goals):
        goal = apply_profile_to_goal(base_goal, profile, goal_position)
        goal_id = f"seed-{employee_id}-g{goal_position + 1}"
        progress_status = profile["progress"][goal_position]

        lines.append(
            dedent(
                f"""
                INSERT INTO platform.goals (
                  goal_id, cycle_id, employee_id, owner_employee_id, description,
                  goal_type, process_type, priority, weight, position, progress_status
                ) VALUES (
                  {sql_str(goal_id)},
                  {sql_str(CYCLE_ID)},
                  {employee_id},
                  {employee_id},
                  {sql_str(goal['description'])},
                  {sql_str(goal['goal_type'])},
                  {sql_str(goal['process_type'])},
                  {sql_str(goal['priority'])},
                  {goal['weight']},
                  {goal_position},
                  {sql_str(progress_status)}
                )
                ON CONFLICT (goal_id) DO UPDATE SET
                  progress_status = EXCLUDED.progress_status,
                  updated_at = now();
                """
            ).strip()
        )

        for measurement_position, measurement in enumerate(goal["measurements"]):
            lines.extend(
                render_measurement(
                    goal_id,
                    employee_id,
                    measurement_position,
                    measurement,
                    profile,
                    goal_position,
                )
            )

    return "\n\n".join(lines)


def main() -> None:
    if len(sys.argv) < 2:
        print("Usage: seed-culture-goals.py '<json employee rows>'", file=sys.stderr)
        sys.exit(1)

    employees = json.loads(sys.argv[1])
    chunks = [
        "-- Seed Q3 2026 goals for People & Culture with status variations",
        "BEGIN;",
    ]

    status_counts: dict[str, int] = {}
    seeded = 0
    for index, row in enumerate(employees):
        employee_id = int(row["employee_id"])
        team = row.get("team") or DEFAULT_TEAM
        manager_id = int(row["manager_id"]) if row.get("manager_id") else None
        manager_name = row.get("manager_name")
        profile = profile_for(index)
        status_counts[profile["status"]] = status_counts.get(profile["status"], 0) + 1
        chunks.append(
            render_employee_goals(employee_id, team, profile, manager_id, manager_name)
        )
        seeded += 1

    chunks.append("COMMIT;")
    chunks.append(f"-- Seeded/updated goals for {seeded} employees")
    for status, count in sorted(status_counts.items()):
        chunks.append(f"--   {status}: {count}")
    print("\n\n".join(chunks))


if __name__ == "__main__":
    main()
