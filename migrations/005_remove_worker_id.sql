-- Remove worker_id column from employees table
ALTER TABLE employees DROP COLUMN IF EXISTS worker_id;

-- Remove any indexes that might have been created for this column
DROP INDEX IF EXISTS employees_worker_id_idx; 