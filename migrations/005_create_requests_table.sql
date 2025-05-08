-- Create requests table for time off/no night shift requests
CREATE TABLE IF NOT EXISTS requests (
    id SERIAL PRIMARY KEY,
    employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,
    single_or_multiple VARCHAR(16) NOT NULL CHECK (single_or_multiple IN ('single', 'multiple')),
    date DATE,
    start_date DATE,
    end_date DATE,
    note VARCHAR(120),
    status VARCHAR(16) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'denied')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_requests_employee_id ON requests(employee_id);
CREATE INDEX IF NOT EXISTS idx_requests_status ON requests(status);

-- Trigger to update updated_at on row update
CREATE OR REPLACE FUNCTION update_requests_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_requests_updated_at ON requests;
CREATE TRIGGER update_requests_updated_at
    BEFORE UPDATE ON requests
    FOR EACH ROW
    EXECUTE FUNCTION update_requests_updated_at(); 