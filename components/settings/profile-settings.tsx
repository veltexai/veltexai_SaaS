'use client';

import { useState, useRef, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
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
import { User, Upload, X } from 'lucide-react';
import { useAuth } from '@/lib/auth/use-auth';
import { createClient } from '@/lib/supabase/client';
import { Profile } from '@/lib/auth/types';
import Image from 'next/image';

const profileSchema = z.object({
  full_name: z
    .string()
    .min(1, 'Full name is required')
    .max(100, 'Full name must be less than 100 characters'),
  company_name: z
    .string()
    .max(100, 'Company name must be less than 100 characters')
    .optional(),
  phone: z
    .string()
    .min(1, 'Phone number is required')
    .regex(/^[+]?[1-9]\d{1,14}$/, 'Please enter a valid phone number'),
  website: z
    .string()
    .optional()
    .transform((val) => (val === '' ? null : val))
    .refine(
      (val) => val === null || val === undefined || /^https?:\/\//.test(val),
      {
        message: 'Website must start with http:// or https://',
      }
    )
    .nullable(),
  logo_url: z.string().optional(),
  company_background: z
    .string()
    .min(50, 'Company background must be at least 50 characters')
    .max(500, 'Company background must be less than 500 characters'),
});

type ProfileFormData = z.infer<typeof profileSchema>;

interface ProfileSettingsProps {
  user: any;
  profile: any;
}

export function ProfileSettings({ user, profile }: ProfileSettingsProps) {
  const { updateProfile } = useAuth();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // Debug: Log user object on component mount
  useEffect(() => {
    console.log('ProfileSettings mounted with user:', {
      user,
      userId: user?.id,
      userEmail: user?.email,
      profile,
      profileId: profile?.id,
    });
  }, [user, profile]);
  const [message, setMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(
    profile?.logo_url || null
  );
  const fileInputRef = useRef<HTMLInputElement>(null);
  const supabase = createClient();

  const form = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      full_name: profile?.full_name || '',
      company_name: profile?.company_name || '',
      phone: profile?.phone || '',
      website: profile?.website || '',
      logo_url: profile?.logo_url || undefined,
      company_background: profile?.company_background || '',
    },
  });

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setMessage({ type: 'error', text: 'Please select an image file.' });
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      setMessage({ type: 'error', text: 'Image must be less than 2MB.' });
      return;
    }

    setSelectedFile(file);
    setMessage(null);

    // Show preview
    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result) {
        setLogoPreview(e.target.result as string);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveLogo = () => {
    setSelectedFile(null);
    setLogoPreview(null);
    form.setValue('logo_url', '');
    setMessage(null);
  };

  const uploadLogo = async (file: File): Promise<string> => {
    console.log('Starting logo upload...', {
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
      userId: user?.id,
    });

    if (!user?.id) {
      throw new Error('User ID is required for upload');
    }

    try {
      // Test Supabase connection first
      console.log('Testing Supabase connection...');
      const { data: buckets, error: bucketsError } =
        await supabase.storage.listBuckets();

      if (bucketsError) {
        console.error('Failed to connect to Supabase storage:', bucketsError);
        throw new Error(`Storage connection failed: ${bucketsError.message}`);
      }

      console.log(
        'Available buckets:',
        buckets?.map((b) => b.name)
      );

      const profileLogosBucket = buckets?.find(
        (b) => b.name === 'profile-logos'
      );
      if (!profileLogosBucket) {
        console.error(
          'profile-logos bucket not found. Available buckets:',
          buckets?.map((b) => b.name)
        );
        throw new Error('Storage bucket "profile-logos" not found');
      }

      console.log('profile-logos bucket found:', profileLogosBucket);

      // Clean up old logo first if it exists
      const currentLogoUrl = form.getValues('logo_url');
      if (currentLogoUrl) {
        try {
          // Extract the file path from the URL
          const urlParts = currentLogoUrl.split('/');
          const bucketIndex = urlParts.findIndex(
            (part) => part === 'profile-logos'
          );
          if (bucketIndex !== -1 && bucketIndex + 1 < urlParts.length) {
            const oldFilePath = urlParts.slice(bucketIndex + 1).join('/');
            console.log('Removing old logo:', oldFilePath);
            const { error: removeError } = await supabase.storage
              .from('profile-logos')
              .remove([oldFilePath]);
            if (removeError) {
              console.warn('Failed to remove old logo:', removeError);
            } else {
              console.log('Old logo removed successfully');
            }
          }
        } catch (cleanupError) {
          console.warn('Failed to cleanup old logo:', cleanupError);
          // Don't fail the upload for cleanup errors
        }
      }

      // Upload new logo
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `${user.id}/${fileName}`;

      console.log('Uploading new logo to path:', filePath);
      console.log('File details:', {
        name: file.name,
        size: file.size,
        type: file.type,
        lastModified: file.lastModified,
      });

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('profile-logos')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false, // Don't allow overwriting to avoid conflicts
        });

      if (uploadError) {
        console.error('Upload error details:', {
          message: uploadError.message,
          error: uploadError,
          filePath,
          userId: user.id,
        });

        // Handle specific error cases
        if (uploadError.message.includes('already exists')) {
          // Try with a different filename
          const newFileName = `${Date.now()}-${Math.random()
            .toString(36)
            .substr(2, 9)}.${fileExt}`;
          const newFilePath = `${user.id}/${newFileName}`;

          console.log('Retrying upload with new filename:', newFilePath);

          const { data: retryData, error: retryError } = await supabase.storage
            .from('profile-logos')
            .upload(newFilePath, file, {
              cacheControl: '3600',
              upsert: false,
            });

          if (retryError) {
            console.error('Retry upload failed:', retryError);
            throw new Error(`Upload failed on retry: ${retryError.message}`);
          }

          console.log('Retry upload successful:', retryData);

          const {
            data: { publicUrl },
          } = supabase.storage.from('profile-logos').getPublicUrl(newFilePath);

          console.log('Generated public URL (retry):', publicUrl);
          return publicUrl;
        }

        throw new Error(`Upload failed: ${uploadError.message}`);
      }

      console.log('Upload successful:', uploadData);

      // Get public URL
      const {
        data: { publicUrl },
      } = supabase.storage.from('profile-logos').getPublicUrl(filePath);

      console.log('Generated public URL:', publicUrl);

      // Verify the file was actually uploaded
      const { data: fileExists, error: checkError } = await supabase.storage
        .from('profile-logos')
        .list(user.id);

      if (checkError) {
        console.warn('Could not verify file upload:', checkError);
      } else {
        console.log(
          'Files in user folder after upload:',
          fileExists?.map((f) => f.name)
        );
      }

      return publicUrl;
    } catch (error) {
      console.error('Logo upload error:', error);
      throw error;
    }
  };
  const onSubmit = async (data: ProfileFormData) => {
    console.log('Form submission started:', {
      user: user?.id,
      selectedFile: selectedFile?.name,
      formData: data,
    });

    setMessage(null);

    try {
      if (!user) {
        setMessage({
          type: 'error',
          text: 'No user logged in. Please refresh the page.',
        });
        return;
      }

      let logoUrl = data.logo_url;

      // Upload logo if a new file is selected
      if (selectedFile) {
        console.log('Uploading new logo file...');
        logoUrl = await uploadLogo(selectedFile);
        console.log('Logo uploaded successfully, URL:', logoUrl);
      }

      // Update profile with logo URL
      const profileData = {
        ...data,
        logo_url: logoUrl,
      };

      console.log('Updating profile with data:', profileData);

      const response = await updateProfile(
        profileData as Partial<Profile>,
        user
      );

      console.log('Profile update response:', response);

      if (response.error) {
        console.error('Profile update error:', response.error);
        setMessage({
          type: 'error',
          text:
            response.error.message ||
            'Failed to update profile. Please try again.',
        });
      } else {
        console.log('Profile updated successfully');
        // Update form state and preview with the uploaded URL
        if (logoUrl) {
          form.setValue('logo_url', logoUrl);
          setLogoPreview(logoUrl);
        }
        setSelectedFile(null);
        setMessage({ type: 'success', text: 'Profile updated successfully!' });
      }
    } catch (error: any) {
      console.error('Profile update error:', error);
      setMessage({
        type: 'error',
        text: error.message || 'Failed to update profile. Please try again.',
      });
    }
  };

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
        {message && (
          <Alert
            className={
              message.type === 'error'
                ? 'border-red-200 bg-red-50 mb-4'
                : 'border-green-200 bg-green-50 mb-4'
            }
          >
            <AlertDescription
              className={
                message.type === 'error' ? 'text-red-800' : 'text-green-800'
              }
            >
              {message.text}
            </AlertDescription>
          </Alert>
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={user?.email || ''}
                disabled
                className="bg-gray-50"
              />
              <p className="text-sm text-gray-500 mt-1">
                Email cannot be changed. Contact support if needed.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <FormField
                control={form.control}
                name="full_name"
                render={({ field }) => (
                  <FormItem className="w-full">
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
                  <FormItem className="w-full">
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

            <div className="flex items-center gap-3">
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem className="w-full">
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
                  <FormItem className="w-full">
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
                      className="min-h-[100px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Logo Upload Section */}
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
                      />
                    </div>
                    <div className="flex flex-col space-y-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        <Upload className="h-4 w-4 mr-2" />
                        Change Logo
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleRemoveLogo}
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
                      >
                        Upload Logo
                      </Button>
                      <p className="text-sm text-gray-500 mt-2">
                        PNG, JPG up to 2MB
                      </p>
                    </div>
                  </div>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </div>
              {selectedFile && (
                <p className="text-sm text-blue-600 mt-2">
                  New logo selected: {selectedFile.name} (will be uploaded when
                  you update profile)
                </p>
              )}
            </div>

            {/* Hidden field for logo_url */}
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

            <Button type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? 'Updating...' : 'Update Profile'}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
