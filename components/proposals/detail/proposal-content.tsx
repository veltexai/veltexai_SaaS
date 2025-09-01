import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MarkdownRenderer } from '@/components/ui/markdown-renderer';
import { FileText } from 'lucide-react';

interface Proposal {
  id: string;
  content: string;
}

interface ProposalContentProps {
  proposal: Proposal;
}

export function ProposalContent({ proposal }: ProposalContentProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Proposal Content</CardTitle>
      </CardHeader>
      <CardContent>
        {proposal.content ? (
          <div className="prose max-w-none">
            <MarkdownRenderer content={proposal.content} />
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <FileText className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <p>No content generated yet</p>
            <p className="text-sm mt-1">
              Edit this proposal to add or generate content
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
