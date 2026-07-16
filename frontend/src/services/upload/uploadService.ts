import { IS_DEV } from '../../config/api';
import { apiClient } from '../api/apiClient';
import { ApiError } from '../../api/errors';
import type { ApiResponse } from '../../types/api';
import type { ExtendedRequestConfig } from '../api/requestConfig';

const logger = IS_DEV
  ? {
      info: (...args: unknown[]) => { console.info('[UploadService]', ...args); },
      warn: (...args: unknown[]) => { console.warn('[UploadService]', ...args); },
      error: (...args: unknown[]) => { console.error('[UploadService]', ...args); },
    }
  : {
      info: () => {},
      warn: () => {},
      error: () => {},
    };

export interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

export interface UploadOptions {
  file: { uri: string; name: string; type: string };
  path: string;
  onProgress?: (progress: UploadProgress) => void;
  onCancel?: () => void;
  extraFields?: Record<string, string>;
  maxRetries?: number;
}

export interface UploadResult {
  url: string;
  fileName: string;
  mimeType: string;
  size: number;
}

const ALLOWED_IMAGE_MIME_TYPES: ReadonlySet<string> = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
]);

const ALLOWED_AUDIO_MIME_TYPES: ReadonlySet<string> = new Set([
  'audio/mpeg',
  'audio/mp4',
  'audio/wav',
  'audio/aac',
  'audio/ogg',
  'audio/x-m4a',
]);

const DEFAULT_MAX_RETRIES = 3;

interface UploadState {
  controller: AbortController;
}

const activeUploads = new Map<string, UploadState>();

function validateMimeType(mimeType: string, allowedTypes: ReadonlySet<string>): void {
  if (!allowedTypes.has(mimeType)) {
    throw new ApiError(
      400,
      `Unsupported file type: ${mimeType}`,
      'This file type is not supported. Please try a different file.',
    );
  }
}

async function uploadFile(options: UploadOptions): Promise<UploadResult> {
  const maxRetries = options.maxRetries ?? DEFAULT_MAX_RETRIES;
  const controller = new AbortController();
  const state: UploadState = { controller };

  activeUploads.set(options.path, state);

  const formData = new FormData();

  formData.append('file', options.file as unknown as Blob);

  if (options.extraFields) {
    for (const [key, value] of Object.entries(options.extraFields)) {
      formData.append(key, value);
    }
  }

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      if (controller.signal.aborted) {
        throw new ApiError(0, 'Upload cancelled', 'Upload was cancelled.');
      }

      const config: ExtendedRequestConfig = {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        timeout: 120_000,
        signal: controller.signal,
        onUploadProgress: (progressEvent: { loaded: number; total?: number }) => {
          if (options.onProgress && progressEvent.total) {
            options.onProgress({
              loaded: progressEvent.loaded,
              total: progressEvent.total,
              percentage: Math.round((progressEvent.loaded * 100) / progressEvent.total),
            });
          }
        },
      };

      const response = await apiClient.post<ApiResponse<UploadResult>>(
        options.path,
        formData,
        config,
      );

      if (!response.success || !response.data) {
        throw new ApiError(
          500,
          response.message ?? 'Upload failed',
          'Upload failed. Please try again.',
        );
      }

      logger.info('Upload successful:', response.data.fileName);
      return response.data;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (error instanceof ApiError && error.statusCode >= 400 && error.statusCode < 500) {
        break;
      }

      if (controller.signal.aborted) {
        logger.info('Upload cancelled');
        if (options.onCancel) {
          options.onCancel();
        }
        throw new ApiError(0, 'Upload cancelled', 'Upload was cancelled.');
      }

      if (attempt < maxRetries) {
        const delayMs = Math.min(1000 * Math.pow(2, attempt), 10_000);
        logger.warn(`Upload attempt ${attempt + 1} failed, retrying in ${delayMs}ms:`, lastError.message);
        await delay(delayMs);
      }
    }
  }

  throw lastError ?? new ApiError(0, 'Upload failed', 'Upload failed after multiple attempts.');
}

async function uploadImage(options: UploadOptions): Promise<UploadResult> {
  validateMimeType(options.file.type, ALLOWED_IMAGE_MIME_TYPES);

  const result = await uploadFile(options);
  return result;
}

async function uploadAudio(options: UploadOptions): Promise<UploadResult> {
  validateMimeType(options.file.type, ALLOWED_AUDIO_MIME_TYPES);

  const result = await uploadFile(options);
  return result;
}

function cancelUpload(path: string): void {
  const state = activeUploads.get(path);
  if (state) {
    state.controller.abort();
    activeUploads.delete(path);
    logger.info('Upload cancelled for path:', path);
  }
}

export const uploadService = {
  uploadFile,
  uploadImage,
  uploadAudio,
  cancelUpload,
};

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
