-- Add CASCADE DELETE to problem_subjects foreign key constraint
-- Run this in Supabase SQL Editor

-- Step 1: Check current constraint (for reference)
SELECT 
  tc.constraint_name,
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name,
  rc.delete_rule
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
JOIN information_schema.referential_constraints AS rc
  ON tc.constraint_name = rc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY' 
  AND tc.table_name = 'problem_subjects'
  AND kcu.column_name = 'problem_id';

-- Step 2: Add CASCADE DELETE constraint
BEGIN;

-- Drop existing foreign key constraint (common name patterns)
ALTER TABLE problem_subjects 
DROP CONSTRAINT IF EXISTS problem_subjects_problem_id_fkey;

ALTER TABLE problem_subjects 
DROP CONSTRAINT IF EXISTS fk_problem_subjects_problem_id;

ALTER TABLE problem_subjects 
DROP CONSTRAINT IF EXISTS problem_subjects_problem_id_fk;

-- Add new constraint with CASCADE DELETE
ALTER TABLE problem_subjects 
ADD CONSTRAINT problem_subjects_problem_id_fkey 
FOREIGN KEY (problem_id) 
REFERENCES problems(id) 
ON DELETE CASCADE;

COMMIT;

-- Step 3: Verify the constraint was added correctly
SELECT 
  tc.constraint_name,
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name,
  rc.delete_rule
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
JOIN information_schema.referential_constraints AS rc
  ON tc.constraint_name = rc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY' 
  AND tc.table_name = 'problem_subjects'
  AND kcu.column_name = 'problem_id';

-- You should see delete_rule = 'CASCADE' in the result