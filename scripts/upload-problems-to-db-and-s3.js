require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const AWS = require('aws-sdk');

// Add command line argument parsing for dry-run mode
const DRY_RUN = process.argv.includes('--dry-run');

// Configuration
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY; // Use anon key for operations
const AWS_ACCESS_KEY_ID = process.env.AWS_ACCESS_KEY_ID;
const AWS_SECRET_ACCESS_KEY = process.env.AWS_SECRET_ACCESS_KEY;
const AWS_REGION = process.env.NEXT_PUBLIC_AWS_REGION || process.env.AWS_REGION || 'ap-northeast-2';
const S3_BUCKET = process.env.NEXT_PUBLIC_S3_BUCKET_NAME || process.env.S3_BUCKET_NAME;

// Initialize clients
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const s3 = new AWS.S3({
  accessKeyId: AWS_ACCESS_KEY_ID,
  secretAccessKey: AWS_SECRET_ACCESS_KEY,
  region: AWS_REGION
});

// Paths
const PROBLEMS_DIR = path.join(__dirname, '../public/data');
const METADATA_FILE = path.join(__dirname, '../public/data/경제-problems-metadata-refined.json');

// Validation functions
async function validateEnvironment() {
  console.log('🔍 Validating environment...');
  
  const missingVars = [];
  if (!SUPABASE_URL) missingVars.push('NEXT_PUBLIC_SUPABASE_URL');
  if (!SUPABASE_ANON_KEY) missingVars.push('NEXT_PUBLIC_SUPABASE_ANON_KEY');
  if (!AWS_ACCESS_KEY_ID) missingVars.push('AWS_ACCESS_KEY_ID');
  if (!AWS_SECRET_ACCESS_KEY) missingVars.push('AWS_SECRET_ACCESS_KEY');
  if (!S3_BUCKET) missingVars.push('NEXT_PUBLIC_S3_BUCKET_NAME or S3_BUCKET_NAME');
  
  if (missingVars.length > 0) {
    throw new Error(`Missing environment variables: ${missingVars.join(', ')}`);
  }
  
  console.log('✅ Environment variables validated');
}

async function validateDatabaseConnection() {
  console.log('🔍 Testing database connection...');
  
  try {
    const { data, error } = await supabase
      .from('problems')
      .select('id')
      .limit(1);
      
    if (error) {
      throw error;
    }
    
    console.log('✅ Database connection successful');
  } catch (error) {
    throw new Error(`Database connection failed: ${error.message}`);
  }
}

async function validateChapterIds(problems) {
  console.log('🔍 Validating chapter UUIDs...');
  
  const uniqueChapterIds = [...new Set(problems.map(p => p.chapter_id))];
  
  const { data: chapters, error } = await supabase
    .from('chapters')
    .select('id, name')
    .in('id', uniqueChapterIds);
    
  if (error) {
    throw new Error(`Failed to validate chapters: ${error.message}`);
  }
  
  const foundChapterIds = chapters.map(c => c.id);
  const missingChapterIds = uniqueChapterIds.filter(id => !foundChapterIds.includes(id));
  
  if (missingChapterIds.length > 0) {
    throw new Error(`Invalid chapter UUIDs found: ${missingChapterIds.join(', ')}`);
  }
  
  console.log(`✅ All ${uniqueChapterIds.length} chapter UUIDs validated`);
  chapters.forEach(ch => console.log(`  - ${ch.id}: ${ch.name}`));
}

async function loadMetadata() {
  try {
    const metadataContent = fs.readFileSync(METADATA_FILE, 'utf8');
    return JSON.parse(metadataContent);
  } catch (error) {
    console.error('Error loading metadata:', error);
    throw error;
  }
}

async function uploadImageToS3(imagePath, s3Key) {
  try {
    if (DRY_RUN) {
      console.log(`🔍 [DRY RUN] Would upload ${path.basename(imagePath)} to S3 as ${s3Key}`);
      return `https://dry-run-url/${s3Key}`;
    }

    if (!fs.existsSync(imagePath)) {
      throw new Error(`Image file not found: ${imagePath}`);
    }

    const fileContent = fs.readFileSync(imagePath);
    
    const params = {
      Bucket: S3_BUCKET,
      Key: s3Key,
      Body: fileContent,
      ContentType: 'image/png'
      // Removed ACL as the bucket doesn't support it
    };

    const result = await s3.upload(params).promise();
    console.log(`✅ Uploaded ${path.basename(imagePath)} to S3 as ${s3Key}`);
    return result.Location; // Return the S3 URL
  } catch (error) {
    console.error(`❌ Failed to upload ${path.basename(imagePath)} to S3:`, error);
    throw error;
  }
}

async function insertProblemToDatabase(problemData) {
  try {
    if (DRY_RUN) {
      console.log(`🔍 [DRY RUN] Would insert problem to database:`, problemData.filename);
      return { 
        id: `dry-run-uuid-${Date.now()}`,
        ...problemData 
      };
    }

    const { data, error } = await supabase
      .from('problems')
      .insert([problemData])
      .select()
      .single();

    if (error) {
      console.error(`❌ Failed to insert problem:`, error);
      throw error;
    }

    console.log(`✅ Inserted problem to database with ID: ${data.id}`);
    return data;
  } catch (error) {
    console.error(`❌ Database error for problem:`, error);
    throw error;
  }
}

async function insertProblemSubjects(problemId, subjectNames) {
  try {
    if (DRY_RUN) {
      console.log(`🔍 [DRY RUN] Would insert problem-subject relationships for ${subjectNames.join(', ')}`);
      return subjectNames.map((name, index) => ({ id: `dry-run-relation-${Date.now()}-${index}` }));
    }

    // First, get the subject IDs for the given subject names
    const { data: subjects, error: subjectsError } = await supabase
      .from('subjects')
      .select('id, name')
      .in('name', subjectNames);

    if (subjectsError) {
      console.error(`❌ Failed to fetch subjects:`, subjectsError);
      throw subjectsError;
    }

    if (subjects.length === 0) {
      console.warn(`⚠️ No subjects found for names: ${subjectNames.join(', ')}`);
      return [];
    }

    // Check if problem-subject relationships already exist
    const { data: existingRelations, error: checkError } = await supabase
      .from('problem_subjects')
      .select('subject_id')
      .eq('problem_id', problemId);

    if (checkError) {
      console.error(`❌ Failed to check existing problem subjects:`, checkError);
      throw checkError;
    }

    // Filter out subjects that are already linked
    const existingSubjectIds = existingRelations.map(rel => rel.subject_id);
    const newSubjects = subjects.filter(subject => !existingSubjectIds.includes(subject.id));

    if (newSubjects.length === 0) {
      console.log(`✅ All subject relationships already exist for problem ${problemId}`);
      return existingRelations;
    }

    // Create problem_subjects records for new relationships only
    const problemSubjects = newSubjects.map(subject => ({
      problem_id: problemId,
      subject_id: subject.id
    }));

    const { data, error } = await supabase
      .from('problem_subjects')
      .insert(problemSubjects)
      .select();

    if (error) {
      console.error(`❌ Failed to insert problem subjects:`, error);
      throw error;
    }

    console.log(`✅ Inserted ${data.length} new problem-subject relationships for problem ${problemId}`);
    return data;
  } catch (error) {
    console.error(`❌ Error inserting problem subjects for ${problemId}:`, error);
    throw error;
  }
}

async function processProblem(problem, index) {
  try {
    console.log(`\n🔄 Processing problem ${index + 1}: ${problem.filename}`);
    
    // 1. Check if problem already exists in database
    const { data: existingProblem, error: checkError } = await supabase
      .from('problems')
      .select('id, problem_filename')
      .eq('problem_filename', problem.filename)
      .single();

    if (checkError && checkError.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error(`❌ Error checking for existing problem:`, checkError);
      throw checkError;
    }

    let problemId;
    if (existingProblem) {
      console.log(`✅ Problem ${problem.filename} already exists in database with ID: ${existingProblem.id}`);
      problemId = existingProblem.id;
    } else {
      // 2. Prepare database data (without ID - let Supabase generate it)
      const dbData = {
        filename: problem.filename,
        problem_filename: problem.problem_filename,
        answer_filename: problem.answer_filename,
        chapter_id: problem.chapter_id,
        difficulty: problem.difficulty,
        problem_type: problem.problem_type,
        correct_rate: problem.correct_rate,
        source: problem.source,
        tags: problem.tags,
        answer: problem.answer,
        created_at: problem.created_at,
        updated_at: problem.updated_at
      };

      // 3. Insert into database to get the real UUID
      const insertedProblem = await insertProblemToDatabase(dbData);
      problemId = insertedProblem.id; // This is the real Supabase UUID
    }
    
    // 4. Upload problem image to S3 using the real UUID
    const problemImagePath = path.join(PROBLEMS_DIR, problem.filename);
    const problemS3Key = `problems/${problemId}.png`; // Use real UUID for S3 key
    
    if (!fs.existsSync(problemImagePath)) {
      throw new Error(`Problem image file not found: ${problemImagePath}`);
    }

    // 5. Upload problem image to S3
    const problemS3Url = await uploadImageToS3(problemImagePath, problemS3Key);
    
    // 6. Upload answer image to S3 if it exists
    let answerS3Url = null;
    if (problem.answer_filename) {
      const answerImagePath = path.join(PROBLEMS_DIR, problem.answer_filename);
      const answerS3Key = `answers/${problemId}.png`; // Use real UUID for answer S3 key
      
      if (fs.existsSync(answerImagePath)) {
        answerS3Url = await uploadImageToS3(answerImagePath, answerS3Key);
        console.log(`✅ Uploaded answer image: ${problem.answer_filename} -> ${answerS3Key}`);
      } else {
        console.warn(`⚠️ Answer image not found: ${answerImagePath}`);
      }
    }
    
    // Note: S3 URL is constructed from UUID, so no need to store it separately
    // URL format: https://bucket.s3.region.amazonaws.com/problems/{uuid}.png

    // 7. Insert problem-subject relationships - use related_subjects field
    const subjectsToLink = problem.related_subjects || problem.tags || [];
    if (subjectsToLink.length > 0) {
      await insertProblemSubjects(problemId, subjectsToLink);
    }
    
    console.log(`✅ Completed problem ${problemId}: ${problem.filename} -> ${problemS3Key}`);
    
    return {
      problemId,
      problem_filename: problem.filename,
      answer_filename: problem.answer_filename,
      problemS3Key,
      answerS3Key: answerS3Url ? `answers/${problemId}.png` : null,
      chapterId: problem.chapter_id,
      subjectCount: subjectsToLink.length
    };
    
  } catch (error) {
    console.error(`❌ Failed to process problem ${problem.filename}:`, error);
    throw error;
  }
}

async function main() {
  try {
    console.log('🚀 Starting economics problem upload to database and S3...');
    if (DRY_RUN) {
      console.log('🔍 [DRY RUN MODE] - No actual changes will be made');
    }
    
    // 1. Validate environment
    await validateEnvironment();
    
    // 2. Test database connection
    if (!DRY_RUN) {
      await validateDatabaseConnection();
    }
    
    // 3. Load metadata
    console.log('📊 Loading metadata...');
    const metadata = await loadMetadata();
    const problems = metadata.problems;
    
    if (!problems || problems.length === 0) {
      throw new Error('No problems found in metadata');
    }
    
    console.log(`📋 Found ${problems.length} problems to process`);
    
    // 4. Validate chapter UUIDs
    if (!DRY_RUN) {
      await validateChapterIds(problems);
    }
    
    // 5. Validate image files exist
    console.log('🔍 Validating image files...');
    const missingImages = [];
    problems.forEach(problem => {
      const problemPath = path.join(PROBLEMS_DIR, problem.filename);
      const answerPath = path.join(PROBLEMS_DIR, problem.answer_filename);
      
      if (!fs.existsSync(problemPath)) {
        missingImages.push(problem.filename);
      }
      if (problem.answer_filename && !fs.existsSync(answerPath)) {
        missingImages.push(problem.answer_filename);
      }
    });
    
    if (missingImages.length > 0) {
      console.warn(`⚠️ Missing ${missingImages.length} image files:`);
      missingImages.slice(0, 5).forEach(img => console.warn(`  - ${img}`));
      if (missingImages.length > 5) {
        console.warn(`  ... and ${missingImages.length - 5} more`);
      }
    } else {
      console.log('✅ All image files found');
    }
    
    // Process each problem
    const results = [];
    const errors = [];
    
    for (let i = 0; i < problems.length; i++) {
      try {
        const result = await processProblem(problems[i], i);
        results.push(result);
        
        // Add a small delay to avoid overwhelming the services
        await new Promise(resolve => setTimeout(resolve, 100));
        
      } catch (error) {
        errors.push({
          index: i,
          problem: problems[i],
          error: error.message
        });
        console.error(`❌ Error processing problem ${i + 1}:`, error.message);
      }
    }
    
    // Summary
    console.log('\n📊 Upload Summary:');
    console.log(`✅ Successfully processed: ${results.length} problems`);
    console.log(`❌ Errors: ${errors.length} problems`);
    
    if (results.length > 0) {
      console.log('\n📋 Successfully processed problems:');
      results.forEach((result, index) => {
        const answerInfo = result.answerS3Key ? ` + answer` : '';
        console.log(`${index + 1}. ${result.problem_filename} -> ${result.problemS3Key}${answerInfo} (${result.subjectCount} subjects)`);
      });
    }
    
    if (errors.length > 0) {
      console.log('\n❌ Failed uploads:');
      errors.forEach(error => {
        console.log(`- Problem ${error.index + 1}: ${error.problem.filename} - ${error.error}`);
      });
    }
    
    // Generate summary report
    const summary = {
      timestamp: new Date().toISOString(),
      totalProblems: problems.length,
      successful: results.length,
      failed: errors.length,
      results: results,
      errors: errors
    };
    
    const summaryFile = path.join(__dirname, 'upload-summary.json');
    fs.writeFileSync(summaryFile, JSON.stringify(summary, null, 2));
    console.log(`\n📄 Upload summary saved to: ${summaryFile}`);
    
    if (errors.length === 0) {
      console.log('\n🎉 All problems uploaded successfully!');
    } else {
      console.log(`\n⚠️  ${errors.length} problems failed to upload. Check the summary for details.`);
    }
    
  } catch (error) {
    console.error('❌ Script failed:', error);
    process.exit(1);
  }
}

// Run the script
if (require.main === module) {
  main();
}

module.exports = { main, processProblem, uploadImageToS3, insertProblemToDatabase, insertProblemSubjects };
