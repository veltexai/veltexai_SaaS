import { redirect } from 'next/navigation';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MessageSquare, Eye, Filter, Settings } from 'lucide-react';
import PromptsFilters from '@/components/admin/prompts-filters';
import PromptsTable from '@/components/admin/prompts-table';

// Force dynamic rendering
export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface VariableDefinition {
  type: 'text' | 'textarea' | 'number' | 'email' | 'phone' | 'url' | 'date' | 'time' | 'currency' | 'select';
  description: string;
  required: boolean;
  options?: string[];
}

interface PromptTemplate {
  id: string;
  name: string;
  description: string | null;
  category: 'proposal' | 'email' | 'follow_up' | 'custom' | 'proposal_commercial' | 'proposal_residential' | 'proposal_specialized' | 'email_welcome' | 'email_follow_up' | 'email_reminder' | 'email_thank_you' | 'email_rejection' | 'follow_up_initial' | 'follow_up_second' | 'follow_up_final';
  subcategory?: string | null;
  template_content: string;
  variables: string[];
  variable_definitions?: Record<string, VariableDefinition>;
  tags?: string[];
  usage_count?: number;
  last_used_at?: string | null;
  is_active: boolean;
  is_default: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

async function checkAdminAccess() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'admin') {
    redirect('/dashboard');
  }

  return user;
}

async function fetchPromptTemplates(): Promise<PromptTemplate[]> {
  const supabase = createServiceClient();

  try {
    const { data, error } = await supabase
      .from('prompt_templates')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching prompt templates:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error fetching prompt templates:', error);
    return [];
  }
}

export default async function PromptsPage() {
  const currentUser = await checkAdminAccess();
  const templates = await fetchPromptTemplates();

  const stats = {
    total: templates.length,
    active: templates.filter((t) => t.is_active).length,
    categories: new Set(templates.map((t) => t.category)).size,
    defaults: templates.filter((t) => t.is_default).length,
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            AI Prompt Templates
          </h1>
          <p className="text-muted-foreground">
            Manage AI prompt templates for proposals, emails, and communications
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Templates
            </CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Active Templates
            </CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.active}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Categories</CardTitle>
            <Filter className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.categories}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Default Templates
            </CardTitle>
            <Settings className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.defaults}</div>
          </CardContent>
        </Card>
      </div>

      <PromptsFilters />

      <PromptsTable templates={templates} currentUserId={currentUser.id} />
    </div>
  );
}
