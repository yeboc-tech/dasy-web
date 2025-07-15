'use client';

import { useState } from 'react';

export default function TeacherPage() {
  const [activeTab, setActiveTab] = useState('unit-type');
  const [selectedGrade, setSelectedGrade] = useState('middle');
  const [selectedCourse, setSelectedCourse] = useState('2-1');
  const [expandedItems, setExpandedItems] = useState<string[]>(['calculation']);

  const tabs = [
    { id: 'unit-type', label: '단원•유형별' },
    { id: 'commercial', label: '시중교재' },
    { id: 'exam', label: '수능/모의고사' },
    { id: 'signature', label: '시그니처 교재' },
    { id: 'school', label: '학교별 기출' },
    { id: 'upload', label: '기출 업로드' },
  ];

  const grades = [
    { id: 'elementary', label: '초' },
    { id: 'middle', label: '중' },
    { id: 'high', label: '고' },
  ];

  const courses = [
    '1 - 1(22개정)',
    '1 - 1',
    '1 - 2(22개정)',
    '1 - 2',
    '2 - 1(22개정)',
    '2 - 1',
    '2 - 2',
  ];

  const contentTree = [
    {
      id: 'middle-2-1',
      label: '중 2 - 1',
      type: 'category',
      expanded: false,
    },
    {
      id: 'numbers',
      label: '수와 식',
      type: 'category',
      expanded: false,
      children: [
        {
          id: 'rational',
          label: '유리수와 순환소수',
          type: 'item',
          expanded: false,
        },
      ],
    },
    {
      id: 'calculation',
      label: '식의 계산',
      type: 'category',
      expanded: true,
      children: [
        {
          id: 'exponents',
          label: '지수법칙',
          type: 'item',
          expanded: false,
        },
        {
          id: 'monomial',
          label: '단항식의 곱셈과 나눗셈',
          type: 'item',
          expanded: false,
        },
        {
          id: 'polynomial-add',
          label: '다항식의 덧셈과 뺄셈',
          type: 'item',
          expanded: false,
        },
        {
          id: 'polynomial-multiply',
          label: '다항식의 곱셈과 나눗셈',
          type: 'item',
          expanded: false,
        },
      ],
    },
    {
      id: 'inequalities',
      label: '부등식',
      type: 'category',
      expanded: false,
    },
    {
      id: 'equations',
      label: '방정식',
      type: 'category',
      expanded: false,
    },
  ];

  const toggleExpanded = (itemId: string) => {
    setExpandedItems(prev => 
      prev.includes(itemId) 
        ? prev.filter(id => id !== itemId)
        : [...prev, itemId]
    );
  };

  const renderTreeItem = (item: any, level: number = 0) => {
    const isExpanded = expandedItems.includes(item.id);
    const hasChildren = item.children && item.children.length > 0;

    return (
      <div key={item.id} className="w-full">
        <div 
          className={`flex items-center py-1 px-2 hover:bg-gray-50 cursor-pointer ${
            level > 0 ? 'ml-4' : ''
          }`}
        >
          <input 
            type="checkbox" 
            className="mr-2 w-4 h-4 text-blue-600"
          />
          {hasChildren && (
            <button
              onClick={() => toggleExpanded(item.id)}
              className="mr-1 w-4 h-4 flex items-center justify-center"
            >
              <svg 
                className={`w-3 h-3 transition-transform ${
                  isExpanded ? 'rotate-90' : ''
                }`}
                fill="currentColor" 
                viewBox="0 0 20 20"
              >
                <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
              </svg>
            </button>
          )}
          <span className="text-sm text-gray-700">{item.label}</span>
        </div>
        {hasChildren && isExpanded && (
          <div className="ml-4">
            {item.children.map((child: any) => renderTreeItem(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-8">
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
          <button className="text-gray-500 hover:text-gray-700">
            X 닫기
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex h-[calc(100vh-80px)]">
        {/* Left Panel */}
        <div className="w-1/2 border-r border-gray-200 flex flex-col">
          {/* Tabs */}
          <div className="border-b border-gray-200">
            <div className="flex space-x-1 p-4">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                    activeTab === tab.id
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Grade and Course Selection */}
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center space-x-4 mb-4">
              {grades.map((grade) => (
                <button
                  key={grade.id}
                  onClick={() => setSelectedGrade(grade.id)}
                  className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                    selectedGrade === grade.id
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  }`}
                >
                  {grade.label}
                </button>
              ))}
            </div>
            
            <div className="flex items-center space-x-2 overflow-x-auto">
              {courses.map((course) => (
                <button
                  key={course}
                  onClick={() => setSelectedCourse(course)}
                  className={`px-3 py-1 text-sm font-medium rounded-md whitespace-nowrap transition-colors ${
                    selectedCourse === course
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  }`}
                >
                  {course}
                </button>
              ))}
              <button className="p-1 text-gray-400 hover:text-gray-600">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          </div>

          {/* Content Tree */}
          <div className="flex-1 overflow-y-auto p-4">
            <div className="space-y-1">
              {contentTree.map((item) => renderTreeItem(item))}
            </div>
          </div>
        </div>

        {/* Right Panel */}
        <div className="w-1/2 flex items-center justify-center">
          <div className="text-center">
            <p className="text-gray-400 text-lg">
              단원과 유형을 선택해주세요.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
