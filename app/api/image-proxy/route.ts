import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/client';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const imageUrl = searchParams.get('url');

  if (!imageUrl) {
    return NextResponse.json({ error: 'Missing url parameter' }, { status: 400 });
  }

  try {
    // Fetch the image from S3
    const response = await fetch(imageUrl);

    if (!response.ok) {
      console.log(`[Image Proxy] S3 fetch failed (${response.status}), trying Supabase...`);

      // Extract problem_id from URL
      // URL format: https://cdn.y3c.kr/tongkidari/contents/{problem_id}.png
      const decodedUrl = decodeURIComponent(imageUrl);
      const urlParts = decodedUrl.split('/contents/');

      if (urlParts.length === 2) {
        // Remove .png extension to get problem_id
        const problemId = urlParts[1].replace('.png', '');
        console.log(`[Image Proxy] Extracted problem_id: ${problemId}`);

        // Query Supabase edited_contents table
        const supabase = createClient();
        const { data, error } = await supabase
          .from('edited_contents')
          .select('base64')
          .eq('resource_id', problemId)
          .single();

        if (error) {
          console.error(`[Image Proxy] Supabase query error:`, error);
          throw new Error(`Failed to fetch from S3 and Supabase: ${error.message}`);
        }

        if (data && data.base64) {
          console.log(`[Image Proxy] ✅ Found base64 in Supabase for ${problemId}`);

          // Convert base64 to ArrayBuffer
          // Remove data URL prefix if present (e.g., "data:image/png;base64,")
          const base64Data = data.base64.includes(',')
            ? data.base64.split(',')[1]
            : data.base64;

          const binaryString = atob(base64Data);
          const bytes = new Uint8Array(binaryString.length);
          for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
          }

          // Return the image with proper CORS headers
          return new NextResponse(bytes.buffer, {
            headers: {
              'Content-Type': 'image/png',
              'Access-Control-Allow-Origin': '*',
              'Access-Control-Allow-Methods': 'GET',
              'Access-Control-Allow-Headers': 'Content-Type',
              'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
            },
          });
        } else {
          console.log(`[Image Proxy] ⚠️ No base64 found in Supabase for ${problemId}`);
          throw new Error('Image not found in S3 or Supabase');
        }
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    }

    const imageBuffer = await response.arrayBuffer();

    // Return the image with proper CORS headers
    return new NextResponse(imageBuffer, {
      headers: {
        'Content-Type': response.headers.get('Content-Type') || 'image/png',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
      },
    });
  } catch (error) {
    console.error('Image proxy error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch image' },
      { status: 500 }
    );
  }
}