-- Migration: Add created_at and updated_at columns to problems table
-- Run this in your Supabase dashboard SQL editor

-- Add created_at and updated_at columns to problems table
ALTER TABLE problems 
ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Create a trigger to automatically update updated_at on row changes
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_problems_updated_at 
    BEFORE UPDATE ON problems 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Add comments for documentation
COMMENT ON COLUMN problems.created_at IS 'Timestamp when the problem was created';
COMMENT ON COLUMN problems.updated_at IS 'Timestamp when the problem was last updated';

-- Verify the changes
SELECT 
  column_name, 
  data_type, 
  is_nullable, 
  column_default
FROM information_schema.columns 
WHERE table_name = 'problems' 
AND table_schema = 'public'
ORDER BY ordinal_position;
