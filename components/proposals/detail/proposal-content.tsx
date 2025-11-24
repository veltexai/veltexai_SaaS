import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { MarkdownRenderer } from '@/components/ui/markdown-renderer';
import StructuredMarkdownRenderer from '@/components/proposals/detail/structured-markdown-renderer';
import { FileText } from 'lucide-react';
import { Database } from '@/types/database';

type Proposal = Database['public']['Tables']['proposals']['Row'];

interface ProposalContentProps {
  proposal: Proposal;
  isEditing?: boolean;
  contentDraft?: string;
  titleDraft?: string;
  onContentChange?: (content: string) => void;
  onTitleChange?: (title: string) => void;
}

export function ProposalContent({ 
  proposal, 
  isEditing = false, 
  contentDraft = '', 
  titleDraft = '',
  onContentChange,
  onTitleChange
}: ProposalContentProps) {
  return (
    <Card>
      <CardHeader>
        {isEditing ? (
          <div className="space-y-2">
            <label htmlFor="proposal-title" className="text-sm font-medium text-muted-foreground">
              Proposal Title
            </label>
            <Input
              id="proposal-title"
              value={titleDraft}
              onChange={(e) => onTitleChange?.(e.target.value)}
              placeholder="Enter proposal title..."
              className="text-lg font-semibold"
            />
          </div>
        ) : (
          <CardTitle>{proposal.title || 'Proposal Content'}</CardTitle>
        )}
      </CardHeader>
      <CardContent>
        {isEditing ? (
          <div className="space-y-4">
            <Textarea
              value={contentDraft}
              onChange={(e) => onContentChange?.(e.target.value)}
              placeholder="Enter proposal content..."
              className="min-h-[400px] resize-none"
            />
          </div>
        ) : (
          <>
            {proposal.generated_content ? (
              <div className="prose max-w-none">
                <StructuredMarkdownRenderer
                  content={proposal.generated_content}
                  proposalId={proposal.id}
                />
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
          </>
        )}
      </CardContent>
    </Card>
  );
}
