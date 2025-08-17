#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const envTemplate = `# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url_here
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here

# AWS S3 Configuration (for public URLs)
NEXT_PUBLIC_S3_BUCKET_NAME=your_s3_bucket_name_here
NEXT_PUBLIC_AWS_REGION=us-east-1

# Copy this file to .env.local and fill in your actual values
# See ENVIRONMENT_SETUP.md for detailed instructions
`;

const envPath = path.join(process.cwd(), '.env.local');

console.log('🚀 Setting up environment variables...\n');

if (fs.existsSync(envPath)) {
  console.log('⚠️  .env.local already exists. Skipping creation.');
  console.log('   If you need to reset it, delete the file and run this script again.\n');
} else {
  try {
    fs.writeFileSync(envPath, envTemplate);
    console.log('✅ Created .env.local file');
    console.log('📝 Please edit .env.local and add your actual values:');
    console.log('   - NEXT_PUBLIC_SUPABASE_URL');
    console.log('   - NEXT_PUBLIC_SUPABASE_ANON_KEY');
    console.log('   - NEXT_PUBLIC_S3_BUCKET_NAME');
    console.log('   - NEXT_PUBLIC_AWS_REGION');
    console.log('\n📖 See ENVIRONMENT_SETUP.md for detailed instructions\n');
  } catch (error) {
    console.error('❌ Failed to create .env.local:', error.message);
    process.exit(1);
  }
}

console.log('🔗 Next steps:');
console.log('   1. Get your Supabase credentials from your project dashboard');
console.log('   2. Set up an AWS S3 bucket for image storage');
console.log('   3. Update .env.local with your actual values');
console.log('   4. Run "npm run dev" to start the development server\n');
