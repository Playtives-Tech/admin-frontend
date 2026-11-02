'use client';

import { useParams } from 'next/navigation';
import { OpportunityEditor } from '@/components/opportunities/opportunity-editor';

export default function DuplicateOpportunityPage(): React.JSX.Element {
  const { id } = useParams<{ id: string }>();
  return <OpportunityEditor copyFromId={id} />;
}
