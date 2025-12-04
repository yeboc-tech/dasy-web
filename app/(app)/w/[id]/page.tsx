'use client';

import { useParams } from 'next/navigation';
import WorksheetBuilder from '@/components/worksheet/WorksheetBuilder';

export default function WorksheetPage() {
  const params = useParams();
  const worksheetId = params.id as string;

  return <WorksheetBuilder worksheetId={worksheetId} />;
}
