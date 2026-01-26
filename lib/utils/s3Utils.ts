/**
 * CDN base URL
 */
const CDN_BASE = 'https://cdn.y3c.kr';

/**
 * CDN base URL for tagged subject problems
 */
const CDN_BASE_URL = `${CDN_BASE}/tongkidari/contents`;

/**
 * Construct full CDN URL from a path
 */
export function getCdnUrl(path: string): string {
  return `${CDN_BASE}/${path}`;
}

/**
 * Tagged subject prefixes that use CDN storage
 */
const TAGGED_SUBJECT_PREFIXES = ['경제_', '사회문화_', '생활과윤리_', '정치와법_', '세계사_', '세계지리_', '한국지리_', '윤리와사상_', '동아시아사_'];

/**
 * Check if a problem ID is from a tagged subject
 */
function isTaggedProblem(problemId: string): boolean {
  return TAGGED_SUBJECT_PREFIXES.some(prefix => problemId.startsWith(prefix));
}

/**
 * Construct S3 URL for a problem image using its UUID
 * For tagged problems (format: {subject}_고3_2024_03_학평_1_문제), uses CDN URL
 */
export function getProblemImageUrl(problemId: string): string {
  // Check if this is a tagged problem (경제, 사회문화, 생활과윤리, etc.)
  if (isTaggedProblem(problemId)) {
    // Tagged problems are stored on CDN (used as fallback when not in DB)
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
 * For tagged problems (format: {subject}_고3_2024_03_학평_1_문제), uses CDN URL with _해설
 */
export function getAnswerImageUrl(problemId: string): string {
  // Check if this is a tagged problem (경제, 사회문화, 생활과윤리, etc.)
  if (isTaggedProblem(problemId)) {
    // Replace _문제 with _해설 for tagged answer images
    const answerId = problemId.replace('_문제', '_해설');
    // Tagged problems are stored on CDN (used as fallback when not in DB)
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
