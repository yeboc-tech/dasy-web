-- Simple CASCADE DELETE setup
-- Drop and recreate the foreign key with CASCADE DELETE

ALTER TABLE problem_subjects 
DROP CONSTRAINT problem_subjects_problem_id_fkey;

ALTER TABLE problem_subjects 
ADD CONSTRAINT problem_subjects_problem_id_fkey 
FOREIGN KEY (problem_id) REFERENCES problems(id) ON DELETE CASCADE;