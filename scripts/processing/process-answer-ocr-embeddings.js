require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const vision = require('@google-cloud/vision');
const OpenAI = require('openai');
const axios = require('axios');

// Configuration
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const AWS_REGION = process.env.NEXT_PUBLIC_AWS_REGION || process.env.AWS_REGION || 'ap-northeast-2';
const S3_BUCKET = process.env.NEXT_PUBLIC_S3_BUCKET_NAME || process.env.S3_BUCKET_NAME;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// Command line arguments
const DRY_RUN = process.argv.includes('--dry-run');
const BATCH_SIZE = parseInt(process.argv.find(arg => arg.startsWith('--batch-size='))?.split('=')[1]) || 10;
const LIMIT = parseInt(process.argv.find(arg => arg.startsWith('--limit='))?.split('=')[1]) || null;

// Initialize clients
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const visionClient = new vision.ImageAnnotatorClient();
const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

// S3 URL constructor for answers (public bucket)
const getS3AnswerUrl = (problemId) => {
  return `https://${S3_BUCKET}.s3.${AWS_REGION}.amazonaws.com/answers/${problemId}.png`;
};

// Validation functions
async function validateEnvironment() {
  console.log('🔍 Validating environment...');

  const missingVars = [];
  if (!SUPABASE_URL) missingVars.push('NEXT_PUBLIC_SUPABASE_URL');
  if (!SUPABASE_ANON_KEY) missingVars.push('NEXT_PUBLIC_SUPABASE_ANON_KEY');
  if (!S3_BUCKET) missingVars.push('NEXT_PUBLIC_S3_BUCKET_NAME or S3_BUCKET_NAME');
  if (!OPENAI_API_KEY) missingVars.push('OPENAI_API_KEY');

  if (missingVars.length > 0) {
    throw new Error(`Missing environment variables: ${missingVars.join(', ')}`);
  }

  console.log('✅ Environment variables validated');
  console.log(`📊 Configuration:`);
  console.log(`   S3 Bucket: ${S3_BUCKET}`);
  console.log(`   AWS Region: ${AWS_REGION}`);
  console.log(`   Batch Size: ${BATCH_SIZE}`);
  console.log(`   Limit: ${LIMIT || 'No limit'}`);
  console.log(`   Dry Run: ${DRY_RUN ? 'Yes' : 'No'}`);
}

async function validateServices() {
  console.log('🔍 Testing service connections...');

  // Test Supabase
  try {
    const { data, error } = await supabase
      .from('problems')
      .select('id')
      .limit(1);

    if (error) throw error;
    console.log('✅ Supabase connection successful');
  } catch (error) {
    throw new Error(`Supabase connection failed: ${error.message}`);
  }

  // Test OpenAI
  try {
    const response = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: 'test',
    });
    if (!response.data || !response.data[0] || !response.data[0].embedding) {
      throw new Error('Invalid response format');
    }
    console.log('✅ OpenAI API connection successful');
    console.log(`📐 Embedding dimensions: ${response.data[0].embedding.length}`);
  } catch (error) {
    throw new Error(`OpenAI API connection failed: ${error.message}`);
  }

  // Test Google Vision (optional - will warn if not configured)
  try {
    await visionClient.textDetection('gs://cloud-samples-data/vision/text/screen.jpg');
    console.log('✅ Google Vision API connection successful');
  } catch (error) {
    console.log('⚠️  Google Vision API test failed (will continue anyway):', error.message);
  }
}

// Core processing functions
async function fetchAnswersToProcess() {
  console.log('📊 Fetching answers that need processing...');

  let query = supabase
    .from('problems')
    .select('id, answer_filename, answer_text, answer_embedding')
    .not('answer_filename', 'is', null) // Only problems that have answer files
    .or('answer_text.is.null,answer_embedding.is.null');

  if (LIMIT) {
    query = query.limit(LIMIT);
  }

  const { data: problems, error } = await query;

  if (error) {
    throw new Error(`Failed to fetch problems with answers: ${error.message}`);
  }

  console.log(`📋 Found ${problems.length} answers to process`);

  // Categorize answers
  const needsOCR = problems.filter(p => !p.answer_text);
  const needsEmbedding = problems.filter(p => p.answer_text && !p.answer_embedding);
  const needsBoth = problems.filter(p => !p.answer_text && !p.answer_embedding);

  console.log(`   - Needs OCR only: ${needsOCR.length - needsBoth.length}`);
  console.log(`   - Needs embeddings only: ${needsEmbedding.length}`);
  console.log(`   - Needs both: ${needsBoth.length}`);

  return problems;
}

async function performAnswerOCR(imageUrl, problemId) {
  console.log(`🔍 Running OCR for answer ${problemId}...`);

  if (DRY_RUN) {
    return 'Sample answer OCR text for dry run mode';
  }

  try {
    // First, check if image is accessible
    const response = await axios.head(imageUrl);
    if (response.status !== 200) {
      throw new Error(`Answer image not accessible: HTTP ${response.status}`);
    }

    // Perform OCR using Google Vision
    const [result] = await visionClient.textDetection(imageUrl);
    const detections = result.textAnnotations;

    if (!detections || detections.length === 0) {
      console.log(`⚠️  No text detected in answer image for problem ${problemId}`);
      return '';
    }

    // First annotation contains all text
    const extractedText = detections[0].description || '';

    console.log(`✅ Answer OCR completed for problem ${problemId} (${extractedText.length} characters)`);
    return extractedText.trim();

  } catch (error) {
    console.error(`❌ Answer OCR failed for problem ${problemId}:`, error.message);
    throw error;
  }
}

async function generateAnswerEmbedding(text, problemId) {
  console.log(`🧠 Generating answer embedding for problem ${problemId}...`);

  if (DRY_RUN) {
    return Array(1536).fill(0.1); // Mock embedding
  }

  if (!text || text.trim().length === 0) {
    throw new Error('Cannot generate embedding for empty answer text');
  }

  try {
    const response = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: text,
    });

    if (!response.data || !response.data[0] || !response.data[0].embedding) {
      throw new Error('Invalid embedding response');
    }

    const embedding = response.data[0].embedding;

    console.log(`✅ Answer embedding generated for problem ${problemId} (${embedding.length} dimensions)`);
    return embedding;

  } catch (error) {
    console.error(`❌ Answer embedding generation failed for problem ${problemId}:`, error.message);
    throw error;
  }
}

async function updateAnswerInDatabase(problemId, updates) {
  console.log(`💾 Updating answer data for problem ${problemId} in database...`);

  if (DRY_RUN) {
    console.log(`🔍 [DRY RUN] Would update problem ${problemId} with:`, Object.keys(updates));
    return;
  }

  try {
    const { data, error } = await supabase
      .from('problems')
      .update(updates)
      .eq('id', problemId)
      .select('id, answer_text, answer_embedding');

    if (error) {
      throw error;
    }

    console.log(`✅ Updated answer data for problem ${problemId} in database`);
    return data[0];

  } catch (error) {
    console.error(`❌ Database update failed for problem ${problemId}:`, error.message);
    throw error;
  }
}

async function processAnswer(problem) {
  const { id: problemId, answer_filename, answer_text, answer_embedding } = problem;
  const imageUrl = getS3AnswerUrl(problemId);

  console.log(`\n🔄 Processing answer for problem ${problemId} (${answer_filename})`);
  console.log(`📍 Answer Image URL: ${imageUrl}`);

  const updates = {};
  let extractedText = answer_text;

  try {
    // Step 1: OCR if needed
    if (!answer_text) {
      extractedText = await performAnswerOCR(imageUrl, problemId);
      updates.answer_text = extractedText;
    } else {
      console.log(`✅ Problem ${problemId} already has answer OCR text (${answer_text.length} characters)`);
    }

    // Step 2: Generate embedding if needed
    if (!answer_embedding && extractedText) {
      const embedding = await generateAnswerEmbedding(extractedText, problemId);
      updates.answer_embedding = embedding;
    } else if (answer_embedding) {
      console.log(`✅ Problem ${problemId} already has answer embedding`);
    } else {
      console.log(`⚠️  Cannot generate answer embedding for problem ${problemId} - no text available`);
    }

    // Step 3: Update database if we have changes
    if (Object.keys(updates).length > 0) {
      await updateAnswerInDatabase(problemId, updates);
    }

    return {
      problemId,
      success: true,
      ocrPerformed: !!updates.answer_text,
      embeddingGenerated: !!updates.answer_embedding,
      textLength: extractedText?.length || 0
    };

  } catch (error) {
    console.error(`❌ Failed to process answer for problem ${problemId}:`, error.message);
    return {
      problemId,
      success: false,
      error: error.message,
      ocrPerformed: false,
      embeddingGenerated: false,
      textLength: 0
    };
  }
}

async function processInBatches(problems, batchSize) {
  const results = [];
  const totalBatches = Math.ceil(problems.length / batchSize);

  console.log(`\n🚀 Starting batch processing: ${problems.length} answers in ${totalBatches} batches`);

  for (let i = 0; i < problems.length; i += batchSize) {
    const batch = problems.slice(i, i + batchSize);
    const batchNumber = Math.floor(i / batchSize) + 1;

    console.log(`\n📦 Processing batch ${batchNumber}/${totalBatches} (${batch.length} answers)`);

    // Process batch sequentially to avoid rate limits
    for (const problem of batch) {
      const result = await processAnswer(problem);
      results.push(result);

      // Small delay between problems to be respectful to APIs
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    // Progress update
    const completed = results.length;
    const successful = results.filter(r => r.success).length;
    console.log(`📊 Progress: ${completed}/${problems.length} processed (${successful} successful)`);

    // Longer delay between batches
    if (i + batchSize < problems.length) {
      console.log('⏳ Waiting 2 seconds before next batch...');
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  return results;
}

function generateSummaryReport(results, startTime) {
  const endTime = Date.now();
  const duration = endTime - startTime;

  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);
  const ocrPerformed = results.filter(r => r.ocrPerformed).length;
  const embeddingsGenerated = results.filter(r => r.embeddingGenerated).length;

  console.log(`\n${'='.repeat(80)}`);
  console.log('📊 ANSWER PROCESSING SUMMARY');
  console.log(`${'='.repeat(80)}`);
  console.log(`⏱️  Total duration: ${Math.round(duration / 1000)}s`);
  console.log(`📝 Total answers: ${results.length}`);
  console.log(`✅ Successful: ${successful.length}`);
  console.log(`❌ Failed: ${failed.length}`);
  console.log(`🔍 OCR performed: ${ocrPerformed}`);
  console.log(`🧠 Embeddings generated: ${embeddingsGenerated}`);

  if (failed.length > 0) {
    console.log(`\n❌ Failed answers:`);
    failed.forEach((result, index) => {
      console.log(`${index + 1}. ${result.problemId}: ${result.error}`);
    });
  }

  // Save detailed report
  const report = {
    timestamp: new Date().toISOString(),
    duration: duration,
    summary: {
      total: results.length,
      successful: successful.length,
      failed: failed.length,
      ocrPerformed,
      embeddingsGenerated
    },
    results: results
  };

  const reportPath = path.join(__dirname, `answer-ocr-embeddings-report-${Date.now()}.json`);
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`\n📄 Detailed report saved to: ${reportPath}`);

  return report;
}

async function main() {
  const startTime = Date.now();

  try {
    console.log('🚀 Starting Answer OCR + Embeddings Processing Pipeline');
    console.log(`${'='.repeat(80)}`);

    // 1. Validate environment and services
    await validateEnvironment();
    if (!DRY_RUN) {
      await validateServices();
    }

    // 2. Fetch answers to process
    const problems = await fetchAnswersToProcess();

    if (problems.length === 0) {
      console.log('🎉 No answers need processing. All done!');
      return;
    }

    // 3. Process answers in batches
    const results = await processInBatches(problems, BATCH_SIZE);

    // 4. Generate summary report
    const report = generateSummaryReport(results, startTime);

    // 5. Final status
    const successRate = (report.summary.successful / report.summary.total * 100).toFixed(1);

    if (report.summary.failed === 0) {
      console.log(`\n🎉 All ${report.summary.total} answers processed successfully!`);
    } else {
      console.log(`\n⚠️  Processing completed with ${report.summary.failed} failures (${successRate}% success rate)`);
    }

  } catch (error) {
    console.error('❌ Pipeline failed:', error);
    process.exit(1);
  }
}

// Run the script
if (require.main === module) {
  main();
}

module.exports = {
  main,
  processAnswer,
  performAnswerOCR,
  generateAnswerEmbedding,
  updateAnswerInDatabase
};