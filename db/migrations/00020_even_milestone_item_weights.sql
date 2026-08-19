-- Spread each milestone measure's weight evenly across its checklist items.

WITH grouped AS (
  SELECT
    measurement_id,
    goal_id,
    COALESCE(measure_group_id, list_id, measurement_id) AS group_id,
    position,
    SUM(weight) OVER (
      PARTITION BY goal_id, COALESCE(measure_group_id, list_id, measurement_id)
    ) AS group_total,
    COUNT(*) OVER (
      PARTITION BY goal_id, COALESCE(measure_group_id, list_id, measurement_id)
    ) AS item_count,
    ROW_NUMBER() OVER (
      PARTITION BY goal_id, COALESCE(measure_group_id, list_id, measurement_id)
      ORDER BY position, measurement_id
    ) AS rn
  FROM platform.goal_measurements
  WHERE kind = 'milestone'
),
calculated AS (
  SELECT
    measurement_id,
    item_count,
    rn,
    GREATEST(0, FLOOR(group_total / NULLIF(item_count, 0)))::int AS each_weight,
    GREATEST(
      0,
      group_total
        - GREATEST(0, FLOOR(group_total / NULLIF(item_count, 0))) * item_count
    )::int AS remainder
  FROM grouped
  WHERE item_count > 1
    AND group_total > 0
)
UPDATE platform.goal_measurements AS gm
SET weight = CASE
  WHEN c.rn = c.item_count THEN c.each_weight + c.remainder
  ELSE c.each_weight
END
FROM calculated AS c
WHERE gm.measurement_id = c.measurement_id
  AND gm.weight IS DISTINCT FROM CASE
    WHEN c.rn = c.item_count THEN c.each_weight + c.remainder
    ELSE c.each_weight
  END;
