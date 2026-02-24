'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Eye, Calendar, Star } from 'lucide-react';
import { BoardColorTag } from '@/components/ui/board-color-tag';
import { SubjectColorTag } from '@/components/ui/subject-color-tag';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/lib/contexts/auth-context';
import { ImageUrlResolver } from '@/lib/entity/ImageUrlResolver';

export interface WorksheetGroupItem {
  id: number;
  image_url: string | null;
  title: string;
  view_count: number;
  created_at: string;
  tags: string[] | null;
  subjects: string[];
  targetGrades?: string[];
}

interface WorksheetGroupListItemProps {
  item: WorksheetGroupItem;
  href?: string;
  hideFavorite?: boolean;
}

export function WorksheetGroupListItem({ item, href, hideFavorite }: WorksheetGroupListItemProps) {
  const router = useRouter();
  const { user } = useAuth();
  const [isFavorite, setIsFavorite] = useState(false);

  useEffect(() => {
    if (hideFavorite) return;
    async function checkFavorite() {
      if (!user) return;
      const supabase = createClient();
      const { data } = await supabase
        .from('worksheet_group_favorites')
        .select('id')
        .eq('user_id', user.id)
        .eq('worksheet_group_id', item.id)
        .single();
      setIsFavorite(!!data);
    }
    checkFavorite();
  }, [user, item.id, hideFavorite]);

  const toggleFavorite = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) {
      router.push('/auth/signin');
      return;
    }

    const supabase = createClient();
    if (isFavorite) {
      await supabase
        .from('worksheet_group_favorites')
        .delete()
        .eq('user_id', user.id)
        .eq('worksheet_group_id', item.id);
      setIsFavorite(false);
    } else {
      await supabase
        .from('worksheet_group_favorites')
        .insert({ user_id: user.id, worksheet_group_id: item.id });
      setIsFavorite(true);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <div
      onClick={() => router.push(href || `/worksheet-group/${item.id}`)}
      className="w-full flex items-center gap-4 p-4 bg-white border border-[var(--border)] rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
    >
      <div className="relative shrink-0 rounded-md overflow-hidden bg-gray-100 flex items-center justify-center" style={{ width: 96, aspectRatio: '1 / 1.41' }}>
        {item.image_url ? (
          <Image
            src={ImageUrlResolver.resolve(item.image_url)!}
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
        {(item.tags?.length || item.targetGrades?.length) && (
          <div className="flex flex-wrap gap-1 mb-1">
            {item.tags?.map((tag) => (
              <BoardColorTag key={tag} tag={tag} />
            ))}
            {item.targetGrades?.map((grade) => (
              <span key={grade} className="px-1.5 py-0.5 text-[10px] font-medium rounded bg-amber-50 text-amber-700">
                {grade}
              </span>
            ))}
          </div>
        )}
        {item.subjects.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-1">
            {[...item.subjects].sort((a, b) => a.localeCompare(b, 'ko')).map((subject) => (
              <SubjectColorTag key={subject} subjectId={subject} />
            ))}
          </div>
        )}
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
      {!hideFavorite && (
        <button
          onClick={toggleFavorite}
          className="shrink-0 p-2 hover:bg-gray-100 rounded-full transition-colors"
        >
          <Star className={`w-5 h-5 ${isFavorite ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`} />
        </button>
      )}
    </div>
  );
}
