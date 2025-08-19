require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const AWS = require('aws-sdk');

// Configuration
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
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

async function findMissingAnswer() {
  try {
    console.log('🔍 Finding missing answer image...');
    
    // 1. Get all problems from database
    const { data: problems, error: dbError } = await supabase
      .from('problems')
      .select('id, filename, problem_filename, answer_filename')
      .like('filename', '정법%')
      .order('filename');
      
    if (dbError) {
      throw new Error(`Failed to fetch problems: ${dbError.message}`);
    }
    
    console.log(`✅ Found ${problems.length} problems in database`);
    
    // 2. Get all answer images from S3
    const params = {
      Bucket: S3_BUCKET,
      Prefix: 'answers/'
    };
    
    const s3Result = await s3.listObjectsV2(params).promise();
    const answerKeys = s3Result.Contents ? s3Result.Contents.map(obj => obj.Key) : [];
    
    console.log(`✅ Found ${answerKeys.length} answer images in S3`);
    
    // 3. Extract UUIDs from S3 answer keys
    const s3AnswerUUIDs = new Set();
    answerKeys.forEach(key => {
      const match = key.match(/answers\/([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})\.png/);
      if (match) {
        s3AnswerUUIDs.add(match[1]);
      }
    });
    
    // 4. Find problems that should have answers but don't have them in S3
    const problemsWithAnswers = problems.filter(p => p.answer_filename);
    const missingAnswers = [];
    
    problemsWithAnswers.forEach(problem => {
      if (!s3AnswerUUIDs.has(problem.id)) {
        missingAnswers.push(problem);
      }
    });
    
    // 5. Report results
    console.log('\n📊 Analysis Results:');
    console.log(`🔍 Total problems in database: ${problems.length}`);
    console.log(`🔍 Problems that should have answers: ${problemsWithAnswers.length}`);
    console.log(`🔍 Answer images in S3: ${answerKeys.length}`);
    console.log(`🔍 Missing answer images: ${missingAnswers.length}`);
    
    if (missingAnswers.length > 0) {
      console.log('\n❌ Missing answer images:');
      missingAnswers.forEach(problem => {
        console.log(`  - Problem: ${problem.filename} (${problem.problem_filename})`);
        console.log(`    UUID: ${problem.id}`);
        console.log(`    Expected answer: ${problem.answer_filename}`);
        console.log(`    Expected S3 key: answers/${problem.id}.png`);
        console.log('');
      });
    } else {
      console.log('\n✅ All expected answer images are present in S3!');
    }
    
    // 6. Also check for problems without answer_filename
    const problemsWithoutAnswers = problems.filter(p => !p.answer_filename);
    if (problemsWithoutAnswers.length > 0) {
      console.log(`\n📝 Problems without answer_filename in database: ${problemsWithoutAnswers.length}`);
      console.log('These problems correctly have no answer images:');
      problemsWithoutAnswers.slice(0, 5).forEach(problem => {
        console.log(`  - ${problem.filename}`);
      });
      if (problemsWithoutAnswers.length > 5) {
        console.log(`  ... and ${problemsWithoutAnswers.length - 5} more`);
      }
    }
    
  } catch (error) {
    console.error('❌ Analysis failed:', error.message);
    process.exit(1);
  }
}

// Run the script
if (require.main === module) {
  findMissingAnswer();
}

module.exports = { findMissingAnswer };