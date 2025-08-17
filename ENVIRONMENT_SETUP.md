# Environment Setup for Database and S3 Migration

## Required Environment Variables

Create a `.env.local` file in the root directory with the following variables:

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url_here
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here

# AWS S3 Configuration (for public URLs)
NEXT_PUBLIC_S3_BUCKET_NAME=your_s3_bucket_name_here
NEXT_PUBLIC_AWS_REGION=us-east-1
```

## How to Get These Values

### Supabase
1. Go to your Supabase project dashboard
2. Navigate to Settings > API
3. Copy the "Project URL" and "anon public" key

### AWS S3
1. Go to AWS S3 Console
2. Note your bucket name
3. Ensure your bucket is configured for public read access

## Migration Status

✅ **Database Migration Complete**
- All 69 problems uploaded to Supabase
- All 147 problem-subject relationships created
- UUIDs generated for all problems

✅ **S3 Migration Complete**
- All 69 images uploaded to AWS S3
- Images named using problem UUIDs
- URLs follow pattern: `https://bucket.s3.region.amazonaws.com/problems/{uuid}.png`

✅ **Code Migration Complete**
- `useProblems` hook replaces `useProblemMetadata`
- S3 URL construction utility created
- All components updated to use database data
- PDF generation updated for S3 URLs

## Testing

1. Set up environment variables
2. Run `npm run dev`
3. Navigate to `/build` to test problem loading
4. Navigate to `/configure` to test PDF generation

## S3 Requirement

The application now **requires** S3 environment variables to be set:
- `NEXT_PUBLIC_S3_BUCKET_NAME` must be configured
- `NEXT_PUBLIC_AWS_REGION` must be configured
- No fallback to local files
- Application will throw an error if S3 is not configured
