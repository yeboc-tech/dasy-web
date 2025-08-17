'use client';

import React, { useState } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { useWorksheetStore } from '@/lib/zustand/worksheetStore';
import type { ChapterTreeItem } from '@/lib/types';
import { Loader } from 'lucide-react';

interface FilterPanelProps {
  contentTree: ChapterTreeItem[];
  selectedMainSubjects: string[];
  onMainSubjectToggle: (subject: string) => void;
  loading?: boolean;
  error?: string | null;
}

export default function FilterPanel({ 
  contentTree, 
  selectedMainSubjects, 
  onMainSubjectToggle,
  loading = false,
  error = null
}: FilterPanelProps) {
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
    setSelectedSubjects
  } = useWorksheetStore();

  const [expandedItems, setExpandedItems] = useState<string[]>([]);
  const checkedItems = new Set(selectedChapters);

  // Handle loading and error states
  if (loading) {
    return (
      <div className="w-1/2 flex flex-col min-h-0 overflow-y-scroll border-r border-gray-200">
        <div className="flex items-center justify-center h-full">
          <Loader className="animate-spin w-4 h-4" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-1/2 flex flex-col min-h-0 overflow-y-scroll border-r border-gray-200">
        <div className="flex items-center justify-center h-full">
          <div className="text-sm text-red-500">단원 정보 로드 실패: {error}</div>
        </div>
      </div>
    );
  }

  if (!contentTree || contentTree.length === 0) {
    return (
      <div className="w-1/2 flex flex-col min-h-0 overflow-y-scroll border-r border-gray-200">
        <div className="flex items-center justify-center h-full">
          <div className="text-sm text-gray-500">단원 정보가 없습니다.</div>
        </div>
      </div>
    );
  }

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
    const newSelectedSubjects = selectedSubjects.includes(subject)
      ? selectedSubjects.filter(s => s !== subject)
      : [...selectedSubjects, subject];
    
    // Ensure at least one subject is always selected
    if (newSelectedSubjects.length === 0) {
      setSelectedSubjects([subject]);
    } else {
      setSelectedSubjects(newSelectedSubjects);
    }
  };

  const renderTreeItem = (item: ChapterTreeItem, level: number = 0) => {
    const isExpanded = expandedItems.includes(item.id);
    const hasChildren = item.children && item.children.length > 0;
    const isChecked = checkedItems.has(item.id);
    const allChildrenChecked = hasChildren ? areAllChildrenChecked(item) : false;
    const someChildrenChecked = hasChildren ? areSomeChildrenChecked(item) : false;

    return (
      <React.Fragment key={item.id}>
        <div className={`min-h-[36px] flex items-center tree-item ${isExpanded ? 'expanded' : ''} cursor-pointer transition-colors duration-200`} onClick={() => toggleExpanded(item.id)}>
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
          <div className="cursor-pointer pl-1 flex items-center hover:cursor-pointer" onClick={(e) => e.stopPropagation()}>
            <Checkbox 
              checked={hasChildren ? allChildrenChecked : isChecked}
              ref={(ref) => {
                if (ref && hasChildren) {
                  (ref as HTMLInputElement).indeterminate = someChildrenChecked && !allChildrenChecked;
                }
              }}
              onCheckedChange={() => handleCheckboxChange(item.id, item, level)}
            />
          </div>
          <div className="pl-2 flex items-center flex-1 text-sm"><span className="tree-title">{item.label}</span></div>
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

  return (
    <div className="w-1/2 flex flex-col min-h-0 overflow-y-scroll border-r border-gray-200">
      {/* Subject Filter Bar */}
      <div className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="flex gap-2">
          <Button
            onClick={() => onMainSubjectToggle('e9393ef5-954d-41a8-b3cd-0b3c07d4143e')} // 통합사회 1 database ID
            variant="outline"
            className={`rounded-full px-6 py-2 text-sm font-medium transition-all ${
              selectedMainSubjects.includes('e9393ef5-954d-41a8-b3cd-0b3c07d4143e')
                ? 'border-black text-black bg-gray-100'
                : 'bg-white text-black border-gray-300 hover:bg-gray-50'
            }`}
          >
            통합사회 1
          </Button>
          <Button
            onClick={() => onMainSubjectToggle('7ec63358-5e6b-49be-89a4-8b5639f3f9c0')} // 통합사회 2 database ID
            variant="outline"
            className={`rounded-full px-6 py-2 text-sm font-medium transition-all ${
              selectedMainSubjects.includes('7ec63358-5e6b-49be-89a4-8b5639f3f9c0')
                ? 'border-black text-black bg-gray-100'
                : 'bg-white text-black border-gray-300 hover:bg-gray-50'
            }`}
          >
            통합사회 2
          </Button>
        </div>
      </div>
      
      <div className="flex-1 p-4 pt-0 min-h-0">
        <div className="space-y-6">
          <Accordion type="multiple" defaultValue={["chapters", "subjects", "problemCount", "difficulty", "problemType"]}>
            {/* 단원·유형별 Section */}
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
                  {['생활과 윤리', '윤리와 사상', '한국지리', '세계지리', '동아시아사', '세계사', '경제', '정치와 법', '사회·문화'].map((subject) => (
                    <Button 
                      key={subject} 
                      onClick={() => handleSubjectToggle(subject)} 
                      variant="outline"
                      className={selectedSubjects.includes(subject) ? "border-black text-black bg-gray-100" : ""}
                    >
                      {subject}
                    </Button>
                  ))}
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
                      type="number"
                      max="100"
                      value={problemCount}
                      onChange={(e) => {
                        const value = parseInt(e.target.value);
                        if (value <= 100) {
                          setProblemCount(value);
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
                  {['하', '중', '상'].map((level) => (
                    <Button 
                      key={level} 
                      onClick={() => {
                        const newDifficulties = selectedDifficulties.includes(level)
                          ? selectedDifficulties.filter(d => d !== level)
                          : [...selectedDifficulties, level];
                        
                        // Ensure at least one difficulty is always selected
                        if (newDifficulties.length === 0) {
                          setSelectedDifficulties([level]);
                        } else {
                          setSelectedDifficulties(newDifficulties);
                        }
                      }} 
                      variant="outline" 
                      className={selectedDifficulties.includes(level) ? "border-black text-black bg-gray-100" : ""}
                    >
                      {level}
                    </Button>
                  ))}
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
                  {['기출문제', 'N제'].map((type) => (
                    <Button 
                      key={type} 
                      onClick={() => {
                        const newTypes = selectedProblemTypes.includes(type)
                          ? selectedProblemTypes.filter(t => t !== type)
                          : [...selectedProblemTypes, type];
                        
                        // Ensure at least one problem type is always selected
                        if (newTypes.length === 0) {
                          setSelectedProblemTypes([type]);
                        } else {
                          setSelectedProblemTypes(newTypes);
                        }
                      }} 
                      variant="outline" 
                      className={selectedProblemTypes.includes(type) ? "border-black text-black bg-gray-100" : ""}
                    >
                      {type}
                    </Button>
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      </div>
    </div>
  );
}
