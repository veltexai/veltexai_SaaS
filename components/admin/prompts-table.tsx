'use client';

import { useState, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import {
  MoreHorizontal,
  Edit,
  Eye,
  Copy,
  Trash2,
  Star,
  StarOff,
  Power,
  PowerOff,
} from 'lucide-react';
import PromptDialog from './prompt-dialog';

interface PromptTemplate {
  id: string;
  name: string;
  description: string | null;
  category: 'proposal' | 'email' | 'follow_up' | 'custom';
  template_content: string;
  variables: string[];
  is_active: boolean;
  is_default: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

interface PromptsTableProps {
  templates: PromptTemplate[];
  currentUserId: string;
}

export default function PromptsTable({ templates: initialTemplates, currentUserId }: PromptsTableProps) {
  const [templates, setTemplates] = useState<PromptTemplate[]>(initialTemplates);
  const [selectedTemplates, setSelectedTemplates] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dialogState, setDialogState] = useState<{
    isOpen: boolean;
    mode: 'create' | 'edit' | 'preview';
    template?: PromptTemplate;
  }>({
    isOpen: false,
    mode: 'create',
  });

  const supabase = createClient();

  // Filter templates based on search and filters
  const filteredTemplates = useMemo(() => {
    return templates.filter((template) => {
      const matchesSearch = 
        template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        template.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        template.category.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesCategory = categoryFilter === 'all' || template.category === categoryFilter;
      
      const matchesStatus = 
        statusFilter === 'all' ||
        (statusFilter === 'active' && template.is_active) ||
        (statusFilter === 'inactive' && !template.is_active);

      return matchesSearch && matchesCategory && matchesStatus;
    });
  }, [templates, searchTerm, categoryFilter, statusFilter]);

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedTemplates(filteredTemplates.map(t => t.id));
    } else {
      setSelectedTemplates([]);
    }
  };

  const handleSelectTemplate = (templateId: string, checked: boolean) => {
    if (checked) {
      setSelectedTemplates(prev => [...prev, templateId]);
    } else {
      setSelectedTemplates(prev => prev.filter(id => id !== templateId));
    }
  };

  const handleToggleActive = async (templateId: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from('prompt_templates')
        .update({ is_active: !isActive })
        .eq('id', templateId);

      if (error) throw error;

      setTemplates(prev =>
        prev.map(t =>
          t.id === templateId ? { ...t, is_active: !isActive } : t
        )
      );

      // Log the action
      await supabase.from('audit_logs').insert({
        user_id: currentUserId,
        action: !isActive ? 'activate_prompt_template' : 'deactivate_prompt_template',
        resource_type: 'prompt_template',
        resource_id: templateId,
        details: { template_id: templateId, new_status: !isActive },
      });

      toast.success(`Template ${!isActive ? 'activated' : 'deactivated'} successfully`);
    } catch (error) {
      console.error('Error toggling template status:', error);
      toast.error('Failed to update template status');
    }
  };

  const handleToggleDefault = async (templateId: string, isDefault: boolean) => {
    try {
      const template = templates.find(t => t.id === templateId);
      if (!template) return;

      // If setting as default, remove default from other templates in the same category
      if (!isDefault) {
        await supabase
          .from('prompt_templates')
          .update({ is_default: false })
          .eq('category', template.category);
      }

      const { error } = await supabase
        .from('prompt_templates')
        .update({ is_default: !isDefault })
        .eq('id', templateId);

      if (error) throw error;

      setTemplates(prev =>
        prev.map(t => {
          if (t.id === templateId) {
            return { ...t, is_default: !isDefault };
          }
          if (!isDefault && t.category === template.category) {
            return { ...t, is_default: false };
          }
          return t;
        })
      );

      // Log the action
      await supabase.from('audit_logs').insert({
        user_id: currentUserId,
        action: !isDefault ? 'set_default_prompt_template' : 'unset_default_prompt_template',
        resource_type: 'prompt_template',
        resource_id: templateId,
        details: { template_id: templateId, category: template.category },
      });

      toast.success(`Template ${!isDefault ? 'set as' : 'removed as'} default`);
    } catch (error) {
      console.error('Error toggling default status:', error);
      toast.error('Failed to update default status');
    }
  };

  const handleDuplicate = async (template: PromptTemplate) => {
    try {
      const { data, error } = await supabase
        .from('prompt_templates')
        .insert({
          name: `${template.name} (Copy)`,
          description: template.description,
          category: template.category,
          template_content: template.template_content,
          variables: template.variables,
          is_active: false,
          is_default: false,
          created_by: currentUserId,
        })
        .select()
        .single();

      if (error) throw error;

      setTemplates(prev => [data, ...prev]);

      // Log the action
      await supabase.from('audit_logs').insert({
        user_id: currentUserId,
        action: 'duplicate_prompt_template',
        resource_type: 'prompt_template',
        resource_id: data.id,
        details: { original_template_id: template.id, new_template_id: data.id },
      });

      toast.success('Template duplicated successfully');
    } catch (error) {
      console.error('Error duplicating template:', error);
      toast.error('Failed to duplicate template');
    }
  };

  const handleDelete = async (templateId: string) => {
    try {
      const { error } = await supabase
        .from('prompt_templates')
        .delete()
        .eq('id', templateId);

      if (error) throw error;

      setTemplates(prev => prev.filter(t => t.id !== templateId));
      setSelectedTemplates(prev => prev.filter(id => id !== templateId));

      // Log the action
      await supabase.from('audit_logs').insert({
        user_id: currentUserId,
        action: 'delete_prompt_template',
        resource_type: 'prompt_template',
        resource_id: templateId,
        details: { template_id: templateId },
      });

      toast.success('Template deleted successfully');
    } catch (error) {
      console.error('Error deleting template:', error);
      toast.error('Failed to delete template');
    }
  };

  const handleBulkDelete = async () => {
    try {
      const { error } = await supabase
        .from('prompt_templates')
        .delete()
        .in('id', selectedTemplates);

      if (error) throw error;

      setTemplates(prev => prev.filter(t => !selectedTemplates.includes(t.id)));
      setSelectedTemplates([]);

      // Log the action
      await supabase.from('audit_logs').insert({
        user_id: currentUserId,
        action: 'bulk_delete_prompt_templates',
        resource_type: 'prompt_template',
        details: { template_ids: selectedTemplates, count: selectedTemplates.length },
      });

      toast.success(`${selectedTemplates.length} templates deleted successfully`);
    } catch (error) {
      console.error('Error bulk deleting templates:', error);
      toast.error('Failed to delete templates');
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'proposal':
        return 'bg-blue-100 text-blue-800';
      case 'email':
        return 'bg-green-100 text-green-800';
      case 'follow_up':
        return 'bg-yellow-100 text-yellow-800';
      case 'custom':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Prompt Templates</CardTitle>
            {selectedTemplates.length > 0 && (
              <div className="flex items-center space-x-2">
                <span className="text-sm text-muted-foreground">
                  {selectedTemplates.length} selected
                </span>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleBulkDelete}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Selected
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <Checkbox
                    checked={
                      filteredTemplates.length > 0 &&
                      selectedTemplates.length === filteredTemplates.length
                    }
                    onCheckedChange={handleSelectAll}
                  />
                </TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Variables</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Default</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTemplates.map((template) => (
                <TableRow key={template.id}>
                  <TableCell>
                    <Checkbox
                      checked={selectedTemplates.includes(template.id)}
                      onCheckedChange={(checked) =>
                        handleSelectTemplate(template.id, checked as boolean)
                      }
                    />
                  </TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium">{template.name}</div>
                      {template.description && (
                        <div className="text-sm text-muted-foreground">
                          {template.description}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={getCategoryColor(template.category)}>
                      {template.category.replace('_', ' ')}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {template.variables.slice(0, 3).map((variable) => (
                        <Badge key={variable} variant="outline" className="text-xs">
                          {variable}
                        </Badge>
                      ))}
                      {template.variables.length > 3 && (
                        <Badge variant="outline" className="text-xs">
                          +{template.variables.length - 3}
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={template.is_active ? 'default' : 'secondary'}>
                      {template.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {template.is_default && (
                      <Badge variant="outline">
                        <Star className="h-3 w-3 mr-1" />
                        Default
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {new Date(template.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() =>
                            setDialogState({
                              isOpen: true,
                              mode: 'preview',
                              template,
                            })
                          }
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          Preview
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() =>
                            setDialogState({
                              isOpen: true,
                              mode: 'edit',
                              template,
                            })
                          }
                        >
                          <Edit className="h-4 w-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleDuplicate(template)}>
                          <Copy className="h-4 w-4 mr-2" />
                          Duplicate
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() =>
                            handleToggleActive(template.id, template.is_active)
                          }
                        >
                          {template.is_active ? (
                            <>
                              <PowerOff className="h-4 w-4 mr-2" />
                              Deactivate
                            </>
                          ) : (
                            <>
                              <Power className="h-4 w-4 mr-2" />
                              Activate
                            </>
                          )}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() =>
                            handleToggleDefault(template.id, template.is_default)
                          }
                        >
                          {template.is_default ? (
                            <>
                              <StarOff className="h-4 w-4 mr-2" />
                              Remove Default
                            </>
                          ) : (
                            <>
                              <Star className="h-4 w-4 mr-2" />
                              Set as Default
                            </>
                          )}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => handleDelete(template.id)}
                          className="text-destructive"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {filteredTemplates.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              No templates found matching your criteria.
            </div>
          )}
        </CardContent>
      </Card>

      <PromptDialog
        isOpen={dialogState.isOpen}
        mode={dialogState.mode}
        template={dialogState.template}
        currentUserId={currentUserId}
        onClose={() => setDialogState({ isOpen: false, mode: 'create' })}
        onSave={(template) => {
          if (dialogState.mode === 'create') {
            setTemplates(prev => [template, ...prev]);
          } else {
            setTemplates(prev =>
              prev.map(t => (t.id === template.id ? template : t))
            );
          }
          setDialogState({ isOpen: false, mode: 'create' });
        }}
      />
    </>
  );
}