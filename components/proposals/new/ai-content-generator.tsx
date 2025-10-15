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
import { Loader2, Wand2 } from 'lucide-react';
import { ProposalFormData } from '@/lib/validations/proposal';
import { MarkdownRenderer } from '@/components/ui/markdown-renderer';

interface AIContentGeneratorProps {
  form: ProposalFormData;
  generatedContent: string;
  onContentGenerated: (content: string) => void;
  onError: (error: string) => void;
  onGeneratingChange?: (generating: boolean) => void;
}

export function AIContentGenerator({
  form,
  generatedContent,
  onContentGenerated,
  onError,
  onGeneratingChange,
}: AIContentGeneratorProps) {
  const [generating, setGenerating] = useState(false);

  const generateProposalContent = async () => {
    if (!form.global_inputs.client_name || !form.title) {
      onError(
        'Please fill in at least the client name and proposal title to generate content.'
      );
      return;
    }

    setGenerating(true);
    onGeneratingChange?.(true);
    // onError('');

    try {
      const response = await fetch('/api/proposals/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          client_name: form.global_inputs.client_name,
          client_company: form.global_inputs.client_company,
          contact_phone: form.global_inputs.contact_phone,
          service_location: form.global_inputs.service_location,
          title: form.title,
          service_type: form.service_type,
          service_frequency: form.global_inputs.service_frequency,
          facility_size: form.global_inputs.facility_size,
          service_specific_data: form.service_specific_data,
          pricing_data: form.pricing_data,
          // Enhanced facility data
          facility_details: form.facility_details,
          traffic_analysis: form.traffic_analysis,
          service_scope: form.service_scope,
          special_requirements: form.special_requirements,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate proposal content');
      }

      const data = await response.json();
      onContentGenerated(data.content);
    } catch (error) {
      console.error('Error generating content:', error);
      onError('Failed to generate proposal content. Please try again.');
    } finally {
      setGenerating(false);
      onGeneratingChange?.(false);
    }
  };

  return (
    <>
      <CardHeader>
        <CardTitle>AI-Generated Content</CardTitle>
        <CardDescription>
          Generate professional proposal content using AI based on your project
          details
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button
          type="button"
          onClick={generateProposalContent}
          disabled={
            generating || !form.global_inputs.client_name || !form.title
          }
          variant="outline"
          className="w-full"
        >
          {generating ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Generating Content...
            </>
          ) : (
            <>
              <Wand2 className="mr-2 h-4 w-4" />
              Generate Proposal Content
            </>
          )}
        </Button>

        {generatedContent && (
          <div className="mt-4">
            <Label>Generated Content Preview</Label>
            <div className="mt-2 p-4 border rounded-md bg-gray-50 max-h-60 overflow-y-auto">
              <MarkdownRenderer content={generatedContent} />
            </div>
          </div>
        )}
      </CardContent>
    </>
  );
}
