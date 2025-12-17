'use client';

import React, { useState, useEffect, useLayoutEffect, useRef } from 'react';
import { Loader } from 'lucide-react';

// Dynamically import PDF.js only on client side
let pdfjsLib: typeof import('pdfjs-dist') | null = null;
if (typeof window !== 'undefined') {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  pdfjsLib = require('pdfjs-dist') as typeof import('pdfjs-dist');
  pdfjsLib.GlobalWorkerOptions.workerSrc = '/lib/pdfjs/pdf.worker.min.js';
}

interface SimplePDFViewerProps {
  pdfUrl: string;
  onError?: (error: string) => void;
}

export const SimplePDFViewer = React.memo(function SimplePDFViewer({ pdfUrl, onError }: SimplePDFViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const pageRefs = useRef<{[key: number]: HTMLImageElement | null}>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pageImages, setPageImages] = useState<string[]>([]);

  // Track if we've already loaded for this URL
  const loadedUrlRef = useRef<string | null>(null);

  // Load PDF document and render all pages at 100% zoom
  useEffect(() => {
    // Skip if already loaded for this URL
    if (loadedUrlRef.current === pdfUrl && pageImages.length > 0) {
      setLoading(false);
      return;
    }

    const loadAndRenderPDF = async () => {
      try {
        setLoading(true);
        setError(null);

        // Ensure PDF.js is loaded
        if (!pdfjsLib) {
          throw new Error('PDF.js library not loaded');
        }

        const loadingTask = pdfjsLib.getDocument(pdfUrl);
        const pdf = await loadingTask.promise;

        // Pre-render all pages as images at high resolution
        const images: string[] = [];
        for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
          const page = await pdf.getPage(pageNum);
          const viewport = page.getViewport({ scale: 2.0 }); // Higher resolution for crisp display

          // Create temporary canvas for rendering
          const canvas = document.createElement('canvas');
          const context = canvas.getContext('2d');
          if (!context) continue;

          canvas.width = viewport.width;
          canvas.height = viewport.height;

          const renderContext = {
            canvasContext: context,
            viewport: viewport,
            canvas: canvas,
          };

          await page.render(renderContext).promise;

          // Convert to image
          const imageData = canvas.toDataURL('image/png', 1.0);
          images.push(imageData);
        }

        setPageImages(images);
        loadedUrlRef.current = pdfUrl;

      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to load PDF';
        setError(errorMessage);
        onError?.(errorMessage);
      } finally {
        setLoading(false);
      }
    };

    if (pdfUrl && typeof window !== 'undefined') {
      loadAndRenderPDF();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pdfUrl]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-100">
        <Loader className="animate-spin w-4 h-4 text-gray-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-100">
        <div className="text-center text-red-600">
          <div className="font-medium mb-2">Error loading PDF</div>
          <div className="text-sm">{error}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full bg-gray-100">
      {/* PDF Container - Continuous Scroll, no headers or toolbars */}
      <div
        ref={containerRef}
        className="h-full overflow-auto bg-gray-100 p-4"
        style={{
          // Fix iOS Safari scrolling
          WebkitOverflowScrolling: 'touch',
          // Ensure touch events work properly on iPad
          touchAction: 'auto'
        }}
      >
        {/* Render all pages as images at 100% size */}
        <div className="flex flex-col gap-5 items-center">
          {pageImages.map((imageData, index) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={index}
              ref={(el) => {
                pageRefs.current[index + 1] = el;
              }}
              src={imageData}
              alt={`PDF Page ${index + 1}`}
              className="shadow-lg border border-gray-300 max-w-full"
              style={{
                width: '100%', // Always 100% width
                height: 'auto',
                display: 'block'
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
});

export default SimplePDFViewer;