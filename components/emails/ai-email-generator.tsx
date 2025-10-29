'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Wand2, RefreshCw, Edit3, Copy } from 'lucide-react';
import { AITone } from '@/types/database';
import { toast } from 'sonner';

interface AIEmailGeneratorProps {
  emailType: 'proposal_send' | 'follow_up' | 'thank_you' | 'reminder' | 'custom';
  proposalTitle?: string;
  clientName: string;
  clientCompany?: string;
  serviceType?: string;
  onSubjectGenerated: (subject: string) => void;
  onMessageGenerated: (message: string) => void;
  onError: (error: string) => void;
  className?: string;
}

export function AIEmailGenerator({
  emailType,
  proposalTitle,
  clientName,
  clientCompany,
  serviceType,
  onSubjectGenerated,
  onMessageGenerated,
  onError,
  className,
}: AIEmailGeneratorProps) {
  const [generating, setGenerating] = useState(false);
  const [selectedTone, setSelectedTone] = useState<AITone>('professional');
  const [customContext, setCustomContext] = useState('');
  const [generatedContent, setGeneratedContent] = useState<{
    subject: string;
    body: string;
  } | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editedSubject, setEditedSubject] = useState('');
  const [editedBody, setEditedBody] = useState('');

  const toneOptions: { value: AITone; label: string; description: string }[] = [
    {
      value: 'professional',
      label: 'Professional',
      description: 'Formal, business-focused tone',
    },
    {
      value: 'friendly',
      label: 'Friendly',
      description: 'Warm and approachable tone',
    },
    {
      value: 'formal',
      label: 'Formal',
      description: 'Very formal and structured tone',
    },
    {
      value: 'casual',
      label: 'Casual',
      description: 'Relaxed and conversational tone',
    },
    {
      value: 'technical',
      label: 'Technical',
      description: 'Detail-oriented and technical tone',
    },
  ];

  const emailTypeLabels = {
    proposal_send: 'Proposal Introduction',
    follow_up: 'Follow-up Email',
    thank_you: 'Thank You Email',
    reminder: 'Gentle Reminder',
    custom: 'Custom Email',
  };

  const generateEmailContent = async (isRegenerate = false) => {
    if (!clientName) {
      onError('Client name is required to generate email content.');
      return;
    }

    setGenerating(true);

    try {
      const response = await fetch('/api/emails/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email_type: emailType,
          proposal_title: proposalTitle,
          client_name: clientName,
          client_company: clientCompany,
          service_type: serviceType,
          ai_tone: selectedTone,
          custom_context: customContext,
          include_proposal_details: true,
          is_regenerate: isRegenerate,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate email content');
      }

      const data = await response.json();
      
      setGeneratedContent({
        subject: data.subject,
        body: data.body,
      });

      // Auto-apply the generated content
      onSubjectGenerated(data.subject);
      onMessageGenerated(data.body);

      toast.success('Email content generated successfully!');
    } catch (error) {
      console.error('Error generating email content:', error);
      onError('Failed to generate email content. Please try again.');
    } finally {
      setGenerating(false);
    }
  };

  const handleRegenerate = () => {
    generateEmailContent(true);
  };

  const handleEdit = () => {
    if (generatedContent) {
      setEditedSubject(generatedContent.subject);
      setEditedBody(generatedContent.body);
      setIsEditing(true);
    }
  };

  const handleSaveEdit = () => {
    if (editedSubject && editedBody) {
      const updatedContent = {
        subject: editedSubject,
        body: editedBody,
      };
      
      setGeneratedContent(updatedContent);
      onSubjectGenerated(editedSubject);
      onMessageGenerated(editedBody);
      
      setIsEditing(false);
      setEditedSubject('');
      setEditedBody('');
      
      toast.success('Email content updated successfully!');
    }
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditedSubject('');
    setEditedBody('');
  };

  const handleCopyContent = () => {
    if (generatedContent) {
      const fullContent = `Subject: ${generatedContent.subject}\n\n${generatedContent.body}`;
      navigator.clipboard.writeText(fullContent);
      toast.success('Email content copied to clipboard!');
    }
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wand2 className="h-5 w-5" />
          AI Email Generator
        </CardTitle>
        <CardDescription>
          Generate professional email content for {emailTypeLabels[emailType].toLowerCase()} using AI.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Tone Selection */}
        <div className="space-y-2">
          <Label htmlFor="ai-tone">Email Tone</Label>
          <Select
            value={selectedTone}
            onValueChange={(value: AITone) => setSelectedTone(value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select tone" />
            </SelectTrigger>
            <SelectContent>
              {toneOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  <div className="flex flex-col">
                    <span className="font-medium">{option.label}</span>
                    <span className="text-xs text-muted-foreground">
                      {option.description}
                    </span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Custom Context for Custom Email Type */}
        {emailType === 'custom' && (
          <div className="space-y-2">
            <Label htmlFor="custom-context">Additional Context</Label>
            <Textarea
              id="custom-context"
              value={customContext}
              onChange={(e) => setCustomContext(e.target.value)}
              placeholder="Provide additional context for the email (e.g., specific points to mention, special requirements, etc.)"
              className="min-h-[80px]"
            />
          </div>
        )}

        {/* Generate/Regenerate Buttons */}
        <div className="flex gap-2">
          <Button
            type="button"
            onClick={() => generateEmailContent(false)}
            disabled={generating || !clientName}
            variant="outline"
            className="flex-1"
          >
            {generating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Wand2 className="mr-2 h-4 w-4" />
                {generatedContent ? 'Generate New' : 'Generate Email'}
              </>
            )}
          </Button>

          {generatedContent && !generating && (
            <>
              <Button
                type="button"
                onClick={handleRegenerate}
                variant="outline"
                size="icon"
                title="Regenerate with same settings"
              >
                <RefreshCw className="h-4 w-4" />
              </Button>

              {!isEditing && (
                <Button
                  type="button"
                  onClick={handleEdit}
                  variant="outline"
                  size="icon"
                  title="Edit content"
                >
                  <Edit3 className="h-4 w-4" />
                </Button>
              )}

              <Button
                type="button"
                onClick={handleCopyContent}
                variant="outline"
                size="icon"
                title="Copy to clipboard"
              >
                <Copy className="h-4 w-4" />
              </Button>
            </>
          )}
        </div>

        {/* Content Display/Edit */}
        {generatedContent && (
          <div className="mt-4 space-y-4">
            <Label>Generated Email Content</Label>
            
            {isEditing ? (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-subject">Subject</Label>
                  <input
                    id="edit-subject"
                    type="text"
                    value={editedSubject}
                    onChange={(e) => setEditedSubject(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Email subject..."
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-body">Message</Label>
                  <Textarea
                    id="edit-body"
                    value={editedBody}
                    onChange={(e) => setEditedBody(e.target.value)}
                    className="min-h-[200px] font-mono text-sm"
                    placeholder="Email message..."
                  />
                </div>
                <div className="flex gap-2 justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleCancelEdit}
                  >
                    Cancel
                  </Button>
                  <Button type="button" onClick={handleSaveEdit}>
                    Save Changes
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="p-3 border rounded-md bg-gray-50">
                  <div className="text-sm font-medium text-gray-700 mb-1">Subject:</div>
                  <div className="text-sm">{generatedContent.subject}</div>
                </div>
                <div className="p-4 border rounded-md bg-gray-50 max-h-60 overflow-y-auto">
                  <div className="text-sm font-medium text-gray-700 mb-2">Message:</div>
                  <div className="text-sm whitespace-pre-wrap">{generatedContent.body}</div>
                </div>
              </div>
            )}

            {/* Veltex AI Attribution */}
            <div className="flex items-center justify-between text-xs text-muted-foreground bg-blue-50 p-2 rounded border">
              <span className="flex items-center gap-1">
                <Wand2 className="h-3 w-3" />
                Powered by Veltex AI
              </span>
              <span>Tone: {toneOptions.find(t => t.value === selectedTone)?.label}</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}