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
        const { imageUrl } = await uploadImageClient({
          file,
          bucket,
          folder,
          onProgress: (progress, message) => {
            console.log(`Upload progress: ${progress}% - ${message}`);
          },
        });

        setLogoPreview(imageUrl);
        toast.success('Image uploaded successfully!');
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
    [bucket, folder]
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
