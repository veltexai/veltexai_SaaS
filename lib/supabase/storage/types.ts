export class StorageError extends Error {
  constructor(
    public code: string,
    message: string,
    public metadata?: Record<string, any>
  ) {
    super(message);
    this.name = 'StorageError';
  }
}

export interface UploadOptions {
  file: File;
  bucket: string;
  folder: string;
  compressionOptions?: {
    maxSizeMB?: number;
    maxWidthOrHeight?: number;
    useWebWorker?: boolean;
    fileType?: string;
  };
  onProgress?: (progress: number, message: string) => void;
}

export interface UploadResult {
  imageUrl: string;
  error: string | null;
}

export interface DeleteResult {
  success: boolean;
  error: string | null;
}
