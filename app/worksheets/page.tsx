'use client';

import { useState, useEffect } from 'react';
import { WorksheetItem, columns } from './columns';
import { DataTable } from './data-table';
import { Loader } from 'lucide-react';

export default function WorksheetsPage() {
  const [worksheets, setWorksheets] = useState<WorksheetItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchWorksheets = async () => {
      try {
        const { createClient } = await import('@/lib/supabase/client');
        const supabase = createClient();
        
        const { data, error } = await supabase
          .from('worksheets')
          .select('id, title, author, created_at, selected_problem_ids')
          .eq('is_public', true)
          .order('created_at', { ascending: false });

        if (error) throw error;
        setWorksheets(data || []);
      } catch (error) {
        console.error('Error fetching worksheets:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchWorksheets();
  }, []);

  if (loading) {
    return (
      <div className="mx-auto px-4 pt-0 pb-4 w-full max-w-4xl h-full">
        <div className="flex justify-center py-8">
          <Loader size={16} className="animate-spin text-gray-500" />
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto px-4 pt-0 pb-4 w-full max-w-4xl h-full">
      <DataTable columns={columns} data={worksheets} />
    </div>
  );
}