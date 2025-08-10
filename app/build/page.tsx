'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Card } from '@/components/ui/card';
import { useWorksheetStore } from '@/lib/zustand/worksheetStore';
import { contentTree } from '@/lib/global';

const actualProblems = [
  { id: 1, name: "문제1_하.png", chapter: "통합사회_1권_1단원", difficulty: "하", imagePath: "/problems/통합사회_1권_1단원/문제1_하.png" },
  { id: 2, name: "문제2_하.png", chapter: "통합사회_1권_1단원", difficulty: "하", imagePath: "/problems/통합사회_1권_1단원/문제2_하.png" },
  { id: 3, name: "문제3_하.png", chapter: "통합사회_1권_1단원", difficulty: "하", imagePath: "/problems/통합사회_1권_1단원/문제3_하.png" },
  { id: 4, name: "문제4_하.png", chapter: "통합사회_1권_1단원", difficulty: "하", imagePath: "/problems/통합사회_1권_1단원/문제4_하.png" },
  { id: 5, name: "문제5_하.png", chapter: "통합사회_1권_1단원", difficulty: "하", imagePath: "/problems/통합사회_1권_1단원/문제5_하.png" },
  { id: 6, name: "문제10_하.png", chapter: "통합사회_1권_1단원", difficulty: "하", imagePath: "/problems/통합사회_1권_1단원/문제10_하.png" },
  { id: 7, name: "문제11_중.png", chapter: "통합사회_1권_1단원", difficulty: "중", imagePath: "/problems/통합사회_1권_1단원/문제11_중.png" },
  { id: 8, name: "문제12_중.png", chapter: "통합사회_1권_1단원", difficulty: "중", imagePath: "/problems/통합사회_1권_1단원/문제12_중.png" },
  { id: 9, name: "문제13_중.png", chapter: "통합사회_1권_1단원", difficulty: "중", imagePath: "/problems/통합사회_1권_1단원/문제13_중.png" },
  { id: 10, name: "문제22_상.png", chapter: "통합사회_1권_1단원", difficulty: "상", imagePath: "/problems/통합사회_1권_1단원/문제22_상.png" },
];

export default function Page() {
  const router = useRouter();
  
  const {selectedChapters, setSelectedChapters, problemCount, setProblemCount, difficulty, setDifficulty, problemType, setProblemType, selectedSubjects, setSelectedSubjects} = useWorksheetStore();
  const [expandedItems, setExpandedItems] = useState<string[]>([]);
  const checkedItems = new Set(selectedChapters);

  const toggleExpanded = (itemId: string) => setExpandedItems(prev => prev.includes(itemId) ? prev.filter(id => id !== itemId): [...prev, itemId])

  const getAllChildIds = (item: any): string[] => {
    const childIds: string[] = [];
    if (item.children && item.children.length > 0) {
      item.children.forEach((child: any) => {
        childIds.push(child.id);
        childIds.push(...getAllChildIds(child));
      });
    }
    return childIds;
  };

  const areAllChildrenChecked = (item: any): boolean => {
    if (!item.children || item.children.length === 0) return false;
    return item.children.every((child: any) => {
      if (child.children && child.children.length > 0) return areAllChildrenChecked(child);
      return checkedItems.has(child.id);
    });
  };

  const areSomeChildrenChecked = (item: any): boolean => {
    if (!item.children || item.children.length === 0) return false;
    return item.children.some((child: any) => {
      if (child.children && child.children.length > 0) return areSomeChildrenChecked(child) || areAllChildrenChecked(child);
      return checkedItems.has(child.id);
    });
  };

  const handleCheckboxChange = (itemId: string, item: any, level: number) => {
    if (level !== 0 && level !== 1) return;
    
    if (level === 1) {
      const parentChapter = itemId.split('_').slice(0, 3).join('_');
      const disallowedChapters = ['통합사회_1권_1단원', '통합사회_1권_2단원'];
      if (disallowedChapters.includes(parentChapter)) return;
    }
    
    let newSelectedChapters: string[];
    const isCurrentlyChecked = checkedItems.has(itemId);
    
    if (isCurrentlyChecked) {
      const allChildIds = getAllChildIds(item);
      newSelectedChapters = selectedChapters.filter(id => id !== itemId && !allChildIds.includes(id));
    } else {
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
    setSelectedSubjects(newSelectedSubjects);
  };

  const renderTreeItem = (item: any, level: number = 0) => {
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
              disabled={!isTopLevel && (level !== 1 || ['통합사회_1권_1단원', '통합사회_1권_2단원'].includes(item.id.split('_').slice(0, 3).join('_')))}
              onCheckedChange={() => handleCheckboxChange(item.id, item, level)}
            />
          </div>
          <div className="pl-2 flex items-center flex-1 text-sm"><span className="tree-title">{item.label}</span></div>
        </div>
        
        {hasChildren && isExpanded && (
          <>
            {item.children.map((child: any) => (<React.Fragment key={child.id}>{renderTreeItem(child, level + 1)}</React.Fragment>))}
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
    params.set('difficulty', difficulty);
    params.set('problemType', problemType);
    router.push(`/configure?${params.toString()}`);
  };

  return (
    <div className="px-4 pt-2 pb-6 max-w-4xl mx-auto w-full h-full">
      <Card className="p-0 h-full flex flex-row gap-0 overflow-hidden">
        {/* Left Panel - Filter Panel */}
        <div className="w-1/2 flex flex-col min-h-0 overflow-y-scroll">
          {/* <h2 className="sticky top-0 z-10 bg-white p-4 text-lg font-semibold">필터</h2> */}
          
          <div className="flex-1 p-4 pt-0 min-h-0">
            <div className="space-y-6">
              <Accordion type="multiple" defaultValue={["chapters", "subjects", "problemCount", "difficulty", "problemType"]}>
                {/* 단원·유형별 Section */}
                <AccordionItem value="chapters" className="border-none">
                  <AccordionTrigger className="hover:no-underline">
                    <span>단원</span>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="tree-container flex flex-col gap-2">{contentTree.map((item) => (<React.Fragment key={item.id}>{renderTreeItem(item)}</React.Fragment>))}</div>
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
                    <div className="flex gap-2">{['하', '중', '상', '모두'].map((level) => (<Button key={level} onClick={() => setDifficulty(level)} variant="outline" className={difficulty === level ? "border-black text-black bg-gray-100" : ""}>{level}</Button>))}</div>
                  </AccordionContent>
                </AccordionItem>

                {/* 문제 타입 Section */}
                <AccordionItem value="problemType" className="border-none">
                  <AccordionTrigger className="hover:no-underline">
                    <span>문제 타입</span>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="flex gap-2">{['기출문제', 'N제', '모두'].map((type) => (<Button key={type} onClick={() => setProblemType(type)} variant="outline" className={problemType === type ? "border-black text-black bg-gray-100" : ""}>{type}</Button>))}</div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </div>
          </div>
        </div>

        {/* Right Panel - Problems Panel */}
        <div className="w-1/2 flex flex-col min-h-0 overflow-y-scroll">
          {/* <h2 className="sticky top-0 z-10 bg-white p-4 text-lg font-semibold">문제</h2> */}
          
          <div className="flex-1 min-h-0">
            <div className="space-y-4">
              {actualProblems.map((problem) => (
                <div key={problem.id} className="w-full p-4">
                  <Image 
                    src={problem.imagePath} 
                    alt={problem.name}
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
          </div>
        </div>
      </Card>
    </div>
  );
}
