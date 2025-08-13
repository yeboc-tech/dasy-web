'use client';

import React, { useEffect, useState, Suspense, useMemo, useRef } from 'react';
import { Loader } from "lucide-react";
import { useSearchParams } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { useWorksheetStore } from '@/lib/zustand/worksheetStore';
import { useChapters } from '@/lib/hooks/useChapters';
import type { ChapterTreeItem } from '@/lib/supabase/services/services';

// Types for the new metadata structure
interface ProblemMetadata {
  id: number;
  filename: string;
  subject_id: string;
  chapter_id: string;
  subject_name: string;
  chapter_name: string;
  difficulty: string;
  problem_type: string;
  exam_type: string | null;
  year: number | null;
  month: number | null;
  estimated_time: number;
  points: number;
  related_subjects: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface MetadataFile {
  problems: ProblemMetadata[];
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
  const selectedDifficulties = searchParams.get('selectedDifficulties')?.split(',').filter(Boolean) || [];
  const selectedProblemTypes = searchParams.get('selectedProblemTypes')?.split(',').filter(Boolean) || [];
  const selectedSubjects = searchParams.get('selectedSubjects')?.split(',').filter(Boolean) || [];
  
  const worksheetName = '';
  const creator = '';
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [metadata, setMetadata] = useState<MetadataFile | null>(null);
  const [metadataLoading, setMetadataLoading] = useState(true);
  const [metadataError, setMetadataError] = useState<string | null>(null);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [useObjectTag, setUseObjectTag] = useState(false);
  const lastProcessedSelection = useRef<string>('');

  // Fetch chapters from database
  const { chapters: contentTree, loading: chaptersLoading, error: chaptersError } = useChapters();

  // Load metadata
  useEffect(() => {
    const loadMetadata = async () => {
      try {
        setMetadataLoading(true);
        setMetadataError(null);
        const response = await fetch('/dummies/problems-metadata.json');
        if (!response.ok) {
          throw new Error(`Failed to load metadata: ${response.status}`);
        }
        const data = await response.json();
        setMetadata(data);
      } catch (error) {
        console.error('Error loading metadata:', error);
        setMetadataError(error instanceof Error ? error.message : 'Failed to load metadata');
      } finally {
        setMetadataLoading(false);
      }
    };

    loadMetadata();
  }, []);

  // Filter and select problems based on criteria
  const selectedImages = useMemo(() => {
    if (!metadata || metadataLoading) return [];

    let filtered = metadata.problems.filter(problem => problem.is_active);

    // Filter by difficulty (multi-select)
    if (selectedDifficulties.length > 0 && selectedDifficulties.length < 3) {
      filtered = filtered.filter(problem => selectedDifficulties.includes(problem.difficulty));
    }

    // Filter by problem type (multi-select)
    if (selectedProblemTypes.length > 0 && selectedProblemTypes.length < 2) {
      filtered = filtered.filter(problem => selectedProblemTypes.includes(problem.problem_type));
    }

    // Filter by selected chapters
    if (selectedChapters.length > 0) {
      // Get chapter names from the database chapters
      const selectedChapterNames: string[] = [];
      
      // Helper function to get chapter names recursively
      const getChapterNames = (chapters: ChapterTreeItem[], selectedIds: string[]) => {
        chapters.forEach(chapter => {
          if (selectedIds.includes(chapter.id)) {
            // If this is a parent chapter, get all its child chapter names
            if (chapter.children && chapter.children.length > 0) {
              chapter.children.forEach((child: ChapterTreeItem) => {
                selectedChapterNames.push(child.label);
                // Also get grandchildren if they exist
                if (child.children && child.children.length > 0) {
                  child.children.forEach((grandchild: ChapterTreeItem) => {
                    selectedChapterNames.push(grandchild.label);
                  });
                }
              });
            } else {
              // If this is a leaf chapter, add it directly
              selectedChapterNames.push(chapter.label);
            }
          }
          // Continue searching in children
          if (chapter.children) {
            getChapterNames(chapter.children, selectedIds);
          }
        });
      };
      
      getChapterNames(contentTree, selectedChapters);
      
      if (selectedChapterNames.length > 0) {
        filtered = filtered.filter(problem => 
          selectedChapterNames.some(chapterName => {
            // Strip the "01.", "02." prefix from the selected chapter name for comparison
            const cleanChapterName = chapterName.replace(/^\d+\.\s*/, '');
            return problem.chapter_name.includes(cleanChapterName);
          })
        );
      }
    } else {
      // If no chapters selected, show no problems
      filtered = [];
    }

    // Filter by selected subjects (using related_subjects array)
    if (selectedSubjects.length > 0) {
      filtered = filtered.filter(problem => 
        problem.related_subjects.some(relatedSubject => 
          selectedSubjects.includes(relatedSubject)
        )
      );
    }

    // Filter out the missing image (problem_004.png)
    filtered = filtered.filter(problem => problem.filename !== 'problem_004.png');

    // Limit to problemCount
    const sampled = getRandomSample(filtered, problemCount);
    
    // Convert to image paths
    return sampled.map(problem => `/dummies/${problem.filename}`);
  }, [metadata, metadataLoading, selectedChapters, selectedDifficulties, selectedProblemTypes, selectedSubjects, problemCount, contentTree]);

  useEffect(() => {
    // Create a unique key for the current selection
    const selectionKey = JSON.stringify({
      selectedChapters,
      selectedDifficulties,
      selectedProblemTypes,
      selectedSubjects,
      problemCount
    });

    // Force generation if we have images but no PDF URL
    const shouldGenerate = selectionKey !== lastProcessedSelection.current || (selectedImages.length > 0 && !pdfUrl);

    if (!shouldGenerate) {
      return;
    }

    const fetchPdf = async () => {
      try {
        setLoading(true);
        
        if (selectedImages.length === 0) {
          setPdfUrl(null);
          setPdfError('선택된 문제가 없습니다.');
          return;
        }
        
        const res = await fetch("/api/configure", {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: worksheetName,
            creator: creator,
            images: selectedImages,
          })
        });
        
        if (!res.ok) {
          const errorText = await res.text();
          throw new Error(`HTTP error! status: ${res.status}, message: ${errorText}`);
        }
        
        const blob = await res.blob();
        
        if (blob.size === 0) throw new Error("PDF blob is empty");
        if (blob.type !== 'application/pdf') {
          console.warn('Unexpected blob type:', blob.type);
        }
        
        const url = URL.createObjectURL(blob);
        setPdfUrl(url);
        setPdfError(null);
        // Mark this selection as processed
        lastProcessedSelection.current = selectionKey;
      } catch (error: any) {
        console.error("Failed to fetch PDF:", error.message);
        // Set error state for better user feedback
        setPdfUrl(null);
        setPdfError(error.message);
      } finally {
        setLoading(false);
      }
    };
    
    if (selectedImages.length > 0) {
      fetchPdf();
    } else {
      setPdfUrl(null);
      setLoading(false);
      lastProcessedSelection.current = selectionKey;
    }
    
    return () => {
      if (pdfUrl && typeof pdfUrl === 'string' && pdfUrl.startsWith("blob:")) URL.revokeObjectURL(pdfUrl);
    };
  }, [selectedImages, worksheetName, creator, selectedChapters, selectedDifficulties, selectedProblemTypes, selectedSubjects, problemCount, pdfUrl]);

  // Reset last processed selection when component mounts
  useEffect(() => {
    lastProcessedSelection.current = '';
  }, []);

  // Force regenerate PDF function
  const regeneratePdf = () => {
    lastProcessedSelection.current = '';
    // Trigger the PDF generation effect by updating a dependency
    setLoading(true);
    setTimeout(() => setLoading(false), 100);
  };

  // Force reset on first load
  useEffect(() => {
    if (selectedImages.length > 0 && !pdfUrl) {
      lastProcessedSelection.current = '';
    }
  }, [selectedImages, pdfUrl]);

  if (metadataLoading || chaptersLoading) {
    return (
      <div className="px-4 pt-2 pb-6 max-w-4xl mx-auto w-full h-full">
        <Card className="p-0 h-full flex flex-row gap-0 overflow-hidden">
          <div className="flex-1 bg-white flex items-center justify-center">
            <Loader className="animate-spin w-4 h-4" />
          </div>
        </Card>
      </div>
    );
  }

  if (metadataError || chaptersError) {
    return (
      <div className="px-4 pt-2 pb-6 max-w-4xl mx-auto w-full h-full">
        <Card className="p-0 h-full flex flex-row gap-0 overflow-hidden">
          <div className="flex-1 bg-white flex items-center justify-center">
            <div className="text-center text-gray-600">
              {metadataError ? `메타데이터 오류: ${metadataError}` : `단원 정보 오류: ${chaptersError}`}
            </div>
          </div>
        </Card>
      </div>
    );
  }

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
          
          {pdfError && (
            <div className="absolute inset-0 flex items-center justify-center z-10 bg-white">
              <div className="text-center text-gray-600 max-w-md p-4">
                <div className="text-red-500 font-medium mb-2">PDF 생성 오류</div>
                <div className="text-sm mb-4">{pdfError}</div>
                <button 
                  onClick={() => {
                    setPdfError(null);
                    lastProcessedSelection.current = '';
                  }}
                  className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                >
                  다시 시도
                </button>
              </div>
            </div>
          )}
          
          {pdfUrl && !loading && !pdfError && (
            <div className="w-full h-full flex flex-col">
              {/* PDF Display */}
              <div className="flex-1 relative">
                {useObjectTag ? (
                  <object 
                    key={pdfUrl} 
                    data={pdfUrl} 
                    type="application/pdf" 
                    className="w-full h-full border-0" 
                    title="PDF Preview"
                    onError={() => {
                      console.error('object failed to load PDF');
                      setPdfError('PDF를 표시할 수 없습니다. 다운로드 버튼을 사용해주세요.');
                    }}
                  >
                    <div className="flex items-center justify-center h-full bg-gray-50">
                      <div className="text-center">
                        <p className="text-gray-600 mb-2">PDF를 표시할 수 없습니다.</p>
                        <button
                          onClick={() => {
                            const link = document.createElement('a');
                            link.href = pdfUrl;
                            link.download = 'worksheet.pdf';
                            link.click();
                          }}
                          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                        >
                          PDF 다운로드
                        </button>
                      </div>
                    </div>
                  </object>
                ) : (
                  <div className="w-full h-full">
                    <iframe 
                      key={pdfUrl} 
                      src={pdfUrl}
                      className="w-full h-full border-0" 
                      title="PDF Preview"
                      onError={(e) => {
                        console.error('iframe failed to load PDF', e);
                        setPdfError('PDF를 표시할 수 없습니다. 다운로드 버튼을 사용해주세요.');
                      }}
                    />
                  </div>
                )}
              </div>
            </div>
          )}
          
          {!loading && !pdfError && selectedImages.length === 0 && (
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
