'use client';

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useWorksheetStore } from "@/lib/zustand/worksheetStore";
import { usePathname } from "next/navigation";

export function TopNavbar() {
  const pathname = usePathname();
  const isBuildPage = pathname === '/build';
  const { selectedChapters, problemCount, selectedDifficulties, selectedProblemTypes, selectedSubjects } = useWorksheetStore();

  const handlePdfGeneration = () => {
    const params = new URLSearchParams();
    if (selectedChapters.length > 0) params.set('selectedChapters', selectedChapters.join(','));
    params.set('problemCount', String(problemCount));
    params.set('selectedDifficulties', selectedDifficulties.join(','));
    params.set('selectedProblemTypes', selectedProblemTypes.join(','));
    // Add selectedSubjects if available
    if (selectedSubjects && selectedSubjects.length > 0) {
      params.set('selectedSubjects', selectedSubjects.join(','));
    }
    window.location.href = `/configure?${params.toString()}`;
  };

  
  const isPdfButtonDisabled = selectedChapters.length === 0;

  return (
    <div className="w-full h-[60px] max-w-4xl mx-auto p-4 flex justify-between items-center shrink-0">
      <Link href="/" className="w-fit block text-lg font-semibold">통합사회 학습지 제작 도구</Link>
      <Button 
        size="sm" 
        variant="outline" 
        disabled={isPdfButtonDisabled}
        className={`w-fit ${isBuildPage ? '' : 'invisible'} ${
          isPdfButtonDisabled 
            ? 'opacity-50 cursor-not-allowed' 
            : 'hover:bg-gray-50 cursor-pointer'
        }`}
        onClick={handlePdfGeneration}
      >
        PDF 생성
      </Button>
    </div>
  );
}
