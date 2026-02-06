'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Loader, Eye, Calendar } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

interface BoardItem {
  id: number;
  image_url: string | null;
  title: string;
  view_count: number;
  created_at: string;
}

export default function BoardPage() {
  const router = useRouter();
  const [items, setItems] = useState<BoardItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchItems() {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('board')
        .select('id, image_url, title, view_count, created_at')
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

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

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
          <div className="flex flex-col gap-2 max-w-3xl mx-auto">
            {items.map((item) => (
              <div
                key={item.id}
                onClick={() => router.push(`/board/${item.id}`)}
                className="flex items-center gap-4 p-4 bg-white border border-[var(--border)] rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
              >
                <div className="relative w-16 h-16 shrink-0 rounded-md overflow-hidden bg-gray-100 flex items-center justify-center">
                  {item.image_url ? (
                    <Image
                      src={item.image_url}
                      alt={item.title}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center">
                      <span className="text-blue-500 text-xl font-bold">
                        {item.title.charAt(0)}
                      </span>
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="font-medium text-[var(--foreground)] truncate">
                    {item.title}
                  </h2>
                  <div className="flex items-center gap-4 text-xs text-gray-500 mt-1">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {formatDate(item.created_at)}
                    </span>
                    <span className="flex items-center gap-1">
                      <Eye className="w-3 h-3" />
                      {item.view_count}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
