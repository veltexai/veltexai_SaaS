'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { type Database } from '@/types/database';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import {
  ArrowLeft,
  Edit,
  Download,
  Trash2,
  Send,
  DollarSign,
  Calendar,
  MapPin,
  User,
  Building,
  Phone,
  Mail,
  Loader2,
  PenTool,
  Save,
  X,
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { ProposalEditDialog } from '@/components/proposals/proposal-edit-dialog';
import { Textarea } from '@/components/ui/textarea';
import { MarkdownRenderer } from '@/components/ui/markdown-renderer';
import LoadingPage from '@/components/ui/loading-page';

type Proposal = Database['public']['Tables']['proposals']['Row'];

interface ProposalDetailPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default function ProposalDetailPage({
  params,
}: ProposalDetailPageProps) {
  const { id } = use(params);
  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [loading, setLoading] = useState(true);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [editingAIContent, setEditingAIContent] = useState(false);
  const [aiContentDraft, setAiContentDraft] = useState('');
  const [savingAIContent, setSavingAIContent] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    fetchProposal();
  }, [id]);

  const fetchProposal = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('proposals')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        console.error('Error fetching proposal:', error);
        console.error('Error code:', error.code); // Check if it's PGRST116
        if (error.code === 'PGRST116') {
          console.error('No rows found - proposal does not exist');
          toast.error('Proposal not found');
        } else {
          toast.error('Failed to load proposal');
        }
        router.push('/dashboard/proposals');
        return;
      }
      setProposal(data);
    } catch (error) {
      console.error('Error:', error);
      toast.error('Failed to load proposal');
      router.push('/dashboard/proposals');
    } finally {
      setLoading(false);
    }
  };

  const handleAIContentEdit = () => {
    setAiContentDraft(proposal?.generated_content || '');
    setEditingAIContent(true);
  };

  const handleAIContentCancel = () => {
    setEditingAIContent(false);
    setAiContentDraft('');
  };

  const handleAIContentSave = async () => {
    if (!proposal) return;

    try {
      setSavingAIContent(true);
      const { error } = await supabase
        .from('proposals')
        .update({
          generated_content: aiContentDraft,
          updated_at: new Date().toISOString(),
        })
        .eq('id', proposal.id);

      if (error) throw error;

      setProposal((prev) =>
        prev
          ? {
              ...prev,
              generated_content: aiContentDraft,
            }
          : null
      );
      setEditingAIContent(false);
      setAiContentDraft('');
      toast.success('AI content updated successfully');
    } catch (error) {
      console.error('Error updating AI content:', error);
      toast.error('Failed to update AI content');
    } finally {
      setSavingAIContent(false);
    }
  };

  const handleDelete = async () => {
    if (!proposal) return;

    try {
      setDeleting(true);
      const { error } = await supabase
        .from('proposals')
        .delete()
        .eq('id', proposal.id);

      if (error) throw error;

      toast.success('Proposal deleted successfully');
      router.push('/dashboard/proposals');
    } catch (error) {
      console.error('Error deleting proposal:', error);
      toast.error('Failed to delete proposal');
    } finally {
      setDeleting(false);
    }
  };

  const handleStatusUpdate = async (
    newStatus: 'draft' | 'sent' | 'accepted' | 'rejected'
  ) => {
    if (!proposal) return;

    try {
      const { error } = await supabase
        .from('proposals')
        .update({
          status: newStatus,
          updated_at: new Date().toISOString(),
        })
        .eq('id', proposal.id);

      if (error) throw error;

      setProposal((prev) =>
        prev
          ? {
              ...prev,
              status: newStatus as 'draft' | 'sent' | 'accepted' | 'rejected',
            }
          : null
      );
      toast.success(`Proposal ${newStatus}`);
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Failed to update proposal status');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft':
        return 'secondary';
      case 'sent':
        return 'default';
      case 'accepted':
        return 'default';
      case 'rejected':
        return 'destructive';
      default:
        return 'secondary';
    }
  };

  const getServiceTypeLabel = (serviceType: string) => {
    const labels: Record<string, string> = {
      residential: 'Residential Cleaning',
      commercial: 'Commercial Cleaning',
      carpet: 'Carpet Cleaning',
      window: 'Window Cleaning',
      floor: 'Floor Cleaning',
    };
    return labels[serviceType] || serviceType;
  };

  const renderServiceSpecificData = () => {
    if (!proposal?.service_specific_data) return null;

    const data = proposal.service_specific_data as any;
    const serviceType = proposal.service_type;

    return (
      <Card>
        <CardHeader>
          <CardTitle>Service Details</CardTitle>
          <CardDescription>
            Specific requirements for {getServiceTypeLabel(serviceType)}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {serviceType === 'residential' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {data.rooms && (
                <div>
                  <h4 className="font-medium mb-2">Rooms to Clean</h4>
                  <div className="flex flex-wrap gap-2">
                    {data.rooms.map((room: any, index: number) => (
                      <Badge key={index} variant="outline">
                        {room.type} ({room.count})
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              {data.special_requirements && (
                <div>
                  <h4 className="font-medium mb-2">Special Requirements</h4>
                  <div className="flex flex-wrap gap-2">
                    {data.special_requirements.map(
                      (req: string, index: number) => (
                        <Badge key={index} variant="secondary">
                          {req}
                        </Badge>
                      )
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {serviceType === 'commercial' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {data.areas && (
                <div>
                  <h4 className="font-medium mb-2">Areas to Clean</h4>
                  <div className="flex flex-wrap gap-2">
                    {data.areas.map((area: any, index: number) => (
                      <Badge key={index} variant="outline">
                        {area.type} ({area.size} sq ft)
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              {data.special_requirements && (
                <div>
                  <h4 className="font-medium mb-2">Special Requirements</h4>
                  <div className="flex flex-wrap gap-2">
                    {data.special_requirements.map(
                      (req: string, index: number) => (
                        <Badge key={index} variant="secondary">
                          {req}
                        </Badge>
                      )
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {serviceType === 'carpet' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {data.carpets && (
                <div>
                  <h4 className="font-medium mb-2">Carpet Areas</h4>
                  <div className="space-y-2">
                    {data.carpets.map((carpet: any, index: number) => (
                      <div
                        key={index}
                        className="flex justify-between items-center p-2 bg-muted rounded"
                      >
                        <span>{carpet.room}</span>
                        <Badge variant="outline">{carpet.size} sq ft</Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {data.treatments && (
                <div>
                  <h4 className="font-medium mb-2">Treatments</h4>
                  <div className="flex flex-wrap gap-2">
                    {data.treatments.map((treatment: string, index: number) => (
                      <Badge key={index} variant="secondary">
                        {treatment}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {serviceType === 'window' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {data.windows && (
                <div>
                  <h4 className="font-medium mb-2">Window Details</h4>
                  <div className="space-y-2">
                    {data.windows.map((window: any, index: number) => (
                      <div
                        key={index}
                        className="flex justify-between items-center p-2 bg-muted rounded"
                      >
                        <span>{window.type}</span>
                        <Badge variant="outline">{window.count} windows</Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {data.services && (
                <div>
                  <h4 className="font-medium mb-2">Additional Services</h4>
                  <div className="flex flex-wrap gap-2">
                    {data.services.map((service: string, index: number) => (
                      <Badge key={index} variant="secondary">
                        {service}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {serviceType === 'floor' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {data.floors && (
                <div>
                  <h4 className="font-medium mb-2">Floor Areas</h4>
                  <div className="space-y-2">
                    {data.floors.map((floor: any, index: number) => (
                      <div
                        key={index}
                        className="flex justify-between items-center p-2 bg-muted rounded"
                      >
                        <span>
                          {floor.room} - {floor.type}
                        </span>
                        <Badge variant="outline">{floor.size} sq ft</Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {data.services && (
                <div>
                  <h4 className="font-medium mb-2">Services</h4>
                  <div className="flex flex-wrap gap-2">
                    {data.services.map((service: string, index: number) => (
                      <Badge key={index} variant="secondary">
                        {service}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  const renderPricingBreakdown = () => {
    if (!proposal?.pricing_data) return null;

    const pricing = proposal.pricing_data as any;

    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Pricing Breakdown
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span>Base Price</span>
              <span className="font-medium">
                {formatCurrency(pricing.base_price || 0)}
              </span>
            </div>

            {pricing.adjustments &&
              Object.entries(pricing.adjustments).map(
                ([key, value]: [string, any]) => (
                  <div
                    key={key}
                    className="flex justify-between items-center text-sm"
                  >
                    <span className="text-muted-foreground capitalize">
                      {key.replace(/_/g, ' ')}
                    </span>
                    <span>{formatCurrency(value)}</span>
                  </div>
                )
              )}

            <Separator />

            <div className="flex justify-between items-center">
              <span>Subtotal</span>
              <span className="font-medium">
                {formatCurrency(pricing.subtotal || 0)}
              </span>
            </div>

            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">
                Labor ({pricing.labor_hours || 0} hrs)
              </span>
              <span>{formatCurrency(pricing.labor_cost || 0)}</span>
            </div>

            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">
                Overhead ({pricing.overhead_percentage || 0}%)
              </span>
              <span>{formatCurrency(pricing.overhead_cost || 0)}</span>
            </div>

            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">
                Margin ({pricing.margin_percentage || 0}%)
              </span>
              <span>{formatCurrency(pricing.margin_cost || 0)}</span>
            </div>

            <Separator />

            <div className="flex justify-between items-center text-lg font-bold">
              <span>Total</span>
              <span className="text-primary">
                {formatCurrency(pricing.total || 0)}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  if (loading) {
    return <LoadingPage />;
  }

  if (!proposal) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold mb-2">Proposal Not Found</h2>
        <p className="text-muted-foreground mb-4">
          The proposal you're looking for doesn't exist.
        </p>
        <Button onClick={() => router.push('/dashboard/proposals')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Proposals
        </Button>
      </div>
    );
  }

  const globalInputs = proposal.global_inputs as any;

  return (
    <div className="container mx-auto space-y-6 py-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push('/dashboard/proposals')}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              {proposal.title}
            </h1>
            <div className="flex items-center gap-4 mt-2">
              <Badge variant={getStatusColor(proposal.status)}>
                {proposal.status.charAt(0).toUpperCase() +
                  proposal.status.slice(1)}
              </Badge>
              <span className="text-sm text-muted-foreground">
                Created {new Date(proposal.created_at).toLocaleDateString()}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setEditDialogOpen(true)}>
            <Edit className="h-4 w-4 mr-2" />
            Edit
          </Button>

          {proposal.status === 'draft' && (
            <Button onClick={() => handleStatusUpdate('sent')}>
              <Send className="h-4 w-4 mr-2" />
              Send Proposal
            </Button>
          )}

          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Download PDF
          </Button>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" size="icon">
                <Trash2 className="h-4 w-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Proposal</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to delete this proposal? This action
                  cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete} disabled={deleting}>
                  {deleting && (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  )}
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="details">Service Details</TabsTrigger>
          <TabsTrigger value="pricing">Pricing</TabsTrigger>
          <TabsTrigger value="ai-content">AI Content</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Client Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Client Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="font-medium">
                        {globalInputs?.client_name || 'N/A'}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Client Name
                      </p>
                    </div>
                  </div>

                  {globalInputs?.company && (
                    <div className="flex items-center gap-3">
                      <Building className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="font-medium">{globalInputs.company}</p>
                        <p className="text-sm text-muted-foreground">Company</p>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center gap-3">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="font-medium">
                        {globalInputs?.email || 'N/A'}
                      </p>
                      <p className="text-sm text-muted-foreground">Email</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="font-medium">
                        {globalInputs?.phone || 'N/A'}
                      </p>
                      <p className="text-sm text-muted-foreground">Phone</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Service Information */}
            <Card>
              <CardHeader>
                <CardTitle>Service Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div>
                    <p className="font-medium">
                      {getServiceTypeLabel(proposal.service_type)}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Service Type
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="font-medium">
                        {globalInputs?.address || 'N/A'}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Service Address
                      </p>
                    </div>
                  </div>

                  <div>
                    <p className="font-medium">
                      {globalInputs?.facility_size || 'N/A'} sq ft
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Facility Size
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="font-medium">
                        {globalInputs?.service_frequency
                          ?.replace('_', ' ')
                          .replace(/\b\w/g, (l: string) => l.toUpperCase()) ||
                          'N/A'}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Service Frequency
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Pricing Summary */}
          {renderPricingBreakdown()}
        </TabsContent>

        <TabsContent value="details">{renderServiceSpecificData()}</TabsContent>

        <TabsContent value="pricing">{renderPricingBreakdown()}</TabsContent>
        <TabsContent value="ai-content" className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <div>
                <CardTitle>AI-Generated Proposal Content</CardTitle>
                <CardDescription>
                  AI-generated content for this proposal
                </CardDescription>
              </div>
              {!editingAIContent && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleAIContentEdit}
                  className="flex items-center gap-2"
                >
                  <PenTool className="h-4 w-4" />
                  Edit
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {editingAIContent ? (
                <div className="space-y-4">
                  <Textarea
                    value={aiContentDraft}
                    onChange={(e) => setAiContentDraft(e.target.value)}
                    placeholder="Enter AI-generated proposal content..."
                    className="min-h-[300px] resize-none"
                  />

                  <div className="flex items-center gap-2 justify-end">
                    <Button
                      variant="outline"
                      onClick={handleAIContentCancel}
                      disabled={savingAIContent}
                    >
                      <X className="h-4 w-4 mr-2" />
                      Cancel
                    </Button>
                    <Button
                      onClick={handleAIContentSave}
                      disabled={savingAIContent}
                    >
                      {savingAIContent ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Save className="h-4 w-4 mr-2" />
                      )}
                      Save
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {proposal?.generated_content ? (
                    <div className="prose max-w-none">
                      <div className="whitespace-pre-wrap text-sm leading-relaxed">
                        <MarkdownRenderer
                          content={proposal.generated_content}
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <p>
                        No AI-generated content available for this proposal.
                      </p>
                      <p className="text-sm mt-2">
                        Generate content using the proposal creation form.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Edit Dialog */}
      <ProposalEditDialog
        proposal={proposal}
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        onProposalUpdated={(updatedProposal) => {
          setProposal(updatedProposal);
          setEditDialogOpen(false);
        }}
      />
    </div>
  );
}
