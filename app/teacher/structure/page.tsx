'use client';

import React, { useState, useEffect, useRef } from 'react';
import Image from 'next/image';

// Sample problem data structure - just the image paths
const sampleProblems = [
  {
    id: 1,
    image: "/problems/통합사회_1권_1단원_2/문제1_하.png"
  },
  {
    id: 2,
    image: "/problems/통합사회_1권_1단원_2/문제2_하.png"
  },
  {
    id: 3,
    image: "/problems/통합사회_1권_1단원_2/문제3_하.png"
  },
  {
    id: 4,
    image: "/problems/통합사회_1권_1단원_2/문제4_하.png"
  },
  {
    id: 5,
    image: "/problems/통합사회_1권_1단원_2/문제5_하.png"
  },
  {
    id: 6,
    image: "/problems/통합사회_1권_1단원_2/문제6_하.png"
  },
  {
    id: 7,
    image: "/problems/통합사회_1권_1단원_2/문제7_하.png"
  },
  {
    id: 8,
    image: "/problems/통합사회_1권_1단원_2/문제8_하.png"
  }
];

export default function TeacherPage() {
  const [worksheetName, setWorksheetName] = useState('자세한 통합사회');
  const [creator, setCreator] = useState('컨설턴트');
  const [scale, setScale] = useState(1);
  const [pages, setPages] = useState<any[][]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const problemRefs = useRef<{ [key: number]: HTMLDivElement | null }>({});

  // Calculate scale based on container width
  useEffect(() => {
    const calculateScale = () => {
      if (containerRef.current) {
        const containerWidth = containerRef.current.offsetWidth;
        const a4Width = 210; // mm
        const maxWidth = containerWidth - 48; // Account for padding (24px each side)
        const calculatedScale = Math.min(maxWidth / a4Width, 1); // Don't scale up, only down
        setScale(calculatedScale);
      }
    };

    calculateScale();
    window.addEventListener('resize', calculateScale);
    return () => window.removeEventListener('resize', calculateScale);
  }, []);

  // Measure problems and create pages based on actual heights
  useEffect(() => {
    const createPagesWithMeasurement = () => {
      // Wait for next tick to ensure DOM is rendered
      setTimeout(() => {
        const newPages: any[][] = [];
        let currentPage: any[] = [];
        let leftColumn: any[] = [];
        let rightColumn: any[] = [];
        
                 // Get available height for problems (A4 height minus header/footer/padding)
         const a4Height = 297; // mm
         const headerHeight = (isFirstPage: boolean) => isFirstPage ? 80 : 0; // mm
         const footerHeight = 30; // mm
         const padding = 40; // mm (top/bottom padding)
        
        let currentPageIndex = 0;
        let currentColumnHeight = 0;
        const maxColumnHeight = a4Height - headerHeight(true) - footerHeight - padding;
        
        sampleProblems.forEach((problem, index) => {
          const problemRef = problemRefs.current[problem.id];
          let problemHeight = 120; // default fallback
          
          if (problemRef) {
            // Get actual rendered height
            const rect = problemRef.getBoundingClientRect();
            problemHeight = rect.height;
          }
          
          // Check if problem fits in current column
          if (currentColumnHeight + problemHeight <= maxColumnHeight) {
            // Add to current column
            if (leftColumn.length <= rightColumn.length) {
              leftColumn.push(problem);
            } else {
              rightColumn.push(problem);
            }
            currentColumnHeight += problemHeight;
          } else {
            // Current column is full, check if we can start a new column on same page
            if (leftColumn.length > 0 && rightColumn.length === 0) {
              // Move to right column
              rightColumn.push(problem);
              currentColumnHeight = problemHeight;
            } else {
              // Page is full, save current page and start new one
              currentPage = [...leftColumn, ...rightColumn];
              newPages.push(currentPage);
              currentPageIndex++;
              
              // Reset for new page
              leftColumn = [problem];
              rightColumn = [];
              currentColumnHeight = problemHeight;
            }
          }
        });
        
        // Add the last page if there are remaining problems
        if (leftColumn.length > 0 || rightColumn.length > 0) {
          currentPage = [...leftColumn, ...rightColumn];
          newPages.push(currentPage);
        }
        
        setPages(newPages);
      }, 100);
    };

    createPagesWithMeasurement();
  }, [scale]);

  const renderProblem = (problem: any) => {
    return (
      <div 
        key={problem.id} 
        ref={(el) => { problemRefs.current[problem.id] = el; }}
        className="mb-6"
      >
        {/* Problem Image (contains the complete problem) */}
        <div className="mb-3">
          <Image
            src={problem.image}
            alt={`Problem ${problem.id}`}
            width={300}
            height={400}
            className="object-contain w-full"
          />
        </div>
      </div>
    );
  };

  const renderPage = (pageProblems: any[], pageIndex: number) => {
    const isFirstPage = pageIndex === 0;
    const leftColumnProblems = pageProblems.slice(0, Math.ceil(pageProblems.length / 2));
    const rightColumnProblems = pageProblems.slice(Math.ceil(pageProblems.length / 2));
    
    return (
      <div key={pageIndex} className="mb-8">
        {/* A4 Worksheet Content */}
        <div 
          className="bg-white border border-gray-200 shadow-sm relative mx-auto origin-top flex flex-col"
          style={{ 
            width: '210mm', 
            height: '297mm',
            transform: `scale(${scale})`,
            transformOrigin: 'top center'
          }}
        >
          {/* Header Section */}
          {isFirstPage && (
            <div className="p-6 border-b border-gray-300 flex-shrink-0">
              {/* First row: name, subtitle, and logo */}
              <div className="flex justify-between items-end mb-4">
                <div className="text-left">
                  <div className="flex items-baseline gap-2 mb-1">
                    <h1 className="text-xl font-bold">{worksheetName}</h1>
                  </div>
                  <p className="text-sm text-gray-600">II. 인간, 사회, 환경과 행복</p>
                </div>
                <div className="flex-shrink-0 pb-1">
                  <Image src="/images/minlab_logo.jpeg" alt="Minlab Logo" width={150} height={50} className="object-contain"/>
                </div>
              </div>
              
              {/* Second row: date, problems, creator, student name */}
              <div className="flex justify-start items-center gap-x-4 text-xs text-gray-600">
                <span>{new Date().toLocaleDateString('ko-KR')}</span>
                <span>ㅣ</span>
                <span>40문제</span>
                <span>{creator}</span>
                <span>이름________</span>
              </div>
            </div>
          )}

          {/* Body Section with vertical line - fills remaining height */}
          <div className="flex-1 relative flex flex-col">
            <div className="p-6 flex-1 flex flex-col">
              {/* Vertical line through the middle */}
              <div className="absolute top-0 bottom-0 left-1/2 w-px bg-gray-300 transform -translate-x-1/2"></div>
              
              {/* Problems Container */}
              <div className="grid grid-cols-2 gap-x-8 flex-1">
                {/* Left Column */}
                <div className="space-y-6 pr-4 overflow-hidden">
                  {leftColumnProblems.map((problem) => renderProblem(problem))}
                </div>
                
                {/* Right Column */}
                <div className="space-y-6 pl-4 overflow-hidden">
                  {rightColumnProblems.map((problem) => renderProblem(problem))}
                </div>
              </div>
            </div>
          </div>

          {/* Footer Section */}
          <div className="pt-1.5 pb-2.5 border-t border-gray-300 flex-shrink-0">
            <div className="text-center">
              <span className="text-xs text-gray-500">{pageIndex + 1}</span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      <div className="flex flex-1 min-h-0">
        {/* Left Panel - Worksheet Preview */}
        <div className="flex-1 bg-white border-r border-[#e0e0e0] p-6 overflow-y-auto">
          <div ref={containerRef} className="max-w-4xl mx-auto">
            {/* Scrollable Pages Container */}
            <div className="h-full">
              <div className="space-y-8">
                {pages.map((pageProblems, pageIndex) => renderPage(pageProblems, pageIndex))}
              </div>
            </div>
          </div>
        </div>

        {/* Right Panel - Form Inputs */}
        <div className="w-[400px] bg-white relative">
          <div className="p-6 space-y-6 pb-20">
            {/* 학습지명 */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-900">학습지명</label>
              <input
                type="text"
                value={worksheetName}
                onChange={(e) => setWorksheetName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="학습지명을 입력하세요"
              />
            </div>

            {/* 출제자 */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-900">출제자</label>
              <input
                type="text"
                value={creator}
                onChange={(e) => setCreator(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="출제자를 입력하세요"
              />
            </div>

            {/* Bottom Bar */}
            <div className="absolute bottom-0 right-0 flex justify-between items-center w-full pl-6">
              <p className="text-sm text-gray-600">
                학습지 문제 수 <span className="text-black font-medium">40</span> 개
              </p>
              <button className="cursor-pointer bg-black text-white py-3 px-6 font-medium hover:bg-gray-800 transition-colors">
                학습지 인쇄
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
