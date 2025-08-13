'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Loader } from "lucide-react";
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Card } from '@/components/ui/card';
import { useWorksheetStore } from '@/lib/zustand/worksheetStore';
import { useChapters } from '@/lib/hooks/useChapters';
import type { ChapterTreeItem } from '@/lib/supabase/services/services';

// Types for our metadata
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
  related_subjects: string[]; // Array of related subjects
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface MetadataFile {
  problems: ProblemMetadata[];
  metadata: {
    total_problems: number;
    subjects: Array<{ id: string; name: string }>;
    chapters: Array<{ id: string; name: string; subject_id: string }>;
    difficulties: string[];
    problem_types: string[];
    exam_types: string[];
    years: number[];
    created_at: string;
    version: string;
  };
}

export default function Page() {
  const router = useRouter();
  
  const {selectedChapters, setSelectedChapters, problemCount, setProblemCount, selectedDifficulties, setSelectedDifficulties, selectedProblemTypes, setSelectedProblemTypes, selectedSubjects, setSelectedSubjects} = useWorksheetStore();
  const [expandedItems, setExpandedItems] = useState<string[]>([]);
  const [selectedMainSubjects, setSelectedMainSubjects] = useState<string[]>(['통합사회_1']);
  const checkedItems = new Set(selectedChapters);
  
  // State for metadata and filtered problems
  const [metadata, setMetadata] = useState<MetadataFile | null>(null);
  const [filteredProblems, setFilteredProblems] = useState<ProblemMetadata[]>([]);
  const [metadataLoading, setMetadataLoading] = useState(true);
  const [metadataError, setMetadataError] = useState<string | null>(null);
  
  // Fetch chapters from database
  const { chapters: contentTree, loading: chaptersLoading, error: chaptersError } = useChapters();

  const toggleExpanded = (itemId: string) => setExpandedItems(prev => prev.includes(itemId) ? prev.filter(id => id !== itemId): [...prev, itemId])

  // Load metadata on component mount
  useEffect(() => {
    const loadMetadata = async () => {
      try {
        setMetadataLoading(true);
        const response = await fetch('/dummies/problems-metadata.json');
        if (!response.ok) {
          throw new Error('Failed to load metadata');
        }
        const data: MetadataFile = await response.json();
        setMetadata(data);
        setFilteredProblems(data.problems);
      } catch (error) {
        console.error('Error loading metadata:', error);
        setMetadataError(error instanceof Error ? error.message : 'Unknown error');
      } finally {
        setMetadataLoading(false);
      }
    };

    loadMetadata();
  }, []);

  // Filter problems based on selected criteria
  useEffect(() => {

    
    if (!metadata) return;

    let filtered = metadata.problems.filter(problem => problem.is_active);

    // Filter by difficulty (multi-select)
    if (selectedDifficulties.length > 0 && selectedDifficulties.length < 3) {
      filtered = filtered.filter(problem => selectedDifficulties.includes(problem.difficulty));
    }

    // Filter by problem type (multi-select)
    if (selectedProblemTypes.length > 0 && selectedProblemTypes.length < 2) {
      filtered = filtered.filter(problem => selectedProblemTypes.includes(problem.problem_type));
    }

    // Filter by selected chapters (using chapter names since database uses UUIDs)
    if (selectedChapters.length > 0) {
      // Get chapter names from the database chapters
      const selectedChapterNames: string[] = [];
      
      // Helper function to get chapter names recursively
      const getChapterNames = (chapters: ChapterTreeItem[], selectedIds: string[]) => {
        chapters.forEach(chapter => {
          if (selectedIds.includes(chapter.id)) {
            // If this is a parent chapter, get all its child chapter names
            if (chapter.children && chapter.children.length > 0) {
              chapter.children.forEach(child => {
                selectedChapterNames.push(child.label);
                // Also get grandchildren if they exist
                if (child.children && child.children.length > 0) {
                  child.children.forEach(grandchild => {
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
      
      // Debug logging
      
      
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
      console.log('No chapters selected, showing no problems');
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

    // Limit to problemCount
    filtered = filtered.slice(0, problemCount);



    setFilteredProblems(filtered);
  }, [metadata, selectedDifficulties, selectedProblemTypes, selectedChapters, selectedSubjects, problemCount, contentTree]);



  const getAllChildIds = (item: ChapterTreeItem): string[] => {
    const childIds: string[] = [];
    if (item.children && item.children.length > 0) {
      item.children.forEach((child: any) => {
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

  const handleMainSubjectToggle = (subject: string) => {
    const newSelectedMainSubjects = selectedMainSubjects.includes(subject)
      ? selectedMainSubjects.filter(s => s !== subject)
      : [...selectedMainSubjects, subject];
    
    // Ensure at least one subject is always selected
    if (newSelectedMainSubjects.length === 0) {
      setSelectedMainSubjects([subject]);
    } else {
      setSelectedMainSubjects(newSelectedMainSubjects);
    }
  };

  const renderTreeItem = (item: ChapterTreeItem, level: number = 0) => {
    const isExpanded = expandedItems.includes(item.id);
    const hasChildren = item.children && item.children.length > 0;
    const isChecked = checkedItems.has(item.id);
    const allChildrenChecked = hasChildren ? areAllChildrenChecked(item) : false;
    const someChildrenChecked = hasChildren ? areSomeChildrenChecked(item) : false;
    const isTopLevel = level === 0;

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

  const handleNextStep = () => {
    const params = new URLSearchParams();
    if (selectedChapters.length > 0) params.set('selectedChapters', selectedChapters.join(','));
    if (selectedSubjects.length > 0) params.set('selectedSubjects', selectedSubjects.join(','));
    params.set('problemCount', String(problemCount));
    params.set('selectedDifficulties', selectedDifficulties.join(','));
    params.set('selectedProblemTypes', selectedProblemTypes.join(','));
    router.push(`/configure?${params.toString()}`);
  };



  // Filter content tree based on selected main subjects
  const filteredContentTree = contentTree.filter(item => selectedMainSubjects.includes(item.id));

  return (
    <div className="px-4 pt-2 pb-6 max-w-4xl mx-auto w-full h-full">
      <Card className="p-0 h-full flex flex-row gap-0 overflow-hidden relative">
        {/* Loading overlay */}
        {chaptersLoading && (
          <div className="absolute inset-0 flex items-center justify-center z-10 bg-white bg-opacity-70">
            <Loader className="animate-spin w-4 h-4" />
          </div>
        )}
        
        {/* Error overlay */}
        {chaptersError && (
          <div className="absolute inset-0 flex items-center justify-center z-10 bg-white">
            <div className="text-center text-gray-600">
              단원 정보를 불러오는 중 오류가 발생했습니다.
            </div>
          </div>
        )}
        
        {/* Left Panel - Filter Panel */}
        <div className="w-1/2 flex flex-col min-h-0 overflow-y-scroll border-r border-gray-200">
          {/* Subject Filter Bar */}
          <div className="bg-white border-b border-gray-200 px-4 py-3">
            <div className="flex gap-2">
              <Button
                onClick={() => handleMainSubjectToggle('통합사회_1')}
                variant="outline"
                className={`rounded-full px-6 py-2 text-sm font-medium transition-all ${
                  selectedMainSubjects.includes('통합사회_1')
                    ? 'border-black text-black bg-gray-100'
                    : 'bg-white text-black border-gray-300 hover:bg-gray-50'
                }`}
              >
                통합사회 1
              </Button>
              <Button
                onClick={() => handleMainSubjectToggle('통합사회_2')}
                variant="outline"
                className={`rounded-full px-6 py-2 text-sm font-medium transition-all ${
                  selectedMainSubjects.includes('통합사회_2')
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
                    <div className="tree-container flex flex-col gap-2">{filteredContentTree.map((item) => (<React.Fragment key={item.id}>{renderTreeItem(item)}</React.Fragment>))}</div>
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

        {/* Right Panel - Problems Panel */}
        <div className="w-1/2 flex flex-col min-h-0 overflow-y-scroll">
          {/* Loading overlay for metadata */}
          {metadataLoading && (
            <div className="absolute inset-0 flex items-center justify-center z-10 bg-white bg-opacity-70">
              <Loader className="animate-spin w-4 h-4" />
            </div>
          )}
          
          {/* Error overlay for metadata */}
          {metadataError && (
            <div className="absolute inset-0 flex items-center justify-center z-10 bg-white">
              <div className="text-center text-gray-600">
                문제 데이터를 불러오는 중 오류가 발생했습니다.
              </div>
            </div>
          )}
          
          <div className="flex-1 min-h-0">
            {filteredProblems.length === 0 ? (
              <div className="flex items-center justify-center h-full text-gray-500 text-sm">
                선택한 조건에 맞는 문제가 없습니다.
              </div>
            ) : (
              <div className="">
                {filteredProblems.map((problem: ProblemMetadata) => (
                  <div key={problem.id} className="w-full p-4 pb-6 border-b border-gray-200">
                    <div className="text-xs mb-1">
                      <span className="font-medium">{problem.chapter_name}</span> • {problem.difficulty} • {problem.problem_type}
                      {problem.exam_type && ` • ${problem.exam_type}`}
                    </div>
                    <Image 
                      src={`/dummies/${problem.filename}`} 
                      alt={problem.filename}
                      width={800}
                      height={600}
                      className="w-full h-auto object-contain"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                      }}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}
