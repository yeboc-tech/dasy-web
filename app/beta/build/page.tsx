'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { CornerDownLeft, ArrowDownUp } from 'lucide-react';
import ProblemsPanel from '@/components/build/problemsPanel';
import FilterPanel from '@/components/build/filterPanel';
import { useChapters } from '@/lib/hooks/useChapters';
import { useProblems } from '@/lib/hooks/useProblems';
import { useWorksheetStore } from '@/lib/zustand/worksheetStore';
import { ProblemFilter } from '@/lib/utils/problemFiltering';
import { WorksheetMetadataDialog } from '@/components/worksheets/WorksheetMetadataDialog';
import { CorrectRateChart } from '@/components/analytics/DifficultyChart';
import { useAuth } from '@/lib/contexts/auth-context';
import type { ProblemMetadata } from '@/lib/types/problems';
import type { ChapterTreeItem } from '@/lib/types';

export default function BetaBuildPage() {
  const router = useRouter();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const {selectedChapters, setSelectedChapters, problemCount, selectedDifficulties, selectedProblemTypes, selectedSubjects, correctRateRange, selectedYears} = useWorksheetStore();
  const { user } = useAuth();
  const [selectedMainSubjects, setSelectedMainSubjects] = useState<string[]>(['7ec63358-5e6b-49be-89a4-8b5639f3f9c0']);
  const [hasSetDefaultSelection, setHasSetDefaultSelection] = useState(false);
  const [filteredProblems, setFilteredProblems] = useState<ProblemMetadata[]>([]);
  const [aiMode, setAiMode] = useState(false);
  const [selectedProblemsForWorksheet, setSelectedProblemsForWorksheet] = useState<ProblemMetadata[]>([]);
  const [showMetadataDialog, setShowMetadataDialog] = useState(false);
  const [chatMessages, setChatMessages] = useState<{role: 'user' | 'ai', content: string}[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [worksheetMode, setWorksheetMode] = useState<'연습' | '실전'>('연습');
  const [sortedSelectedProblems, setSortedSelectedProblems] = useState<ProblemMetadata[]>([]);
  const [sortedDialogProblems, setSortedDialogProblems] = useState<ProblemMetadata[]>([]);

  const { chapters: contentTree, loading: chaptersLoading, error: chaptersError } = useChapters();
  const { problems, loading: problemsLoading, error: problemsError } = useProblems();

  // Simulate clicking 통합사회 2 checkbox when content tree loads (only once)
  useEffect(() => {
    if (contentTree && contentTree.length > 0 && !hasSetDefaultSelection) {
      const tonghapsahoe2Id = '7ec63358-5e6b-49be-89a4-8b5639f3f9c0';
      const tonghapsahoe2Item = contentTree.find(item => item.id === tonghapsahoe2Id);

      if (tonghapsahoe2Item) {
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

        const allChildIds = getAllChildIds(tonghapsahoe2Item);
        const itemsToAdd = [tonghapsahoe2Id, ...allChildIds];
        const newSelectedChapters = [...selectedChapters, ...itemsToAdd.filter(id => !selectedChapters.includes(id))];

        setSelectedChapters(newSelectedChapters);
        setHasSetDefaultSelection(true);
      }
    }
  }, [contentTree, hasSetDefaultSelection, setSelectedChapters, selectedChapters]);

  // Filter problems when any filter changes (only in filter mode, not AI mode)
  useEffect(() => {
    if (aiMode) return; // Skip filtering in AI mode - let AI control the results
    if (!problems || problems.length === 0) return;

    const filters = {
      selectedChapters,
      selectedDifficulties,
      selectedProblemTypes,
      selectedSubjects,
      problemCount,
      contentTree,
      correctRateRange,
      selectedYears
    };

    const filtered = ProblemFilter.filterProblems(problems, filters);
    setFilteredProblems(filtered);
  }, [aiMode, problems, selectedChapters, selectedDifficulties, selectedProblemTypes, selectedSubjects, problemCount, contentTree, correctRateRange, selectedYears]);

  // Sort selected problems based on worksheet mode
  useEffect(() => {
    if (!selectedProblemsForWorksheet || selectedProblemsForWorksheet.length === 0 || !contentTree) {
      setSortedSelectedProblems([]);
      return;
    }

    let sorted = [...selectedProblemsForWorksheet];

    if (worksheetMode === '연습') {
      // Use the same hierarchical sorting as ProblemFilter
      const pathMap = new Map<string, number[]>();
      const traverse = (items: ChapterTreeItem[], path: number[]) => {
        items.forEach((item, index) => {
          const currentPath = [...path, index];
          pathMap.set(item.id, currentPath);
          if (item.children && item.children.length > 0) {
            traverse(item.children, currentPath);
          }
        });
      };
      traverse(contentTree, []);

      sorted.sort((a, b) => {
        const pathA = a.chapter_id ? pathMap.get(a.chapter_id) : undefined;
        const pathB = b.chapter_id ? pathMap.get(b.chapter_id) : undefined;

        if (!pathA && !pathB) return 0;
        if (!pathA) return 1;
        if (!pathB) return -1;

        const minLength = Math.min(pathA.length, pathB.length);
        for (let i = 0; i < minLength; i++) {
          if (pathA[i] !== pathB[i]) {
            return pathA[i] - pathB[i];
          }
        }
        if (pathA.length !== pathB.length) {
          return pathA.length - pathB.length;
        }

        const aCorrectRate = a.correct_rate ?? 0;
        const bCorrectRate = b.correct_rate ?? 0;
        return bCorrectRate - aCorrectRate;
      });
    } else {
      // 실전: totally random
      sorted = sorted
        .map(value => ({ value, sort: Math.random() }))
        .sort((a, b) => a.sort - b.sort)
        .map(({ value }) => value);
    }

    setSortedSelectedProblems(sorted);
  }, [selectedProblemsForWorksheet, worksheetMode, contentTree]);

  // Sort dialog problems based on worksheet mode
  useEffect(() => {
    if (!filteredProblems || filteredProblems.length === 0 || !contentTree) {
      setSortedDialogProblems([]);
      return;
    }

    let sorted = [...filteredProblems];

    if (worksheetMode === '연습') {
      const pathMap = new Map<string, number[]>();
      const traverse = (items: ChapterTreeItem[], path: number[]) => {
        items.forEach((item, index) => {
          const currentPath = [...path, index];
          pathMap.set(item.id, currentPath);
          if (item.children && item.children.length > 0) {
            traverse(item.children, currentPath);
          }
        });
      };
      traverse(contentTree, []);

      sorted.sort((a, b) => {
        const pathA = a.chapter_id ? pathMap.get(a.chapter_id) : undefined;
        const pathB = b.chapter_id ? pathMap.get(b.chapter_id) : undefined;

        if (!pathA && !pathB) return 0;
        if (!pathA) return 1;
        if (!pathB) return -1;

        const minLength = Math.min(pathA.length, pathB.length);
        for (let i = 0; i < minLength; i++) {
          if (pathA[i] !== pathB[i]) {
            return pathA[i] - pathB[i];
          }
        }
        if (pathA.length !== pathB.length) {
          return pathA.length - pathB.length;
        }

        const aCorrectRate = a.correct_rate ?? 0;
        const bCorrectRate = b.correct_rate ?? 0;
        return bCorrectRate - aCorrectRate;
      });
    } else {
      sorted = sorted
        .map(value => ({ value, sort: Math.random() }))
        .sort((a, b) => a.sort - b.sort)
        .map(({ value }) => value);
    }

    setSortedDialogProblems(sorted);
  }, [filteredProblems, worksheetMode, contentTree]);

  const handleMainSubjectToggle = (subject: string) => {
    const newSelectedMainSubjects = selectedMainSubjects.includes(subject)
      ? selectedMainSubjects.filter(s => s !== subject)
      : [...selectedMainSubjects, subject];

    if (newSelectedMainSubjects.length === 0) {
      setSelectedMainSubjects([subject]);
    } else {
      setSelectedMainSubjects(newSelectedMainSubjects);
    }
  };

  const handleCreateWorksheet = () => {
    if (sortedSelectedProblems.length === 0) return;
    setShowMetadataDialog(true);
  };

  const handleMetadataSubmit = async (data: { title: string; author: string }) => {
    try {
      const { createClient } = await import('@/lib/supabase/client');
      const { createWorksheet } = await import('@/lib/supabase/services/worksheetService');

      const supabase = createClient();
      const filters = {
        selectedChapters,
        selectedDifficulties,
        selectedProblemTypes,
        selectedSubjects,
        problemCount,
        correctRateRange,
        selectedYears
      };

      const { id } = await createWorksheet(supabase, {
        title: data.title,
        author: data.author,
        userId: user?.id,
        filters,
        problems: sortedSelectedProblems, // Use sorted problems
        contentTree
      });

      router.push(`/w/${id}`);
    } catch {
      alert('워크시트 생성 중 오류가 발생했습니다. 다시 시도해주세요.');
    }
  };

  const handleSendMessage = async () => {
    if (!chatInput.trim()) return;

    const userMessage = chatInput;
    setChatMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setChatInput('');

    try {
      // Import the agent function dynamically
      const { processUserMessage } = await import('@/lib/ai/agent');

      // Process the message with the AI agent, passing current chat history
      const response = await processUserMessage(userMessage, chatMessages, (problems) => {
        // Update the filtered problems when agent finds results
        setFilteredProblems(problems);
      });

      setChatMessages(prev => [...prev, {
        role: 'ai',
        content: response.message
      }]);

    } catch (error) {
      console.error('Error processing message:', error);
      setChatMessages(prev => [...prev, {
        role: 'ai',
        content: '죄송합니다. 메시지 처리 중 오류가 발생했습니다. 다시 시도해 주세요.'
      }]);
    }
  };

  return (
    <div className="mx-auto px-4 pt-0 pb-4 w-full max-w-4xl h-full relative">
      <Card className="overflow-hidden relative p-0 h-full flex flex-row gap-0 ">
        {/* Left Panel */}
        <div className="w-1/2 border-r border-gray-200 bg-gray-50 flex flex-col">
          {/* Top Bar */}
          <div className="h-9 bg-white border-b border-gray-200 pl-4 flex items-center justify-between overflow-hidden">
            <div className="text-xs text-gray-600">
              {/* Top bar content */}
            </div>
            <Button
              className="h-9 px-4 text-white bg-black hover:bg-gray-800 rounded-none"
              onClick={() => {
                setIsDialogOpen(true);
                setChatMessages([]); // Reset chat when opening dialog
              }}
            >
              문제 추가
            </Button>
          </div>
          <div className="flex-1 p-4">
            <CorrectRateChart problems={selectedProblemsForWorksheet} />
          </div>
        </div>

        {/* Right Panel */}
        <div className="relative w-1/2 flex flex-col">
          <div className="flex-1 overflow-hidden">
            <ProblemsPanel
              filteredProblems={sortedSelectedProblems}
              problemsLoading={false}
              problemsError={null}
              contentTree={contentTree}
              onDeleteProblem={(problemId) => {
                setSelectedProblemsForWorksheet(prev => prev.filter(p => p.id !== problemId));
              }}
            />
          </div>

          {/* Sticky Bottom Bar */}
          <div className="h-9 bg-white border-t border-gray-200 pl-4 flex items-center justify-between shadow-lg overflow-hidden">
            <div className="text-xs text-gray-600">
              {sortedSelectedProblems.length}문제
            </div>
            <div className="flex gap-0">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="h-9 px-3 rounded-none hover:bg-gray-100 flex items-center gap-2 border-l border-gray-200 focus:outline-none focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0">
                    <span className="text-sm">{worksheetMode}</span>
                    <ArrowDownUp className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="bg-white">
                  <DropdownMenuItem
                    onClick={() => setWorksheetMode('연습')}
                    className={`flex flex-col items-start cursor-pointer ${worksheetMode === '연습' ? 'bg-gray-100' : ''}`}
                  >
                    <div className="font-medium">연습</div>
                    <div className="text-xs text-gray-500">단원별 난이도순</div>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => setWorksheetMode('실전')}
                    className={`flex flex-col items-start cursor-pointer ${worksheetMode === '실전' ? 'bg-gray-100' : ''}`}
                  >
                    <div className="font-medium">실전</div>
                    <div className="text-xs text-gray-500">완전 랜덤</div>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <Button
                onClick={handleCreateWorksheet}
                disabled={sortedSelectedProblems.length === 0}
                className="h-9 px-4 text-white rounded-none"
                style={{ backgroundColor: '#FF00A1' }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#E6009A'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#FF00A1'}
              >
                학습지 생성
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {/* Dialog with exact /build page functionality */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="w-full h-[90vh] p-0 gap-0 overflow-hidden flex flex-col" style={{ maxWidth: 'min(56rem, 90vw)' }}>
          <div className="border-b flex-shrink-0">
            <div className="flex h-12">
              {/* Left half of header */}
              <div className="w-1/2 p-4 border-r border-gray-200 flex items-center justify-between">
                <DialogTitle>문제 추가</DialogTitle>
                <div className="flex items-center space-x-2">
                  <Label htmlFor="ai-mode" className="text-sm">AI 모드</Label>
                  <Switch
                    id="ai-mode"
                    checked={aiMode}
                    onCheckedChange={setAiMode}
                    className="data-[state=checked]:bg-[#FF00A1] data-[state=unchecked]:bg-gray-200 data-[state=checked]:!border-[#FF00A1] data-[state=unchecked]:!border-gray-200 h-[1.15rem] w-8 border shadow-sm focus-visible:ring-[#FF00A1]/50 [&>span]:bg-white [&>span]:data-[state=checked]:translate-x-[calc(100%-2px)]"
                  />
                </div>
              </div>
              {/* Right half of header */}
              <div className="w-1/2 p-4">
                {/* Empty right header space */}
              </div>
            </div>
          </div>
          <div className="flex flex-1 overflow-hidden">
            {aiMode ? (
              /* AI Chat Interface in Dialog */
              <div className="w-1/2 border-r border-gray-200 bg-gray-50 flex flex-col">
                {/* Chat Messages Area */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {chatMessages.length === 0 ? (
                    <div className="flex items-center justify-center h-full">
                      <div className="text-center text-gray-600">
                        <div className="text-xl mb-2">KIDARI AI</div>
                        <p className="text-sm text-gray-500">
                          문제 내용으로 검색해보세요
                        </p>
                      </div>
                    </div>
                  ) : (
                    chatMessages.map((message, index) => (
                      <div key={index} className="mb-4">
                        {message.role === 'user' ? (
                          <div className="flex justify-start">
                            <div className="bg-gray-800 text-white pr-4 pt-2.5 pb-2.5 pl-2.5 rounded-lg max-w-[70%] flex items-start gap-3">
                              <div className="flex-shrink-0 w-7 h-7 bg-gray-600 text-white rounded-full flex items-center justify-center text-xs font-medium">
                                나
                              </div>
                              <div className="text-sm pt-1">
                                {message.content}
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="text-gray-800 leading-relaxed text-sm">
                            {message.content}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>

                {/* Message Input */}
                <div className="p-4">
                  <div className="border border-gray-300 rounded-lg p-3 flex flex-col gap-3 bg-white">
                    <Textarea
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      placeholder="찾고 싶은 문제 내용을 설명해주세요"
                      className="w-full border-0 focus:ring-0 focus:border-0 focus-visible:ring-0 focus-visible:ring-offset-0 shadow-none px-0 py-0 resize-none min-h-0 bg-white"
                      onKeyPress={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSendMessage();
                        }
                      }}
                      rows={1}
                    />
                    <div className="flex justify-end">
                      <Button
                        onClick={handleSendMessage}
                        disabled={!chatInput.trim()}
                        size="sm"
                        className="bg-black hover:bg-gray-800 text-white w-8 h-8 p-0"
                      >
                        <CornerDownLeft className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              /* Original Filter Panel */
              <FilterPanel
                contentTree={contentTree}
                selectedMainSubjects={selectedMainSubjects}
                onMainSubjectToggle={handleMainSubjectToggle}
                loading={chaptersLoading}
                error={chaptersError}
              />
            )}
            <div className="relative flex-1 flex flex-col">
              <div className="flex-1 overflow-hidden">
                <ProblemsPanel
                  filteredProblems={sortedDialogProblems}
                  problemsLoading={problemsLoading}
                  problemsError={problemsError}
                  contentTree={contentTree}
                  onDeleteProblem={(problemId) => {
                    setFilteredProblems(prev => prev.filter(p => p.id !== problemId));
                  }}
                />
              </div>

              {/* Sticky Bottom Bar */}
              <div className="h-9 bg-white border-t border-gray-200 pl-4 flex items-center justify-between shadow-lg overflow-hidden">
                <div className="text-xs text-gray-600">
                  {sortedDialogProblems.length}문제
                </div>
                <Button
                  disabled={sortedDialogProblems.length === 0}
                  className="h-9 px-4 text-white bg-black hover:bg-gray-800 rounded-none"
                  onClick={() => {
                    // Add filtered problems to the worksheet
                    const newProblems = sortedDialogProblems.filter(
                      problem => !selectedProblemsForWorksheet.some(existing => existing.id === problem.id)
                    );
                    setSelectedProblemsForWorksheet(prev => [...prev, ...newProblems]);
                    setIsDialogOpen(false);
                  }}
                >
                  문제 추가
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <WorksheetMetadataDialog
        open={showMetadataDialog}
        onOpenChange={setShowMetadataDialog}
        onSubmit={handleMetadataSubmit}
      />
    </div>
  );
}