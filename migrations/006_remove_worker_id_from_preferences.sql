-- Update column preferences to remove worker_id
UPDATE employees
SET column_preferences = jsonb_build_object(
  'visibleColumns', ARRAY['id', 'role', 'phone', 'username', 'name', 'email'],
  'columnOrder', ARRAY['name', 'email', 'role', 'username', 'phone', 'id']
)::jsonb
WHERE role = 'manager'; 