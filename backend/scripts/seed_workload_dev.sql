INSERT INTO workload_entries (account_id, work_date, activity_type_id, category_id, project_id, task_type_id, task_description, status, complexity, hours_spent, quantity)
SELECT
  u.account_id,
  d::date AS work_date,
  CASE WHEN r < 70 THEN 1 WHEN r < 90 THEN 2 ELSE 3 END AS activity_type_id,
  CASE
    WHEN r < 70 THEN ((r % 6) + 1)::bigint
    WHEN r < 90 THEN ((r % 5) + 1)::bigint
    ELSE ((r % 5) + 1)::bigint
  END AS category_id,
  CASE WHEN r < 70 THEN ((r % 5) + 1)::bigint ELSE NULL END AS project_id,
  ((r % 5) + 1)::bigint AS task_type_id,
  CASE r % 8
    WHEN 0 THEN 'Auth flow refactor + token refresh edge cases'
    WHEN 1 THEN 'Reports endpoint pagination + tests'
    WHEN 2 THEN 'Sprint planning + grooming'
    WHEN 3 THEN 'Migration script for legacy data'
    WHEN 4 THEN 'UI polish on dashboard widgets'
    WHEN 5 THEN 'Code review for PR backlog'
    WHEN 6 THEN 'Investigate intermittent CI failure'
    ELSE 'Documentation pass on API'
  END AS task_description,
  CASE r % 3 WHEN 0 THEN 'ongoing' WHEN 1 THEN 'completed' ELSE 'blocked' END AS status,
  CASE r % 3 WHEN 0 THEN 'low' WHEN 1 THEN 'medium' ELSE 'high' END AS complexity,
  ROUND((((r % 7) + 2) * 0.5)::numeric, 2) AS hours_spent,
  CASE WHEN r % 4 = 0 THEN ((r % 10) + 1) ELSE NULL END AS quantity
FROM (
  SELECT account_id, ROW_NUMBER() OVER (ORDER BY account_id) AS uidx
  FROM users WHERE is_active = true
) u
CROSS JOIN LATERAL generate_series(
  (CURRENT_DATE - INTERVAL '45 days')::date,
  CURRENT_DATE::date,
  '3 days'::interval
) d
CROSS JOIN LATERAL (SELECT ((u.uidx * 31 + EXTRACT(DAY FROM d)::int * 17 + EXTRACT(DOY FROM d)::int * 7) % 97) AS r) calc
WHERE EXTRACT(DOW FROM d) NOT IN (0, 6);

SELECT COUNT(*) AS inserted_count FROM workload_entries;
SELECT activity_type_id, COUNT(*) FROM workload_entries GROUP BY activity_type_id ORDER BY 1;
SELECT account_id, COUNT(*) FROM workload_entries GROUP BY account_id ORDER BY 1;
