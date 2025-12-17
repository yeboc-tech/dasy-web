'use client';

import { useParams, useSearchParams } from 'next/navigation';
import WorksheetBuilder from '@/components/worksheet/WorksheetBuilder';

export default function WorksheetPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const worksheetId = params.id as string;
  const autoPdf = searchParams.get('pdf') === 'true';
  const solveId = searchParams.get('solve') || undefined;

  return <WorksheetBuilder worksheetId={worksheetId} autoPdf={autoPdf} solveId={solveId} />;
}
