require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

// Configuration
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Initialize client
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Add command line argument parsing for dry-run mode
const DRY_RUN = process.argv.includes('--dry-run');

async function findDummyProblems() {
  console.log('🔍 Finding dummy problems...');
  
  // Get all problems with dummy patterns
  const { data: problems, error } = await supabase
    .from('problems')
    .select('id, filename, problem_filename, created_at')
    .like('filename', 'problem_%');
  
  if (error) {
    throw new Error(`Failed to fetch dummy problems: ${error.message}`);
  }
  
  // Filter for problems that match dummy patterns
  const dummyProblems = problems.filter(problem => {
    const filename = problem.filename || problem.problem_filename || '';
    return filename.startsWith('problem_') && filename.includes('.png');
  });
  
  console.log(`Found ${dummyProblems.length} dummy problems to remove`);
  
  return dummyProblems;
}

// CASCADE DELETE is now enabled, so we don't need this function anymore!
// Problem subjects will be automatically deleted when problems are deleted

async function removeProblems(problemIds) {
  if (problemIds.length === 0) return { count: 0 };
  
  console.log(`🗑️ Removing ${problemIds.length} dummy problems from database...`);
  console.log('💡 CASCADE DELETE will automatically remove problem_subjects relationships');
  
  if (DRY_RUN) {
    console.log('🔍 [DRY RUN] Would remove problems from database (and auto-delete relationships)');
    return { count: problemIds.length };
  }
  
  const { error, count } = await supabase
    .from('problems')
    .delete()
    .in('id', problemIds);
  
  if (error) {
    throw new Error(`Failed to remove problems: ${error.message}`);
  }
  
  console.log(`✅ Removed ${count} problems from database`);
  console.log(`✅ Problem-subject relationships automatically deleted via CASCADE`);
  return { count };
}

async function verifyCleanup() {
  console.log('🔍 Verifying cleanup...');
  
  // Count remaining problems
  const { count: totalCount, error: countError } = await supabase
    .from('problems')
    .select('*', { count: 'exact', head: true });
  
  if (countError) {
    throw new Error(`Failed to count remaining problems: ${countError.message}`);
  }
  
  // Count remaining dummy problems  
  const { count: dummyCount, error: dummyError } = await supabase
    .from('problems')
    .select('*', { count: 'exact', head: true })
    .like('filename', 'problem_%');
  
  if (dummyError) {
    throw new Error(`Failed to count remaining dummy problems: ${dummyError.message}`);
  }
  
  // Count 정법 problems
  const { count: jeongbeobCount, error: jeongbeobError } = await supabase
    .from('problems')
    .select('*', { count: 'exact', head: true })
    .like('filename', '정법%');
  
  if (jeongbeobError) {
    throw new Error(`Failed to count 정법 problems: ${jeongbeobError.message}`);
  }
  
  console.log('\\n📊 Database status after cleanup:');
  console.log(`✅ Total problems: ${totalCount}`);
  console.log(`🗑️ Remaining dummy problems: ${dummyCount}`);
  console.log(`📚 정법 problems: ${jeongbeobCount}`);
  
  if (dummyCount === 0) {
    console.log('🎉 All dummy problems successfully removed!');
  } else {
    console.log('⚠️ Some dummy problems still remain');
  }
}

async function main() {
  try {
    console.log('🚀 Starting dummy problem cleanup...');
    if (DRY_RUN) {
      console.log('🔍 [DRY RUN MODE] - No actual changes will be made\\n');
    }
    
    // 1. Find dummy problems
    const dummyProblems = await findDummyProblems();
    
    if (dummyProblems.length === 0) {
      console.log('✅ No dummy problems found. Database is already clean!');
      return;
    }
    
    // Show what will be removed
    console.log('\\n🗑️ Dummy problems to be removed:');
    dummyProblems.slice(0, 5).forEach(p => {
      console.log(`  - ${p.id}: ${p.filename} (created: ${p.created_at})`);
    });
    if (dummyProblems.length > 5) {
      console.log(`  ... and ${dummyProblems.length - 5} more`);
    }
    
    const problemIds = dummyProblems.map(p => p.id);
    
    // 2. Remove problems (CASCADE DELETE will handle relationships automatically)
    await removeProblems(problemIds);
    
    // 4. Verify cleanup
    if (!DRY_RUN) {
      await verifyCleanup();
    }
    
    console.log('\\n🎉 Cleanup completed successfully!');
    
  } catch (error) {
    console.error('❌ Cleanup failed:', error.message);
    process.exit(1);
  }
}

// Run the script
if (require.main === module) {
  main();
}

module.exports = { main, findDummyProblems, removeProblems };