-- Add correct_rate column to problems table
ALTER TABLE problems 
ADD COLUMN IF NOT EXISTS correct_rate INTEGER;

-- Add a comment to describe the column
COMMENT ON COLUMN problems.correct_rate IS 'Correct rate percentage (0-100)';