'use server';

import { createClient } from '../server';
import { v4 as uuidv4 } from 'uuid';
import {
  StorageError,
  type UploadOptions,
  type UploadResult,
  type DeleteResult,
} from './types';
import { logger } from '@/lib/logger';

const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/gif',
] as const;

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const CACHE_CONTROL = '31536000';

const validateFile = (file: File): void => {
  if (!ALLOWED_MIME_TYPES.includes(file.type as any)) {
    throw new StorageError(
      'INVALID_FILE_TYPE',
      `File type ${
        file.type
      } is not allowed. Allowed types: ${ALLOWED_MIME_TYPES.join(', ')}`
    );
  }

  if (file.size > MAX_FILE_SIZE) {
    throw new StorageError(
      'FILE_TOO_LARGE',
      `File size ${file.size} exceeds maximum allowed size of ${MAX_FILE_SIZE} bytes`
    );
  }
};

const generateFilePath = (folder: string, fileName: string): string => {
  const fileExtension = fileName.slice(fileName.lastIndexOf('.') + 1);
  return `${folder}/${uuidv4()}.${fileExtension}`;
};

const buildPublicUrl = (bucket: string, path: string): string => {
  const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!baseUrl) {
    throw new StorageError(
      'MISSING_CONFIG',
      'NEXT_PUBLIC_SUPABASE_URL environment variable is not set'
    );
  }
  return `${baseUrl}/storage/v1/object/public/${bucket}/${path}`;
};

export const uploadImageServer = async ({
  file,
  bucket,
  folder,
}: UploadOptions): Promise<UploadResult> => {
  try {
    if (!folder) {
      throw new StorageError(
        'INVALID_FOLDER',
        'Folder (user ID) is required for upload'
      );
    }

    validateFile(file);

    const path = generateFilePath(folder, file.name);
    const supabase = await createClient();

    logger.info('Starting file upload', {
      bucket,
      path,
      fileSize: file.size,
      fileType: file.type,
      userId: folder,
    });

    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(path, file, {
        cacheControl: CACHE_CONTROL,
        upsert: false,
      });

    if (error) {
      logger.error('File upload failed', {
        bucket,
        path,
        error: error.message,
        userId: folder,
      });

      throw new StorageError(
        'UPLOAD_FAILED',
        `Failed to upload file: ${error.message}`,
        { supabaseError: error }
      );
    }

    const imageUrl = buildPublicUrl(bucket, data.path);

    logger.info('File upload successful', {
      bucket,
      path: data.path,
      imageUrl,
      userId: folder,
    });

    return { imageUrl, error: null };
  } catch (error) {
    if (error instanceof StorageError) throw error;

    logger.error('Unexpected upload error', {
      bucket,
      folder,
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    throw new StorageError(
      'UNKNOWN_ERROR',
      'An unexpected error occurred during upload',
      { originalError: error }
    );
  }
};

export const deleteImageServer = async (
  imageUrl: string
): Promise<DeleteResult> => {
  try {
    const urlParts = imageUrl.split('/storage/v1/object/public/');

    if (urlParts.length !== 2) {
      throw new StorageError('INVALID_URL', 'Invalid image URL format');
    }

    const bucketAndPath = urlParts[1];
    const firstSlashIndex = bucketAndPath.indexOf('/');

    if (firstSlashIndex === -1) {
      throw new StorageError(
        'INVALID_URL',
        'Could not extract bucket and path from URL'
      );
    }

    const bucket = bucketAndPath.slice(0, firstSlashIndex);
    const path = bucketAndPath.slice(firstSlashIndex + 1);

    const supabase = await createClient();

    logger.info('Starting file deletion', { bucket, path, imageUrl });

    const { data, error } = await supabase.storage.from(bucket).remove([path]);

    if (error) {
      logger.error('File deletion failed', {
        bucket,
        path,
        error: error.message,
      });

      throw new StorageError(
        'DELETE_FAILED',
        `Failed to delete file: ${error.message}`,
        { supabaseError: error }
      );
    }

    // Clear logo_url from profiles table if it matches the deleted image
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ logo_url: null })
      .eq('logo_url', imageUrl);

    if (updateError) {
      logger.warn('Failed to clear logo_url from profiles', {
        imageUrl,
        error: updateError.message,
      });
      // Don't throw here since file deletion succeeded
    } else {
      logger.info('Cleared logo_url from profiles table', { imageUrl });
    }

    logger.info('File deletion successful', {
      bucket,
      path,
      deletedFiles: data?.length || 0,
    });

    return { success: true, error: null };
  } catch (error) {
    if (error instanceof StorageError) throw error;

    logger.error('Unexpected deletion error', {
      imageUrl,
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    throw new StorageError(
      'UNKNOWN_ERROR',
      'An unexpected error occurred during deletion',
      { originalError: error }
    );
  }
};
