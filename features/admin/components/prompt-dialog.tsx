'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { X, Plus, Eye, Save, Copy } from 'lucide-react';

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

interface PromptDialogProps {
  isOpen: boolean;
  mode: 'create' | 'edit' | 'preview';
  template?: PromptTemplate;
  currentUserId: string;
  onClose: () => void;
  onSave: (template: PromptTemplate) => void;
}

export default function PromptDialog({
  isOpen,
  mode,
  template,
  currentUserId,
  onClose,
  onSave,
}: PromptDialogProps) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: 'custom' as PromptTemplate['category'],
    subcategory: '',
    template_content: '',
    variables: [] as string[],
    variable_definitions: {} as Record<string, VariableDefinition>,
    tags: [] as string[],
    is_active: true,
    is_default: false,
  });
  const [newVariable, setNewVariable] = useState('');
  const [newTag, setNewTag] = useState('');
  const [previewData, setPreviewData] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    if (template && (mode === 'edit' || mode === 'preview')) {
      setFormData({
        name: template.name,
        description: template.description || '',
        category: template.category,
        subcategory: template.subcategory || '',
        template_content: template.template_content,
        variables: template.variables,
        variable_definitions: template.variable_definitions || {},
        tags: template.tags || [],
        is_active: template.is_active,
        is_default: template.is_default,
      });

      // Initialize preview data with empty values
      const initialPreviewData: Record<string, string> = {};
      template.variables.forEach((variable) => {
        initialPreviewData[variable] = '';
      });
      setPreviewData(initialPreviewData);
    } else {
      setFormData({
        name: '',
        description: '',
        category: 'custom',
        subcategory: '',
        template_content: '',
        variables: [],
        variable_definitions: {},
        tags: [],
        is_active: true,
        is_default: false,
      });
      setPreviewData({});
    }
  }, [template, mode]);

  // Extract variables from template content
  useEffect(() => {
    const variableRegex = /\{\{(\w+)\}\}/g;
    const matches = formData.template_content.match(variableRegex);
    const extractedVariables = matches
      ? [...new Set(matches.map((match) => match.replace(/[{}]/g, '')))]
      : [];

    setFormData((prev) => ({ ...prev, variables: extractedVariables }));

    // Update preview data to include new variables
    const newPreviewData: Record<string, string> = {};
    extractedVariables.forEach((variable) => {
      newPreviewData[variable] = previewData[variable] || '';
    });
    setPreviewData(newPreviewData);
  }, [formData.template_content]);

  const handleAddVariable = () => {
    if (newVariable && !formData.variables.includes(newVariable)) {
      setFormData((prev) => ({
        ...prev,
        variables: [...prev.variables, newVariable],
      }));
      setPreviewData((prev) => ({ ...prev, [newVariable]: '' }));
      setNewVariable('');
    }
  };

  const handleRemoveVariable = (variableToRemove: string) => {
    setFormData((prev) => ({
      ...prev,
      variables: prev.variables.filter((v) => v !== variableToRemove),
    }));
    setPreviewData((prev) => {
      const newData = { ...prev };
      delete newData[variableToRemove];
      return newData;
    });
  };

  const handleAddTag = () => {
    if (newTag.trim() && !formData.tags.includes(newTag.trim())) {
      setFormData((prev) => ({
        ...prev,
        tags: [...prev.tags, newTag.trim()],
      }));
      setNewTag('');
    }
  };

  const handleRemoveTag = (indexToRemove: number) => {
    setFormData((prev) => ({
      ...prev,
      tags: prev.tags.filter((_, index) => index !== indexToRemove),
    }));
  };

  const renderPreview = () => {
    let preview = formData.template_content;
    Object.entries(previewData).forEach(([variable, value]) => {
      const regex = new RegExp(`\\{\\{${variable}\\}\\}`, 'g');
      preview = preview.replace(regex, value || `{{${variable}}}`);
    });
    return preview;
  };

  const handleSave = async () => {
    if (!formData.name.trim() || !formData.template_content.trim()) {
      toast.error('Name and template content are required');
      return;
    }

    setIsLoading(true);

    try {
      let result;

      if (mode === 'create') {
        const { data, error } = await supabase
          .from('prompt_templates')
          .insert({
            name: formData.name,
            description: formData.description || null,
            category: formData.category,
            subcategory: formData.subcategory || null,
            template_content: formData.template_content,
            variables: formData.variables,
            variable_definitions: formData.variable_definitions,
            tags: formData.tags,
            is_active: formData.is_active,
            is_default: formData.is_default,
            created_by: currentUserId,
          })
          .select()
          .single();

        if (error) throw error;
        result = data;

        // Log the action
        await supabase.from('audit_logs').insert({
          user_id: currentUserId,
          action: 'create_prompt_template',
          resource_type: 'prompt_template',
          resource_id: data.id,
          details: {
            template_name: formData.name,
            category: formData.category,
          },
        });

        toast.success('Template created successfully');
      } else {
        const { data, error } = await supabase
          .from('prompt_templates')
          .update({
            name: formData.name,
            description: formData.description || null,
            category: formData.category,
            subcategory: formData.subcategory || null,
            template_content: formData.template_content,
            variables: formData.variables,
            variable_definitions: formData.variable_definitions,
            tags: formData.tags,
            is_active: formData.is_active,
            is_default: formData.is_default,
          })
          .eq('id', template!.id)
          .select()
          .single();

        if (error) throw error;
        result = data;

        // Log the action
        await supabase.from('audit_logs').insert({
          user_id: currentUserId,
          action: 'update_prompt_template',
          resource_type: 'prompt_template',
          resource_id: template!.id,
          details: {
            template_name: formData.name,
            category: formData.category,
          },
        });

        toast.success('Template updated successfully');
      }

      onSave(result);
    } catch (error) {
      console.error('Error saving template:', error);
      toast.error('Failed to save template');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyToClipboard = () => {
    navigator.clipboard.writeText(renderPreview());
    toast.success('Preview copied to clipboard');
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {mode === 'create' && 'Create New Template'}
            {mode === 'edit' && 'Edit Template'}
            {mode === 'preview' && 'Preview Template'}
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="details" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="content">Content</TabsTrigger>
            <TabsTrigger value="preview">Preview</TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, name: e.target.value }))
                  }
                  disabled={mode === 'preview'}
                  placeholder="Enter template name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="category">Category *</Label>
                <Select
                  value={formData.category}
                  onValueChange={(value: any) =>
                    setFormData((prev) => ({ ...prev, category: value }))
                  }
                  disabled={mode === 'preview'}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="proposal">Proposal</SelectItem>
                    <SelectItem value="proposal_commercial">Proposal - Commercial</SelectItem>
                    <SelectItem value="proposal_residential">Proposal - Residential</SelectItem>
                    <SelectItem value="proposal_specialized">Proposal - Specialized</SelectItem>
                    <SelectItem value="email">Email</SelectItem>
                    <SelectItem value="email_welcome">Email - Welcome</SelectItem>
                    <SelectItem value="email_follow_up">Email - Follow Up</SelectItem>
                    <SelectItem value="email_reminder">Email - Reminder</SelectItem>
                    <SelectItem value="email_thank_you">Email - Thank You</SelectItem>
                    <SelectItem value="email_rejection">Email - Rejection</SelectItem>
                    <SelectItem value="follow_up">Follow Up</SelectItem>
                    <SelectItem value="follow_up_initial">Follow Up - Initial</SelectItem>
                    <SelectItem value="follow_up_second">Follow Up - Second</SelectItem>
                    <SelectItem value="follow_up_final">Follow Up - Final</SelectItem>
                    <SelectItem value="custom">Custom</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="subcategory">Subcategory</Label>
                <Input
                  id="subcategory"
                  value={formData.subcategory}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      subcategory: e.target.value,
                    }))
                  }
                  disabled={mode === 'preview'}
                  placeholder="Enter subcategory (optional)"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
                disabled={mode === 'preview'}
                placeholder="Enter template description"
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="tags">Tags</Label>
              <div className="space-y-2">
                <Input
                  id="tags"
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  disabled={mode === 'preview'}
                  placeholder="Add tags (press Enter to add)"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddTag();
                    }
                  }}
                />
                {formData.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {formData.tags.map((tag, index) => (
                      <Badge
                        key={index}
                        variant="secondary"
                        className="flex items-center space-x-1"
                      >
                        <span>{tag}</span>
                        {mode !== 'preview' && (
                          <X
                            className="h-3 w-3 cursor-pointer"
                            onClick={() => handleRemoveTag(index)}
                          />
                        )}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center space-x-6">
              <div className="flex items-center space-x-2">
                <Switch
                  id="is_active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) =>
                    setFormData((prev) => ({ ...prev, is_active: checked }))
                  }
                  disabled={mode === 'preview'}
                />
                <Label htmlFor="is_active">Active</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="is_default"
                  checked={formData.is_default}
                  onCheckedChange={(checked) =>
                    setFormData((prev) => ({ ...prev, is_default: checked }))
                  }
                  disabled={mode === 'preview'}
                />
                <Label htmlFor="is_default">Set as Default</Label>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="content" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="template_content">Template Content *</Label>
              <Textarea
                id="template_content"
                value={formData.template_content}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    template_content: e.target.value,
                  }))
                }
                disabled={mode === 'preview'}
                placeholder="Enter your template content. Use {{variable_name}} for variables."
                rows={12}
                className="font-mono"
              />
              <p className="text-sm text-muted-foreground">
                Use double curly braces for variables:{' '}
                <code>{'{{variable_name}}'}</code>
              </p>
            </div>

            {formData.variables.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Detected Variables</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {formData.variables.map((variable) => (
                      <Badge
                        key={variable}
                        variant="outline"
                        className="flex items-center space-x-1"
                      >
                        <span>{variable}</span>
                        {mode !== 'preview' && (
                          <X
                            className="h-3 w-3 cursor-pointer"
                            onClick={() => handleRemoveVariable(variable)}
                          />
                        )}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {mode !== 'preview' && (
              <div className="flex items-center space-x-2">
                <Input
                  value={newVariable}
                  onChange={(e) => setNewVariable(e.target.value)}
                  placeholder="Add custom variable"
                  onKeyPress={(e) => e.key === 'Enter' && handleAddVariable()}
                />
                <Button onClick={handleAddVariable} size="sm">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            )}
          </TabsContent>

          <TabsContent value="preview" className="space-y-4">
            {formData.variables.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Variable Values</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {formData.variables.map((variable) => (
                    <div key={variable} className="space-y-1">
                      <Label htmlFor={`var_${variable}`}>{variable}</Label>
                      <Input
                        id={`var_${variable}`}
                        value={previewData[variable] || ''}
                        onChange={(e) =>
                          setPreviewData((prev) => ({
                            ...prev,
                            [variable]: e.target.value,
                          }))
                        }
                        placeholder={`Enter value for ${variable}`}
                      />
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-sm">Preview Output</CardTitle>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopyToClipboard}
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Copy
                </Button>
              </CardHeader>
              <CardContent>
                <div className="bg-muted p-4 rounded-md">
                  <pre className="whitespace-pre-wrap text-sm">
                    {renderPreview()}
                  </pre>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          {mode !== 'preview' && (
            <Button onClick={handleSave} disabled={isLoading}>
              <Save className="h-4 w-4 mr-2" />
              {isLoading
                ? 'Saving...'
                : mode === 'create'
                ? 'Create'
                : 'Update'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
