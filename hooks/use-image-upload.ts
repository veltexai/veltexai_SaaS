import { useState, useCallback } from 'react';
import { uploadImage as uploadImageClient } from '@/lib/supabase/storage/client';
import { deleteImageServer } from '@/lib/supabase/storage/server';
import { toast } from 'sonner';

interface UseImageUploadOptions {
  initialUrl?: string | null;
  bucket: string;
  folder: string;
}

export function useImageUpload({
  initialUrl,
  bucket,
  folder,
}: UseImageUploadOptions) {
  const [logoPreview, setLogoPreview] = useState<string | null>(
    initialUrl || null
  );
  const [savedLogoUrl, setSavedLogoUrl] = useState<string | null>(
    initialUrl || null
  );
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const uploadImage = useCallback(
    async (file: File): Promise<string> => {
      setIsUploading(true);
      setUploadError(null);

      try {
        // Delete existing logo to avoid orphaned files
        // Priority: delete preview if it exists and is different from saved, otherwise delete saved
        const logoToDelete = logoPreview && logoPreview !== savedLogoUrl 
          ? logoPreview 
          : savedLogoUrl;
          
        if (logoToDelete) {
          try {
            await deleteImageServer(logoToDelete);
            console.log('Deleted existing logo:', logoToDelete);
          } catch (error) {
            console.warn('Failed to delete existing logo:', error);
            // Continue with upload even if deletion fails
          }
        }

        // Use transparency-preserving compression options for logos
        const logoCompressionOptions = {
          maxSizeMB: 2, // Slightly larger for logos to preserve quality
          maxWidthOrHeight: 1920,
          useWebWorker: true,
          preserveExif: true, // Preserve image metadata
          alwaysKeepResolution: true, // Prevent resolution changes that might affect background
          initialQuality: 0.9, // High quality to preserve colors and backgrounds
          // Don't specify fileType to preserve original format and transparency
        };

        const { imageUrl } = await uploadImageClient({
          file,
          bucket,
          folder,
          compressionOptions: logoCompressionOptions,
          onProgress: (progress, message) => {
            console.log(`Upload progress: ${progress}% - ${message}`);
          },
        });

        setLogoPreview(imageUrl);
        toast.success('Logo uploaded successfully!');
        return imageUrl;
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'Upload failed';
        setUploadError(errorMessage);
        toast.error(errorMessage);
        throw error;
      } finally {
        setIsUploading(false);
      }
    },
    [bucket, folder, logoPreview, savedLogoUrl]
  );

  const removeImage = useCallback(async (imageUrl: string): Promise<void> => {
    try {
      await deleteImageServer(imageUrl);
      setLogoPreview(null);
      toast.success('Image removed successfully!');
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Remove failed';
      toast.error(errorMessage);
      throw error;
    }
  }, []);

  const resetToSaved = useCallback((savedUrl: string | null) => {
    setLogoPreview(savedUrl);
    setSavedLogoUrl(savedUrl);
  }, []);

  const hasLogoChanged = logoPreview !== savedLogoUrl;

  return {
    logoPreview,
    isUploading,
    uploadError,
    uploadImage,
    removeImage,
    resetToSaved,
    hasLogoChanged,
  };
}
