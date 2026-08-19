-- Repair milestone rows where list title was copied into measure title (00018 backfill).

WITH corrupted_blocks AS (
  SELECT DISTINCT
    gm.goal_id,
    SUM(CASE WHEN gm.kind = 'metric' THEN 1 ELSE 0 END) OVER (
      PARTITION BY gm.goal_id
      ORDER BY gm.position
      ROWS UNBOUNDED PRECEDING
    ) AS metric_block
  FROM platform.goal_measurements AS gm
  WHERE gm.kind = 'milestone'
    AND gm.measure_title IS NOT NULL
    AND gm.list_title IS NOT NULL
    AND btrim(gm.measure_title) = btrim(gm.list_title)
),
ordered AS (
  SELECT
    gm.measurement_id,
    gm.goal_id,
    gm.position,
    gm.list_id,
    gm.measure_group_id,
    gm.kind,
    SUM(CASE WHEN gm.kind = 'metric' THEN 1 ELSE 0 END) OVER (
      PARTITION BY gm.goal_id
      ORDER BY gm.position
      ROWS UNBOUNDED PRECEDING
    ) AS metric_block
  FROM platform.goal_measurements AS gm
),
canonical AS (
  SELECT DISTINCT ON (o.goal_id, o.metric_block)
    o.goal_id,
    o.metric_block,
    COALESCE(o.measure_group_id, o.list_id, o.measurement_id) AS canonical_group_id
  FROM ordered AS o
  INNER JOIN corrupted_blocks AS cb
    ON cb.goal_id = o.goal_id
   AND cb.metric_block = o.metric_block
  WHERE o.kind = 'milestone'
  ORDER BY o.goal_id, o.metric_block, o.position
)
UPDATE platform.goal_measurements AS gm
SET measure_group_id = canonical.canonical_group_id
FROM ordered AS o
JOIN canonical
  ON canonical.goal_id = o.goal_id
 AND canonical.metric_block = o.metric_block
WHERE gm.measurement_id = o.measurement_id
  AND o.kind = 'milestone'
  AND gm.measure_group_id IS DISTINCT FROM canonical.canonical_group_id;

UPDATE platform.goal_measurements
SET measure_title = NULL
WHERE kind = 'milestone'
  AND measure_title IS NOT NULL
  AND list_title IS NOT NULL
  AND btrim(measure_title) = btrim(list_title);
