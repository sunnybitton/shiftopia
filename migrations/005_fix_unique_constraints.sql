-- Drop existing unique constraints
DROP INDEX IF EXISTS employees_email_idx;
DROP INDEX IF EXISTS employees_username_idx;

-- Add new unique constraints that only apply to active records
CREATE UNIQUE INDEX employees_email_unique ON employees(email);
CREATE UNIQUE INDEX employees_username_unique ON employees(username); 