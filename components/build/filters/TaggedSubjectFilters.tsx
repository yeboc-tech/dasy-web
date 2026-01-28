'use client';

import React, { useState, useEffect, useRef } from 'react';
import { AuthCheckbox as Checkbox } from '@/components/ui/auth-checkbox';
import { AuthInput as Input } from '@/components/ui/auth-input';
import { AuthButton as Button } from '@/components/ui/auth-button';
import { AuthSlider as Slider } from '@/components/ui/auth-slider';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { useWorksheetStore } from '@/lib/zustand/worksheetStore';
import { useTaggedChapters } from '@/lib/hooks/useTaggedChapters';
import type { ChapterTreeItem } from '@/lib/types';
import { Loader } from 'lucide-react';
import {
  getCorrectRateRangeFromTaggedDifficulties,
  getTaggedDifficultiesFromCorrectRateRange,
  doesCorrectRateMatchTaggedDifficulties,
  doTaggedDifficultiesMatchCorrectRate
} from '@/lib/utils/taggedDifficultySync';

// Constants for filter options
const START_YEAR = 2012;
const CURRENT_YEAR = new Date().getFullYear();
const ALL_YEARS = Array.from({ length: CURRENT_YEAR - START_YEAR + 1 }, (_, i) => START_YEAR + i);
const ALL_MONTHS = ['03', '04', '05', '06', '07', '08', '09', '10', '11', '12'];
const ALL_EXAM_TYPES = ['학평', '모평', '수능'];
const ALL_DIFFICULTY_LEVELS = ['최상', '상', '중상', '중', '중하', '하'];

interface TaggedSubjectFiltersProps {
  subject: string; // '경제', '사회문화', '생활과윤리', '정치와법', '세계지리'
  dialogFilters?: {
    selectedChapters: string[];
    setSelectedChapters: (value: string[]) => void;
    selectedDifficulties: string[];
    setSelectedDifficulties: (value: string[]) => void;
    correctRateRange: [number, number];
    setCorrectRateRange: (value: [number, number]) => void;
    selectedYears: number[];
    setSelectedYears: (value: number[]) => void;
    problemCount: number;
    setProblemCount: (value: number) => void;
    selectedGrades?: string[];
    setSelectedGrades?: (value: string[]) => void;
    selectedMonths?: string[];
    setSelectedMonths?: (value: string[]) => void;
    selectedExamTypes?: string[];
    setSelectedExamTypes?: (value: string[]) => void;
  };
}

export default function TaggedSubjectFilters({ subject, dialogFilters }: TaggedSubjectFiltersProps) {
  // Use dialogFilters if provided, otherwise use Zustand store
  const storeFilters = useWorksheetStore();

  const selectedChapters = dialogFilters?.selectedChapters ?? storeFilters.selectedChapters;
  const setSelectedChapters = dialogFilters?.setSelectedChapters ?? storeFilters.setSelectedChapters;
  const problemCount = dialogFilters?.problemCount ?? storeFilters.problemCount;
  const setProblemCount = dialogFilters?.setProblemCount ?? storeFilters.setProblemCount;
  const selectedDifficulties = dialogFilters?.selectedDifficulties ?? storeFilters.selectedDifficulties;
  const setSelectedDifficulties = dialogFilters?.setSelectedDifficulties ?? storeFilters.setSelectedDifficulties;
  const correctRateRange = dialogFilters?.correctRateRange ?? storeFilters.correctRateRange;
  const setCorrectRateRange = dialogFilters?.setCorrectRateRange ?? storeFilters.setCorrectRateRange;
  const selectedYears = dialogFilters?.selectedYears ?? storeFilters.selectedYears;
  const setSelectedYears = dialogFilters?.setSelectedYears ?? storeFilters.setSelectedYears;
  const selectedGrades = dialogFilters?.selectedGrades ?? storeFilters.selectedGrades;
  const setSelectedGrades = dialogFilters?.setSelectedGrades ?? storeFilters.setSelectedGrades;
  const selectedMonths = dialogFilters?.selectedMonths ?? storeFilters.selectedMonths;
  const setSelectedMonths = dialogFilters?.setSelectedMonths ?? storeFilters.setSelectedMonths;
  const selectedExamTypes = dialogFilters?.selectedExamTypes ?? storeFilters.selectedExamTypes;
  const setSelectedExamTypes = dialogFilters?.setSelectedExamTypes ?? storeFilters.setSelectedExamTypes;

  const { chapters: subjectChapters, loading, error } = useTaggedChapters(subject);
  const [expandedItems, setExpandedItems] = useState<string[]>([]);
  const [hasSetDefaultSelection, setHasSetDefaultSelection] = useState(false);
  const [problemCountInput, setProblemCountInput] = useState<string>(problemCount.toString());

  const checkedItems = new Set(selectedChapters);

  // Track the source of changes to avoid infinite sync loops
  const updateSourceRef = useRef<'difficulty' | 'correctRate' | null>(null);

  // Sync input display with store value when store changes externally
  useEffect(() => {
    setProblemCountInput(problemCount.toString());
  }, [problemCount]);

  // On mount, ensure all 6 difficulty levels are selected
  useEffect(() => {
    // Check if all 6 levels are present
    const hasAll6Levels = ALL_DIFFICULTY_LEVELS.every(level => selectedDifficulties.includes(level));

    if (!hasAll6Levels) {
      setSelectedDifficulties(ALL_DIFFICULTY_LEVELS);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run only on mount

  // Sync difficulty → correct rate (when user changes difficulty, update correct rate)
  useEffect(() => {
    // Skip if the change came from correct rate slider
    if (updateSourceRef.current === 'correctRate') {
      updateSourceRef.current = null;
      return;
    }

    // Check if correct rate already matches selected difficulties
    if (doesCorrectRateMatchTaggedDifficulties(correctRateRange as [number, number], selectedDifficulties)) {
      return;
    }

    // Update correct rate range to match selected difficulties
    const newRange = getCorrectRateRangeFromTaggedDifficulties(selectedDifficulties);
    updateSourceRef.current = 'difficulty';
    setCorrectRateRange(newRange);
  }, [selectedDifficulties]); // Only depend on selectedDifficulties

  // Sync correct rate → difficulty (when user changes correct rate, update difficulty)
  useEffect(() => {
    // Skip if the change came from difficulty checkboxes
    if (updateSourceRef.current === 'difficulty') {
      updateSourceRef.current = null;
      return;
    }

    // Check if difficulties already match correct rate range
    if (doTaggedDifficultiesMatchCorrectRate(selectedDifficulties, correctRateRange as [number, number])) {
      return;
    }

    // Update difficulties to match correct rate range
    const newDifficulties = getTaggedDifficultiesFromCorrectRateRange(correctRateRange as [number, number]);
    updateSourceRef.current = 'correctRate';
    setSelectedDifficulties(newDifficulties);
  }, [correctRateRange]); // Only depend on correctRateRange

  // Reset default selection flag when subject changes
  const prevSubjectRef = useRef(subject);
  useEffect(() => {
    if (prevSubjectRef.current !== subject) {
      setHasSetDefaultSelection(false);
      prevSubjectRef.current = subject;
    }
  }, [subject]);

  // Auto-select root chapter and all children when first loaded or subject changes
  React.useEffect(() => {
    // Don't run while loading - wait for correct data
    if (loading) return;

    if (subjectChapters && subjectChapters.length > 0 && !hasSetDefaultSelection) {
      const rootChapter = subjectChapters[0]; // Root chapter for the subject (e.g., '경제', '사회문화')

      // Verify that the loaded chapters match the current subject
      // The root chapter ID should be the subject name itself
      if (rootChapter && rootChapter.id === subject) {
        // Get all child IDs recursively
        const getAllChildIds = (item: ChapterTreeItem): string[] => {
          const childIds: string[] = [];
          if (item.children && item.children.length > 0) {
            item.children.forEach((child: ChapterTreeItem) => {
              childIds.push(child.id);
              childIds.push(...getAllChildIds(child));
            });
          }
          return childIds;
        };

        const allChildIds = getAllChildIds(rootChapter);
        const itemsToAdd = [rootChapter.id, ...allChildIds];

        // Replace selectedChapters entirely when switching subjects
        setSelectedChapters(itemsToAdd);
        setHasSetDefaultSelection(true);
      }
    }
  }, [subjectChapters, hasSetDefaultSelection, setSelectedChapters, loading, subject]);

  // Show loading state
  if (loading) {
    return (
      <div className="flex-1 p-4 pt-0 min-h-0 flex items-center justify-center">
        <Loader className="animate-spin w-4 h-4" />
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="flex-1 p-4 pt-0 min-h-0 flex items-center justify-center">
        <div className="text-sm text-red-500">{subject} 단원 로드 실패: {error}</div>
      </div>
    );
  }

  // Show empty state
  if (!subjectChapters || subjectChapters.length === 0) {
    return (
      <div className="flex-1 p-4 pt-0 min-h-0 flex items-center justify-center">
        <div className="text-sm text-gray-500">{subject} 단원 정보가 없습니다.</div>
      </div>
    );
  }

  const toggleExpanded = (itemId: string) => {
    setExpandedItems(prev =>
      prev.includes(itemId) ? prev.filter(id => id !== itemId) : [...prev, itemId]
    );
  };

  const getAllChildIds = (item: ChapterTreeItem): string[] => {
    const childIds: string[] = [];
    if (item.children && item.children.length > 0) {
      item.children.forEach((child: ChapterTreeItem) => {
        childIds.push(child.id);
        childIds.push(...getAllChildIds(child));
      });
    }
    return childIds;
  };

  const areAllChildrenChecked = (item: ChapterTreeItem): boolean => {
    if (!item.children || item.children.length === 0) return false;
    return item.children.every((child: ChapterTreeItem) => {
      if (child.children && child.children.length > 0) return areAllChildrenChecked(child);
      return checkedItems.has(child.id);
    });
  };

  const areSomeChildrenChecked = (item: ChapterTreeItem): boolean => {
    if (!item.children || item.children.length === 0) return false;
    return item.children.some((child: ChapterTreeItem) => {
      if (child.children && child.children.length > 0)
        return areSomeChildrenChecked(child) || areAllChildrenChecked(child);
      return checkedItems.has(child.id);
    });
  };

  const handleYearToggle = (year: number) => {
    if (selectedYears.length === ALL_YEARS.length) {
      setSelectedYears([year]);
    } else {
      const newSelectedYears = selectedYears.includes(year)
        ? selectedYears.filter(y => y !== year)
        : [...selectedYears, year];

      if (newSelectedYears.length === 0) {
        setSelectedYears([year]);
      } else {
        setSelectedYears(newSelectedYears);
      }
    }
  };

  const handleGradeToggle = (grade: string) => {
    const allGrades = ['고1', '고2', '고3']; // Keep local since not used elsewhere

    if (selectedGrades.length === allGrades.length) {
      setSelectedGrades([grade]);
    } else {
      const newSelectedGrades = selectedGrades.includes(grade)
        ? selectedGrades.filter(g => g !== grade)
        : [...selectedGrades, grade];

      if (newSelectedGrades.length === 0) {
        setSelectedGrades([grade]);
      } else {
        setSelectedGrades(newSelectedGrades);
      }
    }
  };

  const handleMonthToggle = (month: string) => {
    if (selectedMonths.length === ALL_MONTHS.length) {
      setSelectedMonths([month]);
    } else {
      const newSelectedMonths = selectedMonths.includes(month)
        ? selectedMonths.filter(m => m !== month)
        : [...selectedMonths, month];

      if (newSelectedMonths.length === 0) {
        setSelectedMonths([month]);
      } else {
        setSelectedMonths(newSelectedMonths);
      }
    }
  };

  const handleExamTypeToggle = (examType: string) => {
    if (selectedExamTypes.length === ALL_EXAM_TYPES.length) {
      setSelectedExamTypes([examType]);
    } else {
      const newSelectedExamTypes = selectedExamTypes.includes(examType)
        ? selectedExamTypes.filter(t => t !== examType)
        : [...selectedExamTypes, examType];

      if (newSelectedExamTypes.length === 0) {
        setSelectedExamTypes([examType]);
      } else {
        setSelectedExamTypes(newSelectedExamTypes);
      }
    }
  };

  const handleCheckboxChange = (itemId: string, item: ChapterTreeItem, level: number) => {
    let newSelectedChapters: string[];
    const isCurrentlyChecked = checkedItems.has(itemId);

    if (isCurrentlyChecked) {
      // Unchecking this item
      const allChildIds = getAllChildIds(item);
      newSelectedChapters = selectedChapters.filter(
        id => id !== itemId && !allChildIds.includes(id)
      );

      // If this is a child item, also uncheck parent if any sibling is unchecked
      if (level > 0) {
        const findParent = (
          items: ChapterTreeItem[],
          targetId: string
        ): ChapterTreeItem | null => {
          for (const item of items) {
            if (item.children) {
              if (item.children.some(child => child.id === targetId)) {
                return item;
              }
              const found = findParent(item.children, targetId);
              if (found) return found;
            }
          }
          return null;
        };

        const parent = findParent(subjectChapters, itemId);
        if (parent) {
          const anySiblingUnchecked = parent.children!.some(
            sibling => !newSelectedChapters.includes(sibling.id)
          );

          if (anySiblingUnchecked) {
            newSelectedChapters = newSelectedChapters.filter(id => id !== parent.id);
          }
        }
      }
    } else {
      // Checking this item
      const allChildIds = getAllChildIds(item);
      const itemsToAdd = [itemId, ...allChildIds];
      newSelectedChapters = [
        ...selectedChapters,
        ...itemsToAdd.filter(id => !selectedChapters.includes(id))
      ];
    }

    setSelectedChapters(newSelectedChapters);
  };

  const renderTreeItem = (item: ChapterTreeItem, level: number = 0) => {
    const isExpanded = expandedItems.includes(item.id);
    const hasChildren = item.children && item.children.length > 0;
    const isChecked = checkedItems.has(item.id);
    const allChildrenChecked = hasChildren ? areAllChildrenChecked(item) : false;
    const someChildrenChecked = hasChildren ? areSomeChildrenChecked(item) : false;

    return (
      <React.Fragment key={item.id}>
        <div
          className={`min-h-[36px] flex items-center tree-item ${
            isExpanded ? 'expanded' : ''
          } cursor-pointer transition-colors duration-200`}
          onClick={() => toggleExpanded(item.id)}
        >
          <div className="flex">
            {level > 0 && <div className="w-6"></div>}
            {level > 1 && <div className="w-6"></div>}
          </div>
          <div className="flex items-center">
            {hasChildren ? (
              <div>
                <div className="tree-expanded-icon">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="24"
                    height="24"
                    fill="none"
                    viewBox="0 0 24 24"
                    className={`transition-transform ${
                      isExpanded ? 'rotate-180' : 'rotate-90'
                    }`}
                    style={{
                      width: '24px',
                      color: isExpanded ? 'rgb(112, 112, 112)' : 'rgb(192, 192, 192)'
                    }}
                  >
                    <path
                      fill="#000"
                      d="M16.586 15.5c.89 0 1.337-1.077.707-1.707l-4.586-4.586c-.39-.39-1.024-.39-1.414 0l-4.586 4.586c-.63.63-.184 1.707.707 1.707h9.172z"
                    ></path>
                  </svg>
                </div>
              </div>
            ) : (
              <div className="w-6 h-6"></div>
            )}
          </div>
          <div
            className="pl-1 flex items-center cursor-pointer hover:cursor-pointer"
            onClick={e => e.stopPropagation()}
          >
            <Checkbox
              checked={isChecked || (hasChildren ? allChildrenChecked : false)}
              ref={ref => {
                if (ref && hasChildren) {
                  (ref as HTMLInputElement).indeterminate =
                    someChildrenChecked && !allChildrenChecked;
                }
              }}
              onCheckedChange={() => handleCheckboxChange(item.id, item, level)}
            />
          </div>
          <div className="pl-2 flex items-center flex-1 text-sm">
            <span className="tree-title">{item.label}</span>
          </div>
        </div>

        {hasChildren && isExpanded && item.children && (
          <>
            {item.children.map((child: ChapterTreeItem) => (
              <React.Fragment key={child.id}>{renderTreeItem(child, level + 1)}</React.Fragment>
            ))}
          </>
        )}
      </React.Fragment>
    );
  };

  return (
    <div className="flex-1 p-4 pt-0 min-h-0">
      <div className="space-y-6">
        <Accordion type="multiple" defaultValue={["chapters", "grade", "examType", "years", "month", "difficulty", "correctRate", "problemCount"]}>
          {/* 단원 Section */}
          <AccordionItem value="chapters" className="border-none">
            <AccordionTrigger className="hover:no-underline">
              <span>단원</span>
            </AccordionTrigger>
            <AccordionContent>
              <div className="tree-container flex flex-col gap-2">
                {subjectChapters.map(item => (
                  <React.Fragment key={item.id}>{renderTreeItem(item)}</React.Fragment>
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* 학년 Section - Only 고3 available for economy */}
          <AccordionItem value="grade" className="border-none">
            <AccordionTrigger className="hover:no-underline">
              <span>학년</span>
            </AccordionTrigger>
            <AccordionContent>
              <div className="flex gap-2 flex-wrap">
                <Button
                  onClick={() => {
                    setSelectedGrades(['고3']);
                  }}
                  variant="outline"
                  className="h-auto rounded-md px-4 py-1.5 text-sm font-medium border-black text-black bg-gray-100"
                >
                  고3
                </Button>
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* 시험 유형 Section */}
          <AccordionItem value="examType" className="border-none">
            <AccordionTrigger className="hover:no-underline">
              <span>시험 유형</span>
            </AccordionTrigger>
            <AccordionContent>
              <div className="flex gap-2 flex-wrap">
                <Button
                  onClick={() => {
                    setSelectedExamTypes(ALL_EXAM_TYPES);
                  }}
                  variant="outline"
                  className={`h-auto rounded-md px-4 py-1.5 text-sm font-medium ${selectedExamTypes.length === ALL_EXAM_TYPES.length ? "border-black text-black bg-gray-100" : ""}`}
                >
                  모두
                </Button>
                {ALL_EXAM_TYPES.map((examType) => (
                  <Button
                    key={examType}
                    onClick={() => handleExamTypeToggle(examType)}
                    variant="outline"
                    className={`h-auto rounded-md px-4 py-1.5 text-sm font-medium ${selectedExamTypes.includes(examType) && selectedExamTypes.length < ALL_EXAM_TYPES.length ? "border-black text-black bg-gray-100" : ""}`}
                  >
                    {examType}
                  </Button>
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* 연도 Section */}
          <AccordionItem value="years" className="border-none">
            <AccordionTrigger className="hover:no-underline">
              <span>연도</span>
            </AccordionTrigger>
            <AccordionContent>
              <div className="flex gap-2 flex-wrap">
                <Button
                  onClick={() => {
                    setSelectedYears(ALL_YEARS);
                  }}
                  variant="outline"
                  className={`h-auto rounded-md px-4 py-1.5 text-sm font-medium ${selectedYears.length === ALL_YEARS.length ? "border-black text-black bg-gray-100" : ""}`}
                >
                  모두
                </Button>
                {ALL_YEARS.map((year) => (
                  <Button
                    key={year}
                    onClick={() => handleYearToggle(year)}
                    variant="outline"
                    className={`h-auto rounded-md px-4 py-1.5 text-sm font-medium ${selectedYears.includes(year) && selectedYears.length < ALL_YEARS.length ? "border-black text-black bg-gray-100" : ""}`}
                  >
                    {year}
                  </Button>
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* 월 Section */}
          <AccordionItem value="month" className="border-none">
            <AccordionTrigger className="hover:no-underline">
              <span>월</span>
            </AccordionTrigger>
            <AccordionContent>
              <div className="flex gap-2 flex-wrap">
                <Button
                  onClick={() => {
                    setSelectedMonths(ALL_MONTHS);
                  }}
                  variant="outline"
                  className={`h-auto rounded-md px-4 py-1.5 text-sm font-medium ${selectedMonths.length === ALL_MONTHS.length ? "border-black text-black bg-gray-100" : ""}`}
                >
                  모두
                </Button>
                {ALL_MONTHS.map((month) => (
                  <Button
                    key={month}
                    onClick={() => handleMonthToggle(month)}
                    variant="outline"
                    className={`h-auto rounded-md px-4 py-1.5 text-sm font-medium ${selectedMonths.includes(month) && selectedMonths.length < ALL_MONTHS.length ? "border-black text-black bg-gray-100" : ""}`}
                  >
                    {parseInt(month)}월
                  </Button>
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* 난이도 Section - 6 levels for tagged subjects */}
          <AccordionItem value="difficulty" className="border-none">
            <AccordionTrigger className="hover:no-underline">
              <span>난이도</span>
            </AccordionTrigger>
            <AccordionContent>
              <div className="flex gap-2 flex-wrap">
                <Button
                  onClick={() => {
                    setSelectedDifficulties(ALL_DIFFICULTY_LEVELS);
                  }}
                  variant="outline"
                  className={`h-auto rounded-md px-4 py-1.5 text-sm font-medium ${selectedDifficulties.length === ALL_DIFFICULTY_LEVELS.length ? "border-black text-black bg-gray-100" : ""}`}
                >
                  모두
                </Button>
                {ALL_DIFFICULTY_LEVELS.map((level) => (
                  <Button
                    key={level}
                    onClick={() => {
                      if (selectedDifficulties.length === ALL_DIFFICULTY_LEVELS.length) {
                        setSelectedDifficulties([level]);
                      } else {
                        const newDifficulties = selectedDifficulties.includes(level)
                          ? selectedDifficulties.filter(d => d !== level)
                          : [...selectedDifficulties, level];

                        if (newDifficulties.length === 0) {
                          setSelectedDifficulties([level]);
                        } else {
                          setSelectedDifficulties(newDifficulties);
                        }
                      }
                    }}
                    variant="outline"
                    className={`h-auto rounded-md px-4 py-1.5 text-sm font-medium ${selectedDifficulties.includes(level) && selectedDifficulties.length < ALL_DIFFICULTY_LEVELS.length ? "border-black text-black bg-gray-100" : ""}`}
                  >
                    {level}
                  </Button>
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* 정답률 Section */}
          <AccordionItem value="correctRate" className="border-none">
            <AccordionTrigger className="hover:no-underline">
              <span>정답률</span>
            </AccordionTrigger>
            <AccordionContent>
              <div className="space-y-4">
                <div className="h-9 mb-3 flex items-center max-w-md">
                  <Slider
                    value={correctRateRange}
                    onValueChange={(value) => setCorrectRateRange([value[0], value[1]])}
                    max={100}
                    min={0}
                    step={1}
                    className="w-full"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    value={correctRateRange[0]}
                    onChange={(e) => {
                      const value = parseInt(e.target.value) || 0;
                      const clampedValue = Math.max(0, Math.min(100, value));
                      setCorrectRateRange([clampedValue, correctRateRange[1]]);
                    }}
                    className="h-auto w-[80px] rounded-md px-3 py-1.5 text-sm font-medium focus-visible:ring-0 border-black"
                    placeholder="0"
                  />
                  <span className="text-sm font-medium text-black">%</span>
                  <span className="text-sm">~</span>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    value={correctRateRange[1]}
                    onChange={(e) => {
                      const value = parseInt(e.target.value) || 100;
                      const clampedValue = Math.max(0, Math.min(100, value));
                      setCorrectRateRange([correctRateRange[0], clampedValue]);
                    }}
                    className="h-auto w-[80px] rounded-md px-3 py-1.5 text-sm font-medium focus-visible:ring-0 border-black"
                    placeholder="100"
                  />
                  <span className="text-sm font-medium text-black">%</span>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* 문제 수 Section */}
          <AccordionItem value="problemCount" className="border-none">
            <AccordionTrigger className="hover:no-underline">
              <span>문제 수</span>
            </AccordionTrigger>
            <AccordionContent>
              <div className="space-y-3">
                <div className="flex gap-2 flex-wrap">
                  <Button
                    onClick={() => setProblemCount(-1)}
                    variant="outline"
                    className={`h-auto rounded-md px-4 py-1.5 text-sm font-medium ${problemCount === -1 ? "border-black text-black bg-gray-100" : ""}`}
                  >
                    전체
                  </Button>
                  {[20, 25, 30, 50, 100].map((num) => (
                    <Button
                      key={num}
                      onClick={() => setProblemCount(num)}
                      variant="outline"
                      className={`h-auto rounded-md px-4 py-1.5 text-sm font-medium ${problemCount === num ? "border-black text-black bg-gray-100" : ""}`}
                    >
                      {num}
                    </Button>
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <Input
                    type="text"
                    value={problemCount === -1 ? '전체' : problemCountInput}
                    onChange={(e) => {
                      const inputValue = e.target.value;
                      setProblemCountInput(inputValue);

                      if (inputValue === '' || inputValue === '-') {
                        return;
                      }

                      const value = parseInt(inputValue);

                      if (!isNaN(value) && (value === -1 || (value >= 1 && value <= 100))) {
                        setProblemCount(value);
                      }
                    }}
                    onBlur={(e) => {
                      const inputValue = e.target.value;
                      if (inputValue === '' || inputValue === '-') {
                        setProblemCountInput(problemCount.toString());
                      }
                    }}
                    className="h-auto w-[80px] rounded-md px-3 py-1.5 text-sm font-medium focus-visible:ring-0 border-black"
                    placeholder="1-100 or -1 for all"
                    disabled={problemCount === -1}
                  />
                  <span className="text-sm font-medium text-black">문제</span>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>
    </div>
  );
}
