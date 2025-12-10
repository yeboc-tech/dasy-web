'use client';

import React, { useMemo } from 'react';
import Image from 'next/image';
import type { ProblemMetadata } from '@/lib/types/problems';
import { getAnswerImageUrl } from '@/lib/utils/s3Utils';

interface AnswersPanelProps {
  filteredProblems: ProblemMetadata[];
}

// Generate column-based flow for answer images
function generateColumnFlow(problems: ProblemMetadata[], itemsPerColumn: number) {
  const columns: ProblemMetadata[][] = [[], [], []]; // 3 columns
  
  problems.forEach((problem, index) => {
    const columnIndex = Math.floor(index / itemsPerColumn) % 3;
    columns[columnIndex].push(problem);
  });
  
  return columns;
}

// Create answer grid data (5 answers per row)
function createAnswerGrid(problems: ProblemMetadata[]) {
  const rows: Array<Array<{ number: number; answer: number | null }>> = [];
  
  for (let i = 0; i < problems.length; i += 5) {
    const row = [];
    for (let j = 0; j < 5 && i + j < problems.length; j++) {
      const problem = problems[i + j];
      row.push({
        number: i + j + 1,
        answer: problem.answer || null
      });
    }
    rows.push(row);
  }
  
  return rows;
}

// Convert answer number to circle symbol
function getAnswerSymbol(answer: number | null): string {
  if (!answer) return '?';
  const symbols = ['', '①', '②', '③', '④', '⑤'];
  return symbols[answer] || '?';
}

export default function AnswersPanel({ filteredProblems }: AnswersPanelProps) {
  // Filter problems that have answers
  const problemsWithAnswers = useMemo(() => {
    return filteredProblems.filter(problem => 
      problem.answer_filename && problem.answer
    );
  }, [filteredProblems]);

  // Generate answer grid (5 per row)
  const answerGrid = useMemo(() => {
    return createAnswerGrid(problemsWithAnswers);
  }, [problemsWithAnswers]);

  // Generate column flow for images (estimate 8 items per column for A4)
  const answerColumns = useMemo(() => {
    return generateColumnFlow(problemsWithAnswers, 8);
  }, [problemsWithAnswers]);

  if (problemsWithAnswers.length === 0) {
    return (
      <div className="w-full h-full flex items-center justify-center text-gray-500">
        답안이 있는 문제가 없습니다.
      </div>
    );
  }

  return (
    <div className="w-full h-full bg-white">
      {/* 3-column layout with 2/3 width each */}
      <div className="grid grid-cols-3 gap-4 p-6" style={{ gridTemplateColumns: '2fr 2fr 2fr' }}>
        
        {/* Column 1: Header + Answer Grid + Answer Images */}
        <div className="flex flex-col">
          {/* Header */}
          <div className="mb-4">
            <h2 className="text-lg font-bold text-center p-2 border border-gray-300 bg-gray-50">
              정답 및 해설
            </h2>
          </div>

          {/* Answer Grid */}
          <div className="mb-6">
            <table className="w-full border-collapse border border-gray-300 text-sm">
              <tbody>
                {answerGrid.map((row, rowIndex) => (
                  <React.Fragment key={rowIndex}>
                    {/* Number row */}
                    <tr>
                      {row.map((cell, cellIndex) => (
                        <td key={`num-${cellIndex}`} className="border border-gray-300 p-1 text-center bg-gray-50 font-medium">
                          {cell.number}
                        </td>
                      ))}
                      {/* Fill remaining cells if less than 5 */}
                      {Array.from({ length: 5 - row.length }).map((_, emptyIndex) => (
                        <td key={`empty-num-${emptyIndex}`} className="border border-gray-300 p-1 bg-gray-50"></td>
                      ))}
                    </tr>
                    {/* Answer row */}
                    <tr>
                      {row.map((cell, cellIndex) => (
                        <td key={`ans-${cellIndex}`} className="border border-gray-300 p-1 text-center font-bold">
                          {getAnswerSymbol(cell.answer)}
                        </td>
                      ))}
                      {/* Fill remaining cells if less than 5 */}
                      {Array.from({ length: 5 - row.length }).map((_, emptyIndex) => (
                        <td key={`empty-ans-${emptyIndex}`} className="border border-gray-300 p-1"></td>
                      ))}
                    </tr>
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>

          {/* Column 1 Answer Images */}
          <div className="flex flex-col gap-4">
            {answerColumns[0].map((problem) => (
              <div key={`col1-${problem.id}`} className="w-full">
                <Image 
                  src={getAnswerImageUrl(problem.id)} 
                  alt={problem.answer_filename || 'Answer'}
                  width={400}
                  height={300}
                  className="w-full h-auto object-contain border border-gray-200"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                    const parent = target.parentElement;
                    if (parent) {
                      const errorDiv = document.createElement('div');
                      errorDiv.className = 'flex items-center justify-center p-4 bg-gray-50 border-2 border-dashed border-gray-300 rounded';
                      const innerDiv = document.createElement('div');
                      innerDiv.className = 'text-center text-gray-500 text-sm';
                      const msgDiv = document.createElement('div');
                      msgDiv.textContent = '답안 이미지를 불러올 수 없습니다';
                      const idDiv = document.createElement('div');
                      idDiv.className = 'text-xs mt-1';
                      idDiv.textContent = `ID: ${problem.id}`;
                      innerDiv.appendChild(msgDiv);
                      innerDiv.appendChild(idDiv);
                      errorDiv.appendChild(innerDiv);
                      parent.appendChild(errorDiv);
                    }
                  }}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Column 2: Answer Images */}
        <div className="flex flex-col gap-4">
          {answerColumns[1].map((problem) => (
            <div key={`col2-${problem.id}`} className="w-full">
              <Image
                src={getAnswerImageUrl(problem.id)}
                alt={problem.answer_filename || 'Answer'}
                width={400}
                height={300}
                className="w-full h-auto object-contain border border-gray-200"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.style.display = 'none';
                  const parent = target.parentElement;
                  if (parent) {
                    const errorDiv = document.createElement('div');
                    errorDiv.className = 'flex items-center justify-center p-4 bg-gray-50 border-2 border-dashed border-gray-300 rounded';
                    const innerDiv = document.createElement('div');
                    innerDiv.className = 'text-center text-gray-500 text-sm';
                    const msgDiv = document.createElement('div');
                    msgDiv.textContent = '답안 이미지를 불러올 수 없습니다';
                    const idDiv = document.createElement('div');
                    idDiv.className = 'text-xs mt-1';
                    idDiv.textContent = `ID: ${problem.id}`;
                    innerDiv.appendChild(msgDiv);
                    innerDiv.appendChild(idDiv);
                    errorDiv.appendChild(innerDiv);
                    parent.appendChild(errorDiv);
                  }
                }}
              />
            </div>
          ))}
        </div>

        {/* Column 3: Answer Images */}
        <div className="flex flex-col gap-4">
          {answerColumns[2].map((problem) => (
            <div key={`col3-${problem.id}`} className="w-full">
              <Image
                src={getAnswerImageUrl(problem.id)}
                alt={problem.answer_filename || 'Answer'}
                width={400}
                height={300}
                className="w-full h-auto object-contain border border-gray-200"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.style.display = 'none';
                  const parent = target.parentElement;
                  if (parent) {
                    const errorDiv = document.createElement('div');
                    errorDiv.className = 'flex items-center justify-center p-4 bg-gray-50 border-2 border-dashed border-gray-300 rounded';
                    const innerDiv = document.createElement('div');
                    innerDiv.className = 'text-center text-gray-500 text-sm';
                    const msgDiv = document.createElement('div');
                    msgDiv.textContent = '답안 이미지를 불러올 수 없습니다';
                    const idDiv = document.createElement('div');
                    idDiv.className = 'text-xs mt-1';
                    idDiv.textContent = `ID: ${problem.id}`;
                    innerDiv.appendChild(msgDiv);
                    innerDiv.appendChild(idDiv);
                    errorDiv.appendChild(innerDiv);
                    parent.appendChild(errorDiv);
                  }
                }}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}