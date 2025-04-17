-- Remove worker_id and active columns from employees table
ALTER TABLE employees
DROP COLUMN IF EXISTS worker_id,
DROP COLUMN IF EXISTS active;

-- Remove any indexes that might have been created for these columns
DROP INDEX IF EXISTS employees_worker_id_idx;
DROP INDEX IF EXISTS employees_active_idx; 