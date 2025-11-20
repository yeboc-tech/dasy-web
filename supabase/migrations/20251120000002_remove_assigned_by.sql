-- Remove assigned_by column from problem_labels
-- We can add it back later if we need to track who assigned labels

ALTER TABLE problem_labels DROP COLUMN IF EXISTS assigned_by;
DROP INDEX IF EXISTS idx_problem_labels_assigned_by;
