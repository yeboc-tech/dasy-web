import { NextRequest, NextResponse } from 'next/server';
import AWS from 'aws-sdk';

// S3 configuration for thumbnails
const S3_BUCKET = 'cdn.y3c.kr';
const S3_REGION = 'ap-northeast-2';
const THUMBNAIL_PATH = 'tongkidari/worksheets/thumbnails';
const CDN_BASE_URL = 'https://cdn.y3c.kr';

// Initialize S3 client
const s3 = new AWS.S3({
  region: S3_REGION,
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
});

/**
 * Upload a thumbnail image for a worksheet
 * POST /api/worksheets/[id]/thumbnail
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: worksheetId } = await params;

    if (!worksheetId) {
      return NextResponse.json({ error: 'Worksheet ID is required' }, { status: 400 });
    }

    // Get the form data
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Validate file type
    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: 'Only PNG and JPG files are allowed' }, { status: 400 });
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return NextResponse.json({ error: 'File size must be less than 10MB' }, { status: 400 });
    }

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Determine file extension
    const extension = file.type === 'image/png' ? 'png' : 'jpg';
    const s3Key = `${THUMBNAIL_PATH}/${worksheetId}.${extension}`;

    // Upload to S3
    await s3.putObject({
      Bucket: S3_BUCKET,
      Key: s3Key,
      Body: buffer,
      ContentType: file.type,
      CacheControl: 'max-age=31536000', // 1 year cache
    }).promise();

    // Return the path (not full URL - construct full URL in frontend)
    return NextResponse.json({
      success: true,
      thumbnailPath: s3Key
    });

  } catch (error) {
    console.error('Error uploading thumbnail:', error);
    return NextResponse.json(
      { error: 'Failed to upload thumbnail' },
      { status: 500 }
    );
  }
}

/**
 * Delete a thumbnail image for a worksheet
 * DELETE /api/worksheets/[id]/thumbnail
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: worksheetId } = await params;

    if (!worksheetId) {
      return NextResponse.json({ error: 'Worksheet ID is required' }, { status: 400 });
    }

    // Try to delete both png and jpg versions
    const extensions = ['png', 'jpg'];

    for (const ext of extensions) {
      const s3Key = `${THUMBNAIL_PATH}/${worksheetId}.${ext}`;
      try {
        await s3.deleteObject({
          Bucket: S3_BUCKET,
          Key: s3Key,
        }).promise();
      } catch {
        // Ignore errors if file doesn't exist
      }
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Error deleting thumbnail:', error);
    return NextResponse.json(
      { error: 'Failed to delete thumbnail' },
      { status: 500 }
    );
  }
}
