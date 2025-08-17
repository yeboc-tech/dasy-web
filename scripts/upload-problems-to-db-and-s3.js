require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const AWS = require('aws-sdk');

// Configuration
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY; // Use anon key for operations
const AWS_ACCESS_KEY_ID = process.env.AWS_ACCESS_KEY_ID;
const AWS_SECRET_ACCESS_KEY = process.env.AWS_SECRET_ACCESS_KEY;
const AWS_REGION = process.env.AWS_REGION || 'us-east-1';
const S3_BUCKET = process.env.S3_BUCKET_NAME;

// Initialize clients
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const s3 = new AWS.S3({
  accessKeyId: AWS_ACCESS_KEY_ID,
  secretAccessKey: AWS_SECRET_ACCESS_KEY,
  region: AWS_REGION
});

// Paths
const PROBLEMS_DIR = path.join(__dirname, '../public/dummies');
const METADATA_FILE = path.join(__dirname, '../public/dummies/problems-metadata.json');

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
    console.log(`\n🔄 Processing problem ${index + 1}/69: ${problem.filename}`);
    
    // 1. Check if problem already exists in database
    const { data: existingProblem, error: checkError } = await supabase
      .from('problems')
      .select('id, filename')
      .eq('filename', problem.filename)
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
        chapter_id: problem.chapter_id,
        difficulty: problem.difficulty,
        problem_type: problem.problem_type,
        created_at: problem.created_at,
        updated_at: problem.updated_at
      };

      // 3. Insert into database to get the real UUID
      const insertedProblem = await insertProblemToDatabase(dbData);
      problemId = insertedProblem.id; // This is the real Supabase UUID
    }
    
    // 4. Upload image to S3 using the real UUID
    const imagePath = path.join(PROBLEMS_DIR, problem.filename);
    const s3Key = `problems/${problemId}.png`; // Use real UUID for S3 key
    
    if (!fs.existsSync(imagePath)) {
      throw new Error(`Image file not found: ${imagePath}`);
    }

    // 5. Upload to S3
    const s3Url = await uploadImageToS3(imagePath, s3Key);
    
    // Note: S3 URL is constructed from UUID, so no need to store it separately
    // URL format: https://bucket.s3.region.amazonaws.com/problems/{uuid}.png

    // 6. Insert problem-subject relationships (tags) - only if not already existing
    if (problem.tags && problem.tags.length > 0) {
      await insertProblemSubjects(problemId, problem.tags);
    }
    
    console.log(`✅ Completed problem ${problemId}: ${problem.filename} -> ${s3Key}`);
    
    return {
      problemId,
      filename: problem.filename,
      s3Key,
      chapterId: problem.chapter_id,
      subjectCount: problem.tags ? problem.tags.length : 0
    };
    
  } catch (error) {
    console.error(`❌ Failed to process problem ${problem.filename}:`, error);
    throw error;
  }
}

async function main() {
  try {
    console.log('🚀 Starting problem upload to database and S3...');
    console.log('📊 Loading metadata...');
    
    // Validate environment variables
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      throw new Error('Missing Supabase environment variables');
    }
    
    if (!AWS_ACCESS_KEY_ID || !AWS_SECRET_ACCESS_KEY || !S3_BUCKET) {
      throw new Error('Missing AWS environment variables');
    }
    
    // Load metadata
    const metadata = await loadMetadata();
    const problems = metadata.problems;
    
    if (!problems || problems.length === 0) {
      throw new Error('No problems found in metadata');
    }
    
    console.log(`📋 Found ${problems.length} problems to process`);
    
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
      console.log('\n📋 Successfully uploaded problems:');
      results.forEach((result, index) => {
        console.log(`${index + 1}. ${result.filename} -> ${result.s3Key} (${result.subjectCount} subjects)`);
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
