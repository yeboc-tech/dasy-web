'use client';

import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { ArrowLeft, Eye, Calendar, Star, Lock } from 'lucide-react';
import { MDXRemote, MDXRemoteSerializeResult } from 'next-mdx-remote';
import { serialize } from 'next-mdx-remote/serialize';
import remarkGfm from 'remark-gfm';
import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/lib/contexts/auth-context';
import { useUserAccountStore } from '@/lib/zustand/userAccountStore';
import { toast } from 'sonner';

interface WorksheetGroupItem {
  id: number;
  image_url: string | null;
  title: string;
  content: string;
  view_count: number;
  created_at: string;
  price: number;
}

interface WorksheetGroupDetailContentProps {
  item: WorksheetGroupItem;
}

// MDX base components (without `a` — that's handled dynamically)
const baseMdxComponents = {
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

function isLockedLink(href: string | undefined): boolean {
  if (!href) return false;
  return href.includes('/solve/') || href.includes('cdn.y3c.kr');
}

export default function WorksheetGroupDetailContent({ item }: WorksheetGroupDetailContentProps) {
  const router = useRouter();
  const { user } = useAuth();
  const { point, fetchAccount } = useUserAccountStore();
  const [mdxSource, setMdxSource] = useState<MDXRemoteSerializeResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isFavorite, setIsFavorite] = useState(false);
  const [favoriteLoading, setFavoriteLoading] = useState(false);
  const [isPurchased, setIsPurchased] = useState(item.price === 0);
  const [purchaseLoading, setPurchaseLoading] = useState(false);

  const isPaid = item.price > 0;

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
    async function checkFavoriteAndPurchase() {
      if (!user) return;
      const supabase = createClient();

      // Check favorite
      const { data: favData } = await supabase
        .from('worksheet_group_favorites')
        .select('id')
        .eq('user_id', user.id)
        .eq('worksheet_group_id', item.id)
        .single();
      setIsFavorite(!!favData);

      // Check purchase (only for paid items)
      if (isPaid) {
        const { data: purchaseData } = await supabase
          .from('user_worksheet_group_purchases')
          .select('id')
          .eq('user_id', user.id)
          .eq('worksheet_group_id', item.id)
          .single();
        setIsPurchased(!!purchaseData);
      }
    }
    checkFavoriteAndPurchase();
  }, [user, item.id, isPaid]);

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

  const [purchaseDialogOpen, setPurchaseDialogOpen] = useState(false);

  const handlePurchaseClick = () => {
    if (!user) {
      router.push('/auth/signin');
      return;
    }
    setPurchaseDialogOpen(true);
  };

  const handlePurchaseConfirm = async () => {
    setPurchaseDialogOpen(false);
    setPurchaseLoading(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase.rpc('purchase_worksheet_group', {
        p_worksheet_group_id: item.id,
      });

      if (error) {
        toast.error('구매 중 오류가 발생했습니다.');
        return;
      }

      const result = data as { status: string; current_point?: number; required_point?: number; remaining_point?: number };

      switch (result.status) {
        case 'SUCCESS':
          setIsPurchased(true);
          if (user) fetchAccount(user.id);
          toast.success('구매가 완료되었습니다!');
          break;
        case 'ALREADY_PURCHASED':
          setIsPurchased(true);
          toast.info('이미 구매한 상품입니다.');
          break;
        case 'INSUFFICIENT_POINTS':
          toast.error(`포인트가 부족합니다. (보유: ${result.current_point}P / 필요: ${result.required_point}P)`);
          break;
        default:
          toast.error('구매 중 오류가 발생했습니다.');
      }
    } finally {
      setPurchaseLoading(false);
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

  const locked = isPaid && !isPurchased;

  const mdxComponents = useMemo(() => ({
    ...baseMdxComponents,
    a: (props: React.AnchorHTMLAttributes<HTMLAnchorElement>) => {
      if (locked && isLockedLink(props.href)) {
        return (
          <span className="inline-flex items-center gap-1 text-gray-400 cursor-not-allowed">
            <Lock className="w-3.5 h-3.5" />
            <span className="line-through">{props.children}</span>
          </span>
        );
      }
      return <a className="text-blue-600 hover:underline" {...props} />;
    },
  }), [locked]);

  return (
    <div className="w-full h-full flex flex-col overflow-hidden">
      {/* Top Bar */}
      <div className="h-14 border-b border-[var(--border)] flex items-center justify-between px-4 shrink-0 bg-white">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.back()}
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

          {/* Purchase Banner */}
          {isPaid && !isPurchased && (
            <div className="mb-8 p-4 bg-amber-50 border border-amber-200 rounded-lg flex items-center justify-between">
              <div>
                <p className="font-medium text-amber-900">이 학습지 그룹은 유료입니다</p>
                <p className="text-sm text-amber-700 mt-1">
                  풀기 및 PDF 다운로드를 위해 구매가 필요합니다. (보유 포인트: {point}P)
                </p>
              </div>
              <Button
                onClick={handlePurchaseClick}
                disabled={purchaseLoading}
                className="shrink-0 bg-amber-600 hover:bg-amber-700 text-white"
              >
                {purchaseLoading ? '처리 중...' : `${item.price.toLocaleString()}P 구매`}
              </Button>
            </div>
          )}

          {/* Purchase Confirmation Dialog */}
          <Dialog open={purchaseDialogOpen} onOpenChange={setPurchaseDialogOpen}>
            <DialogContent className="sm:max-w-sm">
              <DialogTitle>구매 확인</DialogTitle>
              <div className="space-y-3 mt-2">
                <p className="text-sm text-gray-700">
                  <span className="font-medium">{item.title}</span>을(를) 구매하시겠습니까?
                </p>
                <div className="p-3 bg-gray-50 rounded-lg space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">차감 포인트</span>
                    <span className="font-medium text-amber-700">{item.price.toLocaleString()}P</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">보유 포인트</span>
                    <span className="font-medium">{point.toLocaleString()}P</span>
                  </div>
                  <div className="border-t border-gray-200 pt-1 flex justify-between">
                    <span className="text-gray-500">구매 후 잔액</span>
                    <span className={`font-medium ${point - item.price < 0 ? 'text-red-500' : 'text-gray-900'}`}>
                      {(point - item.price).toLocaleString()}P
                    </span>
                  </div>
                </div>
                {point < item.price && (
                  <p className="text-xs text-red-500">포인트가 부족합니다.</p>
                )}
                <div className="flex gap-2 pt-1">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => setPurchaseDialogOpen(false)}
                  >
                    취소
                  </Button>
                  <Button
                    className="flex-1 bg-amber-600 hover:bg-amber-700 text-white"
                    onClick={handlePurchaseConfirm}
                    disabled={point < item.price}
                  >
                    구매하기
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

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
