'use client';

import React, { useState, useEffect, useLayoutEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, Minus, Plus, Maximize, Download, Printer, Loader } from 'lucide-react';
import { Button } from '@/components/ui/button';

// Print styles (minimal, just for hiding toolbar if needed)
const printStyles = `
  @media print {
    .print\\:hidden {
      display: none !important;
    }
  }
`;

// Dynamically import PDF.js only on client side
let pdfjsLib: typeof import('pdfjs-dist') | null = null;
if (typeof window !== 'undefined') {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  pdfjsLib = require('pdfjs-dist') as typeof import('pdfjs-dist');
  pdfjsLib.GlobalWorkerOptions.workerSrc = '/lib/pdfjs/pdf.worker.min.js';
}

interface PDFViewerProps {
  pdfUrl: string;
  onError?: (error: string) => void;
  onEdit?: () => void;
  onSave?: () => void;
  worksheetTitle?: string;
  worksheetAuthor?: string;
  isPublic?: boolean;
}

const PDFViewer = React.memo(function PDFViewer({ pdfUrl, onError, onEdit, onSave, worksheetTitle, worksheetAuthor, isPublic }: PDFViewerProps) {
  console.log('🟠 PDFViewer component render - pdfUrl:', !!pdfUrl);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const pageRefs = useRef<{[key: number]: HTMLImageElement | null}>({});
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [pageInputValue, setPageInputValue] = useState('1');
  const [zoom, setZoom] = useState(1.0);
  const [isInitialZoom, setIsInitialZoom] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pageImages, setPageImages] = useState<string[]>([]);
  
  // Track prop changes
  const prevProps = useRef({ pdfUrl, onError, onEdit, onSave });
  useEffect(() => {
    const prev = prevProps.current;
    const changes = [];
    
    if (prev.pdfUrl !== pdfUrl) changes.push(`pdfUrl: ${prev.pdfUrl} -> ${pdfUrl}`);
    if (prev.onError !== onError) changes.push('onError changed');
    if (prev.onEdit !== onEdit) changes.push('onEdit changed');
    if (prev.onSave !== onSave) changes.push('onSave changed');
    
    if (changes.length > 0) {
      console.log('🟠 PDFViewer prop changes:', changes);
    }
    
    prevProps.current = { pdfUrl, onError, onEdit, onSave };
  });
  

  // Load PDF document and render all pages
  useEffect(() => {
    console.log('🟠 PDFViewer useEffect (loadAndRenderPDF) triggered for pdfUrl:', pdfUrl);
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
        
        setTotalPages(pdf.numPages);
        setCurrentPage(1);
        setPageInputValue('1');
        
        // Pre-render all pages as images
        const images: string[] = [];
        for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
          const page = await pdf.getPage(pageNum);
          const viewport = page.getViewport({ scale: 2.0 }); // Higher quality
          
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
  }, [pdfUrl, onError]);

  // Calculate fit-to-width zoom on first load
  useLayoutEffect(() => {
    if (pageImages.length > 0 && containerRef.current && zoom === 1.0 && isInitialZoom) {
      const container = containerRef.current;
      if (container.clientWidth > 0) {
        // Calculate based on first image
        const tempImg = new Image();
        tempImg.onload = () => {
          const containerWidth = container.clientWidth - 32; // Account for p-4 padding
          const scaleToFitWidth = containerWidth / tempImg.width;
          if (scaleToFitWidth > 0) {
            setZoom(Math.min(scaleToFitWidth, 1.0)); // Start with fit-to-width, capped at 100%
            setIsInitialZoom(false);
          }
        };
        tempImg.src = pageImages[0];
      }
    }
  }, [pageImages, zoom, isInitialZoom]);

  // Update current page based on scroll position
  useEffect(() => {
    const container = containerRef.current;
    if (!container || pageImages.length === 0) return;

    const updateCurrentPageFromScroll = () => {
      const scrollTop = container.scrollTop;
      const containerHeight = container.clientHeight;
      
      // Find which page is currently most visible in the viewport
      let newCurrentPage = 1;
      let maxVisibleArea = 0;

      for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
        const pageRef = pageRefs.current[pageNum];
        if (!pageRef) continue;

        const pageTop = pageRef.offsetTop;
        const pageHeight = pageRef.offsetHeight;
        const pageBottom = pageTop + pageHeight;

        // Calculate visible area of this page
        const visibleTop = Math.max(scrollTop, pageTop);
        const visibleBottom = Math.min(scrollTop + containerHeight, pageBottom);
        const visibleHeight = Math.max(0, visibleBottom - visibleTop);
        const visibleArea = visibleHeight * pageRef.offsetWidth;

        if (visibleArea > maxVisibleArea) {
          maxVisibleArea = visibleArea;
          newCurrentPage = pageNum;
        }
      }

      if (newCurrentPage !== currentPage) {
        setCurrentPage(newCurrentPage);
        setPageInputValue(newCurrentPage.toString());
      }
    };

    container.addEventListener('scroll', updateCurrentPageFromScroll, { passive: true });
    return () => container.removeEventListener('scroll', updateCurrentPageFromScroll);
  }, [pageImages.length, totalPages, currentPage]);

  // Navigation functions with scroll support
  const goToPreviousPage = () => {
    if (currentPage > 1) {
      const newPage = currentPage - 1;
      setCurrentPage(newPage);
      setPageInputValue(newPage.toString());
      scrollToPage(newPage);
    }
  };

  const goToNextPage = () => {
    if (currentPage < totalPages) {
      const newPage = currentPage + 1;
      setCurrentPage(newPage);
      setPageInputValue(newPage.toString());
      scrollToPage(newPage);
    }
  };

  const goToPage = (pageNum: number) => {
    if (pageNum >= 1 && pageNum <= totalPages) {
      setCurrentPage(pageNum);
      setPageInputValue(pageNum.toString());
      scrollToPage(pageNum);
    }
  };

  // Handle page input changes (allow empty values)
  const handlePageInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPageInputValue(e.target.value);
  };

  // Handle page input submit (Enter key or blur)
  const handlePageInputSubmit = () => {
    const pageNum = parseInt(pageInputValue);
    if (!isNaN(pageNum) && pageNum >= 1 && pageNum <= totalPages) {
      goToPage(pageNum);
    } else {
      // Reset to current page if invalid
      setPageInputValue(currentPage.toString());
    }
  };

  const handlePageInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handlePageInputSubmit();
      e.currentTarget.blur();
    }
  };

  const scrollToPage = (pageNum: number) => {
    const pageRef = pageRefs.current[pageNum];
    if (!pageRef || !containerRef.current) return;
    
    const container = containerRef.current;
    const pageElement = pageRef;
    
    // For page 1, scroll to the very top to show the natural container padding
    if (pageNum === 1) {
      container.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
      return;
    }
    
    // For other pages, calculate position to show them at the top with consistent spacing
    // Get the first page to calculate the offset from container top
    const firstPageRef = pageRefs.current[1];
    if (!firstPageRef) return;
    
    const firstPageTop = firstPageRef.offsetTop;
    const currentPageTop = pageElement.offsetTop;
    
    // Calculate the scroll position to align the current page where the first page starts
    // This maintains the same visual spacing as page 1
    const targetScrollTop = currentPageTop - firstPageTop;
    
    container.scrollTo({
      top: Math.max(0, targetScrollTop),
      behavior: 'smooth'
    });
  };

  // Zoom functions
  const zoomIn = () => {
    setZoom(prevZoom => {
      const newZoom = Math.min(prevZoom * 1.2, 1.0);
      setIsInitialZoom(false);
      return newZoom;
    });
  };

  const zoomOut = () => {
    setZoom(prevZoom => {
      const newZoom = Math.max(prevZoom / 1.2, 0.1);
      setIsInitialZoom(false);
      return newZoom;
    });
  };


  const fitToPage = () => {
    // Set zoom to 100% when maximize button is clicked
    setZoom(1.0);
    setIsInitialZoom(false);
  };

  // Download function
  const downloadPDF = () => {
    // Create filename from title and author
    let filename = 'worksheet.pdf';
    
    if (worksheetTitle || worksheetAuthor) {
      const titlePart = worksheetTitle || '';
      const authorPart = worksheetAuthor || '';
      const nameParts = [titlePart, authorPart].filter(part => part.trim().length > 0);
      
      if (nameParts.length > 0) {
        // Clean up the filename by removing invalid characters
        const cleanName = nameParts.join('_').replace(/[<>:"/\\|?*]/g, '').trim();
        filename = `${cleanName}.pdf`;
      }
    }
    
    const link = document.createElement('a');
    link.href = pdfUrl;
    link.download = filename;
    link.click();
  };

  // Keep reference to print iframe to avoid recreating it
  const printIframeRef = useRef<HTMLIFrameElement | null>(null);

  // Cleanup print iframe when component unmounts or PDF changes
  useEffect(() => {
    return () => {
      if (printIframeRef.current) {
        document.body.removeChild(printIframeRef.current);
        printIframeRef.current = null;
      }
    };
  }, []);

  // Cleanup and recreate iframe when PDF URL changes
  useEffect(() => {
    if (printIframeRef.current) {
      document.body.removeChild(printIframeRef.current);
      printIframeRef.current = null;
    }
  }, [pdfUrl]);

  // Print function - create persistent hidden iframe for PDF printing
  const printPDF = () => {
    try {
      // If iframe doesn't exist, create it once
      if (!printIframeRef.current) {
        const iframe = document.createElement('iframe');
        iframe.style.position = 'absolute';
        iframe.style.top = '-1000px';
        iframe.style.left = '-1000px';
        iframe.style.width = '1px';
        iframe.style.height = '1px';
        iframe.src = pdfUrl;
        
        document.body.appendChild(iframe);
        printIframeRef.current = iframe;
        
        // Wait for PDF to load initially
        iframe.onload = () => {
          // Now it's ready for printing anytime
        };
      }
      
      // Print using the existing iframe
      setTimeout(() => {
        try {
          const iframeWindow = printIframeRef.current?.contentWindow;
          if (iframeWindow) {
            iframeWindow.print();
          }
        } catch (e) {
          console.error('Iframe print error:', e);
          // Fallback: open PDF in new tab
          window.open(pdfUrl, '_blank');
        }
      }, 100); // Small delay to ensure iframe is ready
      
    } catch (err) {
      console.error('Error printing:', err);
      // Fallback: open PDF in new tab
      window.open(pdfUrl, '_blank');
    }
  };


  if (loading) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-50">
        <Loader className="animate-spin w-4 h-4 text-gray-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-50">
        <div className="text-center text-red-600">
          <div className="font-medium mb-2">Error loading PDF</div>
          <div className="text-sm">{error}</div>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Inject print styles */}
      <style dangerouslySetInnerHTML={{ __html: printStyles }} />
      
      <div className="flex flex-col h-full bg-white print:h-auto">
        {/* Worksheet Header Bar */}
        {(worksheetTitle || onEdit || onSave) && (
          <div className="flex items-center justify-between px-3 bg-white print:hidden h-[49px]">
            <div className="flex items-center space-x-3">
              {worksheetTitle && (
                <div className="text-sm font-medium text-gray-800">
                  {worksheetTitle}
                </div>
              )}
              {worksheetAuthor && (
                <div className="text-xs text-gray-500">
                  {worksheetAuthor}
                </div>
              )}
            </div>
            
            <div className="flex items-center space-x-2">
              {onEdit && !isPublic && (
                <Button 
                  variant="outline"
                  size="sm"
                  onClick={onEdit}
                  className="h-7 px-3 text-gray-700 text-xs hover:bg-gray-50"
                  title="학습지 제목 및 출제자 정보 수정"
                >
                  정보 수정
                </Button>
              )}
              
              {onSave && !isPublic && (
                <Button 
                  variant="outline"
                  size="sm"
                  onClick={onSave}
                  className="h-7 px-3 text-gray-700 text-xs hover:bg-gray-50"
                  title="학습지를 공개 목록에 추가"
                >
                  목록 추가
                </Button>
              )}
            </div>
          </div>
        )}

        {/* PDF Toolbar and Viewer Group */}
        <div className="flex-1 flex flex-col overflow-hidden rounded-lg">
          {/* PDF Toolbar */}
          <div className="flex items-center justify-between px-3 py-2 bg-black text-white border-b border-gray-800 print:hidden rounded-t-lg">
        {/* Left Section */}
        <div className="flex items-center space-x-2">
          {/* Page Navigation */}
          <div className="flex items-center space-x-1">
            <Button 
              variant="ghost"
              size="icon"
              onClick={goToPreviousPage}
              disabled={currentPage <= 1}
              className="h-8 w-8 text-white disabled:opacity-50"
              title="Previous page"
            >
              <ChevronLeft size={16} />
            </Button>
            
            <div className="flex items-center space-x-1 text-xs">
              <input
                type="number"
                value={pageInputValue}
                onChange={handlePageInputChange}
                onKeyDown={handlePageInputKeyDown}
                onBlur={handlePageInputSubmit}
                className="w-10 px-1 py-0.5 text-center bg-gray-800 border border-gray-600 rounded text-white text-xs"
                min="1"
                max={totalPages}
                placeholder="Page"
              />
              <span>/</span>
              <span>{totalPages}</span>
            </div>
            
            <Button 
              variant="ghost"
              size="icon"
              onClick={goToNextPage}
              disabled={currentPage >= totalPages}
              className="h-8 w-8 text-white disabled:opacity-50"
              title="Next page"
            >
              <ChevronRight size={16} />
            </Button>
          </div>
          
          {/* Zoom Controls */}
          <div className="flex items-center space-x-1">
            <Button 
              variant="ghost"
              size="icon"
              onClick={zoomOut}
              className="h-8 w-8 text-white"
              title="Zoom out"
            >
              <Minus size={16} />
            </Button>
            
            <div
              className="h-8 text-xs text-white flex items-center justify-center bg-transparent"
              style={{ width: '45px' }}
            >
{Math.min(Math.round(zoom * 100), 100)}%
            </div>
            
            <Button 
              variant="ghost"
              size="icon"
              onClick={zoomIn}
              disabled={zoom >= 1.0}
              className="h-8 w-8 text-white disabled:opacity-50"
              title="Zoom in"
            >
              <Plus size={16} />
            </Button>
            
            <Button 
              variant="ghost"
              size="icon"
              onClick={fitToPage}
              className="h-8 w-8 text-white"
              title="Fit to page"
            >
              <Maximize size={16} />
            </Button>
          </div>
        </div>

        {/* Right Section */}
        <div className="flex items-center space-x-1">
          <Button 
            variant="ghost"
            size="icon"
            onClick={downloadPDF}
            className="h-8 w-8 text-white"
            title="Download PDF"
          >
            <Download size={16} />
          </Button>
          <Button 
            variant="ghost"
            size="icon"
            onClick={printPDF}
            className="h-8 w-8 text-white"
            title="Print"
          >
            <Printer size={16} />
          </Button>
        </div>
      </div>

      {/* PDF Container - Continuous Scroll */}
      <div 
        ref={containerRef}
        className="flex-1 overflow-auto bg-gray-100 p-4"
        style={{
          // Fix iOS Safari scrolling
          WebkitOverflowScrolling: 'touch',
          // Ensure touch events work properly on iPad
          touchAction: 'auto'
        }}
      >
        {/* Render all pages as images */}
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
                width: `${zoom * 100}%`,
                height: 'auto',
                display: 'block'
              }}
            />
          ))}
        </div>
      </div>
        </div>
    </div>
    </>
  );
});

export default PDFViewer;