require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

// Configuration  
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Initialize client
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function checkCurrentConstraints() {
  console.log('🔍 Checking current foreign key constraints...');
  
  // Query to get current foreign key constraint details
  const { data, error } = await supabase.rpc('sql', {
    query: `
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
    `
  });
  
  if (error) {
    console.log('Error checking constraints:', error);
    return null;
  }
  
  if (data && data.length > 0) {
    const constraint = data[0];
    console.log('✅ Found foreign key constraint:');
    console.log(`  - Constraint name: ${constraint.constraint_name}`);
    console.log(`  - Delete rule: ${constraint.delete_rule}`);
    console.log(`  - References: ${constraint.foreign_table_name}(${constraint.foreign_column_name})`);
    
    return constraint;
  } else {
    console.log('❌ No foreign key constraint found for problem_subjects.problem_id');
    return null;
  }
}

async function addCascadeDelete(constraintName) {
  console.log('🔧 Adding CASCADE DELETE constraint...');
  
  const sql = `
    BEGIN;
    
    -- Drop existing constraint
    ALTER TABLE problem_subjects 
    DROP CONSTRAINT IF EXISTS ${constraintName};
    
    -- Add new constraint with CASCADE DELETE
    ALTER TABLE problem_subjects 
    ADD CONSTRAINT ${constraintName}
    FOREIGN KEY (problem_id) 
    REFERENCES problems(id) 
    ON DELETE CASCADE;
    
    COMMIT;
  `;
  
  const { data, error } = await supabase.rpc('sql', { query: sql });
  
  if (error) {
    console.log('❌ Error adding CASCADE DELETE:', error);
    throw error;
  }
  
  console.log('✅ CASCADE DELETE constraint added successfully');
  return data;
}

async function verifyConstraint() {
  console.log('🔍 Verifying new constraint...');
  
  const constraint = await checkCurrentConstraints();
  
  if (constraint && constraint.delete_rule === 'CASCADE') {
    console.log('🎉 SUCCESS: CASCADE DELETE is now active!');
    return true;
  } else {
    console.log('⚠️ WARNING: CASCADE DELETE may not be active');
    return false;
  }
}

async function main() {
  try {
    console.log('🚀 Setting up CASCADE DELETE for problem_subjects...\n');
    
    // 1. Check current constraints
    const currentConstraint = await checkCurrentConstraints();
    
    if (!currentConstraint) {
      console.log('❌ Cannot proceed: No existing foreign key constraint found');
      return;
    }
    
    // 2. Check if CASCADE DELETE is already enabled
    if (currentConstraint.delete_rule === 'CASCADE') {
      console.log('✅ CASCADE DELETE is already enabled! No changes needed.');
      return;
    }
    
    // 3. Add CASCADE DELETE
    console.log(`\n🔧 Current delete rule: ${currentConstraint.delete_rule}`);
    console.log('🔧 Updating to CASCADE DELETE...\n');
    
    await addCascadeDelete(currentConstraint.constraint_name);
    
    // 4. Verify the change
    await verifyConstraint();
    
    console.log('\n🎉 Setup completed! You can now delete problems and their relationships will be automatically removed.');
    
  } catch (error) {
    console.error('❌ Setup failed:', error.message);
    process.exit(1);
  }
}

// Run the script
if (require.main === module) {
  main();
}

module.exports = { checkCurrentConstraints, addCascadeDelete, verifyConstraint };