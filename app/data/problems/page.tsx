'use client';

import { useState, useEffect, useRef } from 'react';
import { Loader, Search, X, Copy, Filter } from 'lucide-react';
import { getProblemImageUrl, getAnswerImageUrl } from '@/lib/utils/s3Utils';

interface Problem {
  id: string;
  problem_filename: string;
  answer_filename: string | null;
  source: string | null;
  exam_year: number | null;
  difficulty: string;
  correct_rate: number | null;
  answer: number | null;
  created_at: string;
  chapters: {
    name: string;
    subjects: {
      name: string;
    };
  } | null;
  problem_subjects: {
    subjects: {
      name: string;
    };
  }[];
}

interface ProblemsResponse {
  problems: Problem[];
  total: number;
  page: number;
  pageSize: number;
}

export default function ProblemsDataPage() {
  const [data, setData] = useState<ProblemsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(100);
  const [search, setSearch] = useState('');
  const [difficulty, setDifficulty] = useState('');
  const [sourceFilter, setSourceFilter] = useState('');
  const [sourceSearchInput, setSourceSearchInput] = useState('');
  const [showSourceDropdown, setShowSourceDropdown] = useState(false);
  const [idFilter, setIdFilter] = useState('');
  const [idSearchInput, setIdSearchInput] = useState('');
  const [showIdDropdown, setShowIdDropdown] = useState(false);
  const [problemFileFilter, setProblemFileFilter] = useState('');
  const [problemFileSearchInput, setProblemFileSearchInput] = useState('');
  const [showProblemFileDropdown, setShowProblemFileDropdown] = useState(false);
  const [answerFileFilter, setAnswerFileFilter] = useState('');
  const [answerFileSearchInput, setAnswerFileSearchInput] = useState('');
  const [showAnswerFileDropdown, setShowAnswerFileDropdown] = useState(false);
  const [relatedSubjectFilter, setRelatedSubjectFilter] = useState<string[]>([]);
  const [showRelatedSubjectDropdown, setShowRelatedSubjectDropdown] = useState(false);
  const [availableSubjects, setAvailableSubjects] = useState<{ id: string; name: string }[]>([]);
  const [previewImage, setPreviewImage] = useState<{ url: string; top: number; left: number } | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const [statsData, setStatsData] = useState<{ total: number; stats: Record<string, number> } | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const statusDropdownRef = useRef<HTMLDivElement>(null);
  const [columnWidths, setColumnWidths] = useState({
    id: 100,
    problemFile: 150,
    answerFile: 150,
    source: 200,
    year: 80,
    subject: 100,
    chapter: 150,
    relatedSubjects: 150,
    correctRate: 100,
    difficulty: 100,
    answer: 60,
  });
  const resizingColumn = useRef<string | null>(null);
  const startX = useRef(0);
  const startWidth = useRef(0);
  const sourceDropdownRef = useRef<HTMLDivElement>(null);
  const idDropdownRef = useRef<HTMLDivElement>(null);
  const problemFileDropdownRef = useRef<HTMLDivElement>(null);
  const answerFileDropdownRef = useRef<HTMLDivElement>(null);
  const relatedSubjectDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchProblems();
  }, [page, difficulty, pageSize, sourceFilter, idFilter, problemFileFilter, answerFileFilter, relatedSubjectFilter]);

  useEffect(() => {
    fetchSubjects();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (sourceDropdownRef.current && !sourceDropdownRef.current.contains(event.target as Node)) {
        setShowSourceDropdown(false);
      }
      if (idDropdownRef.current && !idDropdownRef.current.contains(event.target as Node)) {
        setShowIdDropdown(false);
      }
      if (problemFileDropdownRef.current && !problemFileDropdownRef.current.contains(event.target as Node)) {
        setShowProblemFileDropdown(false);
      }
      if (answerFileDropdownRef.current && !answerFileDropdownRef.current.contains(event.target as Node)) {
        setShowAnswerFileDropdown(false);
      }
      if (relatedSubjectDropdownRef.current && !relatedSubjectDropdownRef.current.contains(event.target as Node)) {
        setShowRelatedSubjectDropdown(false);
      }
      if (statusDropdownRef.current && !statusDropdownRef.current.contains(event.target as Node)) {
        setShowStatusDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchProblems = async () => {
    setLoading(true);
    const params = new URLSearchParams({
      page: page.toString(),
      pageSize: pageSize.toString(),
      ...(search && { search }),
      ...(difficulty && { difficulty }),
      ...(sourceFilter && { source: sourceFilter }),
      ...(idFilter && { id: idFilter }),
      ...(problemFileFilter && { problemFile: problemFileFilter }),
      ...(answerFileFilter && { answerFile: answerFileFilter }),
      ...(relatedSubjectFilter.length > 0 && { relatedSubject: relatedSubjectFilter.join(',') }),
    });

    const res = await fetch(`/api/data/problems?${params}`);
    const json = await res.json();

    // Handle error response
    if (json.error) {
      console.error('Error fetching problems:', json.error);
      setData({ problems: [], total: 0, page, pageSize });
    } else {
      setData(json);
    }

    setLoading(false);
  };

  const fetchSubjects = async () => {
    const res = await fetch('/api/data/subjects');
    const json = await res.json();
    if (json.subjects) {
      setAvailableSubjects(json.subjects);
    }
  };

  const handleSourceSearch = () => {
    // If input is empty, use special marker to indicate "search for empty values"
    setSourceFilter(sourceSearchInput === '' ? '__EMPTY__' : sourceSearchInput);
    setPage(1);
    setShowSourceDropdown(false);
  };

  const handleClearSourceFilter = () => {
    setSourceFilter('');
    setSourceSearchInput('');
    setPage(1);
  };

  const handleIdSearch = () => {
    // If input is empty, use special marker to indicate "search for empty values"
    setIdFilter(idSearchInput === '' ? '__EMPTY__' : idSearchInput);
    setPage(1);
    setShowIdDropdown(false);
  };

  const handleClearIdFilter = () => {
    setIdFilter('');
    setIdSearchInput('');
    setPage(1);
  };

  const handleProblemFileSearch = () => {
    // If input is empty, use special marker to indicate "search for empty values"
    setProblemFileFilter(problemFileSearchInput === '' ? '__EMPTY__' : problemFileSearchInput);
    setPage(1);
    setShowProblemFileDropdown(false);
  };

  const handleClearProblemFileFilter = () => {
    setProblemFileFilter('');
    setProblemFileSearchInput('');
    setPage(1);
  };

  const handleAnswerFileSearch = () => {
    // If input is empty, use special marker to indicate "search for empty values"
    setAnswerFileFilter(answerFileSearchInput === '' ? '__EMPTY__' : answerFileSearchInput);
    setPage(1);
    setShowAnswerFileDropdown(false);
  };

  const handleClearAnswerFileFilter = () => {
    setAnswerFileFilter('');
    setAnswerFileSearchInput('');
    setPage(1);
  };

  const handleRelatedSubjectToggle = (subjectName: string) => {
    setRelatedSubjectFilter(prev => {
      if (prev.includes(subjectName)) {
        // Remove if already selected
        return prev.filter(s => s !== subjectName);
      } else {
        // Add if not selected
        return [...prev, subjectName];
      }
    });
    setPage(1);
  };

  const handleImageHover = (e: React.MouseEvent, url: string) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setPreviewImage({
      url,
      top: rect.bottom,
      left: rect.left,
    });
  };

  const handleImageLeave = () => {
    setPreviewImage(null);
  };

  const handleCopyId = (id: string) => {
    navigator.clipboard.writeText(id);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const fetchStats = async () => {
    setStatsLoading(true);
    try {
      const res = await fetch('/api/data/problems/stats');
      const json = await res.json();
      setStatsData(json);
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setStatsLoading(false);
    }
  };

  const handleStatusDropdownToggle = () => {
    const newShowState = !showStatusDropdown;
    setShowStatusDropdown(newShowState);

    // Fetch stats every time when opening dropdown
    if (newShowState) {
      fetchStats();
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchProblems();
  };

  const getStatus = (problem: Problem) => {
    if (!problem.answer_filename) return '⚠️';
    if (!problem.source || !problem.exam_year) return '⚠️';
    return '✅';
  };

  const handleMouseDown = (e: React.MouseEvent, columnKey: keyof typeof columnWidths) => {
    resizingColumn.current = columnKey;
    startX.current = e.clientX;
    startWidth.current = columnWidths[columnKey];

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    e.preventDefault();
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!resizingColumn.current) return;

    const diff = e.clientX - startX.current;
    const newWidth = Math.max(50, startWidth.current + diff);

    setColumnWidths(prev => ({
      ...prev,
      [resizingColumn.current!]: newWidth,
    }));
  };

  const handleMouseUp = () => {
    resizingColumn.current = null;
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
  };

  if (loading && !data) {
    return (
      <div className="h-full flex-1 bg-white">
        <div className="max-w-4xl mx-auto p-4">
          <h1 className="text-base font-normal mb-4">문제 데이터</h1>
          <div className="flex items-center justify-center py-20">
            <Loader className="animate-spin w-4 h-4" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white h-full flex flex-col overflow-hidden" style={{ height: 'calc(100vh - 60px)' }}>
      <div className="max-w-4xl mx-auto px-4 pt-4 pb-4 w-full flex-1 flex flex-col overflow-hidden">
        <div className="mb-4">
          <h1 className="text-base font-normal">문제 데이터</h1>
        </div>

        {/* Table */}
        <div className="bg-white shadow flex-1 flex flex-col overflow-hidden mb-4">
          <div className="overflow-auto flex-1">
            <table className="w-full text-sm" style={{ tableLayout: 'fixed' }}>
              <thead className="bg-gray-100 border-b sticky top-0" style={{ zIndex: 50 }}>
                <tr>
                  <th className="px-3 py-2 text-left text-xs border-r relative" style={{ width: columnWidths.id, minWidth: columnWidths.id }}>
                    <div className="flex items-center justify-between">
                      <span>ID</span>
                      <div className="relative" ref={idDropdownRef}>
                        <button
                          onClick={() => setShowIdDropdown(!showIdDropdown)}
                          className="p-1 hover:bg-gray-200 cursor-pointer"
                        >
                          <Search className={`w-3 h-3 ${idFilter ? 'text-blue-600' : 'text-gray-400'}`} />
                        </button>
                        {showIdDropdown && (
                          <div className="absolute top-full left-0 mt-1 bg-white border shadow-lg p-1" style={{ minWidth: '200px', zIndex: 9999 }}>
                            <div className="flex items-center gap-1">
                              <input
                                type="text"
                                value={idSearchInput}
                                onChange={(e) => setIdSearchInput(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    handleIdSearch();
                                  }
                                }}
                                className="flex-1 px-2 py-1 text-xs outline-none"
                                autoFocus
                              />
                              {(idSearchInput || idFilter) && (
                                <button
                                  onClick={handleClearIdFilter}
                                  className="flex-shrink-0 cursor-pointer mr-1"
                                >
                                  <X className="w-3 h-3 text-gray-400" />
                                </button>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                    <div
                      className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-blue-500"
                      onMouseDown={(e) => handleMouseDown(e, 'id')}
                    />
                  </th>
                  <th className="px-3 py-2 text-left text-xs border-r relative" style={{ width: columnWidths.problemFile, minWidth: columnWidths.problemFile }}>
                    <div className="flex items-center justify-between">
                      <span>문제 파일명</span>
                      <div className="relative" ref={problemFileDropdownRef}>
                        <button
                          onClick={() => setShowProblemFileDropdown(!showProblemFileDropdown)}
                          className="p-1 hover:bg-gray-200 cursor-pointer"
                        >
                          <Search className={`w-3 h-3 ${problemFileFilter ? 'text-blue-600' : 'text-gray-400'}`} />
                        </button>
                        {showProblemFileDropdown && (
                          <div className="absolute top-full left-0 mt-1 bg-white border shadow-lg p-1" style={{ minWidth: '200px', zIndex: 9999 }}>
                            <div className="flex items-center gap-1">
                              <input
                                type="text"
                                value={problemFileSearchInput}
                                onChange={(e) => setProblemFileSearchInput(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    handleProblemFileSearch();
                                  }
                                }}
                                className="flex-1 px-2 py-1 text-xs outline-none"
                                autoFocus
                              />
                              {(problemFileSearchInput || problemFileFilter) && (
                                <button
                                  onClick={handleClearProblemFileFilter}
                                  className="flex-shrink-0 cursor-pointer mr-1"
                                >
                                  <X className="w-3 h-3 text-gray-400" />
                                </button>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                    <div
                      className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-blue-500"
                      onMouseDown={(e) => handleMouseDown(e, 'problemFile')}
                    />
                  </th>
                  <th className="px-3 py-2 text-left text-xs border-r relative" style={{ width: columnWidths.answerFile, minWidth: columnWidths.answerFile }}>
                    <div className="flex items-center justify-between">
                      <span>정답 파일명</span>
                      <div className="relative" ref={answerFileDropdownRef}>
                        <button
                          onClick={() => setShowAnswerFileDropdown(!showAnswerFileDropdown)}
                          className="p-1 hover:bg-gray-200 cursor-pointer"
                        >
                          <Search className={`w-3 h-3 ${answerFileFilter ? 'text-blue-600' : 'text-gray-400'}`} />
                        </button>
                        {showAnswerFileDropdown && (
                          <div className="absolute top-full left-0 mt-1 bg-white border shadow-lg p-1" style={{ minWidth: '200px', zIndex: 9999 }}>
                            <div className="flex items-center gap-1">
                              <input
                                type="text"
                                value={answerFileSearchInput}
                                onChange={(e) => setAnswerFileSearchInput(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    handleAnswerFileSearch();
                                  }
                                }}
                                className="flex-1 px-2 py-1 text-xs outline-none"
                                autoFocus
                              />
                              {(answerFileSearchInput || answerFileFilter) && (
                                <button
                                  onClick={handleClearAnswerFileFilter}
                                  className="flex-shrink-0 cursor-pointer mr-1"
                                >
                                  <X className="w-3 h-3 text-gray-400" />
                                </button>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                    <div
                      className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-blue-500"
                      onMouseDown={(e) => handleMouseDown(e, 'answerFile')}
                    />
                  </th>
                  <th className="px-3 py-2 text-left text-xs border-r relative" style={{ width: columnWidths.source, minWidth: columnWidths.source }}>
                    <div className="flex items-center justify-between">
                      <span>출처</span>
                      <div className="relative" ref={sourceDropdownRef}>
                        <button
                          onClick={() => setShowSourceDropdown(!showSourceDropdown)}
                          className="p-1 hover:bg-gray-200 cursor-pointer"
                        >
                          <Search className={`w-3 h-3 ${sourceFilter ? 'text-blue-600' : 'text-gray-400'}`} />
                        </button>
                        {showSourceDropdown && (
                          <div className="absolute top-full left-0 mt-1 bg-white border shadow-lg p-1" style={{ minWidth: '200px', zIndex: 9999 }}>
                            <div className="flex items-center gap-1">
                              <input
                                type="text"
                                value={sourceSearchInput}
                                onChange={(e) => setSourceSearchInput(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    handleSourceSearch();
                                  }
                                }}
                                className="flex-1 px-2 py-1 text-xs outline-none"
                                autoFocus
                              />
                              {(sourceSearchInput || sourceFilter) && (
                                <button
                                  onClick={handleClearSourceFilter}
                                  className="flex-shrink-0 cursor-pointer mr-1"
                                >
                                  <X className="w-3 h-3 text-gray-400" />
                                </button>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                    <div
                      className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-blue-500"
                      onMouseDown={(e) => handleMouseDown(e, 'source')}
                    />
                  </th>
                  <th className="px-3 py-2 text-left text-xs border-r relative" style={{ width: columnWidths.year, minWidth: columnWidths.year }}>
                    연도
                    <div
                      className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-blue-500"
                      onMouseDown={(e) => handleMouseDown(e, 'year')}
                    />
                  </th>
                  <th className="px-3 py-2 text-left text-xs border-r relative" style={{ width: columnWidths.subject, minWidth: columnWidths.subject }}>
                    과목
                    <div
                      className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-blue-500"
                      onMouseDown={(e) => handleMouseDown(e, 'subject')}
                    />
                  </th>
                  <th className="px-3 py-2 text-left text-xs border-r relative" style={{ width: columnWidths.chapter, minWidth: columnWidths.chapter }}>
                    단원
                    <div
                      className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-blue-500"
                      onMouseDown={(e) => handleMouseDown(e, 'chapter')}
                    />
                  </th>
                  <th className="px-3 py-2 text-left text-xs border-r relative" style={{ width: columnWidths.relatedSubjects, minWidth: columnWidths.relatedSubjects }}>
                    <div className="flex items-center justify-between">
                      <span>관련 과목</span>
                      <div className="relative" ref={relatedSubjectDropdownRef}>
                        <button
                          onClick={() => setShowRelatedSubjectDropdown(!showRelatedSubjectDropdown)}
                          className="p-1 hover:bg-gray-200 cursor-pointer"
                        >
                          <Filter className={`w-3 h-3 ${relatedSubjectFilter.length > 0 ? 'text-blue-600' : 'text-gray-400'}`} />
                        </button>
                        {showRelatedSubjectDropdown && (
                          <div className="absolute top-full left-0 mt-1 bg-white border shadow-lg max-h-60 overflow-y-auto" style={{ minWidth: '200px', zIndex: 9999 }}>
                            {availableSubjects.map((subject) => (
                              <div
                                key={subject.id}
                                onClick={() => handleRelatedSubjectToggle(subject.name)}
                                className={`px-3 py-2 text-xs hover:bg-gray-100 cursor-pointer ${
                                  relatedSubjectFilter.includes(subject.name) ? 'bg-blue-50 text-blue-600' : ''
                                }`}
                              >
                                {subject.name}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                    <div
                      className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-blue-500"
                      onMouseDown={(e) => handleMouseDown(e, 'relatedSubjects')}
                    />
                  </th>
                  <th className="px-3 py-2 text-left text-xs border-r relative" style={{ width: columnWidths.correctRate, minWidth: columnWidths.correctRate }}>
                    정답률
                    <div
                      className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-blue-500"
                      onMouseDown={(e) => handleMouseDown(e, 'correctRate')}
                    />
                  </th>
                  <th className="px-3 py-2 text-left text-xs border-r relative" style={{ width: columnWidths.difficulty, minWidth: columnWidths.difficulty }}>
                    난이도
                    <div
                      className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-blue-500"
                      onMouseDown={(e) => handleMouseDown(e, 'difficulty')}
                    />
                  </th>
                  <th className="px-3 py-2 text-left text-xs" style={{ width: columnWidths.answer, minWidth: columnWidths.answer }}>
                    답
                  </th>
                </tr>
              </thead>
              <tbody>
                {data?.problems.map((problem, index) => (
                    <tr
                      key={problem.id}
                      className="hover:bg-gray-50 border-b"
                      onMouseLeave={handleImageLeave}
                    >
                    <td className="px-3 py-2 text-xs font-mono text-gray-500 overflow-hidden border-r" title={problem.id} style={{ width: columnWidths.id, minWidth: columnWidths.id }}>
                      <div className="flex items-center justify-between gap-1">
                        <div className="truncate">{problem.id}</div>
                        <button
                          onClick={() => handleCopyId(problem.id)}
                          className="flex-shrink-0 p-1 hover:bg-gray-200 cursor-pointer"
                        >
                          <Copy className="w-3 h-3 text-gray-400" />
                        </button>
                      </div>
                    </td>
                    <td className="px-3 py-2 text-xs overflow-hidden border-r" style={{ width: columnWidths.problemFile, minWidth: columnWidths.problemFile }}>
                      <a
                        href={getProblemImageUrl(problem.id)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline block truncate"
                        onMouseEnter={(e) => handleImageHover(e, getProblemImageUrl(problem.id))}
                      >
                        {problem.problem_filename}
                      </a>
                    </td>
                    <td className="px-3 py-2 text-xs overflow-hidden border-r" style={{ width: columnWidths.answerFile, minWidth: columnWidths.answerFile }}>
                      {problem.answer_filename ? (
                        <a
                          href={getAnswerImageUrl(problem.id)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline block truncate"
                          onMouseEnter={(e) => handleImageHover(e, getAnswerImageUrl(problem.id))}
                        >
                          {problem.answer_filename}
                        </a>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-xs overflow-hidden border-r" title={problem.source || ''} style={{ width: columnWidths.source, minWidth: columnWidths.source }}>
                      <div className="truncate">{problem.source || '-'}</div>
                    </td>
                    <td className="px-3 py-2 text-xs border-r" style={{ width: columnWidths.year, minWidth: columnWidths.year }}>{problem.exam_year || '-'}</td>
                    <td className="px-3 py-2 text-xs overflow-hidden border-r" style={{ width: columnWidths.subject, minWidth: columnWidths.subject }}>
                      <div className="truncate">{problem.chapters?.subjects?.name || '-'}</div>
                    </td>
                    <td className="px-3 py-2 text-xs overflow-hidden border-r" title={problem.chapters?.name || ''} style={{ width: columnWidths.chapter, minWidth: columnWidths.chapter }}>
                      <div className="truncate">{problem.chapters?.name || '-'}</div>
                    </td>
                    <td className="px-3 py-2 text-xs overflow-hidden border-r" style={{ width: columnWidths.relatedSubjects, minWidth: columnWidths.relatedSubjects }}>
                      <div className="truncate" title={problem.problem_subjects && problem.problem_subjects.length > 0 ? problem.problem_subjects.map(ps => ps.subjects?.name || 'N/A').join(', ') : ''}>
                        {problem.problem_subjects && problem.problem_subjects.length > 0
                          ? problem.problem_subjects.map(ps => ps.subjects?.name || 'N/A').join(', ')
                          : '-'}
                      </div>
                    </td>
                    <td className="px-3 py-2 text-xs border-r" style={{ width: columnWidths.correctRate, minWidth: columnWidths.correctRate }}>{problem.correct_rate || '-'}%</td>
                    <td className="px-3 py-2 text-xs border-r" style={{ width: columnWidths.difficulty, minWidth: columnWidths.difficulty }}>{problem.difficulty}</td>
                    <td className="px-3 py-2 text-xs" style={{ width: columnWidths.answer, minWidth: columnWidths.answer }}>{problem.answer || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination - sticky footer inside table */}
          <div className="sticky bottom-0 bg-white border-t px-3 flex items-center justify-between text-xs" style={{ height: '33px' }}>
            <div className="flex items-center gap-4">
              <span className="text-gray-600">
                {page} / {Math.ceil((data?.total || 0) / pageSize)} 페이지
              </span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setPage(1);
                }}
                style={{
                  paddingLeft: '0.5rem',
                  paddingRight: '1.75rem',
                  paddingTop: '0.25rem',
                  paddingBottom: '0.25rem',
                  backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
                  backgroundPosition: 'right 0.25rem center',
                  backgroundRepeat: 'no-repeat',
                  backgroundSize: '1.5em 1.5em',
                }}
                className="border text-xs appearance-none"
              >
                <option value={100}>100개씩 보기</option>
                <option value={500}>500개씩 보기</option>
                <option value={1000}>1000개씩 보기</option>
              </select>
              <span className="text-gray-600">
                총 {data?.total || 0}개
              </span>
              <div className="relative" ref={statusDropdownRef}>
                <button
                  onClick={handleStatusDropdownToggle}
                  className="text-blue-600 hover:text-blue-800 cursor-pointer"
                >
                  상태
                </button>
                {showStatusDropdown && (
                  <div className="absolute bottom-full right-0 mb-1 bg-white border shadow-lg p-3" style={{ minWidth: '250px', zIndex: 10000 }}>
                    {statsLoading ? (
                      <div className="text-xs text-gray-500">로딩 중...</div>
                    ) : statsData ? (
                      <div className="text-xs">
                        <div className="font-medium mb-2">데이터 상태</div>
                        <div className="space-y-1">
                          <div className="flex justify-between">
                            <span>출처:</span>
                            <span className="text-gray-600">{statsData.stats.source}개 누락</span>
                          </div>
                          <div className="flex justify-between">
                            <span>연도:</span>
                            <span className="text-gray-600">{statsData.stats.exam_year}개 누락</span>
                          </div>
                          <div className="flex justify-between">
                            <span>과목:</span>
                            <span className="text-gray-600">{statsData.stats.subject}개 누락</span>
                          </div>
                          <div className="flex justify-between">
                            <span>단원:</span>
                            <span className="text-gray-600">{statsData.stats.chapter}개 누락</span>
                          </div>
                          <div className="flex justify-between">
                            <span>정답률:</span>
                            <span className="text-gray-600">{statsData.stats.correct_rate}개 누락</span>
                          </div>
                          <div className="flex justify-between">
                            <span>답:</span>
                            <span className="text-gray-600">{statsData.stats.answer}개 누락</span>
                          </div>
                        </div>
                      </div>
                    ) : null}
                  </div>
                )}
              </div>
            </div>
            <div className="flex gap-4">
              <button
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
                className="text-blue-600 hover:text-blue-800 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                이전
              </button>
              <button
                onClick={() => setPage(page + 1)}
                disabled={page >= Math.ceil((data?.total || 0) / pageSize)}
                className="text-blue-600 hover:text-blue-800 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                다음
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Image Preview */}
      {previewImage && (
        <div
          className="fixed pointer-events-none"
          style={{
            left: previewImage.left,
            top: previewImage.top,
            zIndex: 10000,
          }}
        >
          <img
            src={previewImage.url}
            alt="Preview"
            className="border shadow-lg bg-white"
            style={{ maxWidth: '400px', maxHeight: '400px' }}
          />
        </div>
      )}

      {/* Copy Toast */}
      {copiedId && (
        <div
          className="fixed bottom-8 left-1/2 transform -translate-x-1/2 bg-white border shadow-lg px-4 py-2 text-sm text-gray-700"
          style={{ zIndex: 10001 }}
        >
          ID 복사됨: {copiedId}
        </div>
      )}
    </div>
  );
}
