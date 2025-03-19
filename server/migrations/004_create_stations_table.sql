-- Create stations table
CREATE TABLE IF NOT EXISTS stations (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    short_code VARCHAR(50) NOT NULL,
    display_order INTEGER NOT NULL DEFAULT 0,
    attributes JSONB NOT NULL DEFAULT '{
        "maxEmployees": 1,
        "color": "#808080",
        "requiresCertification": [],
        "overlapAllowed": false
    }'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create index on display_order for faster sorting
CREATE INDEX IF NOT EXISTS stations_display_order_idx ON stations(display_order);

-- Create unique index on short_code to prevent duplicates
CREATE UNIQUE INDEX IF NOT EXISTS stations_short_code_idx ON stations(short_code);

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_stations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_stations_updated_at
    BEFORE UPDATE ON stations
    FOR EACH ROW
    EXECUTE FUNCTION update_stations_updated_at(); 