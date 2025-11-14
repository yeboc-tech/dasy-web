/**
 * CDN base URL for economy problems
 */
const CDN_BASE_URL = 'https://cdn.y3c.kr/tongkidari/contents';

/**
 * Construct S3 URL for a problem image using its UUID
 * For economy problems (format: 경제_고3_2024_03_학평_1_문제), uses CDN URL
 */
export function getProblemImageUrl(problemId: string): string {
  // Check if this is an economy problem (starts with "경제_")
  if (problemId.startsWith('경제_')) {
    // Economy problems are stored on CDN (used as fallback when not in DB)
    // Don't encode here - Next.js Image component will handle encoding
    return `${CDN_BASE_URL}/${problemId}.png`;
  }

  // Regular problems use S3
  const bucketName = process.env.NEXT_PUBLIC_S3_BUCKET_NAME;
  const region = process.env.NEXT_PUBLIC_AWS_REGION || 'us-east-1';

  if (!bucketName) {
    console.warn('NEXT_PUBLIC_S3_BUCKET_NAME environment variable not set. Using placeholder image.');
    throw new Error('S3 configuration missing. Please set NEXT_PUBLIC_S3_BUCKET_NAME in your .env.local file. See ENVIRONMENT_SETUP.md for details.');
  }

  return `https://${bucketName}.s3.${region}.amazonaws.com/problems/${problemId}.png`;
}

/**
 * Construct S3 URL for an answer image using its UUID
 * For economy problems (format: 경제_고3_2024_03_학평_1_문제), uses CDN URL with _해설
 */
export function getAnswerImageUrl(problemId: string): string {
  // Check if this is an economy problem (starts with "경제_")
  if (problemId.startsWith('경제_')) {
    // Replace _문제 with _해설 for economy answer images
    const answerId = problemId.replace('_문제', '_해설');
    // Economy problems are stored on CDN (used as fallback when not in DB)
    // Don't encode here - Next.js Image component will handle encoding
    return `${CDN_BASE_URL}/${answerId}.png`;
  }

  // Regular problems use S3
  const bucketName = process.env.NEXT_PUBLIC_S3_BUCKET_NAME;
  const region = process.env.NEXT_PUBLIC_AWS_REGION || 'us-east-1';

  if (!bucketName) {
    console.warn('NEXT_PUBLIC_S3_BUCKET_NAME environment variable not set. Using placeholder image.');
    throw new Error('S3 configuration missing. Please set NEXT_PUBLIC_S3_BUCKET_NAME in your .env.local file. See ENVIRONMENT_SETUP.md for details.');
  }

  return `https://${bucketName}.s3.${region}.amazonaws.com/answers/${problemId}.png`;
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
