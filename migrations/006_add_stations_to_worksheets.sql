-- Add stations column to worksheets table
ALTER TABLE worksheets
ADD COLUMN IF NOT EXISTS stations JSONB DEFAULT '[]'::jsonb;

-- Update any existing records to have an empty array if stations is null
UPDATE worksheets
SET stations = '[]'::jsonb
WHERE stations IS NULL; 