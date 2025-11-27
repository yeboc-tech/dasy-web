'use client';

import { useState } from 'react';
import { WorksheetItem, columns } from '../worksheets/columns';
import { DataTable } from '../worksheets/data-table';
import { Search } from 'lucide-react';
import { ProtectedRoute } from '@/components/auth/protected-route';
import { useAuth } from '@/lib/contexts/auth-context';
import { Input } from '@/components/ui/input';
import { Table as TableType } from '@tanstack/react-table';

export default function MyWorksheetsPage() {
  const [worksheets] = useState<WorksheetItem[]>([]);
  const [table, setTable] = useState<TableType<WorksheetItem> | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const { user } = useAuth();

  // Temporarily disabled - no infrastructure for this feature yet
  // Feature will be enabled once backend infrastructure is ready

  return (
    <ProtectedRoute>
      <div className="w-full h-full flex flex-col overflow-hidden">
        {/* Top Bar */}
        <div className="h-14 border-b border-[var(--border)] flex items-center justify-between px-4 shrink-0 bg-white">
          <h1 className="text-lg font-semibold text-[var(--foreground)]">내 학습지</h1>

          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="제목으로 검색..."
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                className="h-8 w-64 pl-8"
              />
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto">
          <DataTable
            columns={columns}
            data={worksheets}
            onTableReady={setTable}
          />
        </div>
      </div>
    </ProtectedRoute>
  );
}
