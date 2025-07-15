'use client';

import { useState } from 'react';
import { contentTree } from '@/lib/global';

export default function TeacherPage() {
  const [expandedItems, setExpandedItems] = useState<string[]>(['integrated-perspective']);

  const toggleExpanded = (itemId: string) => {
    setExpandedItems(prev => prev.includes(itemId) 
        ? prev.filter(id => id !== itemId)
        : [...prev, itemId]
    );
  };

  const renderTreeItem = (item: any, level: number = 0) => {
    const isExpanded = expandedItems.includes(item.id);
    const hasChildren = item.children && item.children.length > 0;

    return (
      <div key={item.id} className={`flex items-center tree-item ${isExpanded ? 'expanded' : ''}`}>
        {/* Indentation */}
        <div className="flex">
          {level > 0 && (<div className="w-4"></div>)}
          {level > 1 && (<div className="w-4"></div>)}
        </div>
        
        {/* Switcher */}
        <div className="flex items-center">
          {hasChildren && (
            <button onClick={() => toggleExpanded(item.id)} className="p-1">
              <div className="tree-expanded-icon">
                <svg 
                  xmlns="http://www.w3.org/2000/svg" 
                  width="24" 
                  height="24" 
                  fill="none" 
                  viewBox="0 0 24 24" 
                  className={`transition-transform ${isExpanded ? '' : 'rotate-90'}`}
                  style={{ width: '24px', color: isExpanded ? 'rgb(112, 112, 112)' : 'rgb(192, 192, 192)' }}
                >
                  <path fill="#000" d="M16.586 15.5c.89 0 1.337-1.077.707-1.707l-4.586-4.586c-.39-.39-1.024-.39-1.414 0l-4.586 4.586c-.63.63-.184 1.707.707 1.707h9.172z"></path>
                </svg>
              </div>
            </button>
          )}
        </div>
        
        {/* Checkbox */}
        <div className="flex items-center"><input type="checkbox" className="w-4 h-4 text-blue-600"/></div>
        
        {/* Content */}
        <div className="flex items-center flex-1"><span className="tree-title">{item.label}</span></div>
        
        {/* Children */}
        {hasChildren && isExpanded && (
          <div className="tree-children">
            {item.children.map((child: any) => renderTreeItem(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="h-full px-4 py-6 flex flex-col bg-[#f5f5f5]">

      {/* Header */}
      <div className="px-6 py-4">
        <div className="flex items-center justify-between">
            <h1 className="text-lg font-medium text-gray-900">
              STEP 1 학습지 종류 및 범위 선택
            </h1>

            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-medium">
                  ①
                </div>
                <span className="text-blue-600 font-medium">범위 선택</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-6 h-6 bg-gray-300 text-gray-600 rounded-full flex items-center justify-center text-xs font-medium">
                  ②
                </div>
                <span className="text-gray-500">상세 편집</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-6 h-6 bg-gray-300 text-gray-600 rounded-full flex items-center justify-center text-xs font-medium">
                  ③
                </div>
                <span className="text-gray-500">구성 설정</span>
              </div>
            </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex w-full h-full">
        {/* Main Card Container */}
        <div className="flex flex-col w-full rounded-xl border border-[#e0e0e0] overflow-hidden">
          {/* Navigation Header */}
          <div className="px-6 bg-white border-b border-[#e0e0e0]">
            <div className='w-[124px] flex justify-center items-center'>
              <div className="py-4 border-b-[1px] !border-black text-center font-semibold">단원·유형별</div>
            </div>
          </div>

          {/* Card Content */}
          <div className="flex flex-1">
          {/* Left Panel */}
          <div className="w-1/2 bg-white flex flex-col">
            {/* Content Tree */}
            <div className="flex-1 overflow-y-auto p-4">
              <div className="tree-container">
                {contentTree.map((item) => renderTreeItem(item))}
              </div>
            </div>
          </div>

          {/* Right Panel */}
          <div className="w-1/2 bg-white flex items-center justify-center">
            <div className="text-center">
              <p className="text-gray-400 text-lg">
                단원과 유형을 선택해주세요.
              </p>
            </div>
          </div>
          </div>
        </div>
      </div>
    </div>
  );
}
