'use client';
import { useParams } from 'next/navigation';
import { OpportunityEditor } from '@/components/opportunities/opportunity-editor';
export default function EditOpportunityPage(): React.JSX.Element {
  const { id } = useParams<{ id: string }>();
  return <OpportunityEditor opportunityId={id} />;
}
