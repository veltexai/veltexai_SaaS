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
import { Loader2, Wand2, RefreshCw, Edit3 } from 'lucide-react';
import { ProposalFormData } from '@/lib/validations/proposal';
import { MarkdownRenderer } from '@/components/ui/markdown-renderer';
import { AITone } from '@/types/database';
import { Textarea } from '@/components/ui/textarea';

interface AIContentGeneratorProps {
  form: ProposalFormData;
  selectedAddons?: any[];
  generatedContent: string;
  onContentGenerated: (content: string) => void;
  onError: (error: string) => void;
  onGeneratingChange?: (generating: boolean) => void;
  selectedTone?: AITone;
  onToneChange?: (tone: AITone) => void;
  pricingEnabled?: boolean;
}

export function AIContentGenerator({
  form,
  selectedAddons,
  generatedContent,
  onContentGenerated,
  onError,
  onGeneratingChange,
  selectedTone = 'professional',
  onToneChange,
  pricingEnabled = false,
}: AIContentGeneratorProps) {
  const [generating, setGenerating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState('');

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

  const generateProposalContent = async (isRegenerate = false) => {
    if (!form.global_inputs.client_name || !form.title) {
      onError(
        'Please fill in at least the client name and proposal title to generate content.'
      );
      return;
    }

    setGenerating(true);
    onGeneratingChange?.(true);

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
          // Only include pricing_data when pricing is enabled - ensures fresh generation
          pricing_data: pricingEnabled ? form.pricing_data : undefined,
          pricing_enabled: pricingEnabled,
          // Enhanced facility data
          facility_details: form.facility_details,
          traffic_analysis: form.traffic_analysis,
          service_scope: form.service_scope,
          special_requirements: form.special_requirements,
          selected_addons:
            Array.isArray(selectedAddons) && selectedAddons.length > 0
              ? selectedAddons
              : (form as any).selected_addons,
          // AI tone selection
          ai_tone: selectedTone,
          is_regenerate: isRegenerate,
          // Template data
          template_id: form.template_id,
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

  const handleRegenerate = () => {
    generateProposalContent(true);
  };

  const handleEdit = () => {
    setEditedContent(generatedContent);
    setIsEditing(true);
  };

  const handleSaveEdit = () => {
    onContentGenerated(editedContent);
    setIsEditing(false);
    setEditedContent('');
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditedContent('');
  };

  return (
    <>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wand2 className="h-5 w-5" />
          Operational Intelligence Output
        </CardTitle>
        <CardDescription>
          Client-ready content from your scope, labor, and margin inputs. Constrained by real janitorial rules. Choose a tone that matches your client relationship.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Tone Selection */}
        <div className="space-y-2">
          <Label htmlFor="ai-tone">AI Tone</Label>
          <Select
            value={selectedTone}
            onValueChange={(value: AITone) => onToneChange?.(value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select tone">
                {selectedTone &&
                  toneOptions.find((option) => option.value === selectedTone)
                    ?.label}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {toneOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  <div className="flex flex-col items-start">
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

        {/* Generate/Regenerate Buttons */}
        <div className="flex gap-2">
          <Button
            type="button"
            onClick={() => generateProposalContent(false)}
            disabled={
              generating || !form.global_inputs.client_name || !form.title
            }
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
                {generatedContent ? 'Generate New' : 'Generate Content'}
              </>
            )}
          </Button>

          {generatedContent && !generating && (
            <Button
              type="button"
              onClick={handleRegenerate}
              variant="outline"
              size="icon"
              title="Regenerate with same settings"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          )}

          {generatedContent && !generating && !isEditing && (
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
        </div>

        {/* Content Display/Edit */}
        {generatedContent && (
          <div className="mt-4 space-y-4">
            <Label>Generated Content Preview</Label>

            {isEditing ? (
              <div className="space-y-4">
                <Textarea
                  value={editedContent}
                  onChange={(e) => setEditedContent(e.target.value)}
                  className="min-h-[300px] font-mono text-sm"
                  placeholder="Edit your proposal content..."
                />
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
              <div className="p-4 border rounded-md bg-gray-50 max-h-60 overflow-y-auto">
                <MarkdownRenderer content={generatedContent} />
              </div>
            )}

            {/* Veltex AI Attribution */}
            <div className="flex items-center justify-between text-xs text-muted-foreground bg-blue-50 p-2 rounded border">
              <span className="flex items-center gap-1">
                <Wand2 className="h-3 w-3" />
                Powered by Veltex AI
              </span>
              <span>
                Tone: {toneOptions.find((t) => t.value === selectedTone)?.label}
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </>
  );
}
