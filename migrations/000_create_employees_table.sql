-- Create employees table if it doesn't exist
CREATE TABLE IF NOT EXISTS employees (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    role VARCHAR(50) NOT NULL,
    phone VARCHAR(50),
    username VARCHAR(255) NOT NULL UNIQUE,
    password TEXT,
    column_preferences JSONB DEFAULT '{
        "visibleColumns": ["id", "role", "phone", "username", "name", "email"],
        "columnOrder": ["name", "email", "role", "username", "phone", "id"]
    }'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX IF NOT EXISTS employees_role_idx ON employees(role);
CREATE INDEX IF NOT EXISTS employees_email_idx ON employees(email);
CREATE INDEX IF NOT EXISTS employees_username_idx ON employees(username);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_employees_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_employees_timestamp ON employees;
CREATE TRIGGER update_employees_timestamp
    BEFORE UPDATE ON employees
    FOR EACH ROW
    EXECUTE FUNCTION update_employees_timestamp(); 