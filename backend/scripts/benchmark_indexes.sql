-- Measures the task indexes on a realistic volume (200k tasks, 500 users).
-- Everything runs in one transaction that is rolled back, so no data changes.
-- Run with: make benchmark-indexes

\timing off
BEGIN;
INSERT INTO users_user (id, password, is_superuser, username, first_name, last_name, email, is_staff, is_active, date_joined, created_at, updated_at)
SELECT gen_random_uuid(), '!', false, 'bench' || n, '', '', 'bench' || n || '@example.com', false, true, now(), now(), now()
FROM generate_series(1, 500) n;
CREATE TEMP TABLE bench_users AS SELECT id, row_number() OVER () AS rn FROM users_user WHERE username LIKE 'bench%';
INSERT INTO tasks_task (id, title, description, status, priority, due_date, assignee_id, created_by_id, completed_at, created_at, updated_at)
SELECT gen_random_uuid(), 'Bench task ' || n, '',
       s.status, (ARRAY['low','medium','high'])[1 + (n % 3)],
       CURRENT_DATE + ((n * 7919) % 365 - 182),
       CASE WHEN n % 5 = 0 THEN NULL ELSE (SELECT id FROM bench_users WHERE rn = 1 + (n * 31) % 500) END,
       (SELECT id FROM bench_users WHERE rn = 1 + (n * 17) % 500),
       CASE WHEN s.status = 'completed' THEN now() END,
       now() - (n || ' minutes')::interval, now()
FROM generate_series(1, 200000) n,
LATERAL (SELECT (ARRAY['pending','in_progress','completed','completed','completed'])[1 + (n % 5)] AS status) s;
ANALYZE tasks_task; ANALYZE users_user;
SELECT status, count(*) FROM tasks_task GROUP BY status;
\set u '(SELECT id FROM bench_users WHERE rn = 42)'

\echo '=== Q1 staff: status=pending, newest first (LIMIT 10)'
EXPLAIN (ANALYZE, COSTS OFF, SUMMARY ON) SELECT * FROM tasks_task WHERE status = 'pending' ORDER BY created_at DESC LIMIT 10;
\echo '=== Q2 staff: due date in the next 7 days'
EXPLAIN (ANALYZE, COSTS OFF, SUMMARY ON) SELECT * FROM tasks_task WHERE due_date BETWEEN CURRENT_DATE AND CURRENT_DATE + 7 ORDER BY created_at DESC LIMIT 10;
\echo '=== Q3 staff: count of due date range (pagination count)'
EXPLAIN (ANALYZE, COSTS OFF, SUMMARY ON) SELECT count(*) FROM tasks_task WHERE due_date BETWEEN CURRENT_DATE AND CURRENT_DATE + 7;
\echo '=== Q4 user: visible tasks with status=in_progress'
EXPLAIN (ANALYZE, COSTS OFF, SUMMARY ON) SELECT * FROM tasks_task WHERE (created_by_id = :u OR assignee_id = :u) AND status = 'in_progress' ORDER BY created_at DESC LIMIT 10;
\echo '=== Q5 overdue digest: open tasks past due'
EXPLAIN (ANALYZE, COSTS OFF, SUMMARY ON) SELECT count(*) FROM tasks_task WHERE due_date < CURRENT_DATE AND NOT status = 'completed';

DROP INDEX task_status_idx; DROP INDEX task_due_date_idx; DROP INDEX task_assignee_status_idx;
ANALYZE tasks_task;
\echo '############ WITHOUT the three indexes'
\echo '=== Q1'
EXPLAIN (ANALYZE, COSTS OFF, SUMMARY ON) SELECT * FROM tasks_task WHERE status = 'pending' ORDER BY created_at DESC LIMIT 10;
\echo '=== Q2'
EXPLAIN (ANALYZE, COSTS OFF, SUMMARY ON) SELECT * FROM tasks_task WHERE due_date BETWEEN CURRENT_DATE AND CURRENT_DATE + 7 ORDER BY created_at DESC LIMIT 10;
\echo '=== Q3'
EXPLAIN (ANALYZE, COSTS OFF, SUMMARY ON) SELECT count(*) FROM tasks_task WHERE due_date BETWEEN CURRENT_DATE AND CURRENT_DATE + 7;
\echo '=== Q4'
EXPLAIN (ANALYZE, COSTS OFF, SUMMARY ON) SELECT * FROM tasks_task WHERE (created_by_id = :u OR assignee_id = :u) AND status = 'in_progress' ORDER BY created_at DESC LIMIT 10;
\echo '=== Q5'
EXPLAIN (ANALYZE, COSTS OFF, SUMMARY ON) SELECT count(*) FROM tasks_task WHERE due_date < CURRENT_DATE AND NOT status = 'completed';
ROLLBACK;
