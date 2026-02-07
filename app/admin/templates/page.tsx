'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import Image from 'next/image';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
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
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, Edit, Trash2, Settings, Layout } from 'lucide-react';
import { cn, getTierBadgeColor } from '@/lib/utils';
import { toast } from 'sonner';
import { ProposalTemplate } from '@/types/database';
import { SubscriptionTier } from '@/types/subscription';

interface TemplateFormData {
  name: string;
  display_name: string;
  description: string;
  template_data: {
    category: string;
    content: string;
    preview_image_url?: string;
  };
}

interface TemplateWithTiers extends ProposalTemplate {
  accessible_tiers?: string[];
}


const SUBSCRIPTION_TIERS: SubscriptionTier[] = [
  'starter',
  'professional',
  'enterprise',
];

const TEMPLATE_CATEGORIES = [
  'Residential Cleaning',
  'Commercial Cleaning',
  'Deep Cleaning',
  'Move-in/Move-out',
  'Post-Construction',
  'Carpet Cleaning',
  'Window Cleaning',
  'Specialized Services',
];

export default function AdminTemplatesPage() {
  const [templates, setTemplates] = useState<TemplateWithTiers[]>([]);
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [tierDialogOpen, setTierDialogOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] =
    useState<TemplateWithTiers | null>(null);
  const [formData, setFormData] = useState<TemplateFormData>({
    name: '',
    display_name: '',
    description: '',
    template_data: {
      category: '',
      content: '',
    },
  });
  const [selectedTiers, setSelectedTiers] = useState<SubscriptionTier[]>([]);

  const supabase = createClient();

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      // Fetch templates with their tier access
      const { data: templates, error: templatesError } = await supabase
        .from('proposal_templates')
        .select('*')
        .order('sort_order', { ascending: true });

      if (templatesError) throw templatesError;

      // Fetch tier access for each template
      const templatesWithTiers = await Promise.all(
        (templates || []).map(async (template) => {
          const { data: tierAccess } = await supabase
            .from('template_tier_access')
            .select('subscription_tier')
            .eq('template_id', template.id);

          return {
            ...template,
            accessible_tiers: tierAccess?.map((t) => t.subscription_tier) || [],
          };
        })
      );

      setTemplates(templatesWithTiers);
    } catch (error) {
      console.error('Error fetching templates:', error);
      toast.error('Failed to load templates');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTemplate = async () => {
    try {
      const { data, error } = await supabase
        .from('proposal_templates')
        .insert([formData])
        .select()
        .single();

      if (error) throw error;

      toast.success('Template created successfully');
      setCreateDialogOpen(false);
      resetForm();
      fetchTemplates();
    } catch (error) {
      console.error('Error creating template:', error);
      toast.error('Failed to create template');
    }
  };

  const handleUpdateTemplate = async () => {
    if (!selectedTemplate) return;

    try {
      const { error } = await supabase
        .from('proposal_templates')
        .update(formData)
        .eq('id', selectedTemplate.id);

      if (error) throw error;

      toast.success('Template updated successfully');
      setEditDialogOpen(false);
      resetForm();
      fetchTemplates();
    } catch (error) {
      console.error('Error updating template:', error);
      toast.error('Failed to update template');
    }
  };

  const handleDeleteTemplate = async (template: TemplateWithTiers) => {
    try {
      const { error } = await supabase
        .from('proposal_templates')
        .update({ is_active: false })
        .eq('id', template.id);

      if (error) throw error;

      toast.success('Template deleted successfully');
      fetchTemplates();
    } catch (error) {
      console.error('Error deleting template:', error);
      toast.error('Failed to delete template');
    }
  };

  const handleUpdateTierAccess = async () => {
    if (!selectedTemplate) return;

    try {
      // Delete existing tier access
      await supabase
        .from('template_tier_access')
        .delete()
        .eq('template_id', selectedTemplate.id);

      // Insert new tier access
      if (selectedTiers.length > 0) {
        const tierAccessData = selectedTiers.map((tier) => ({
          template_id: selectedTemplate.id,
          subscription_tier: tier,
        }));

        const { error } = await supabase
          .from('template_tier_access')
          .insert(tierAccessData);

        if (error) throw error;
      }

      toast.success('Tier access updated successfully');
      setTierDialogOpen(false);
      fetchTemplates();
    } catch (error) {
      console.error('Error updating tier access:', error);
      toast.error('Failed to update tier access');
    }
  };

  const openEditDialog = (template: TemplateWithTiers) => {
    setSelectedTemplate(template);
    // Safely read template_data which is Supabase Json
    const td = (template.template_data ?? {}) as {
      category?: string;
      content?: string;
      preview_image_url?: string;
    };
    setFormData({
      name: template.name,
      display_name: template.display_name,
      description: template.description || '',
      template_data: {
        category: td.category || '',
        content: td.content || '',
        preview_image_url: template.preview_image_url || undefined,
      },
    });
    setEditDialogOpen(true);
  };

  const openTierDialog = (template: TemplateWithTiers) => {
    setSelectedTemplate(template);
    setSelectedTiers((template.accessible_tiers as SubscriptionTier[]) || []);
    setTierDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      display_name: '',
      description: '',
      template_data: {
        category: '',
        content: '',
      },
    });
    setSelectedTemplate(null);
  };

  const getTierBadges = (tiers: string[]) => {
    if (!tiers || tiers.length === 0)
      return <Badge variant="secondary">No Access</Badge>;

    return tiers.map((tier) => (
      <Badge key={tier} className={getTierBadgeColor(tier as SubscriptionTier)}>
        {tier}
      </Badge>
    ));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6 p-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Templates</h1>
          <p className="text-muted-foreground">
            Manage proposal templates and tier access
          </p>
        </div>
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button disabled title="AI Scope-of-Work from Facility Photos/Videos (Phase 2)">
              <Plus className="h-4 w-4 mr-2" />
              Create Template — Phase 2
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create New Template</DialogTitle>
              <DialogDescription>
                Create a new proposal template for users to select from.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Template Name (Internal)</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="internal_template_name"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="display_name">Display Name</Label>
                <Input
                  id="display_name"
                  value={formData.display_name}
                  onChange={(e) =>
                    setFormData({ ...formData, display_name: e.target.value })
                  }
                  placeholder="Professional Template"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  placeholder="Brief description of the template"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="category">Category</Label>
                <select
                  id="category"
                  value={formData.template_data.category}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      template_data: {
                        ...formData.template_data,
                        category: e.target.value,
                      },
                    })
                  }
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="">Select category</option>
                  {TEMPLATE_CATEGORIES.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="content">Template Content</Label>
                <Textarea
                  id="content"
                  value={formData.template_data.content}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      template_data: {
                        ...formData.template_data,
                        content: e.target.value,
                      },
                    })
                  }
                  placeholder="Enter the template content..."
                  rows={8}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setCreateDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button onClick={handleCreateTemplate}>Create Template</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {templates.map((template) => {
          console.log('🚀 ~ AdminTemplatesPage ~ template:', template);
          return (
            <div
              key={template.id}
              className={cn(
                'relative border-2 rounded-lg overflow-hidden transition-all',
                'border-gray-200 hover:border-gray-300 hover:shadow-md'
              )}
            >
              {/* Template Preview */}
              <div className="aspect-[1/1.4] bg-gray-100 relative">
                {template?.preview_image_url ? (
                  <Image
                    src={template.preview_image_url}
                    alt={template.display_name || 'Template Preview'}
                    className="w-full h-full object-cover"
                    width={200}
                    height={150}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Layout className="h-12 w-12 text-gray-400" />
                  </div>
                )}

                {/* Inactive badge */}
                {!template.is_active && (
                  <div className="absolute top-2 left-2">
                    <Badge variant="secondary">Inactive</Badge>
                  </div>
                )}
              </div>

              {/* Template Info */}
              <div className="p-4 flex flex-col justify-between gap-2">
                <div className="flex items-start justify-between">
                  <h3 className="font-medium text-sm">
                    {template.display_name}
                  </h3>
                  {!!(
                    template.accessible_tiers &&
                    template.accessible_tiers.length
                  ) && (
                    <div className="flex flex-wrap gap-1">
                      {template.accessible_tiers!.map((tier) => (
                        <Badge
                          key={tier}
                          variant="secondary"
                          className={cn(
                            'text-xs capitalize',
                            getTierBadgeColor(tier as SubscriptionTier)
                          )}
                        >
                          {tier}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>

                {template.description && (
                  <p className="text-xs text-muted-foreground">
                    {template.description}
                  </p>
                )}

                <div className="flex items-center gap-2 justify-between">
                  <Badge
                    variant="outline"
                    className={cn(
                      'text-xs capitalize',
                      template?.is_active
                        ? 'bg-green-500 text-white'
                        : 'bg-red-500 text-white'
                    )}
                  >
                    {template?.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    Created {new Date(template.created_at).toLocaleDateString()}
                  </span>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2 justify-end">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openTierDialog(template)}
                  >
                    <Settings className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openEditDialog(template)}
                    disabled
                  >
                    <Edit className="h-4 w-4" /> - Phase 2
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline" size="sm">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Template</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to delete "{template.name}"?
                          This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleDeleteTemplate(template)}
                        >
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Edit Template Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Template</DialogTitle>
            <DialogDescription>
              Update the template information and content.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-name">Template Name (Internal)</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder="internal_template_name"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-display-name">Display Name</Label>
              <Input
                id="edit-display-name"
                value={formData.display_name}
                onChange={(e) =>
                  setFormData({ ...formData, display_name: e.target.value })
                }
                placeholder="Professional Template"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-description">Description</Label>
              <Input
                id="edit-description"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder="Brief description of the template"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-category">Category</Label>
              <select
                id="edit-category"
                value={formData.template_data.category}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    template_data: {
                      ...formData.template_data,
                      category: e.target.value,
                    },
                  })
                }
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="">Select category</option>
                {TEMPLATE_CATEGORIES.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-content">Template Content</Label>
              <Textarea
                id="edit-content"
                value={formData.template_data.content}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    template_data: {
                      ...formData.template_data,
                      content: e.target.value,
                    },
                  })
                }
                placeholder="Enter the template content..."
                rows={8}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateTemplate}>Update Template</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Tier Access Dialog */}
      <Dialog open={tierDialogOpen} onOpenChange={setTierDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Manage Tier Access</DialogTitle>
            <DialogDescription>
              Select which subscription tiers can access this template.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            {SUBSCRIPTION_TIERS.map((tier) => (
              <div key={tier} className="flex items-center space-x-2">
                <Checkbox
                  id={tier}
                  checked={selectedTiers.includes(tier)}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      setSelectedTiers([...selectedTiers, tier]);
                    } else {
                      setSelectedTiers(selectedTiers.filter((t) => t !== tier));
                    }
                  }}
                />
                <Label htmlFor={tier} className="capitalize">
                  {tier}
                </Label>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTierDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateTierAccess}>Update Access</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
