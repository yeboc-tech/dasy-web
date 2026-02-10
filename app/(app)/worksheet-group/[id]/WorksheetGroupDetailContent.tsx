'use client';

import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { ArrowLeft, Eye, Calendar, Star } from 'lucide-react';
import { MDXRemote, MDXRemoteSerializeResult } from 'next-mdx-remote';
import { serialize } from 'next-mdx-remote/serialize';
import remarkGfm from 'remark-gfm';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/lib/contexts/auth-context';

interface WorksheetGroupItem {
  id: number;
  image_url: string | null;
  title: string;
  content: string;
  view_count: number;
  created_at: string;
}

interface WorksheetGroupDetailContentProps {
  item: WorksheetGroupItem;
}

// Custom MDX components
const mdxComponents = {
  h1: (props: React.HTMLAttributes<HTMLHeadingElement>) => (
    <h1 className="text-3xl font-bold mt-8 mb-4" {...props} />
  ),
  h2: (props: React.HTMLAttributes<HTMLHeadingElement>) => (
    <h2 className="text-2xl font-semibold mt-6 mb-3" {...props} />
  ),
  h3: (props: React.HTMLAttributes<HTMLHeadingElement>) => (
    <h3 className="text-xl font-medium mt-4 mb-2" {...props} />
  ),
  p: (props: React.HTMLAttributes<HTMLParagraphElement>) => (
    <p className="my-3 leading-7" {...props} />
  ),
  ul: (props: React.HTMLAttributes<HTMLUListElement>) => (
    <ul className="list-disc list-inside my-3 space-y-1" {...props} />
  ),
  ol: (props: React.HTMLAttributes<HTMLOListElement>) => (
    <ol className="list-decimal list-inside my-3 space-y-1" {...props} />
  ),
  li: (props: React.HTMLAttributes<HTMLLIElement>) => (
    <li className="leading-7" {...props} />
  ),
  blockquote: (props: React.HTMLAttributes<HTMLQuoteElement>) => (
    <blockquote className="border-l-4 border-gray-300 pl-4 my-4 italic text-gray-600" {...props} />
  ),
  code: (props: React.HTMLAttributes<HTMLElement>) => (
    <code className="bg-gray-100 px-1.5 py-0.5 rounded text-sm font-mono" {...props} />
  ),
  pre: (props: React.HTMLAttributes<HTMLPreElement>) => (
    <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto my-4" {...props} />
  ),
  a: (props: React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a className="text-blue-600 hover:underline" {...props} />
  ),
  img: (props: React.ImgHTMLAttributes<HTMLImageElement>) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img className="max-w-full h-auto rounded-lg my-4" alt={props.alt || ''} {...props} />
  ),
  hr: () => <hr className="my-8 border-gray-200" />,
  table: (props: React.HTMLAttributes<HTMLTableElement>) => (
    <div className="overflow-x-auto my-4">
      <table className="min-w-full border-collapse border border-gray-200" {...props} />
    </div>
  ),
  th: (props: React.HTMLAttributes<HTMLTableCellElement>) => (
    <th className="border border-gray-200 px-4 py-2 bg-gray-50 font-medium text-left" {...props} />
  ),
  td: (props: React.HTMLAttributes<HTMLTableCellElement>) => (
    <td className="border border-gray-200 px-4 py-2" {...props} />
  ),
};

export default function WorksheetGroupDetailContent({ item }: WorksheetGroupDetailContentProps) {
  const router = useRouter();
  const { user } = useAuth();
  const [mdxSource, setMdxSource] = useState<MDXRemoteSerializeResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isFavorite, setIsFavorite] = useState(false);
  const [favoriteLoading, setFavoriteLoading] = useState(false);

  useEffect(() => {
    async function compileMDX() {
      try {
        const source = await serialize(item.content, {
          mdxOptions: {
            remarkPlugins: [remarkGfm],
          },
        });
        setMdxSource(source);
      } catch {
        setError('MDX 파싱 오류가 발생했습니다.');
      }
    }
    compileMDX();
  }, [item.content]);

  useEffect(() => {
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
  }, [user, item.id]);

  const toggleFavorite = async () => {
    if (!user) {
      router.push('/auth/signin');
      return;
    }

    setFavoriteLoading(true);
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
    setFavoriteLoading(false);
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
    <div className="w-full h-full flex flex-col overflow-hidden">
      {/* Top Bar */}
      <div className="h-14 border-b border-[var(--border)] flex items-center justify-between px-4 shrink-0 bg-white">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push('/worksheet-group')}
          className="flex items-center gap-1 -ml-2"
        >
          <ArrowLeft className="w-4 h-4" />
          목록으로
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={toggleFavorite}
          disabled={favoriteLoading}
          className="flex items-center gap-1"
        >
          <Star className={`w-4 h-4 ${isFavorite ? 'fill-yellow-400 text-yellow-400' : ''}`} />
          {isFavorite ? '즐겨찾기 해제' : '즐겨찾기'}
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <article className="max-w-3xl mx-auto px-4 py-8">
          {/* Header */}
          <header className="mb-8">
            <h1 className="text-3xl font-bold text-[var(--foreground)] mb-4">
              {item.title}
            </h1>
            <div className="flex items-center gap-4 text-sm text-gray-500">
              <span className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                {formatDate(item.created_at)}
              </span>
              <span className="flex items-center gap-1">
                <Eye className="w-4 h-4" />
                {item.view_count}
              </span>
            </div>
          </header>

          {/* Featured Image */}
          {item.image_url && (
            <div className="relative w-full h-64 md:h-96 mb-8 rounded-lg overflow-hidden">
              <Image
                src={item.image_url}
                alt={item.title}
                fill
                className="object-cover"
              />
            </div>
          )}

          {/* MDX Content */}
          <div className="prose prose-gray max-w-none">
            {error ? (
              <div className="text-red-500">{error}</div>
            ) : mdxSource ? (
              <MDXRemote {...mdxSource} components={mdxComponents} />
            ) : (
              <div className="text-gray-400">로딩 중...</div>
            )}
          </div>
        </article>
      </div>
    </div>
  );
}
