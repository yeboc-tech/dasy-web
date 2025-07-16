'use client';

import React, { useState, useEffect } from 'react';

export default function Page() {
  const [worksheetName, setWorksheetName] = useState('');
  const [creator, setCreator] = useState('');
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);

  useEffect(() => {
    const fetchPdf = async () => {
      try {
        // Dummy call with sample data
        const res = await fetch("/api/pdf", {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: worksheetName,
            creator: creator,
            images: [
              "통합사회_1권_1단원_2/문제1_하.png",
              "통합사회_1권_1단원_2/문제2_하.png",
              "통합사회_1권_1단원_2/문제3_하.png"
            ]
          })
        });
        
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        
        const blob = await res.blob();
        if (blob.size === 0) throw new Error("PDF blob is empty");
        
        const url = URL.createObjectURL(blob);
        setPdfUrl(url);
      } catch (error: any) {
        console.error("Failed to fetch PDF:", error.message);
      } 
    };

    fetchPdf();
    return () => {
      if (pdfUrl && typeof pdfUrl === 'string' && pdfUrl.startsWith("blob:")) URL.revokeObjectURL(pdfUrl);
    };
  }, [worksheetName, creator]);

  return (
    <>
      <div className="flex flex-1 min-h-0">
        {/* Left Panel - Worksheet Preview */}
        <div className="flex-1 bg-white border-r border-[#e0e0e0] overflow-y-auto">          
          {pdfUrl && (
            <iframe 
              key={pdfUrl} 
              src={pdfUrl} 
              className="w-full h-full" 
            />
          )}
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
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                placeholder="학습지명을 입력하세요"
                disabled
              />
            </div>

            {/* 출제자 */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-900">출제자</label>
              <input
                type="text"
                value={creator}
                onChange={(e) => setCreator(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                placeholder="출제자를 입력하세요"
                disabled
              />
            </div>

            {/* Bottom Bar */}
            <div className="absolute bottom-0 right-0 flex justify-between items-center w-full pl-6 border-t border-gray-300">
              <p className="text-sm text-gray-600">학습지 문제 수 <span className="text-black font-medium">3</span> 개</p>
              <button className="cursor-pointer bg-black text-white py-3 px-6 font-medium hover:bg-gray-800 transition-colors">적용하기</button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
