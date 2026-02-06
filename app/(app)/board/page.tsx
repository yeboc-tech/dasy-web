'use client';

import { useState, useEffect } from 'react';
import { Loader } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { BoardListItem, BoardItem } from '@/components/board/board-list-item';

export default function BoardPage() {
  const [items, setItems] = useState<BoardItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchItems() {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('board')
        .select('id, image_url, title, view_count, created_at, tags, subjects')
        .eq('is_best', true)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching board items:', error);
      } else {
        setItems(data || []);
      }
      setLoading(false);
    }

    fetchItems();
  }, []);

  if (loading) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <Loader className="animate-spin w-6 h-6 text-gray-400" />
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col overflow-hidden">
      {/* Top Bar */}
      <div className="h-14 border-b border-[var(--border)] flex items-center justify-between px-4 shrink-0 bg-white">
        <div className="flex items-end gap-2">
          <h1 className="text-lg font-semibold leading-none text-[var(--foreground)]">게시판</h1>
          <span className="text-xs text-[var(--gray-500)] leading-none pb-0.5">
            {items.length}개 게시물
          </span>
        </div>
      </div>

      {/* Board List */}
      <div className="flex-1 overflow-y-auto p-4">
        {items.length === 0 ? (
          <div className="flex items-center justify-center h-48 text-gray-500">
            게시물이 없습니다.
          </div>
        ) : (
          <div className="flex flex-col gap-2 w-full">
            {items.map((item) => (
              <BoardListItem key={item.id} item={item} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
