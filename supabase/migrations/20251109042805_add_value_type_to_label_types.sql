-- Add value_type and value_constraints columns to label_types table
ALTER TABLE label_types
  ADD COLUMN value_type VARCHAR(50) DEFAULT 'categorical' NOT NULL,
  ADD COLUMN value_constraints JSONB DEFAULT '{}'::jsonb;

-- Add comment explaining the value_type field
COMMENT ON COLUMN label_types.value_type IS 'Type of values for this label type: categorical (default), numeric, numeric_range, date, etc.';
COMMENT ON COLUMN label_types.value_constraints IS 'JSONB object with constraints like {"min": 0, "max": 100, "step": 1, "unit": "%"}';

-- Update existing label types to be categorical (default is already set, but being explicit)
UPDATE label_types SET value_type = 'categorical' WHERE value_type IS NULL;
