'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import WorksheetBuilder from '@/components/worksheet/WorksheetBuilder';
import { createClient } from '@/lib/supabase/client';
import { checkWorksheetAccess } from '@/lib/supabase/services/purchaseService';
import { toast } from 'sonner';

export default function PdfPage() {
  const params = useParams();
  const router = useRouter();
  const worksheetId = params.id as string;
  const [accessChecked, setAccessChecked] = useState(false);

  useEffect(() => {
    async function verifyAccess() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        const access = await checkWorksheetAccess(supabase, user.id, worksheetId);
        if (access.isPaid && !access.isPurchased) {
          toast.error('구매가 필요한 학습지입니다.');
          router.replace(access.worksheetGroupId ? `/worksheet-group/${access.worksheetGroupId}` : '/worksheet-group');
          return;
        }
      }

      setAccessChecked(true);
    }
    verifyAccess();
  }, [worksheetId, router]);

  if (!accessChecked) return null;

  return <WorksheetBuilder worksheetId={worksheetId} autoPdf />;
}
