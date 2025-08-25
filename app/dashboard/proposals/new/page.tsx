import { redirect } from 'next/navigation';
import { getUser } from '@/queries/user';
import { ProposalForm } from '@/components/proposals/new/proposal-form';

export default async function NewProposalPage() {
  const { user } = await getUser();

  if (!user) {
    redirect('/auth/login');
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">
          Create New Proposal
        </h1>
        <p className="mt-2 text-sm text-gray-600">
          Fill in the details below and let AI help you create a professional
          proposal.
        </p>
      </div>

      <ProposalForm userId={user.id} />
    </div>
  );
}
