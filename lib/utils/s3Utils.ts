/**
 * Construct S3 URL for a problem image using its UUID
 */
export function getProblemImageUrl(problemId: string): string {
  const bucketName = process.env.NEXT_PUBLIC_S3_BUCKET_NAME;
  const region = process.env.NEXT_PUBLIC_AWS_REGION || 'us-east-1';
  
  if (!bucketName) {
    console.warn('NEXT_PUBLIC_S3_BUCKET_NAME environment variable not set. Using placeholder image.');
    throw new Error('S3 configuration missing. Please set NEXT_PUBLIC_S3_BUCKET_NAME in your .env.local file. See ENVIRONMENT_SETUP.md for details.');
  }
  
  return `https://${bucketName}.s3.${region}.amazonaws.com/problems/${problemId}.png`;
}


/**
 * Get the S3 bucket name from environment variables
 */
export function getS3BucketName(): string {
  const bucketName = process.env.NEXT_PUBLIC_S3_BUCKET_NAME;
  if (!bucketName) {
    throw new Error('NEXT_PUBLIC_S3_BUCKET_NAME environment variable not set');
  }
  return bucketName;
}

/**
 * Check if S3 is properly configured
 */
export function isS3Configured(): boolean {
  return !!process.env.NEXT_PUBLIC_S3_BUCKET_NAME;
}

/**
 * Get a placeholder image URL for when S3 is not configured
 */
export function getPlaceholderImageUrl(): string {
  return '/images/minlab_logo.jpeg';
}
