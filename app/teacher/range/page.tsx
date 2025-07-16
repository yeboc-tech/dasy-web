'use client';

import React, { useState } from 'react';
import { contentTree } from '@/lib/global';
import { Checkbox } from '@/components/ui/checkbox';
import { Slider } from '@/components/ui/slider';
import { useWorksheetStore } from '@/lib/zustand/worksheetStore';
import { useRouter } from 'next/navigation';

export default function Page() {
  const {selectedChapters, setSelectedChapters, problemCount, setProblemCount, difficulty, setDifficulty, problemType, setProblemType} = useWorksheetStore();
  const [expandedItems, setExpandedItems] = useState<string[]>(['통합사회_1권_1단원_2']);
  const checkedItems = new Set(selectedChapters);
  const router = useRouter();

  const toggleExpanded = (itemId: string) => {
    setExpandedItems(prev => prev.includes(itemId) 
        ? prev.filter(id => id !== itemId)
        : [...prev, itemId]
    );
  };

  // Get all child IDs recursively
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

  // Check if all children are checked
  const areAllChildrenChecked = (item: any): boolean => {
    if (!item.children || item.children.length === 0) return false;
    return item.children.every((child: any) => {
      if (child.children && child.children.length > 0) {
        return areAllChildrenChecked(child);
      }
      return checkedItems.has(child.id);
    });
  };

  // Check if some children are checked (for indeterminate state)
  const areSomeChildrenChecked = (item: any): boolean => {
    if (!item.children || item.children.length === 0) return false;
    return item.children.some((child: any) => {
      if (child.children && child.children.length > 0) {
        return areSomeChildrenChecked(child) || areAllChildrenChecked(child);
      }
      return checkedItems.has(child.id);
    });
  };

  const handleCheckboxChange = (itemId: string, item: any, level: number) => {
    // Only allow checking/unchecking for top-level categories (level 0)
    if (level !== 0) return;
    
    let newSelectedChapters: string[];
    const isCurrentlyChecked = checkedItems.has(itemId);
    
    if (isCurrentlyChecked) {
      // Remove this item and all its children
      const allChildIds = getAllChildIds(item);
      newSelectedChapters = selectedChapters.filter(id => id !== itemId && !allChildIds.includes(id));
    } else {
      // Add this item and all its children
      const allChildIds = getAllChildIds(item);
      const itemsToAdd = [itemId, ...allChildIds];
      newSelectedChapters = [...selectedChapters, ...itemsToAdd.filter(id => !selectedChapters.includes(id))];
    }
    
    setSelectedChapters(newSelectedChapters);
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
        <div className={`pl-1.5 min-h-[48px] flex items-center tree-item ${isExpanded ? 'expanded' : ''} hover:bg-gray-50 cursor-pointer transition-colors duration-200`} onClick={() => toggleExpanded(item.id)}>
          {/* Indentation */}
          <div className="flex">
            {level > 0 && (<div className="w-4"></div>)}
            {level > 1 && (<div className="w-4"></div>)}
          </div>
          
          {/* Switcher */}
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
          
          {/* Checkbox */}
          <div className="cursor-pointer pl-1 flex items-center hover:cursor-pointer" onClick={(e) => e.stopPropagation()}>
            <Checkbox 
              checked={hasChildren ? allChildrenChecked : isChecked}
              ref={(ref) => {
                if (ref && hasChildren) {
                  // Set indeterminate state for parent checkboxes
                  (ref as HTMLInputElement).indeterminate = someChildrenChecked && !allChildrenChecked;
                }
              }}
              disabled={!isTopLevel}
              onCheckedChange={() => handleCheckboxChange(item.id, item, level)}
            />
          </div>
          
          {/* Content */}
          <div className="pl-2 flex items-center flex-1 text-sm"><span className="tree-title">{item.label}</span></div>
        </div>
        
        {/* Children as separate rows */}
        {hasChildren && isExpanded && (
          <>
            {item.children.map((child: any) => (
              <React.Fragment key={child.id}>
                {renderTreeItem(child, level + 1)}
              </React.Fragment>
            ))}
          </>
        )}
      </React.Fragment>
    );
  };

  const handleNextStep = () => {
    const params = new URLSearchParams();
    if (selectedChapters.length > 0) params.set('selectedChapters', selectedChapters.join(','));
    params.set('problemCount', String(problemCount));
    params.set('difficulty', difficulty);
    params.set('problemType', problemType);
    router.push(`/teacher/structure?${params.toString()}`);
  };

  return (
    <>
      <div className="px-6 bg-white border-b border-[#e0e0e0] flex-shrink-0">
        <div className='w-[124px] flex justify-center items-center'>
          <div className="py-4 border-b-[1px] !border-black text-center font-semibold">단원·유형별</div>
        </div>
      </div>

      <div className="flex flex-1 min-h-0">
        
        {/* Left Panel */}
        <div className="flex-1 flex flex-col min-h-0 bg-white border-r border-[#e0e0e0]">
          <div className="flex-1 overflow-y-auto">
            <div className="tree-container">{contentTree.map((item) => (<React.Fragment key={item.id}>{renderTreeItem(item)}</React.Fragment>))}</div>
          </div>
        </div>
        {/* Right Panel */}
        <div className="w-[400px] bg-white relative">
          {selectedChapters.length > 0 ? (
            <div className="p-6 space-y-6 pb-20">
              {/* 문제 수 (Number of Problems) */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-medium text-gray-900">문제 수</h3>
                  <span className="text-xs text-gray-400">최대 150문제</span>
                </div>
                <div className="space-y-3">
                  <div className="flex gap-2">
                    {[25, 50, 75, 100].map((num) => (
                      <button
                        key={num}
                        onClick={() => setProblemCount(num)}
                        className={`cursor-pointer px-3 py-2 text-sm border rounded-md transition-colors ${
                          problemCount === num 
                            ? 'border-black text-black bg-gray-100' 
                            : 'border-gray-300 text-gray-700 hover:border-gray-400'
                        }`}
                      >
                        {num}
                      </button>
                    ))}
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex-1">
                      <div className="flex justify-between gap-2 text-xs text-gray-500">
                        <span>0</span>
                        <Slider value={[problemCount]} onValueChange={([val]) => setProblemCount(val)} min={0} max={150} step={1} className="w-full" />
                        <span>150</span>
                      </div>
                    </div>
                    <span className="text-sm font-medium text-black">{problemCount} 문제</span>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium text-gray-900">난이도</h3>
                </div>
                <div className="flex gap-2">
                  {['하', '중', '상'].map((level) => (
                    <button
                      key={level}
                      onClick={() => setDifficulty(level)}
                      className={`px-3 py-2 text-sm border rounded-md transition-colors cursor-pointer ${
                        difficulty === level 
                          ? 'border-black text-black bg-gray-100' 
                          : 'border-gray-300 text-gray-700 hover:border-gray-400'
                      }`}
                    >
                      {level}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium text-gray-900">문제 타입</h3>
                </div>
                <div className="flex gap-2">
                  {['기출문제', 'N제', '모두 포함'].map((type) => (
                    <button
                      key={type}
                      onClick={() => setProblemType(type)}
                      className={`px-3 py-2 text-sm border rounded-md transition-colors cursor-pointer ${
                        problemType === type 
                          ? 'border-black text-black bg-gray-100' 
                          : 'border-gray-300 text-gray-700 hover:border-gray-400'
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              <div className="absolute bottom-0 right-0 flex justify-between items-center w-full pl-6">
                <p className="text-sm text-gray-600">
                  학습지 문제 수 <span className="text-black font-medium">{problemCount}</span> 개
                </p>
                <button
                  type="button"
                  onClick={handleNextStep}
                  className="cursor-pointer bg-black text-white py-3 px-6 font-medium hover:bg-gray-800 transition-colors"
                >
                  다음 단계
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center text-gray-400 text-sm">단원과 유형을 선택해주세요.</div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
