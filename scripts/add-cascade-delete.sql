-- Add CASCADE DELETE to problem_subjects foreign key constraint
-- This will automatically delete problem_subjects entries when a problem is deleted

-- First, we need to drop the existing foreign key constraint
-- and recreate it with CASCADE DELETE

BEGIN;

-- Step 1: Find the current foreign key constraint name
-- (We'll assume it's named something like 'problem_subjects_problem_id_fkey')
-- If this fails, we'll need to check the actual constraint name

-- Step 2: Drop the existing foreign key constraint
ALTER TABLE problem_subjects 
DROP CONSTRAINT IF EXISTS problem_subjects_problem_id_fkey;

-- Step 3: Add the new foreign key constraint with CASCADE DELETE
ALTER TABLE problem_subjects 
ADD CONSTRAINT problem_subjects_problem_id_fkey 
FOREIGN KEY (problem_id) 
REFERENCES problems(id) 
ON DELETE CASCADE;

-- Step 4: Verify the constraint was added correctly
-- This is just a comment for manual verification:
-- You can run: \d+ problem_subjects to see the constraint details

COMMIT;

-- Test query to verify the constraint (optional):
-- SELECT 
--   tc.constraint_name,
--   tc.table_name,
--   kcu.column_name,
--   ccu.table_name AS foreign_table_name,
--   ccu.column_name AS foreign_column_name,
--   rc.delete_rule
-- FROM information_schema.table_constraints AS tc
-- JOIN information_schema.key_column_usage AS kcu
--   ON tc.constraint_name = kcu.constraint_name
-- JOIN information_schema.constraint_column_usage AS ccu
--   ON ccu.constraint_name = tc.constraint_name
-- JOIN information_schema.referential_constraints AS rc
--   ON tc.constraint_name = rc.constraint_name
-- WHERE tc.constraint_type = 'FOREIGN KEY' 
--   AND tc.table_name = 'problem_subjects'
--   AND kcu.column_name = 'problem_id';