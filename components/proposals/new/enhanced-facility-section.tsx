'use client';

import { useFormContext } from 'react-hook-form';
import { useEffect, useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { type ProposalFormData, type ServiceType } from '@/lib/validations/proposal';
import {
  Building2,
  Users,
  AlertTriangle,
  Clock,
  Trash2,
  Plus,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AddonServicePickerModal } from './addon-service-picker-modal';
import { Separator } from '@/components/ui/separator';

// ============================================================
// SERVICE-SPECIFIC OPTIONS CONFIGURATION
// Following Service Logic Contract - strict service isolation
// ============================================================

// Building type options by service type
const buildingTypeOptionsByService: Record<ServiceType, { value: string; label: string }[]> = {
  residential: [
    { value: 'apartment', label: 'Apartment' },
    { value: 'house', label: 'House' },
    { value: 'condo', label: 'Condo' },
    { value: 'townhouse', label: 'Townhouse' },
    { value: 'other', label: 'Other' },
  ],
  commercial: [
    { value: 'office', label: 'Office Building' },
    { value: 'warehouse', label: 'Warehouse' },
    { value: 'retail', label: 'Retail Store' },
    { value: 'restaurant', label: 'Restaurant' },
    { value: 'medical', label: 'Medical Facility' },
    { value: 'educational', label: 'Educational/School' },
    { value: 'daycare', label: 'Daycare Center' },
    { value: 'church', label: 'Church/Religious' },
    { value: 'hospitality', label: 'Hospitality' },
    { value: 'industrial', label: 'Industrial' },
    { value: 'other', label: 'Other' },
  ],
  carpet: [
    { value: 'residential', label: 'Residential Property' },
    { value: 'office', label: 'Office Building' },
    { value: 'retail', label: 'Retail Store' },
    { value: 'hospitality', label: 'Hotel/Hospitality' },
    { value: 'other', label: 'Other' },
  ],
  window: [
    { value: 'residential', label: 'Residential Property' },
    { value: 'office', label: 'Office Building' },
    { value: 'retail', label: 'Retail Storefront' },
    { value: 'other', label: 'Other' },
  ],
  floor: [
    { value: 'residential', label: 'Residential Property' },
    { value: 'office', label: 'Office Building' },
    { value: 'retail', label: 'Retail Store' },
    { value: 'warehouse', label: 'Warehouse' },
    { value: 'industrial', label: 'Industrial' },
    { value: 'other', label: 'Other' },
  ],
};

// Special considerations/attention areas by service type
// These are areas that need SPECIAL ATTENTION, not just room names
const specialAreasOptionsByService: Record<ServiceType, string[]> = {
  residential: [
    'Pet Areas',
    'Child Play Areas',
    'Allergy-Sensitive Areas',
    'Antique/Delicate Items',
    'Home Gym/Exercise Area',
    'Wine Cellar/Bar',
    'Mudroom/Entry',
    'Sunroom/Conservatory',
  ],
  commercial: [
    'Clean Room Standards',
    'Data Center/IT Equipment',
    'Food Safety Zones',
    'Medical/Sterile Areas',
    'Hazmat/Chemical Areas',
    'Restricted Access Zones',
    'Art/Antique Collections',
    'Sensitive Electronics',
  ],
  carpet: [
    'Heavy Stain Areas',
    'Pet Damage Areas',
    'High Traffic Zones',
    'Under Furniture',
    'Stair Risers',
    'Area Rug Edges',
  ],
  window: [
    'Hard-to-Reach Access',
    'High Elevation Areas',
    'Oversized Panes',
    'Leaded/Decorative Glass',
    'Multi-Pane Storm Windows',
    'Security/Tinted Film',
  ],
  floor: [
    'Heavy Wear Areas',
    'Wax Build-up Zones',
    'Grout Lines',
    'Transition Strips',
    'Under Equipment',
    'Drain Areas',
  ],
};

// Equipment present options by service type
const equipmentOptionsByService: Record<ServiceType, string[]> = {
  residential: [
    'Home Electronics',
    'Kitchen Appliances',
    'HVAC Systems',
    'Security Systems',
    'Home Office Equipment',
    'Audio/Visual Equipment',
  ],
  commercial: [
    'Computers/Electronics',
    'Medical Equipment',
    'Kitchen Equipment',
    'Manufacturing Equipment',
    'Laboratory Equipment',
    'Audio/Visual Equipment',
    'Security Systems',
    'HVAC Systems',
    'Server Racks',
  ],
  carpet: [
    'Area Rugs',
    'Wall-to-Wall Carpeting',
    'Furniture to Move',
    'Delicate Textiles',
  ],
  window: [
    'Window Screens',
    'Storm Windows',
    'Window Films',
    'Blinds/Shutters',
  ],
  floor: [
    'Heavy Machinery',
    'Furniture to Move',
    'Floor Drains',
    'Sensitive Equipment',
  ],
};

// Environmental concerns by service type
const environmentalConcernsByService: Record<ServiceType, string[]> = {
  residential: [
    'Pet Odors/Dander',
    'Allergies in Household',
    'Chemical Sensitivity',
    'Child-Safe Products Required',
    'Eco-Friendly Products Preferred',
    'Dust Control Required',
  ],
  commercial: [
    'Chemical Sensitivity',
    'Dust Control Required',
    'Noise Restrictions',
    'Temperature Sensitive',
    'Humidity Control',
    'Air Quality Standards',
    'Contamination Control',
    'Allergen Management',
  ],
  carpet: [
    'Pet Stains/Odors',
    'Allergies',
    'Chemical Sensitivity',
    'Eco-Friendly Products',
    'Fast Drying Required',
  ],
  window: [
    'Water Restrictions',
    'Eco-Friendly Products',
    'Noise Restrictions',
  ],
  floor: [
    'Chemical Sensitivity',
    'Dust Control Required',
    'Fume Ventilation',
    'Eco-Friendly Products',
    'Fast Drying Required',
  ],
};

// Special equipment options by service type
const specialEquipmentOptionsByService: Record<ServiceType, string[]> = {
  residential: [
    'HEPA Filtration',
    'Steam Cleaning',
    'Carpet Extraction',
    'Eco-Friendly Products',
  ],
  commercial: [
    'HEPA Filtration',
    'Electrostatic Sprayers',
    'UV Sanitization',
    'Steam Cleaning',
    'Pressure Washing',
    'Carpet Extraction',
    'Floor Buffing/Polishing',
    'Window Cleaning Equipment',
  ],
  carpet: [
    'Steam Cleaning',
    'Carpet Extraction',
    'Stain Treatment',
    'Deodorizing Treatment',
    'Scotchgard Protection',
  ],
  window: [
    'Water-Fed Pole System',
    'Ladder/Lift Access',
    'Pressure Washing',
    'Squeegee System',
  ],
  floor: [
    'Floor Buffing/Polishing',
    'Auto Scrubbers',
    'Strip & Wax Equipment',
    'Diamond Polishing',
    'Concrete Grinding',
  ],
};

// Certification options by service type
const certificationOptionsByService: Record<ServiceType, string[]> = {
  residential: [
    'Green Cleaning Certification',
    'Background Checked',
    'Bonded & Insured',
  ],
  commercial: [
    'OSHA Compliance',
    'HIPAA Training',
    'Food Safety Certification',
    'Hazmat Handling',
    'Security Clearance',
    'Green Cleaning Certification',
    'Infection Control Training',
    'Chemical Safety Training',
  ],
  carpet: [
    'IICRC Certification',
    'Green Cleaning Certification',
    'Bonded & Insured',
  ],
  window: [
    'Height Safety Certification',
    'Bonded & Insured',
  ],
  floor: [
    'Floor Care Specialist',
    'Chemical Safety Training',
    'Bonded & Insured',
  ],
};

// Insurance options (same for all, but can be customized)
const insuranceOptions = [
  'General Liability',
  'Professional Liability',
  'Workers Compensation',
  'Bonding/Fidelity',
  'Equipment Coverage',
];

// Areas included options by service type
const areasIncludedByService: Record<ServiceType, string[]> = {
  residential: [
    'Kitchen',
    'Living Room',
    'Dining Room',
    'Bedrooms',
    'Bathrooms',
    'Home Office',
    'Laundry Room',
    'Garage',
    'Basement',
    'Attic',
    'Hallways',
    'Stairs',
    'Outdoor Areas',
  ],
  commercial: [
    'Offices',
    'Common Areas',
    'Restrooms',
    'Break Rooms',
    'Storage Areas',
    'Printing Rooms',
    'Conference Rooms',
    'Reception Area',
    'Hallways',
    'Lobby',
    'Kitchen/Cafeteria',
    'Stairwells',
    'Elevators',
    'Server Room',
    'Executive Offices',
    'Training Rooms',
    'Copy Centers',
    'Supply Closets',
  ],
  carpet: [
    'Living Room',
    'Bedrooms',
    'Hallways',
    'Stairs',
    'Office Spaces',
    'Reception Area',
    'Conference Rooms',
  ],
  window: [
    'All Interior Windows',
    'All Exterior Windows',
    'Ground Floor Only',
    'Upper Floors',
    'Skylights',
    'Glass Doors',
  ],
  floor: [
    'Main Floor Area',
    'Hallways',
    'Stairs',
    'Kitchen',
    'Bathrooms',
    'Entryways',
    'Warehouse Floor',
    'Showroom',
  ],
};

// Visitor frequency options (only for commercial)
const visitorFrequencyOptions = [
  { value: 'low', label: 'Low (< 50 visitors/day)' },
  { value: 'medium', label: 'Medium (50-200 visitors/day)' },
  { value: 'high', label: 'High (> 200 visitors/day)' },
];

// Traffic level options
const trafficLevelOptions = [
  { value: 'light', label: 'Light Traffic' },
  { value: 'medium', label: 'Medium Traffic' },
  { value: 'heavy', label: 'Heavy Traffic' },
];

// Accessibility options (mainly for commercial)
const accessibilityOptions = [
  'ADA Compliance Required',
  'Wheelchair Accessible',
  'Special Mobility Equipment',
  'Hearing Assistance Systems',
  'Visual Assistance Systems',
];

// Services that should show traffic analysis section
const servicesWithTrafficAnalysis: ServiceType[] = ['commercial'];

// Services that should show full facility details
const servicesWithFullFacilityDetails: ServiceType[] = ['commercial'];


type PASRow = {
  id: string;
  proposal_id: string;
  sku: string;
  label: string;
  unit_type: string;
  rate: number;
  qty: number;
  min_qty: number;
  frequency: 'one_time' | 'monthly' | 'quarterly' | 'annual';
  subtotal: number;
  monthly_amount: number | null;
  notes: string | null;
};

interface EnhancedFacilitySectionProps {
  proposalId?: string;
  serviceType?: ServiceType;
}

export function EnhancedFacilitySection({
  proposalId,
  serviceType = 'commercial',
}: EnhancedFacilitySectionProps) {
  // Get service-specific options based on selected service type
  const buildingTypeOptions = buildingTypeOptionsByService[serviceType];
  const specialAreasOptions = specialAreasOptionsByService[serviceType];
  const equipmentOptions = equipmentOptionsByService[serviceType];
  const environmentalConcerns = environmentalConcernsByService[serviceType];
  const specialEquipmentOptions = specialEquipmentOptionsByService[serviceType];
  const certificationOptions = certificationOptionsByService[serviceType];
  const areasIncludedOptions = areasIncludedByService[serviceType];
  
  // Determine which sections to show based on service type
  const showTrafficAnalysis = servicesWithTrafficAnalysis.includes(serviceType);
  const showFullFacilityDetails = servicesWithFullFacilityDetails.includes(serviceType);
  
  // Get section titles based on service type
  const getSectionTitle = () => {
    switch (serviceType) {
      case 'residential':
        return 'Home Details';
      case 'carpet':
        return 'Carpet Cleaning Details';
      case 'window':
        return 'Window Cleaning Details';
      case 'floor':
        return 'Floor Care Details';
      default:
        return 'Enhanced Facility Details';
    }
  };
  
  const getSectionDescription = () => {
    switch (serviceType) {
      case 'residential':
        return 'Provide details about the home for accurate service planning.';
      case 'carpet':
        return 'Provide details about the carpet areas for accurate cleaning estimates.';
      case 'window':
        return 'Provide details about the windows for accurate service planning.';
      case 'floor':
        return 'Provide details about the floor areas for accurate service planning.';
      default:
        return 'Provide comprehensive facility information for accurate service planning and pricing.';
    }
  };
  const form = useFormContext<ProposalFormData>();
  const supabase = createClient();
  const [addons, setAddons] = useState<PASRow[]>([]);
  const [loadingAddons, setLoadingAddons] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);

  useEffect(() => {
    const fetchAddons = async () => {
      try {
        setLoadingAddons(true);
        const { data, error } = await supabase
          .from('proposal_additional_services')
          .select('*')
          .eq('proposal_id', proposalId)
          .order('created_at', { ascending: true });
        if (error) return;
        const normalized = (data || []).map((row: any) => {
          const subtotal = Number.isFinite(row?.subtotal)
            ? Number(row.subtotal)
            : Number(row?.rate) * Number(row?.qty);
          const freq = String(row?.frequency || '').toLowerCase();
          const monthly_amount_raw = row?.monthly_amount;
          const monthly_amount_num =
            monthly_amount_raw != null ? Number(monthly_amount_raw) : NaN;
          const monthly_amount = Number.isFinite(monthly_amount_num)
            ? monthly_amount_num
            : freq.includes('month')
            ? subtotal
            : null;
          return {
            ...row,
            subtotal,
            monthly_amount,
          } as PASRow;
        });
        setAddons(normalized);
      } finally {
        setLoadingAddons(false);
      }
    };
    if (proposalId) fetchAddons();
  }, [proposalId, supabase]);

  useEffect(() => {
    if (!proposalId) {
      const preSelected =
        (form.getValues('selected_addons' as any) as any[]) || [];
      setAddons(preSelected as PASRow[]);
    }
  }, [proposalId]);

  const monthlyAddonsTotal = useMemo(() => {
    return addons.reduce((sum, a) => {
      const m = a.monthly_amount;
      if (m !== null && m !== undefined) return sum + Number(m);
      const freq = String(a.frequency || '').toLowerCase();
      const base = Number.isFinite(a.subtotal)
        ? Number(a.subtotal)
        : Number(a.rate) * Number(a.qty);
      const months = freq === 'monthly' ? 1 : freq === 'quarterly' ? 3 : freq === 'annual' ? 12 : 0;
      if (months > 0) return sum + (Number.isFinite(base) ? base / months : 0);
      return sum;
    }, 0);
  }, [addons]);
  console.log(
    '🚀 ~ EnhancedFacilitySection ~ monthlyAddonsTotal:',
    monthlyAddonsTotal
  );

  const handleDeleteAddon = async (id: string) => {
    const prev = addons;
    setAddons(addons.filter((a) => a.id !== id));
    if (!proposalId) {
      form.setValue(
        'selected_addons' as any,
        addons.filter((a) => a.id !== id),
        {
          shouldValidate: false,
          shouldTouch: false,
          shouldDirty: false,
        }
      );
      return;
    }
    const { error } = await supabase
      .from('proposal_additional_services')
      .delete()
      .eq('id', id);
    if (error) setAddons(prev);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold mb-2">
          {getSectionTitle()}
        </h2>
        <p className="text-muted-foreground">
          {getSectionDescription()}
        </p>
      </div>

      {/* Facility Details */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Building2 className="h-5 w-5" />
            <span>{serviceType === 'residential' ? 'Property Information' : 'Facility Information'}</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="facility_details.building_age"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{serviceType === 'residential' ? 'Home Age (years)' : 'Building Age (years)'}</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min="0"
                      placeholder={serviceType === 'residential' ? 'Enter home age' : 'Enter building age'}
                      value={field.value || ''}
                      onChange={(e) => {
                        // Allow any input during typing
                        field.onChange(e.target.value);
                      }}
                      onBlur={(e) => {
                        // Validate and sanitize only on blur
                        const value = e.target.value;
                        field.onChange(
                          value === '' ? undefined : parseInt(value, 10)
                        );
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="facility_details.building_type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{serviceType === 'residential' ? 'Property Type' : 'Building Type'}</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder={serviceType === 'residential' ? 'Select property type' : 'Select building type'} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {buildingTypeOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Accessibility Requirements - Only show for commercial */}
          {showFullFacilityDetails && (
            <FormField
              control={form.control}
              name="facility_details.accessibility_requirements"
              render={() => (
                <FormItem className="border-b-1 pb-3">
                  <FormLabel>Accessibility Requirements</FormLabel>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                    {accessibilityOptions.map((item) => (
                      <FormField
                        key={item}
                        control={form.control}
                        name="facility_details.accessibility_requirements"
                        render={({ field }) => {
                          return (
                            <FormItem
                              key={item}
                              className="flex flex-row items-start space-x-3 space-y-0"
                            >
                              <FormControl>
                                <Checkbox
                                  checked={field.value?.includes(item)}
                                  onCheckedChange={(checked) => {
                                    const currentValue = Array.isArray(
                                      field.value
                                    )
                                      ? field.value
                                      : [];
                                    return checked
                                      ? field.onChange([...currentValue, item])
                                      : field.onChange(
                                          currentValue.filter(
                                            (value) => value !== item
                                          )
                                        );
                                  }}
                                />
                              </FormControl>
                              <FormLabel className="text-sm font-normal">
                                {item}
                              </FormLabel>
                            </FormItem>
                          );
                        }}
                      />
                    ))}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          <FormField
            control={form.control}
            name="facility_details.special_areas"
            render={() => (
              <FormItem className="border-b-1 pb-3">
                <FormLabel>Areas Requiring Special Attention</FormLabel>
                <p className="text-xs text-muted-foreground mb-2">
                  Select areas that need extra care or have special requirements
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  {specialAreasOptions.map((item) => (
                    <FormField
                      key={item}
                      control={form.control}
                      name="facility_details.special_areas"
                      render={({ field }) => {
                        return (
                          <FormItem
                            key={item}
                            className="flex flex-row items-start space-x-3 space-y-0"
                          >
                            <FormControl>
                              <Checkbox
                                checked={field.value?.includes(item)}
                                onCheckedChange={(checked) => {
                                  const currentValue = Array.isArray(
                                    field.value
                                  )
                                    ? field.value
                                    : [];
                                  return checked
                                    ? field.onChange([...currentValue, item])
                                    : field.onChange(
                                        currentValue.filter(
                                          (value) => value !== item
                                        )
                                      );
                                }}
                              />
                            </FormControl>
                            <FormLabel className="text-sm font-normal">
                              {item}
                            </FormLabel>
                          </FormItem>
                        );
                      }}
                    />
                  ))}
                </div>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="facility_details.equipment_present"
            render={() => (
              <FormItem className="border-b-1 pb-3">
                <FormLabel>Equipment Present</FormLabel>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  {equipmentOptions.map((item) => (
                    <FormField
                      key={item}
                      control={form.control}
                      name="facility_details.equipment_present"
                      render={({ field }) => {
                        return (
                          <FormItem
                            key={item}
                            className="flex flex-row items-start space-x-3 space-y-0"
                          >
                            <FormControl>
                              <Checkbox
                                checked={field.value?.includes(item)}
                                onCheckedChange={(checked) => {
                                  const currentValue = Array.isArray(
                                    field.value
                                  )
                                    ? field.value
                                    : [];
                                  return checked
                                    ? field.onChange([...currentValue, item])
                                    : field.onChange(
                                        currentValue.filter(
                                          (value) => value !== item
                                        )
                                      );
                                }}
                              />
                            </FormControl>
                            <FormLabel className="text-sm font-normal">
                              {item}
                            </FormLabel>
                          </FormItem>
                        );
                      }}
                    />
                  ))}
                </div>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="facility_details.environmental_concerns"
            render={() => (
              <FormItem>
                <FormLabel>Environmental Concerns</FormLabel>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  {environmentalConcerns.map((item) => (
                    <FormField
                      key={item}
                      control={form.control}
                      name="facility_details.environmental_concerns"
                      render={({ field }) => {
                        return (
                          <FormItem
                            key={item}
                            className="flex flex-row items-start space-x-3 space-y-0"
                          >
                            <FormControl>
                              <Checkbox
                                checked={field.value?.includes(item)}
                                onCheckedChange={(checked) => {
                                  const currentValue = Array.isArray(
                                    field.value
                                  )
                                    ? field.value
                                    : [];
                                  return checked
                                    ? field.onChange([...currentValue, item])
                                    : field.onChange(
                                        currentValue.filter(
                                          (value) => value !== item
                                        )
                                      );
                                }}
                              />
                            </FormControl>
                            <FormLabel className="text-sm font-normal">
                              {item}
                            </FormLabel>
                          </FormItem>
                        );
                      }}
                    />
                  ))}
                </div>
                <FormMessage />
              </FormItem>
            )}
          />
        </CardContent>
      </Card>

      {/* Traffic Analysis - Only show for commercial */}
      {showTrafficAnalysis && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Users className="h-5 w-5" />
              <span>Traffic Analysis</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="traffic_analysis.staff_count"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Staff Count</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="0"
                        placeholder="Number of staff"
                        value={field.value || ''}
                        onChange={(e) => {
                          // Allow any input during typing
                          field.onChange(e.target.value);
                        }}
                        onBlur={(e) => {
                          // Validate and sanitize only on blur
                          const value = e.target.value;
                          field.onChange(
                            value === '' ? undefined : parseInt(value, 10)
                          );
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="traffic_analysis.visitor_frequency"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Visitor Frequency</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select frequency" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {visitorFrequencyOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="traffic_analysis.traffic_level"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Traffic Level</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select traffic level" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {trafficLevelOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="traffic_analysis.special_events"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>Special Events or High-Traffic Periods</FormLabel>
                    <p className="text-sm text-muted-foreground">
                      Check if the facility hosts special events that require
                      additional cleaning
                    </p>
                  </div>
                </FormItem>
              )}
            />
          </CardContent>
        </Card>
      )}

      {/* Service Scope */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Clock className="h-5 w-5" />
            <span>Service Scope</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <FormField
            control={form.control}
            name="service_scope.areas_included"
            render={() => (
              <FormItem>
                <FormLabel>Areas Included in Service</FormLabel>
                <p className="text-xs text-muted-foreground mb-2">
                  Select the rooms/spaces to be cleaned
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  {areasIncludedOptions.map((area) => (
                    <FormField
                      key={area}
                      control={form.control}
                      name="service_scope.areas_included"
                      render={({ field }) => {
                        return (
                          <FormItem
                            key={area}
                            className="flex flex-row items-start space-x-3 space-y-0"
                          >
                            <FormControl>
                              <Checkbox
                                checked={field.value?.includes(area)}
                                onCheckedChange={(checked) => {
                                  const currentValue = Array.isArray(
                                    field.value
                                  )
                                    ? field.value
                                    : [];
                                  return checked
                                    ? field.onChange([...currentValue, area])
                                    : field.onChange(
                                        currentValue.filter(
                                          (value) => value !== area
                                        )
                                      );
                                }}
                              />
                            </FormControl>
                            <FormLabel className="text-sm font-normal">
                              {area}
                            </FormLabel>
                          </FormItem>
                        );
                      }}
                    />
                  ))}
                </div>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="service_scope.special_notes"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Special Notes</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Add any special instructions, additional areas, or specific requirements for the cleaning service..."
                    className="min-h-[100px]"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="service_scope.areas_excluded"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Areas Excluded</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="List areas that should be excluded from cleaning"
                    className="min-h-[80px]"
                    value={field.value?.join('\n') || ''}
                    onChange={(e) => {
                      const lines = e.target.value
                        .split('\n')
                        .filter((line) => line.trim());
                      field.onChange(lines);
                    }}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="service_scope.special_services"
            render={() => <></>}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Clock className="h-5 w-5" />
            <span>Add-on Services</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              {loadingAddons
                ? 'Loading services...'
                : addons.length === 0
                ? 'No add-ons selected'
                : `${addons.length} add-on${
                    addons.length > 1 ? 's' : ''
                  } selected`}
            </div>
            <Button onClick={() => setPickerOpen(true)} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Add Service
            </Button>
          </div>

          {addons.length > 0 && (
            <div className="space-y-3">
              {addons.map((a) => (
                <div
                  key={a.id}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <div className="space-y-1">
                    <div className="font-medium">{a.label}</div>
                    <div className="text-xs text-muted-foreground">
                      Qty {a.qty} {a.unit_type} • Rate ${a.rate.toFixed(2)} •{' '}
                      {a.frequency}
                    </div>
                    <div className="text-sm">
                      {a.monthly_amount !== null ? (
                        <span className="font-semibold">
                          Monthly: ${a.monthly_amount.toFixed(2)}
                        </span>
                      ) : (
                        <span className="font-semibold">
                          One-time: ${a.subtotal.toFixed(2)}
                        </span>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="destructive"
                    size="icon"
                    onClick={() => handleDeleteAddon(a.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}

              <Separator />
              <div className="flex justify-between items-center">
                <span className="text-sm">Monthly Add-ons Total</span>
                <span className="text-lg font-semibold">
                  ${monthlyAddonsTotal.toFixed(2)}
                </span>
              </div>
            </div>
          )}

          <AddonServicePickerModal
            open={pickerOpen}
            onOpenChange={setPickerOpen}
            proposalId={proposalId}
            onAdded={(row: PASRow) => {
              setAddons((prev) => {
                const next = [...prev, row];
                if (!proposalId) {
                  form.setValue('selected_addons' as any, next, {
                    shouldValidate: false,
                    shouldTouch: false,
                    shouldDirty: false,
                  });
                }
                return next;
              });
            }}
          />
        </CardContent>
      </Card>

      {/* Special Requirements */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <AlertTriangle className="h-5 w-5" />
            <span>Special Requirements</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Security options - Only show for commercial */}
          {showFullFacilityDetails && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="special_requirements.security_clearance"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Security Clearance Required</FormLabel>
                    </div>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="special_requirements.after_hours_access"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>After Hours Access Required</FormLabel>
                    </div>
                  </FormItem>
                )}
              />
            </div>
          )}

          <FormField
            control={form.control}
            name="special_requirements.special_equipment"
            render={() => (
              <FormItem className="border-b-1 pb-3">
                <FormLabel>Special Equipment Required</FormLabel>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  {specialEquipmentOptions.map((item) => (
                    <FormField
                      key={item}
                      control={form.control}
                      name="special_requirements.special_equipment"
                      render={({ field }) => {
                        return (
                          <FormItem
                            key={item}
                            className="flex flex-row items-start space-x-3 space-y-0"
                          >
                            <FormControl>
                              <Checkbox
                                checked={field.value?.includes(item)}
                                onCheckedChange={(checked) => {
                                  const currentValue = Array.isArray(
                                    field.value
                                  )
                                    ? field.value
                                    : [];
                                  return checked
                                    ? field.onChange([...currentValue, item])
                                    : field.onChange(
                                        currentValue.filter(
                                          (value) => value !== item
                                        )
                                      );
                                }}
                              />
                            </FormControl>
                            <FormLabel className="text-sm font-normal">
                              {item}
                            </FormLabel>
                          </FormItem>
                        );
                      }}
                    />
                  ))}
                </div>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Certifications - show service-specific options */}
          <FormField
            control={form.control}
            name="special_requirements.certifications_required"
            render={() => (
              <FormItem className="border-b-1 pb-3">
                <FormLabel>Certifications Required</FormLabel>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  {certificationOptions.map((item) => (
                    <FormField
                      key={item}
                      control={form.control}
                      name="special_requirements.certifications_required"
                      render={({ field }) => {
                        return (
                          <FormItem
                            key={item}
                            className="flex flex-row items-start space-x-3 space-y-0"
                          >
                            <FormControl>
                              <Checkbox
                                checked={field.value?.includes(item)}
                                onCheckedChange={(checked) => {
                                  const currentValue = Array.isArray(
                                    field.value
                                  )
                                    ? field.value
                                    : [];
                                  return checked
                                    ? field.onChange([...currentValue, item])
                                    : field.onChange(
                                        currentValue.filter(
                                          (value) => value !== item
                                        )
                                      );
                                }}
                              />
                            </FormControl>
                            <FormLabel className="text-sm font-normal">
                              {item}
                            </FormLabel>
                          </FormItem>
                        );
                      }}
                    />
                  ))}
                </div>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="special_requirements.insurance_requirements"
            render={() => (
              <FormItem>
                <FormLabel>Insurance Requirements</FormLabel>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  {insuranceOptions.map((item) => (
                    <FormField
                      key={item}
                      control={form.control}
                      name="special_requirements.insurance_requirements"
                      render={({ field }) => {
                        return (
                          <FormItem
                            key={item}
                            className="flex flex-row items-start space-x-3 space-y-0"
                          >
                            <FormControl>
                              <Checkbox
                                checked={field.value?.includes(item)}
                                onCheckedChange={(checked) => {
                                  const currentValue = Array.isArray(
                                    field.value
                                  )
                                    ? field.value
                                    : [];
                                  return checked
                                    ? field.onChange([...currentValue, item])
                                    : field.onChange(
                                        currentValue.filter(
                                          (value) => value !== item
                                        )
                                      );
                                }}
                              />
                            </FormControl>
                            <FormLabel className="text-sm font-normal">
                              {item}
                            </FormLabel>
                          </FormItem>
                        );
                      }}
                    />
                  ))}
                </div>
                <FormMessage />
              </FormItem>
            )}
          />
        </CardContent>
      </Card>
    </div>
  );
}
