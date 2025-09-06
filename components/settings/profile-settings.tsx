'use client';

import { useRef, useCallback, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { User, Upload, X } from 'lucide-react';
import Image from 'next/image';

// Components
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';

// Hooks and utilities
import { useImageUpload } from '@/hooks/use-image-upload';
import { useProfileUpdate } from '@/hooks/use-profile-update';
import { profileSchema, type ProfileFormData } from '@/lib/validations/profile';
import { type User as UserType, type Profile } from '@/types/database';
import { useNavigationGuard } from '@/hooks/use-navigation-guard';

// Constants
const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB
const ACCEPTED_IMAGE_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
];

interface ProfileSettingsProps {
  user: UserType;
  profile: Profile;
}

interface LogoUploadProps {
  logoPreview: string | null;
  isUploading: boolean;
  onFileSelect: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onRemove: () => void;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
}

export function ProfileSettings({ user, profile }: ProfileSettingsProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Custom hooks for separation of concerns
  const {
    logoPreview,
    isUploading,
    uploadError,
    uploadImage: handleImageUpload,
    removeImage: handleImageRemove,
  } = useImageUpload({
    initialUrl: profile?.logo_url,
    bucket: 'profile-logos',
    folder: user.id,
  });

  const { updateProfile, isUpdating, updateError } = useProfileUpdate();

  const form = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: useMemo(
      () => ({
        full_name: profile?.full_name || '',
        company_name: profile?.company_name || '',
        phone: profile?.phone || '',
        website: profile?.website || '',
        logo_url: profile?.logo_url || '',
        company_background: profile?.company_background || '',
      }),
      [profile]
    ),
  });

  // Track changes
  const { isDirty } = form.formState;
  const hasLogoChanged = logoPreview !== (profile?.logo_url || null);
  const hasChanges = isDirty || hasLogoChanged;
  // Navigation guard hook
  useNavigationGuard(
    hasChanges,
    'You have unsaved profile changes. Leave anyway?'
  );

  const validateFile = useCallback((file: File): string | null => {
    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
      return 'Please select a valid image file (JPEG, PNG, WebP).';
    }
    if (file.size > MAX_FILE_SIZE) {
      return 'Image must be less than 2MB.';
    }
    return null;
  }, []);

  const handleFileSelect = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;

      const validationError = validateFile(file);
      if (validationError) {
        // Handle validation error through error boundary or toast
        return;
      }

      try {
        const imageUrl = await handleImageUpload(file);
        form.setValue('logo_url', imageUrl, { shouldDirty: true });
      } catch (error) {
        console.error('Upload failed:', error);
      }
    },
    [validateFile, handleImageUpload, form]
  );

  const handleRemoveLogo = useCallback(async () => {
    if (!logoPreview) return;

    try {
      await handleImageRemove(logoPreview);
      form.setValue('logo_url', '', { shouldDirty: true });
    } catch (error) {
      console.error('Remove failed:', error);
    }
  }, [logoPreview, handleImageRemove, form]);

  const onSubmit = useCallback(
    async (data: ProfileFormData) => {
      try {
        await updateProfile({
          ...data,
          logo_url: logoPreview || data.logo_url || null,
        });
        form.reset(data);
      } catch (error) {
        console.error('Profile update failed:', error);
      }
    },
    [updateProfile, logoPreview, form]
  );

  const isLoading = isUploading || isUpdating;
  const error = uploadError || updateError;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center space-x-2">
          <User className="h-5 w-5 text-blue-600" />
          <CardTitle>Profile Information</CardTitle>
        </div>
        <CardDescription>
          Update your personal information and company details
        </CardDescription>
      </CardHeader>
      <CardContent>
        {error && (
          <Alert className="border-red-200 bg-red-50 mb-4">
            <AlertDescription className="text-red-800">
              {error}
            </AlertDescription>
          </Alert>
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Logo Upload Component */}
            <LogoUpload
              logoPreview={logoPreview}
              isUploading={isUploading}
              onFileSelect={handleFileSelect}
              onRemove={handleRemoveLogo}
              fileInputRef={fileInputRef}
            />

            <FormField
              control={form.control}
              name="logo_url"
              render={({ field }) => (
                <FormItem className="hidden">
                  <FormControl>
                    <Input type="hidden" {...field} />
                  </FormControl>
                </FormItem>
              )}
            />
            {/* Email field - readonly */}
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={user.email}
                disabled
                className="bg-gray-50"
              />
              <p className="text-sm text-gray-500 mt-1">
                Email cannot be changed. Contact support if needed.
              </p>
            </div>

            {/* Form fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="full_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter your full name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="company_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Company Name</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Enter your company name (optional)"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone Number *</FormLabel>
                    <FormControl>
                      <Input placeholder="+1234567890" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="website"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Website</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="https://yourcompany.com (optional)"
                        {...field}
                        value={field.value || ''}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="company_background"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Company Background *</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Describe your company's background, services, and expertise (50-500 characters)"
                      className="min-h-[100px] resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button
              type="submit"
              disabled={isLoading || !hasChanges}
              className="!w-full md:w-auto"
            >
              {isLoading ? 'Updating...' : 'Update Profile'}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

// Extracted Logo Upload Component
function LogoUpload({
  logoPreview,
  isUploading,
  onFileSelect,
  onRemove,
  fileInputRef,
}: LogoUploadProps) {
  return (
    <div>
      <Label>Company Logo</Label>
      <div className="mt-2">
        {logoPreview ? (
          <div className="flex items-center space-x-4">
            <div className="relative w-20 h-20 border-2 border-gray-200 rounded-lg overflow-hidden">
              <Image
                src={logoPreview}
                alt="Company logo"
                fill
                className="object-contain"
                sizes="80px"
              />
            </div>
            <div className="flex flex-col space-y-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
              >
                <Upload className="h-4 w-4 mr-2" />
                {isUploading ? 'Uploading...' : 'Change Logo'}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onRemove}
                disabled={isUploading}
                className="text-red-600 hover:text-red-700"
              >
                <X className="h-4 w-4 mr-2" />
                Remove
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg hover:border-gray-400 transition-colors">
            <div className="text-center">
              <Upload className="mx-auto h-8 w-8 text-gray-400 mb-2" />
              <Button
                type="button"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
              >
                {isUploading ? 'Uploading...' : 'Upload Logo'}
              </Button>
              <p className="text-sm text-gray-500 mt-2">
                PNG, JPG, WebP up to 2MB
              </p>
            </div>
          </div>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/jpg,image/png,image/webp"
          onChange={onFileSelect}
          className="hidden"
        />
      </div>
    </div>
  );
}
