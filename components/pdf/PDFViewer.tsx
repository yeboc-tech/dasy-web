'use client';

import React, { useState, useEffect, useLayoutEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, Minus, Plus, Maximize, Download, Printer, Loader } from 'lucide-react';
import dynamic from 'next/dynamic';
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
let pdfjsLib: any = null;
if (typeof window !== 'undefined') {
  pdfjsLib = require('pdfjs-dist');
  pdfjsLib.GlobalWorkerOptions.workerSrc = '/lib/pdfjs/pdf.worker.min.js';
}

interface PDFViewerProps {
  pdfUrl: string;
  onError?: (error: string) => void;
}

export default function PDFViewer({ pdfUrl, onError }: PDFViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const pageRefs = useRef<{[key: number]: HTMLImageElement | null}>({});
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [zoom, setZoom] = useState(1.0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pageImages, setPageImages] = useState<string[]>([]);
  const [fitToWidthZoom, setFitToWidthZoom] = useState(1.0);
  
  // Touch gesture state
  const [isTouch, setIsTouch] = useState(false);
  const [lastPinchDistance, setLastPinchDistance] = useState(0);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [scrollPosition, setScrollPosition] = useState({ x: 0, y: 0 });

  // Load PDF document and render all pages
  useEffect(() => {
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
        
        setPdfDoc(pdf);
        setTotalPages(pdf.numPages);
        setCurrentPage(1);
        
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
    if (pageImages.length > 0 && containerRef.current && zoom === 1.0) {
      const container = containerRef.current;
      if (container.clientWidth > 0) {
        // Calculate based on first image
        const tempImg = new Image();
        tempImg.onload = () => {
          const containerWidth = container.clientWidth - 32; // Account for p-4 padding
          const scaleToFitWidth = containerWidth / tempImg.width;
          if (scaleToFitWidth > 0) {
            setFitToWidthZoom(scaleToFitWidth);
            setZoom(scaleToFitWidth); // Start with fit-to-width
          }
        };
        tempImg.src = pageImages[0];
      }
    }
  }, [pageImages, zoom]);

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
      scrollToPage(newPage);
    }
  };

  const goToNextPage = () => {
    if (currentPage < totalPages) {
      const newPage = currentPage + 1;
      setCurrentPage(newPage);
      scrollToPage(newPage);
    }
  };

  const goToPage = (pageNum: number) => {
    if (pageNum >= 1 && pageNum <= totalPages) {
      setCurrentPage(pageNum);
      scrollToPage(pageNum);
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
    setZoom(prevZoom => prevZoom * 1.2);
  };

  const zoomOut = () => {
    setZoom(prevZoom => Math.max(prevZoom / 1.2, 0.1));
  };

  const resetZoom = () => {
    setZoom(1.0);
  };

  const fitToPage = () => {
    // Calculate and set zoom to fit width
    const container = containerRef.current;
    if (container && pageImages.length > 0) {
      console.log('Fit to page clicked, container:', container.clientWidth, 'images:', pageImages.length);
      const tempImg = new Image();
      tempImg.onload = () => {
        // Account for p-4 padding (16px on each side = 32px total)
        const containerWidth = container.clientWidth - 32;
        // Images are rendered at 2.0 scale, so we need to account for that
        const actualImageWidth = tempImg.width / 2.0;
        const scaleToFitWidth = containerWidth / actualImageWidth;
        console.log('Container width:', containerWidth, 'Image width:', tempImg.width, 'Actual width:', actualImageWidth, 'Scale:', scaleToFitWidth);
        if (scaleToFitWidth > 0) {
          setZoom(scaleToFitWidth);
        }
      };
      tempImg.src = pageImages[0];
    }
  };

  // Download function
  const downloadPDF = () => {
    const link = document.createElement('a');
    link.href = pdfUrl;
    link.download = 'worksheet.pdf';
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

  // Touch gesture handlers
  const getTouchDistance = (touches: TouchList) => {
    if (touches.length < 2) return 0;
    const touch1 = touches[0];
    const touch2 = touches[1];
    return Math.sqrt(
      Math.pow(touch2.clientX - touch1.clientX, 2) + 
      Math.pow(touch2.clientY - touch1.clientY, 2)
    );
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    setIsTouch(true);
    
    if (e.touches.length === 2) {
      // Pinch gesture start
      setLastPinchDistance(getTouchDistance(e.touches));
    } else if (e.touches.length === 1) {
      // Pan gesture start
      setPanStart({
        x: e.touches[0].clientX,
        y: e.touches[0].clientY
      });
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    e.preventDefault();
    
    if (e.touches.length === 2) {
      // Pinch to zoom
      const distance = getTouchDistance(e.touches);
      if (lastPinchDistance > 0) {
        const scale = distance / lastPinchDistance;
        const newZoom = Math.max(0.1, zoom * scale);
        setZoom(newZoom);
      }
      setLastPinchDistance(distance);
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (e.touches.length === 0) {
      setIsTouch(false);
      setLastPinchDistance(0);
    }
  };

  // Swipe detection for page navigation
  let touchStartX = 0;
  const handleSwipeStart = (e: React.TouchEvent) => {
    touchStartX = e.touches[0].clientX;
  };

  const handleSwipeEnd = (e: React.TouchEvent) => {
    if (!e.changedTouches.length) return;
    
    const touchEndX = e.changedTouches[0].clientX;
    const swipeDistance = touchEndX - touchStartX;
    const minSwipeDistance = 50;
    
    if (Math.abs(swipeDistance) > minSwipeDistance) {
      if (swipeDistance > 0) {
        // Swipe right - previous page
        goToPreviousPage();
      } else {
        // Swipe left - next page
        goToNextPage();
      }
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
        {/* Custom PDF Toolbar */}
        <div className="flex items-center justify-between px-3 py-2 bg-black text-white border-b border-gray-800 print:hidden">
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
                value={currentPage}
                onChange={(e) => goToPage(parseInt(e.target.value) || 1)}
                className="w-10 px-1 py-0.5 text-center bg-gray-800 border border-gray-600 rounded text-white text-xs"
                min="1"
                max={totalPages}
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
{Math.round(zoom * 100)}%
            </div>
            
            <Button 
              variant="ghost"
              size="icon"
              onClick={zoomIn}
              className="h-8 w-8 text-white"
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
            title="Download"
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
            <img 
              key={index}
              ref={(el) => pageRefs.current[index + 1] = el}
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
    </>
  );
}