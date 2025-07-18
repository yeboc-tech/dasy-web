'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { Loader } from "lucide-react";
import { useSearchParams } from 'next/navigation';
import problemDB from '@/public/problems/db-index';

function filterImagesByType(images: string[], difficulty: string, problemType: string): string[] {
  return images.filter((img) => {
    // 문제번호_난이도(_기출종류).png
    // e.g. 문제1_하.png (N제), 문제1_하_수능.png (기출)
    const base = img.replace('.png', '');
    const parts = base.split('_');
    // parts: [문제번호, 난이도, (기출종류?)]
    
    // Check difficulty filter
    const difficultyMatch = difficulty === '모두' || parts[1] === difficulty;
    
    if (problemType === 'N제') {
      // Only allow if there are exactly 2 parts (no 기출종류)
      return parts.length === 2 && difficultyMatch;
    } else if (problemType === '기출문제') {
      // Only allow if there are 3 parts (기출종류 present)
      return parts.length === 3 && difficultyMatch;
    } else if (problemType === '모두') {
      // Allow both
      return difficultyMatch;
    }
    return false;
  });
}

function getRandomSample<T>(arr: T[], n: number): T[] {
  if (arr.length <= n) return arr;
  const result = [];
  const used = new Set<number>();
  while (result.length < n) {
    const idx = Math.floor(Math.random() * arr.length);
    if (!used.has(idx)) {
      used.add(idx);
      result.push(arr[idx]);
    }
  }
  return result;
}

function StructureContent() {
  const searchParams = useSearchParams();
  const selectedChapters = searchParams.get('selectedChapters')?.split(',').filter(Boolean) || [];
  const problemCount = parseInt(searchParams.get('problemCount') || '0', 10);
  const difficulty = searchParams.get('difficulty') || '';
  const problemType = searchParams.get('problemType') || '';
  const worksheetName = '';
  const creator = '';
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedImages, setSelectedImages] = useState<string[]>([]);

  useEffect(() => {
    let allImages: string[] = [];
    selectedChapters.forEach((chapter) => {
      const images = (problemDB as any)[chapter] as string[] | undefined;
      if (images) {
        const filtered = filterImagesByType(images, difficulty, problemType);
        allImages = allImages.concat(
          filtered.map(img => `${chapter}/${img}`)
        );
      }
    });
    const sampled = getRandomSample(allImages, problemCount);
    setSelectedImages(sampled);
  }, [searchParams]);

  useEffect(() => {
    const fetchPdf = async () => {
      try {
        setLoading(true);
        const res = await fetch("/api/pdf", {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: worksheetName,
            creator: creator,
            images: selectedImages,
          })
        });
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        const blob = await res.blob();
        if (blob.size === 0) throw new Error("PDF blob is empty");
        const url = URL.createObjectURL(blob);
        setPdfUrl(url);
      } catch (error: any) {
        console.error("Failed to fetch PDF:", error.message);
      } finally {
        setLoading(false);
      }
    };
    if (selectedImages.length > 0) {
      fetchPdf();
    } else {
      setPdfUrl(null);
      setLoading(false);
    }
    return () => {
      if (pdfUrl && typeof pdfUrl === 'string' && pdfUrl.startsWith("blob:")) URL.revokeObjectURL(pdfUrl);
    };
  }, [worksheetName, creator, selectedImages]);

  return (
    <>
      <div className="flex flex-1 min-h-0">
        {/* Left Panel - Worksheet Preview */}
        <div className="flex-1 bg-white border-r border-[#e0e0e0] overflow-y-auto relative">
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center z-10 bg-white bg-opacity-70">
              <Loader className="animate-spin w-4 h-4" />
            </div>
          )}
          {pdfUrl && !loading && (
            <iframe 
              key={pdfUrl} 
              src={pdfUrl} 
              className="w-full h-full" 
            />
          )}
          {!loading && selectedImages.length === 0 && (
            <div className="flex items-center justify-center h-full">
              <div className="text-center text-gray-400 text-sm">선택한 조건에 맞는 문제가 없습니다.</div>
            </div>
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
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                placeholder="출제자를 입력하세요"
                disabled
              />
            </div>

            {/* Bottom Bar */}
            <div className="absolute bottom-0 right-0 flex justify-between items-center w-full pl-6 border-t border-gray-300">
              <p className="text-sm text-gray-600">학습지 문제 수 <span className="text-black font-medium">{selectedImages.length}</span> 개</p>
              <div className="flex">
                <a href="/teacher/range" className="cursor-pointer h-full bg-white text-black py-3 px-6 font-medium hover:bg-gray-100 transition-colors border-l border-gray-300">이전</a>
                <button className="cursor-pointer bg-black text-white py-3 px-6 font-medium hover:bg-gray-800 transition-colors">적용하기</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default function Page() {
  return (
    <Suspense fallback={
      <div className="flex flex-1 min-h-0">
        <div className="flex-1 bg-white border-r border-[#e0e0e0] flex items-center justify-center"><Loader className="animate-spin w-4 h-4" /></div>
        <div className="w-[400px] bg-white flex items-center justify-center"><Loader className="animate-spin w-4 h-4" /></div>
      </div>
    }>
      <StructureContent />
    </Suspense>
  );
}
