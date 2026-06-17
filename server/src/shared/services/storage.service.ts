import { env } from '../../config/env.js';
import { logger } from '../../utils/logger.js';

export class StorageService {
  private cdnBaseUrl: string;

  constructor() {
    this.cdnBaseUrl = (env.CDN_BASE_URL || 'https://dy3um9dzarz6y.cloudfront.net').replace(/\/$/, '');
  }

  /**
   * Clean a file key by removing starting slashes or legacy 'storage/' prefixes.
   */
  private cleanKey(key: string | null | undefined): string | null {
    if (!key) {
      return null;
    }

    let cleaned = key.trim();

    // Check if the key indicates a missing file / placeholder
    if (
      cleaned === '' ||
      cleaned.toLowerCase() === 'coming_soon' ||
      cleaned.toLowerCase() === 'coming-soon'
    ) {
      return null;
    }

    // Strip legacy 'storage/' prefix if present
    if (cleaned.startsWith('storage/')) {
      cleaned = cleaned.substring('storage/'.length);
    } else if (cleaned.startsWith('/storage/')) {
      cleaned = cleaned.substring('/storage/'.length);
    }

    // Strip leading slashes
    cleaned = cleaned.replace(/^\/+/, '');

    return cleaned;
  }

  /**
   * Generate a public CloudFront URL for a given storage key.
   */
  getPublicUrl(key: string | null | undefined): string | null {
    const cleaned = this.cleanKey(key);
    if (!cleaned) {
      if (key && key.toLowerCase() !== 'coming_soon' && key.toLowerCase() !== 'coming-soon') {
        logger.warn(`StorageService: Attempted to resolve url for invalid key: "${key}"`);
      }
      return null;
    }
    return `${this.cdnBaseUrl}/${cleaned}`;
  }

  /**
   * Generate a video URL. Prepend videos/ if not already present.
   */
  getVideoUrl(key: string | null | undefined): string | null {
    let cleaned = this.cleanKey(key);
    if (!cleaned) {
      return null;
    }
    if (!cleaned.startsWith('videos/')) {
      cleaned = `videos/${cleaned}`;
    }
    return `${this.cdnBaseUrl}/${cleaned}`;
  }

  /**
   * Generate an audio URL. Prepend audio/ if not already present.
   */
  getAudioUrl(key: string | null | undefined): string | null {
    let cleaned = this.cleanKey(key);
    if (!cleaned) {
      return null;
    }
    if (!cleaned.startsWith('audio/')) {
      cleaned = `audio/${cleaned}`;
    }
    return `${this.cdnBaseUrl}/${cleaned}`;
  }
}

export const storageService = new StorageService();
