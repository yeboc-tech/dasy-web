require('dotenv').config();
const fs = require('fs');
const path = require('path');
const AWS = require('aws-sdk');

// Configuration
const AWS_ACCESS_KEY_ID = process.env.AWS_ACCESS_KEY_ID;
const AWS_SECRET_ACCESS_KEY = process.env.AWS_SECRET_ACCESS_KEY;
const AWS_REGION = process.env.NEXT_PUBLIC_AWS_REGION || process.env.AWS_REGION || 'ap-northeast-2';
const S3_BUCKET = process.env.NEXT_PUBLIC_S3_BUCKET_NAME || process.env.S3_BUCKET_NAME;

// Initialize S3 client
const s3 = new AWS.S3({
  accessKeyId: AWS_ACCESS_KEY_ID,
  secretAccessKey: AWS_SECRET_ACCESS_KEY,
  region: AWS_REGION
});

async function uploadMissingAnswer() {
  try {
    console.log('🚀 Uploading missing answer image for 정법267...');
    
    const problemUUID = '7e87de04-ccf1-4270-a137-dfacec715fb6';
    const localFilePath = '/Users/joonnam/Workspace/dasy-web/public/data/정법267-a.png';
    const s3Key = `answers/${problemUUID}.png`;
    
    // Check if file exists
    if (!fs.existsSync(localFilePath)) {
      throw new Error(`File not found: ${localFilePath}`);
    }
    
    console.log(`📁 Reading file: ${localFilePath}`);
    const fileContent = fs.readFileSync(localFilePath);
    
    const params = {
      Bucket: S3_BUCKET,
      Key: s3Key,
      Body: fileContent,
      ContentType: 'image/png'
    };
    
    console.log(`☁️ Uploading to S3: ${s3Key}`);
    const result = await s3.upload(params).promise();
    
    console.log(`✅ Successfully uploaded: ${result.Location}`);
    console.log(`🎉 Missing answer image uploaded successfully!`);
    
  } catch (error) {
    console.error('❌ Upload failed:', error.message);
    process.exit(1);
  }
}

// Run the script
if (require.main === module) {
  uploadMissingAnswer();
}

module.exports = { uploadMissingAnswer };