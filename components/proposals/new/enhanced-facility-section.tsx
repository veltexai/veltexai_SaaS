'use client';

import { useFormContext } from 'react-hook-form';
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
import { type ProposalFormData } from '@/lib/validations/proposal';
import { Building2, Users, Clock, AlertTriangle } from 'lucide-react';

const buildingTypeOptions = [
  { value: 'office', label: 'Office Building' },
  { value: 'warehouse', label: 'Warehouse' },
  { value: 'retail', label: 'Retail Store' },
  { value: 'medical', label: 'Medical Facility' },
  { value: 'educational', label: 'Educational' },
  { value: 'hospitality', label: 'Hospitality' },
  { value: 'industrial', label: 'Industrial' },
  { value: 'other', label: 'Other' },
];

const visitorFrequencyOptions = [
  { value: 'low', label: 'Low (< 50 visitors/day)' },
  { value: 'medium', label: 'Medium (50-200 visitors/day)' },
  { value: 'high', label: 'High (> 200 visitors/day)' },
];

const trafficLevelOptions = [
  { value: 'light', label: 'Light Traffic' },
  { value: 'medium', label: 'Medium Traffic' },
  { value: 'heavy', label: 'Heavy Traffic' },
];

const accessibilityOptions = [
  'ADA Compliance Required',
  'Wheelchair Accessible',
  'Special Mobility Equipment',
  'Hearing Assistance Systems',
  'Visual Assistance Systems',
];

const specialAreasOptions = [
  'Clean Rooms',
  'Server Rooms',
  'Food Service Areas',
  'Medical Treatment Areas',
  'Chemical Storage',
  'High Security Zones',
  'Art/Antique Areas',
  'Electronics/Sensitive Equipment',
];

const equipmentOptions = [
  'Computers/Electronics',
  'Medical Equipment',
  'Kitchen Equipment',
  'Manufacturing Equipment',
  'Laboratory Equipment',
  'Audio/Visual Equipment',
  'Security Systems',
  'HVAC Systems',
];

const environmentalConcerns = [
  'Chemical Sensitivity',
  'Dust Control Required',
  'Noise Restrictions',
  'Temperature Sensitive',
  'Humidity Control',
  'Air Quality Standards',
  'Contamination Control',
  'Allergen Management',
];

const specialEquipmentOptions = [
  'HEPA Filtration',
  'Electrostatic Sprayers',
  'UV Sanitization',
  'Steam Cleaning',
  'Pressure Washing',
  'Carpet Extraction',
  'Floor Buffing/Polishing',
  'Window Cleaning Equipment',
];

const certificationOptions = [
  'OSHA Compliance',
  'HIPAA Training',
  'Food Safety Certification',
  'Hazmat Handling',
  'Security Clearance',
  'Green Cleaning Certification',
  'Infection Control Training',
  'Chemical Safety Training',
];

const insuranceOptions = [
  'General Liability',
  'Professional Liability',
  'Workers Compensation',
  'Bonding/Fidelity',
  'Cyber Liability',
  'Environmental Liability',
  'Equipment Coverage',
  'Auto Liability',
];

export function EnhancedFacilitySection() {
  const form = useFormContext<ProposalFormData>();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold mb-2">
          Enhanced Facility Details
        </h2>
        <p className="text-muted-foreground">
          Provide comprehensive facility information for accurate service
          planning and pricing.
        </p>
      </div>

      {/* Facility Details */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Building2 className="h-5 w-5" />
            <span>Facility Information</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="facility_details.building_age"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Building Age (years)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min="0"
                      placeholder="Enter building age"
                      value={field.value || ''}
                      onChange={(e) => {
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
                  <FormLabel>Building Type</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select building type" />
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

          <FormField
            control={form.control}
            name="facility_details.accessibility_requirements"
            render={() => (
              <FormItem className="border-b-1 pb-3">
                <FormLabel>Accessibility Requirements</FormLabel>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
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
                                  return checked
                                    ? field.onChange([...field.value, item])
                                    : field.onChange(
                                        field.value?.filter(
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
            name="facility_details.special_areas"
            render={() => (
              <FormItem className="border-b-1 pb-3">
                <FormLabel>Special Areas</FormLabel>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
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
                                  return checked
                                    ? field.onChange([...field.value, item])
                                    : field.onChange(
                                        field.value?.filter(
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
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
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
                                  return checked
                                    ? field.onChange([...field.value, item])
                                    : field.onChange(
                                        field.value?.filter(
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
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
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
                                  return checked
                                    ? field.onChange([...field.value, item])
                                    : field.onChange(
                                        field.value?.filter(
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

      {/* Traffic Analysis */}
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
            render={({ field }) => (
              <FormItem>
                <FormLabel>Areas Included</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="List specific areas to be cleaned (e.g., offices, restrooms, lobby, conference rooms)"
                    className="min-h-[100px]"
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
            render={({ field }) => (
              <FormItem>
                <FormLabel>Special Services</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="List any special cleaning services required (e.g., carpet cleaning, window washing, deep sanitization)"
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

          <FormField
            control={form.control}
            name="special_requirements.special_equipment"
            render={() => (
              <FormItem className="border-b-1 pb-3">
                <FormLabel>Special Equipment Required</FormLabel>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
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
                                  return checked
                                    ? field.onChange([...field.value, item])
                                    : field.onChange(
                                        field.value?.filter(
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
            name="special_requirements.certifications_required"
            render={() => (
              <FormItem className="border-b-1 pb-3">
                <FormLabel>Certifications Required</FormLabel>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
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
                                  return checked
                                    ? field.onChange([...field.value, item])
                                    : field.onChange(
                                        field.value?.filter(
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
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
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
                                  return checked
                                    ? field.onChange([...field.value, item])
                                    : field.onChange(
                                        field.value?.filter(
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
