import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import AWS from 'aws-sdk';

// Use Node.js runtime for larger body sizes
export const runtime = 'nodejs';

// S3 configuration
const S3_BUCKET = 'cdn.y3c.kr';
const S3_REGION = 'ap-northeast-2';
const PDF_PATH = 'tongkidari/worksheets/pdf';

// Initialize S3 client
const s3 = new AWS.S3({
  region: S3_REGION,
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
});

// Create Supabase admin client
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * Check if a cached PDF exists and is valid
 * GET /api/pdf/cached?worksheetId=xxx
 * Returns: { cached: boolean, cdnPath?: string }
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const worksheetId = searchParams.get('worksheetId');

    if (!worksheetId) {
      return NextResponse.json({ error: 'worksheetId is required' }, { status: 400 });
    }

    // Get worksheet updated_at
    const { data: worksheet, error: wsError } = await supabaseAdmin
      .from('worksheets')
      .select('updated_at')
      .eq('id', worksheetId)
      .single();

    if (wsError || !worksheet) {
      return NextResponse.json({ error: 'Worksheet not found' }, { status: 404 });
    }

    // Look up cache entry
    const { data: cacheEntry, error } = await supabaseAdmin
      .from('worksheet_pdf_cache')
      .select('cdn_path, created_at')
      .eq('worksheet_id', worksheetId)
      .single();

    if (error || !cacheEntry) {
      return NextResponse.json({ cached: false });
    }

    // Check if cache is stale (worksheet updated after PDF was cached)
    const wsUpdatedAt = new Date(worksheet.updated_at || 0);
    const cacheCreatedAt = new Date(cacheEntry.created_at);

    if (wsUpdatedAt > cacheCreatedAt) {
      return NextResponse.json({ cached: false, reason: 'stale' });
    }

    // Return cdn path (client will assemble full URL)
    return NextResponse.json({
      cached: true,
      cdnPath: cacheEntry.cdn_path
    });
  } catch (error) {
    console.error('Error checking PDF cache:', error);
    return NextResponse.json({ error: 'Failed to check cache' }, { status: 500 });
  }
}

/**
 * Upload a generated PDF to cache
 * POST /api/pdf/cached
 * Body: { worksheetId: string, pdf: base64 }
 * Returns: { success: boolean, cdnPath?: string }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { worksheetId, pdf } = body;

    if (!worksheetId) {
      return NextResponse.json({ error: 'worksheetId is required' }, { status: 400 });
    }

    if (!pdf) {
      return NextResponse.json({ error: 'PDF data is required' }, { status: 400 });
    }

    // Verify worksheet exists
    const { data: worksheet, error: wsError } = await supabaseAdmin
      .from('worksheets')
      .select('id')
      .eq('id', worksheetId)
      .single();

    if (wsError || !worksheet) {
      return NextResponse.json({ error: 'Worksheet not found' }, { status: 404 });
    }

    // Check if already cached
    const { data: existing } = await supabaseAdmin
      .from('worksheet_pdf_cache')
      .select('id')
      .eq('worksheet_id', worksheetId)
      .single();

    // Convert base64 to buffer
    const pdfBuffer = Buffer.from(pdf, 'base64');

    // Generate CDN path (without host)
    const cdnPath = `${PDF_PATH}/${worksheetId}.pdf`;

    // Upload to S3
    await s3.putObject({
      Bucket: S3_BUCKET,
      Key: cdnPath,
      Body: pdfBuffer,
      ContentType: 'application/pdf',
      CacheControl: 'max-age=31536000', // 1 year cache
    }).promise();

    const now = new Date().toISOString();

    if (existing) {
      // Update existing entry
      await supabaseAdmin
        .from('worksheet_pdf_cache')
        .update({
          cdn_path: cdnPath,
          created_at: now,
          updated_at: now
        })
        .eq('id', existing.id);
    } else {
      // Create new cache entry
      await supabaseAdmin
        .from('worksheet_pdf_cache')
        .insert({
          worksheet_id: worksheetId,
          cdn_path: cdnPath
        });
    }

    return NextResponse.json({
      success: true,
      cdnPath
    });
  } catch (error) {
    console.error('Error caching PDF:', error);
    return NextResponse.json({ error: 'Failed to cache PDF' }, { status: 500 });
  }
}

/**
 * Delete cached PDF
 * DELETE /api/pdf/cached?worksheetId=xxx
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const worksheetId = searchParams.get('worksheetId');

    if (!worksheetId) {
      return NextResponse.json({ error: 'worksheetId is required' }, { status: 400 });
    }

    // Get cache entry
    const { data: cacheEntry } = await supabaseAdmin
      .from('worksheet_pdf_cache')
      .select('id, cdn_path')
      .eq('worksheet_id', worksheetId)
      .single();

    if (cacheEntry) {
      // Delete from S3
      try {
        await s3.deleteObject({
          Bucket: S3_BUCKET,
          Key: cacheEntry.cdn_path,
        }).promise();
      } catch {
        // Ignore S3 delete errors
      }

      // Delete from database
      await supabaseAdmin
        .from('worksheet_pdf_cache')
        .delete()
        .eq('id', cacheEntry.id);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting PDF cache:', error);
    return NextResponse.json({ error: 'Failed to delete cache' }, { status: 500 });
  }
}
