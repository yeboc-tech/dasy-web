'use client';

import React, { useState, useEffect } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { useWorksheetStore } from '@/lib/zustand/worksheetStore';
import type { ChapterTreeItem } from '@/lib/types';

interface TonghapsahoeFiltersProps {
  contentTree: ChapterTreeItem[];
  selectedMainSubjects: string[];
}

export default function TonghapsahoeFilters({
  contentTree,
  selectedMainSubjects
}: TonghapsahoeFiltersProps) {
  const {
    selectedChapters,
    setSelectedChapters,
    problemCount,
    setProblemCount,
    selectedDifficulties,
    setSelectedDifficulties,
    selectedProblemTypes,
    setSelectedProblemTypes,
    selectedSubjects,
    setSelectedSubjects,
    correctRateRange,
    setCorrectRateRange,
    selectedYears,
    setSelectedYears
  } = useWorksheetStore();

  const [expandedItems, setExpandedItems] = useState<string[]>([]);
  const [problemCountInput, setProblemCountInput] = useState<string>(problemCount.toString());
  const checkedItems = new Set(selectedChapters);

  // Sync input display with store value when store changes externally
  useEffect(() => {
    setProblemCountInput(problemCount.toString());
  }, [problemCount]);

  const toggleExpanded = (itemId: string) => setExpandedItems(prev => prev.includes(itemId) ? prev.filter(id => id !== itemId) : [...prev, itemId]);

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
      if (child.children && child.children.length > 0) return areSomeChildrenChecked(child) || areAllChildrenChecked(child);
      return checkedItems.has(child.id);
    });
  };

  const handleCheckboxChange = (itemId: string, item: ChapterTreeItem, level: number) => {
    let newSelectedChapters: string[];
    const isCurrentlyChecked = checkedItems.has(itemId);

    if (isCurrentlyChecked) {
      // Unchecking this item
      const allChildIds = getAllChildIds(item);
      newSelectedChapters = selectedChapters.filter(id => id !== itemId && !allChildIds.includes(id));

      // If this is a child item, also uncheck parent if any sibling is unchecked
      if (level > 0) {
        // Find the parent item
        const findParent = (items: ChapterTreeItem[], targetId: string): ChapterTreeItem | null => {
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

        const parent = findParent(contentTree, itemId);
        if (parent) {
          // Check if any sibling is now unchecked (including the current item being unchecked)
          const anySiblingUnchecked = parent.children!.some(sibling =>
            !newSelectedChapters.includes(sibling.id)
          );

          if (anySiblingUnchecked) {
            // Remove parent from selection when any child is unchecked
            newSelectedChapters = newSelectedChapters.filter(id => id !== parent.id);
          }
        }
      }
    } else {
      // Checking this item
      const allChildIds = getAllChildIds(item);
      const itemsToAdd = [itemId, ...allChildIds];
      newSelectedChapters = [...selectedChapters, ...itemsToAdd.filter(id => !selectedChapters.includes(id))];
    }

    setSelectedChapters(newSelectedChapters);
  };

  const handleSubjectToggle = (subject: string) => {
    const allSubjects = ['생활과 윤리', '윤리와 사상', '한국지리', '세계지리', '동아시아사', '세계사', '경제', '정치와 법', '사회·문화'];

    // If all subjects are currently selected (모두 is active), start fresh with just this subject
    if (selectedSubjects.length === allSubjects.length) {
      setSelectedSubjects([subject]);
    } else {
      const newSelectedSubjects = selectedSubjects.includes(subject)
        ? selectedSubjects.filter(s => s !== subject)
        : [...selectedSubjects, subject];

      // Ensure at least one subject is always selected
      if (newSelectedSubjects.length === 0) {
        setSelectedSubjects([subject]);
      } else {
        setSelectedSubjects(newSelectedSubjects);
      }
    }
  };

  const handleYearToggle = (year: number) => {
    const allYears = [2012, 2013, 2014, 2015, 2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025];

    // If all years are currently selected (모두 is active), start fresh with just this year
    if (selectedYears.length === allYears.length) {
      setSelectedYears([year]);
    } else {
      const newSelectedYears = selectedYears.includes(year)
        ? selectedYears.filter(y => y !== year)
        : [...selectedYears, year];

      // Ensure at least one year is always selected
      if (newSelectedYears.length === 0) {
        setSelectedYears([year]);
      } else {
        setSelectedYears(newSelectedYears);
      }
    }
  };

  const renderTreeItem = (item: ChapterTreeItem, level: number = 0) => {
    const isExpanded = expandedItems.includes(item.id);
    const hasChildren = item.children && item.children.length > 0;
    const isChecked = checkedItems.has(item.id);
    const allChildrenChecked = hasChildren ? areAllChildrenChecked(item) : false;
    const someChildrenChecked = hasChildren ? areSomeChildrenChecked(item) : false;
    const isDisabled = isChapterDisabled(item);

    return (
      <React.Fragment key={item.id}>
        <div className={`min-h-[36px] flex items-center tree-item ${isExpanded ? 'expanded' : ''} ${isDisabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'} transition-colors duration-200`} onClick={() => !isDisabled && toggleExpanded(item.id)}>
          <div className="flex">
            {level > 0 && (<div className="w-6"></div>)}
            {level > 1 && (<div className="w-6"></div>)}
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
                    className={`transition-transform ${isExpanded ? 'rotate-180' : 'rotate-90'}`}
                    style={{ width: '24px', color: isExpanded ? 'rgb(112, 112, 112)' : 'rgb(192, 192, 192)' }}
                  >
                    <path fill="#000" d="M16.586 15.5c.89 0 1.337-1.077.707-1.707l-4.586-4.586c-.39-.39-1.024-.39-1.414 0l-4.586 4.586c-.63.63-.184 1.707.707 1.707h9.172z"></path>
                  </svg>
                </div>
              </div>
            ) : (
              <div className="w-6 h-6"></div>
            )}
          </div>
          <div className={`pl-1 flex items-center ${isDisabled ? 'cursor-not-allowed' : 'cursor-pointer hover:cursor-pointer'}`} onClick={(e) => e.stopPropagation()}>
            <Checkbox
              checked={isChecked || (hasChildren ? allChildrenChecked : false)}
              disabled={isDisabled}
              ref={(ref) => {
                if (ref && hasChildren) {
                  (ref as HTMLInputElement).indeterminate = someChildrenChecked && !allChildrenChecked;
                }
                if (ref && isDisabled) {
                  // Apply red styling to disabled checkboxes with opacity
                  const element = ref as HTMLElement;
                  element.style.backgroundColor = '#fef2f2'; // red-50 to match buttons
                  element.style.opacity = '0.6';
                }
              }}
              onCheckedChange={() => !isDisabled && handleCheckboxChange(item.id, item, level)}
              className={isDisabled ? 'opacity-60' : ''}
              style={isDisabled ? {
                backgroundColor: '#fef2f2',
                opacity: '0.6'
              } : {}}
            />
          </div>
          <div className="pl-2 flex items-center flex-1 text-sm">
            <span className={`tree-title ${isDisabled ? 'text-black opacity-60' : ''}`}>
              {item.label}
            </span>
          </div>
        </div>

        {hasChildren && isExpanded && item.children && (
          <>
            {item.children.map((child: ChapterTreeItem) => (<React.Fragment key={child.id}>{renderTreeItem(child, level + 1)}</React.Fragment>))}
          </>
        )}
      </React.Fragment>
    );
  };

  // Filter content tree based on selected main subjects
  const filteredContentTree = contentTree.filter(item => selectedMainSubjects.includes(item.id));

  // Define disabled chapters
  const disabledChapters = new Set([
    '03. 다양한 불평등 현상과 정의로운 사회 실현',
    'IV. 세계화와 평화',
    'V. 미래와 지속가능한 삶'
  ]);

  // Check if a chapter should be disabled
  const isChapterDisabled = (item: ChapterTreeItem): boolean => {
    return disabledChapters.has(item.label);
  };

  return (
    <div className="flex-1 p-4 pt-0 min-h-0">
      <div className="space-y-6">
        <Accordion type="multiple" defaultValue={["chapters", "subjects", "problemCount", "difficulty", "correctRate", "problemType", "years"]}>
          {/* 단원 Section */}
          <AccordionItem value="chapters" className="border-none">
            <AccordionTrigger className="hover:no-underline">
              <span>단원</span>
            </AccordionTrigger>
            <AccordionContent>
              <div className="tree-container flex flex-col gap-2">
                {filteredContentTree.map((item) => (
                  <React.Fragment key={item.id}>{renderTreeItem(item)}</React.Fragment>
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* 관련 과목 Section */}
          <AccordionItem value="subjects" className="border-none">
            <AccordionTrigger className="hover:no-underline">
              <span>관련 과목</span>
            </AccordionTrigger>
            <AccordionContent>
              <div className="flex gap-2 flex-wrap">
                <Button
                  onClick={() => {
                    const allSubjects = ['생활과 윤리', '윤리와 사상', '한국지리', '세계지리', '동아시아사', '세계사', '경제', '정치와 법', '사회·문화'];
                    setSelectedSubjects(allSubjects);
                  }}
                  variant="outline"
                  className={selectedSubjects.length === 9 ? "border-black text-black bg-gray-100" : ""}
                >
                  모두
                </Button>
                {['생활과 윤리', '경제', '정치와 법', '윤리와 사상', '한국지리', '세계지리', '동아시아사', '세계사', '사회·문화'].map((subject) => {
                  const enabledSubjects = ['정치와 법', '생활과 윤리', '경제'];
                  const isSubjectDisabled = !enabledSubjects.includes(subject);
                  return isSubjectDisabled ? (
                    <div key={subject} className="cursor-not-allowed">
                      <Button
                        onClick={() => {}} // No action for disabled
                        variant="outline"
                        disabled={true}
                        className="bg-red-50 text-black border-red-300 opacity-60 hover:bg-red-50 pointer-events-none"
                      >
                        {subject}
                      </Button>
                    </div>
                  ) : (
                    <Button
                      key={subject}
                      onClick={() => handleSubjectToggle(subject)}
                      variant="outline"
                      className={selectedSubjects.includes(subject) && selectedSubjects.length < 9 ? "border-black text-black bg-gray-100" : ""}
                    >
                      {subject}
                    </Button>
                  );
                })}
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
                    value={problemCountInput}
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
                    placeholder="1-100"
                  />
                  <span className="text-sm font-medium text-black">문제</span>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* 난이도 Section */}
          <AccordionItem value="difficulty" className="border-none">
            <AccordionTrigger className="hover:no-underline">
              <span>난이도</span>
            </AccordionTrigger>
            <AccordionContent>
              <div className="flex gap-2">
                <Button
                  onClick={() => {
                    setSelectedDifficulties(['상', '중', '하']);
                  }}
                  variant="outline"
                  className={selectedDifficulties.length === 3 ? "border-black text-black bg-gray-100" : ""}
                >
                  모두
                </Button>
                {['상', '중', '하'].map((level) => (
                  <Button
                    key={level}
                    onClick={() => {
                      if (selectedDifficulties.length === 3) {
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
                    className={selectedDifficulties.includes(level) && selectedDifficulties.length < 3 ? "border-black text-black bg-gray-100" : ""}
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

          {/* 문제 타입 Section */}
          <AccordionItem value="problemType" className="border-none">
            <AccordionTrigger className="hover:no-underline">
              <span>문제 타입</span>
            </AccordionTrigger>
            <AccordionContent>
              <div className="flex gap-2">
                <Button
                  onClick={() => {
                    setSelectedProblemTypes(['기출문제', 'N제']);
                  }}
                  variant="outline"
                  className={selectedProblemTypes.length === 2 ? "border-black text-black bg-gray-100" : ""}
                >
                  모두
                </Button>
                {['기출문제', 'N제'].map((type) => {
                  const isNjeDisabled = type === 'N제';
                  return isNjeDisabled ? (
                      <div key={type} className="cursor-not-allowed">
                        <Button
                          onClick={() => {}}
                          variant="outline"
                          disabled={true}
                          className="bg-red-50 text-black border-red-300 opacity-60 hover:bg-red-50 pointer-events-none"
                        >
                          {type}
                        </Button>
                      </div>
                    ) : (
                      <Button
                        key={type}
                        onClick={() => {
                          if (selectedProblemTypes.length === 2) {
                            setSelectedProblemTypes([type]);
                          } else {
                            const newTypes = selectedProblemTypes.includes(type)
                              ? selectedProblemTypes.filter(t => t !== type)
                              : [...selectedProblemTypes, type];

                            if (newTypes.length === 0) {
                              setSelectedProblemTypes([type]);
                            } else {
                              setSelectedProblemTypes(newTypes);
                            }
                          }
                        }}
                        variant="outline"
                        className={selectedProblemTypes.includes(type) && selectedProblemTypes.length < 2 ? "border-black text-black bg-gray-100" : ""}
                      >
                        {type}
                      </Button>
                    );
                })}
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
                    const allYears = [2012, 2013, 2014, 2015, 2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025];
                    setSelectedYears(allYears);
                  }}
                  variant="outline"
                  className={selectedYears.length === 14 ? "border-black text-black bg-gray-100" : ""}
                >
                  모두
                </Button>
                {[2012, 2013, 2014, 2015, 2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025].map((year) => (
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
        </Accordion>
      </div>
    </div>
  );
}
