'use client';

import { useParams, useSearchParams } from 'next/navigation';
import WorksheetBuilder from '@/components/worksheet/WorksheetBuilder';

export default function WorksheetPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const worksheetId = params.id as string;
  const autoPdf = searchParams.get('pdf') === 'true';

  return <WorksheetBuilder worksheetId={worksheetId} autoPdf={autoPdf} />;
}
