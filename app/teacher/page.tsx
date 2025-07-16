'use client';

import React, { useState } from 'react';
import { contentTree } from '@/lib/global';
import { Checkbox } from '@/components/ui/checkbox';
import { Slider } from '@/components/ui/slider';

export default function TeacherPage() {
  const [expandedItems, setExpandedItems] = useState<string[]>(['integrated-perspective']);
  const [checkedItems, setCheckedItems] = useState<Set<string>>(new Set());
  const [problemCount, setProblemCount] = useState<number[]>([50]);

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
    if (!item.children || item.children.length === 0) return true;
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

  const handleCheckboxChange = (itemId: string, item: any) => {
    const newCheckedItems = new Set(checkedItems);
    const childIds = getAllChildIds(item);
    const isCurrentlyChecked = checkedItems.has(itemId);

    if (isCurrentlyChecked) {
      // Uncheck this item and all its children
      newCheckedItems.delete(itemId);
      childIds.forEach(id => newCheckedItems.delete(id));
    } else {
      // Check this item and all its children
      newCheckedItems.add(itemId);
      childIds.forEach(id => newCheckedItems.add(id));
    }

    setCheckedItems(newCheckedItems);
  };

  const renderTreeItem = (item: any, level: number = 0) => {
    const isExpanded = expandedItems.includes(item.id);
    const hasChildren = item.children && item.children.length > 0;
    const isChecked = checkedItems.has(item.id);
    const allChildrenChecked = hasChildren ? areAllChildrenChecked(item) : false;
    const someChildrenChecked = hasChildren ? areSomeChildrenChecked(item) : false;

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
              onCheckedChange={() => handleCheckboxChange(item.id, item)}
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

  return (
    <div className="h-full px-4 py-6 flex flex-col bg-[#f5f5f5]">
      <div className="max-w-7xl mx-auto w-full h-full flex flex-col">
        {/* Header */}
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
              <h1 className="text-lg font-medium text-gray-900">
                자세한 통합사회 학습지 제작 도구
              </h1>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex w-full flex-1 min-h-0">
          {/* Main Card Container */}
          <div className="flex flex-col w-full rounded-xl border border-[#e0e0e0] overflow-hidden">
            {/* Navigation Header */}
            <div className="px-6 bg-white border-b border-[#e0e0e0] flex-shrink-0">
              <div className='w-[124px] flex justify-center items-center'>
                <div className="py-4 border-b-[1px] !border-black text-center font-semibold">단원·유형별</div>
              </div>
            </div>

            {/* Card Content */}
            <div className="flex flex-1 min-h-0">
              {/* Left Panel */}
              <div className="flex-1 flex flex-col min-h-0 bg-white border-r border-[#e0e0e0]">
                {/* Content Tree */}
                <div className="flex-1 overflow-y-auto">
                  <div className="tree-container">
                    {contentTree.map((item) => (
                      <React.Fragment key={item.id}>
                        {renderTreeItem(item)}
                      </React.Fragment>
                    ))}
                  </div>
                </div>
              </div>

              {/* Right Panel */}
              <div className="w-[400px] bg-white">
                {checkedItems.size > 0 ? (
                  <div className="p-6 space-y-6">
                    {/* 문제 수 (Number of Problems) */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-medium text-gray-900">문제 수</h3>
                        <span className="text-xs text-gray-500">최대 150문제</span>
                      </div>
                      <div className="space-y-3">
                        <div className="flex gap-2">
                          {[25, 50, 75, 100].map((num) => (
                            <button
                              key={num}
                              onClick={() => setProblemCount([num])}
                              className={`px-3 py-2 text-sm border rounded-md transition-colors ${
                                problemCount[0] === num 
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
                            <div className="h-[20px] w-full">
                              <Slider
                                value={problemCount}
                                onValueChange={setProblemCount}
                                min={0}
                                max={150}
                                step={1}
                                className="w-full"
                                />
                            </div>
                            <div className="flex justify-between text-xs text-gray-500 mt-1">
                              <span>0</span>
                              <span>150</span>
                            </div>
                          </div>
                          <span className="text-sm font-medium text-black">{problemCount[0]} 문제</span>
                        </div>
                      </div>
                    </div>

                    {/* 난이도 (Difficulty) */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-medium text-gray-900">난이도</h3>
                        <button className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700">
                          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
                          </svg>
                          난이도 설정
                        </button>
                      </div>
                                              <div className="flex gap-2">
                          {['하', '중하', '중', '상', '최상'].map((level) => (
                            <button
                              key={level}
                              className={`px-3 py-2 text-sm border rounded-md transition-colors ${
                                level === '중' 
                                  ? 'border-black text-black bg-gray-100' 
                                  : 'border-gray-300 text-gray-700 hover:border-gray-400'
                              }`}
                            >
                              {level}
                            </button>
                          ))}
                        </div>
                    </div>

                    {/* 문제 타입 (Problem Type) */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-medium text-gray-900">문제 타입</h3>
                      </div>
                                              <div className="flex gap-2">
                          {['전체', '객관식', '주관식'].map((type) => (
                            <button
                              key={type}
                              className={`px-3 py-2 text-sm border rounded-md transition-colors ${
                                type === '객관식' 
                                  ? 'border-black text-black bg-gray-100' 
                                  : 'border-gray-300 text-gray-700 hover:border-gray-400'
                              }`}
                            >
                              {type}
                            </button>
                          ))}
                        </div>
                    </div>

                    {/* Summary */}
                    <div className="pt-4 border-t border-gray-200">
                      <p className="text-sm text-gray-600">
                        학습지 문제 수 <span className="text-black font-medium">{problemCount[0]}</span> 개 | 유형 <span className="text-gray-900">242</span>개
                      </p>
                    </div>

                    {/* Action Button */}
                    <button className="w-full bg-black text-white py-3 px-4 rounded-md font-medium hover:bg-gray-800 transition-colors flex items-center justify-center gap-2">
                      다음 단계 →
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center">
                      <p className="text-gray-400 text-sm">
                        단원과 유형을 선택해주세요.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
