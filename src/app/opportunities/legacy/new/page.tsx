// import { OpportunityEditor } from '@/components/opportunities/opportunity-editor';
import { redirect } from 'next/navigation';

export default function NewLegacyOpportunityPage(): never {
  // Historical creation is paused; the editor remains available for future use.
  // return <OpportunityEditor historicalMode />;
  redirect('/members');
}
