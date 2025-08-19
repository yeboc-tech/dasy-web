require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const AWS = require('aws-sdk');

// Add command line argument parsing for dry-run mode
const DRY_RUN = process.argv.includes('--dry-run');

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

async function getCurrentProblemUUIDs() {
  console.log('🔍 Fetching current problem UUIDs from database...');
  
  const { data: problems, error } = await supabase
    .from('problems')
    .select('id');
    
  if (error) {
    throw new Error(`Failed to fetch problem UUIDs: ${error.message}`);
  }
  
  const uuids = problems.map(p => p.id);
  console.log(`✅ Found ${uuids.length} current problem UUIDs in database`);
  
  return new Set(uuids);
}

async function listS3Objects(prefix) {
  console.log(`🔍 Listing S3 objects with prefix: ${prefix}`);
  
  const params = {
    Bucket: S3_BUCKET,
    Prefix: prefix
  };
  
  try {
    const result = await s3.listObjectsV2(params).promise();
    const keys = result.Contents ? result.Contents.map(obj => obj.Key) : [];
    console.log(`✅ Found ${keys.length} objects in S3 with prefix: ${prefix}`);
    return keys;
  } catch (error) {
    throw new Error(`Failed to list S3 objects: ${error.message}`);
  }
}

function extractUUIDFromS3Key(key) {
  // Extract UUID from keys like "problems/uuid.png" or "answers/uuid.png"
  const match = key.match(/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/);
  return match ? match[0] : null;
}

async function deleteS3Objects(keys) {
  if (keys.length === 0) {
    console.log('✅ No objects to delete');
    return;
  }
  
  console.log(`🗑️ Deleting ${keys.length} orphaned objects from S3...`);
  
  if (DRY_RUN) {
    console.log('🔍 [DRY RUN] Would delete the following objects:');
    keys.forEach(key => console.log(`  - ${key}`));
    return;
  }
  
  // Delete objects in batches of 1000 (AWS limit)
  const batchSize = 1000;
  let totalDeleted = 0;
  
  for (let i = 0; i < keys.length; i += batchSize) {
    const batch = keys.slice(i, i + batchSize);
    
    const deleteParams = {
      Bucket: S3_BUCKET,
      Delete: {
        Objects: batch.map(key => ({ Key: key })),
        Quiet: false
      }
    };
    
    try {
      const result = await s3.deleteObjects(deleteParams).promise();
      const deletedCount = result.Deleted ? result.Deleted.length : 0;
      totalDeleted += deletedCount;
      
      console.log(`✅ Deleted batch ${Math.ceil((i + 1) / batchSize)}: ${deletedCount} objects`);
      
      if (result.Errors && result.Errors.length > 0) {
        console.warn(`⚠️ Errors in batch ${Math.ceil((i + 1) / batchSize)}:`);
        result.Errors.forEach(error => {
          console.warn(`  - ${error.Key}: ${error.Code} - ${error.Message}`);
        });
      }
    } catch (error) {
      console.error(`❌ Failed to delete batch ${Math.ceil((i + 1) / batchSize)}:`, error.message);
    }
  }
  
  console.log(`✅ Total deleted: ${totalDeleted} objects`);
}

async function cleanupOrphanedImages() {
  try {
    console.log('🚀 Starting S3 orphaned image cleanup...');
    if (DRY_RUN) {
      console.log('🔍 [DRY RUN MODE] - No actual deletions will be performed\n');
    }
    
    // 1. Get current problem UUIDs from database
    const currentUUIDs = await getCurrentProblemUUIDs();
    
    // 2. List all problem images in S3
    const problemKeys = await listS3Objects('problems/');
    
    // 3. List all answer images in S3
    const answerKeys = await listS3Objects('answers/');
    
    // 4. Find orphaned problem images
    const orphanedProblemKeys = problemKeys.filter(key => {
      const uuid = extractUUIDFromS3Key(key);
      return uuid && !currentUUIDs.has(uuid);
    });
    
    // 5. Find orphaned answer images
    const orphanedAnswerKeys = answerKeys.filter(key => {
      const uuid = extractUUIDFromS3Key(key);
      return uuid && !currentUUIDs.has(uuid);
    });
    
    // 6. Combine all orphaned keys
    const allOrphanedKeys = [...orphanedProblemKeys, ...orphanedAnswerKeys];
    
    console.log('\n📊 Cleanup Summary:');
    console.log(`🔍 Total problem images in S3: ${problemKeys.length}`);
    console.log(`🔍 Total answer images in S3: ${answerKeys.length}`);
    console.log(`🗑️ Orphaned problem images: ${orphanedProblemKeys.length}`);
    console.log(`🗑️ Orphaned answer images: ${orphanedAnswerKeys.length}`);
    console.log(`🗑️ Total orphaned images: ${allOrphanedKeys.length}`);
    
    if (allOrphanedKeys.length > 0) {
      console.log('\n🗑️ Orphaned images to be deleted:');
      allOrphanedKeys.slice(0, 10).forEach(key => console.log(`  - ${key}`));
      if (allOrphanedKeys.length > 10) {
        console.log(`  ... and ${allOrphanedKeys.length - 10} more`);
      }
      
      // 7. Delete orphaned images
      await deleteS3Objects(allOrphanedKeys);
    } else {
      console.log('\n✅ No orphaned images found. S3 bucket is clean!');
    }
    
    console.log('\n🎉 S3 cleanup completed successfully!');
    
  } catch (error) {
    console.error('❌ S3 cleanup failed:', error.message);
    process.exit(1);
  }
}

// Run the script
if (require.main === module) {
  cleanupOrphanedImages();
}

module.exports = { cleanupOrphanedImages, getCurrentProblemUUIDs, listS3Objects, extractUUIDFromS3Key };