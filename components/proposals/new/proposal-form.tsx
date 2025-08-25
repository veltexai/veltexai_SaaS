'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { createClient } from '@/lib/supabase/client';
import { Loader2, FileText } from 'lucide-react';
import { BasicInfoSection } from './basic-info-section';
import { ProjectDetailsSection } from './project-details-section';
import { ProjectDescriptionSection } from './project-description-section';
import { AIContentGenerator } from './ai-content-generator';

interface ProposalForm {
  title: string;
  client_name: string;
  client_email: string;
  project_description: string;
  budget_range: string;
  timeline: string;
  company_name: string;
  services_offered: string;
}

interface ProposalFormProps {
  userId: string;
}

export function ProposalForm({ userId }: ProposalFormProps) {
  const router = useRouter();
  const [form, setForm] = useState<ProposalForm>({
    title: '',
    client_name: '',
    client_email: '',
    project_description: '',
    budget_range: '',
    timeline: '',
    company_name: '',
    services_offered: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [generatedContent, setGeneratedContent] = useState('');

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.title || !form.client_name || !form.project_description) {
      setError('Please fill in all required fields.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const supabase = createClient();

      const { data, error: insertError } = await supabase
        .from('proposals')
        .insert({
          user_id: userId,
          title: form.title,
          client_name: form.client_name,
          client_email: form.client_email,
          project_description: form.project_description,
          budget_range: form.budget_range,
          timeline: form.timeline,
          company_name: form.company_name,
          services_offered: form.services_offered,
          content: generatedContent,
          status: 'draft',
          value: parseFloat(form.budget_range.replace(/[^0-9.-]+/g, '')) || 0,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      router.push(`/dashboard/proposals/${data.id}`);
    } catch (error) {
      console.error('Error creating proposal:', error);
      setError('Failed to create proposal. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <BasicInfoSection form={form} onChange={handleInputChange} />
          <ProjectDetailsSection form={form} onChange={handleInputChange} />
        </div>

        <ProjectDescriptionSection form={form} onChange={handleInputChange} />

        <AIContentGenerator
          form={form}
          generatedContent={generatedContent}
          onContentGenerated={setGeneratedContent}
          onError={setError}
        />

        <div className="flex justify-end space-x-4">
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Cancel
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <FileText className="mr-2 h-4 w-4" />
                Create Proposal
              </>
            )}
          </Button>
        </div>
      </form>
    </>
  );
}
