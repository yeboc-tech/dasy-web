-- Add problem_code column to problems table
-- Nullable and no unique constraint for now - can add constraints later once data is validated
-- All values will be NULL initially

ALTER TABLE problems ADD COLUMN problem_code VARCHAR(100);

-- Add index for performance (even without unique constraint)
CREATE INDEX idx_problems_code ON problems(problem_code);

-- Comment
COMMENT ON COLUMN problems.problem_code IS 'Natural key for problem identification (e.g., 경제_고3_2018_04_학평_10_문제)';
