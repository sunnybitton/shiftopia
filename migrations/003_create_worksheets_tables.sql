-- Create worksheets table
CREATE TABLE IF NOT EXISTS worksheets (
    id SERIAL PRIMARY KEY,
    month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
    year INTEGER NOT NULL CHECK (year >= 2000),
    name VARCHAR(255) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'draft',
    created_by INTEGER REFERENCES employees(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(month, year)
);

-- Create worksheet_entries table
CREATE TABLE IF NOT EXISTS worksheet_entries (
    id SERIAL PRIMARY KEY,
    worksheet_id INTEGER REFERENCES worksheets(id) ON DELETE CASCADE,
    day INTEGER NOT NULL CHECK (day >= 1 AND day <= 31),
    workstation VARCHAR(255) NOT NULL,
    employee_assigned VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(worksheet_id, day, workstation)
);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for both tables
DROP TRIGGER IF EXISTS update_worksheets_timestamp ON worksheets;
CREATE TRIGGER update_worksheets_timestamp
    BEFORE UPDATE ON worksheets
    FOR EACH ROW
    EXECUTE FUNCTION update_timestamp();

DROP TRIGGER IF EXISTS update_worksheet_entries_timestamp ON worksheet_entries;
CREATE TRIGGER update_worksheet_entries_timestamp
    BEFORE UPDATE ON worksheet_entries
    FOR EACH ROW
    EXECUTE FUNCTION update_timestamp(); 