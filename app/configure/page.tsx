'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { Loader } from "lucide-react";
import { useSearchParams } from 'next/navigation';
import { Card } from '@/components/ui/card';
import problemDB from '@/public/problems/db-index';

function filterImagesByType(images: string[], difficulty: string, problemType: string): string[] {
  return images.filter((img) => {
    // 문제번호_난이도(_기출종류).png
    // e.g. 문제1_하.png (N제), 문제1_하_수능.png (기출)
    const base = img.replace('.png', '');
    const parts = base.split('_');
    const difficultyMatch = difficulty === '모두' || parts[1] === difficulty;
    
    if (problemType === 'N제') return parts.length === 2 && difficultyMatch;
    else if (problemType === '기출문제') return parts.length === 3 && difficultyMatch;
    else if (problemType === '모두') return difficultyMatch;
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

function PdfContent() {
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
        const res = await fetch("/api/configure", {
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
    <div className="px-4 pt-2 pb-6 max-w-4xl mx-auto w-full h-full">
      <Card className="p-0 h-full flex flex-row gap-0 overflow-hidden">
        {/* PDF Preview Panel */}
        <div className="flex-1 bg-white overflow-y-auto relative">
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
      </Card>
    </div>
  );
}

export default function Page() {
  return (
    <Suspense fallback={
      <div className="px-4 pt-2 pb-6 max-w-6xl mx-auto w-full h-full">
        <Card className="p-0 h-full flex flex-row gap-0 overflow-hidden">
          <div className="flex-1 bg-white flex items-center justify-center">
            <Loader className="animate-spin w-4 h-4" />
          </div>
        </Card>
      </div>
    }>
      <PdfContent />
    </Suspense>
  );
}
