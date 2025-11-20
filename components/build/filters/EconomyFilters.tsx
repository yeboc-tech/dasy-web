'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { useWorksheetStore } from '@/lib/zustand/worksheetStore';
import { useEconomyChapters } from '@/lib/hooks/useEconomyChapters';
import type { ChapterTreeItem } from '@/lib/types';
import { Loader } from 'lucide-react';
import {
  getCorrectRateRangeFromEconomyDifficulties,
  getEconomyDifficultiesFromCorrectRateRange,
  doesCorrectRateMatchEconomyDifficulties,
  doEconomyDifficultiesMatchCorrectRate
} from '@/lib/utils/economyDifficultySync';

export default function EconomyFilters() {
  const {
    selectedChapters,
    setSelectedChapters,
    problemCount,
    setProblemCount,
    selectedDifficulties,
    setSelectedDifficulties,
    correctRateRange,
    setCorrectRateRange,
    selectedYears,
    setSelectedYears,
    selectedGrades,
    setSelectedGrades,
    selectedMonths,
    setSelectedMonths,
    selectedExamTypes,
    setSelectedExamTypes
  } = useWorksheetStore();

  const { chapters: economyChapters, loading, error } = useEconomyChapters();
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

  // On mount, ensure all 6 economy difficulty levels are selected
  useEffect(() => {
    const economyLevels = ['최상', '상', '중상', '중', '중하', '하'];

    // Check if all 6 levels are present
    const hasAll6Levels = economyLevels.every(level => selectedDifficulties.includes(level));

    if (!hasAll6Levels) {
      setSelectedDifficulties(economyLevels);
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
    if (doesCorrectRateMatchEconomyDifficulties(correctRateRange as [number, number], selectedDifficulties)) {
      return;
    }

    // Update correct rate range to match selected difficulties
    const newRange = getCorrectRateRangeFromEconomyDifficulties(selectedDifficulties);
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
    if (doEconomyDifficultiesMatchCorrectRate(selectedDifficulties, correctRateRange as [number, number])) {
      return;
    }

    // Update difficulties to match correct rate range
    const newDifficulties = getEconomyDifficultiesFromCorrectRateRange(correctRateRange as [number, number]);
    updateSourceRef.current = 'correctRate';
    setSelectedDifficulties(newDifficulties);
  }, [correctRateRange]); // Only depend on correctRateRange

  // Auto-select 경제 root chapter and all children when first loaded
  React.useEffect(() => {
    if (economyChapters && economyChapters.length > 0 && !hasSetDefaultSelection) {
      const rootChapter = economyChapters[0]; // Should be "경제"

      if (rootChapter) {
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
        const newSelectedChapters = [...selectedChapters, ...itemsToAdd.filter(id => !selectedChapters.includes(id))];

        setSelectedChapters(newSelectedChapters);
        setHasSetDefaultSelection(true);
      }
    }
  }, [economyChapters, hasSetDefaultSelection, setSelectedChapters, selectedChapters]);

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
        <div className="text-sm text-red-500">경제 단원 로드 실패: {error}</div>
      </div>
    );
  }

  // Show empty state
  if (!economyChapters || economyChapters.length === 0) {
    return (
      <div className="flex-1 p-4 pt-0 min-h-0 flex items-center justify-center">
        <div className="text-sm text-gray-500">경제 단원 정보가 없습니다.</div>
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
    const allYears = Array.from({ length: 2025 - 2012 + 1 }, (_, i) => 2012 + i);

    if (selectedYears.length === allYears.length) {
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
    const allGrades = ['고1', '고2', '고3'];

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
    const allMonths = ['03', '04', '05', '06', '07', '08', '09', '10', '11', '12'];

    if (selectedMonths.length === allMonths.length) {
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
    const allExamTypes = ['학평', '모평', '수능'];

    if (selectedExamTypes.length === allExamTypes.length) {
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

        const parent = findParent(economyChapters, itemId);
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
                {economyChapters.map(item => (
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
                  className="border-black text-black bg-gray-100"
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
                    setSelectedExamTypes(['학평', '모평', '수능']);
                  }}
                  variant="outline"
                  className={selectedExamTypes.length === 3 ? "border-black text-black bg-gray-100" : ""}
                >
                  모두
                </Button>
                {['학평', '모평', '수능'].map((examType) => (
                  <Button
                    key={examType}
                    onClick={() => handleExamTypeToggle(examType)}
                    variant="outline"
                    className={selectedExamTypes.includes(examType) && selectedExamTypes.length < 3 ? "border-black text-black bg-gray-100" : ""}
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
                    const allYears = Array.from({ length: 2025 - 2012 + 1 }, (_, i) => 2012 + i);
                    setSelectedYears(allYears);
                  }}
                  variant="outline"
                  className={selectedYears.length === 14 ? "border-black text-black bg-gray-100" : ""}
                >
                  모두
                </Button>
                {Array.from({ length: 2025 - 2012 + 1 }, (_, i) => 2012 + i).map((year) => (
                  <Button
                    key={year}
                    onClick={() => handleYearToggle(year)}
                    variant="outline"
                    className={selectedYears.includes(year) && selectedYears.length < 14 ? "border-black text-black bg-gray-100" : ""}
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
                    setSelectedMonths(['03', '04', '05', '06', '07', '08', '09', '10', '11', '12']);
                  }}
                  variant="outline"
                  className={selectedMonths.length === 10 ? "border-black text-black bg-gray-100" : ""}
                >
                  모두
                </Button>
                {['03', '04', '05', '06', '07', '08', '09', '10', '11', '12'].map((month) => (
                  <Button
                    key={month}
                    onClick={() => handleMonthToggle(month)}
                    variant="outline"
                    className={selectedMonths.includes(month) && selectedMonths.length < 10 ? "border-black text-black bg-gray-100" : ""}
                  >
                    {parseInt(month)}월
                  </Button>
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* 난이도 Section - 6 levels for economy */}
          <AccordionItem value="difficulty" className="border-none">
            <AccordionTrigger className="hover:no-underline">
              <span>난이도</span>
            </AccordionTrigger>
            <AccordionContent>
              <div className="flex gap-2 flex-wrap">
                <Button
                  onClick={() => {
                    setSelectedDifficulties(['최상', '상', '중상', '중', '중하', '하']);
                  }}
                  variant="outline"
                  className={selectedDifficulties.length === 6 ? "border-black text-black bg-gray-100" : ""}
                >
                  모두
                </Button>
                {['최상', '상', '중상', '중', '중하', '하'].map((level) => (
                  <Button
                    key={level}
                    onClick={() => {
                      if (selectedDifficulties.length === 6) {
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
                    className={selectedDifficulties.includes(level) && selectedDifficulties.length < 6 ? "border-black text-black bg-gray-100" : ""}
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
                <div className="h-9 mb-3 flex items-center">
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
                    className="w-[80px] focus-visible:ring-0 border-black"
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
                    className="w-[80px] focus-visible:ring-0 border-black"
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
                    className={problemCount === -1 ? "border-black text-black bg-gray-100" : ""}
                  >
                    전체
                  </Button>
                  {[20, 25, 30, 50, 100].map((num) => (
                    <Button
                      key={num}
                      onClick={() => setProblemCount(num)}
                      variant="outline"
                      className={problemCount === num ? "border-black text-black bg-gray-100" : ""}
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
                    className="w-[80px] focus-visible:ring-0 border-black"
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
