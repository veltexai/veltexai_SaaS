'use client';

/**
 * AddonForm Component
 * Modal form for creating and editing add-ons
 */

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, AlertCircle, Wand2 } from 'lucide-react';
import { addonFormSchemaWithRefinements } from '../utils/validation';
import { generateSkuFromLabel } from '../utils/formatters';
import type { Addon, AddonFormData, CategoryType, UnitType, FrequencyType } from '../types';
import {
  UNIT_TYPE_LABELS,
  FREQUENCY_LABELS,
  CATEGORY_LABELS,
  DEFAULT_QTY_SOURCE_OPTIONS,
} from '../types';

interface AddonFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  addon?: Addon | null;
  onSubmit: (data: AddonFormData) => Promise<void>;
}

const frequencyOptions: FrequencyType[] = ['one_time', 'monthly', 'quarterly', 'annual'];
const unitTypes: UnitType[] = ['sqft', 'pane', 'visit', 'hour', 'flat'];
const categories: CategoryType[] = ['cleaning', 'maintenance', 'specialty', 'seasonal', 'other'];

export function AddonForm({ open, onOpenChange, addon, onSubmit }: AddonFormProps) {
  const [loading, setLoading] = useState(false);
  const [autoSku, setAutoSku] = useState(!addon);
  const isEdit = !!addon;

  const form = useForm<AddonFormData>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(addonFormSchemaWithRefinements) as any,
    defaultValues: {
      sku: '',
      label: '',
      category: 'cleaning',
      unit_type: 'sqft',
      rate: 0,
      min_qty: 0,
      default_frequency: 'monthly',
      frequency_options: ['monthly'],
      amortize_to_monthly: false,
      default_qty_source: 'manual',
      active: true,
      show_in_proposals: true,
      description: '',
      notes: '',
    },
  });

  // Load addon data when editing
  useEffect(() => {
    if (addon) {
      form.reset({
        sku: addon.sku,
        label: addon.label,
        category: addon.category,
        unit_type: addon.unit_type,
        rate: addon.rate,
        min_qty: addon.min_qty,
        default_frequency: addon.default_frequency,
        frequency_options: addon.frequency_options,
        amortize_to_monthly: addon.amortize_to_monthly,
        default_qty_source: addon.default_qty_source,
        active: addon.active,
        show_in_proposals: addon.show_in_proposals,
        description: addon.description || '',
        notes: addon.notes || '',
      });
      setAutoSku(false);
    } else {
      form.reset({
        sku: '',
        label: '',
        category: 'cleaning',
        unit_type: 'sqft',
        rate: 0,
        min_qty: 0,
        default_frequency: 'monthly',
        frequency_options: ['monthly'],
        amortize_to_monthly: false,
        default_qty_source: 'manual',
        active: true,
        show_in_proposals: true,
        description: '',
        notes: '',
      });
      setAutoSku(true);
    }
  }, [addon, form]);

  // Auto-generate SKU from label
  const handleLabelChange = (label: string) => {
    form.setValue('label', label);
    if (autoSku && !isEdit) {
      const generatedSku = generateSkuFromLabel(label);
      form.setValue('sku', generatedSku);
    }
  };

  // Handle form submission
  const handleSubmit = async (data: AddonFormData) => {
    try {
      setLoading(true);
      await onSubmit(data);
      onOpenChange(false);
      form.reset();
    } catch (error) {
      console.error('Error submitting form:', error);
    } finally {
      setLoading(false);
    }
  };

  // Toggle frequency option
  const toggleFrequencyOption = (frequency: FrequencyType, checked: boolean) => {
    const currentOptions = form.getValues('frequency_options');
    const newOptions = checked
      ? [...currentOptions, frequency]
      : currentOptions.filter((f) => f !== frequency);

    form.setValue('frequency_options', newOptions, { shouldValidate: true });
  };

  const selectedFrequencies = form.watch('frequency_options') || [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Add-On Service' : 'Create Add-On Service'}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? 'Update the add-on service details below.'
              : 'Add a new service to the catalog that can be included in proposals.'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            {/* Basic Information */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold">Basic Information</h3>
              
              {/* Label */}
              <FormField
                control={form.control}
                name="label"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Service Label *</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="e.g., Carpet Cleaning (Hot Water Extraction)"
                        onChange={(e) => handleLabelChange(e.target.value)}
                      />
                    </FormControl>
                    <FormDescription>
                      Display name shown to users in proposals
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* SKU */}
              <FormField
                control={form.control}
                name="sku"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>SKU *</FormLabel>
                    <div className="flex gap-2">
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="e.g., carpet_extraction"
                          disabled={autoSku && !isEdit}
                        />
                      </FormControl>
                      {!isEdit && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setAutoSku(!autoSku)}
                        >
                          {autoSku ? <Wand2 className="h-4 w-4" /> : 'Manual'}
                        </Button>
                      )}
                    </div>
                    <FormDescription>
                      Unique identifier (lowercase, numbers, underscores, hyphens only)
                      {autoSku && !isEdit && ' - Auto-generated from label'}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Category */}
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {categories.map((cat) => (
                          <SelectItem key={cat} value={cat}>
                            {CATEGORY_LABELS[cat]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Description */}
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        placeholder="Brief description of the service..."
                        rows={2}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Pricing Configuration */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold">Pricing Configuration</h3>

              <div className="grid grid-cols-2 gap-4">
                {/* Unit Type */}
                <FormField
                  control={form.control}
                  name="unit_type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Unit Type *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {unitTypes.map((unit) => (
                            <SelectItem key={unit} value={unit}>
                              {UNIT_TYPE_LABELS[unit]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Rate */}
                <FormField
                  control={form.control}
                  name="rate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Rate (per unit) *</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          {...field}
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Min Quantity */}
                <FormField
                  control={form.control}
                  name="min_qty"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Minimum Quantity *</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="1"
                          min="0"
                          {...field}
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormDescription>Minimum units to charge</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Default Qty Source */}
                <FormField
                  control={form.control}
                  name="default_qty_source"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Quantity Source *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {DEFAULT_QTY_SOURCE_OPTIONS.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription>How quantity is determined</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Frequency Configuration */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold">Frequency Configuration</h3>

              {/* Default Frequency */}
              <FormField
                control={form.control}
                name="default_frequency"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Default Frequency *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {frequencyOptions.map((freq) => (
                          <SelectItem key={freq} value={freq}>
                            {FREQUENCY_LABELS[freq]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Frequency Options */}
              <FormField
                control={form.control}
                name="frequency_options"
                render={() => (
                  <FormItem>
                    <FormLabel>Available Frequency Options *</FormLabel>
                    <div className="grid grid-cols-2 gap-3 mt-2">
                      {frequencyOptions.map((freq) => (
                        <div key={freq} className="flex items-center space-x-2">
                          <Checkbox
                            id={`freq-${freq}`}
                            checked={selectedFrequencies.includes(freq)}
                            onCheckedChange={(checked) =>
                              toggleFrequencyOption(freq, checked as boolean)
                            }
                          />
                          <Label htmlFor={`freq-${freq}`} className="font-normal cursor-pointer">
                            {FREQUENCY_LABELS[freq]}
                          </Label>
                        </div>
                      ))}
                    </div>
                    <FormDescription>
                      Select which frequencies are available for this service
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Amortize to Monthly */}
              <FormField
                control={form.control}
                name="amortize_to_monthly"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Amortize to Monthly Amount</FormLabel>
                      <FormDescription>
                        Calculate and display monthly equivalent for quarterly/annual frequencies
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />
            </div>

            {/* Status & Visibility */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold">Status & Visibility</h3>

              <div className="space-y-3">
                {/* Active */}
                <FormField
                  control={form.control}
                  name="active"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>Active</FormLabel>
                        <FormDescription>
                          Inactive add-ons will not be available in the system
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />

                {/* Show in Proposals */}
                <FormField
                  control={form.control}
                  name="show_in_proposals"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>Show in Proposals</FormLabel>
                        <FormDescription>
                          Display this add-on in the proposal builder
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Notes */}
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Internal Notes</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      placeholder="Internal notes (not shown to clients)..."
                      rows={3}
                    />
                  </FormControl>
                  <FormDescription>For admin reference only</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Submit */}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isEdit ? 'Update Add-On' : 'Create Add-On'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}






