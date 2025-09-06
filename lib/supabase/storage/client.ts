import imageCompression from 'browser-image-compression';
import { uploadImageServer } from './server';
import { StorageError, type UploadOptions, type UploadResult } from './types';

type CompressionOptions = {
  maxSizeMB?: number;
  maxWidthOrHeight?: number;
  useWebWorker?: boolean;
  fileType?: string;
};

const DEFAULT_COMPRESSION_OPTIONS: CompressionOptions = {
  maxSizeMB: 1,
  maxWidthOrHeight: 1920,
  useWebWorker: true,
  fileType: 'image/webp',
};

const MAX_RETRIES = 3;
const RETRY_DELAY = 1000;

const compressImage = async (
  file: File,
  options: CompressionOptions = DEFAULT_COMPRESSION_OPTIONS
): Promise<File> => {
  try {
    return await imageCompression(file, options);
  } catch (error) {
    throw new StorageError('COMPRESSION_FAILED', 'Failed to compress image', {
      originalError: error,
    });
  }
};

const delay = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

const uploadWithRetry = async (
  uploadFn: () => Promise<UploadResult>,
  retries = MAX_RETRIES
): Promise<UploadResult> => {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await uploadFn();
    } catch (error) {
      if (attempt === retries) throw error;

      console.warn(`Upload attempt ${attempt} failed, retrying...`, error);
      await delay(RETRY_DELAY * attempt);
    }
  }

  throw new StorageError('UPLOAD_FAILED', 'All retry attempts failed');
};

export const uploadImage = async ({
  file,
  bucket,
  folder,
  compressionOptions,
  onProgress,
}: UploadOptions): Promise<UploadResult> => {
  if (!folder) {
    throw new StorageError(
      'INVALID_FOLDER',
      'Folder (user ID) is required for upload'
    );
  }

  try {
    onProgress?.(0, 'Compressing image...');

    const compressedFile = await compressImage(file, compressionOptions);
    onProgress?.(30, 'Uploading to server...');

    const result = await uploadWithRetry(async () => {
      const { imageUrl, error } = await uploadImageServer({
        file: compressedFile,
        bucket,
        folder,
      });

      if (error) {
        throw new StorageError('UPLOAD_FAILED', error);
      }

      return { imageUrl, error: null };
    });

    onProgress?.(100, 'Upload complete!');
    return result;
  } catch (error) {
    if (error instanceof StorageError) throw error;

    throw new StorageError(
      'UNKNOWN_ERROR',
      'An unexpected error occurred during upload',
      { originalError: error }
    );
  }
};
