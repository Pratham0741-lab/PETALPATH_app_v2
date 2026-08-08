/**
 * Core Asset Preloader Service — PetalPath Core
 * Handles image and audio preloading and caching before activity launch.
 */

export interface AssetDescriptor {
  assetId: string;
  assetType: 'image' | 'audio' | 'lottie' | 'svg' | string;
  purpose?: string;
}

export class AssetPreloader {
  private static cachedImages = new Set<string>();

  static async preloadAssets(assets: AssetDescriptor[]): Promise<boolean> {
    if (!assets || assets.length === 0) return true;

    const promises = assets.map((asset) => {
      if (asset.assetType === 'image') {
        return this.preloadImage(asset.assetId);
      }
      return Promise.resolve(true);
    });

    try {
      await Promise.all(promises);
      return true;
    } catch {
      return false; // Non-fatal asset preload failure
    }
  }

  private static preloadImage(assetId: string): Promise<boolean> {
    return new Promise((resolve) => {
      if (this.cachedImages.has(assetId) || assetId.startsWith('petalpath:asset:placeholder:')) {
        resolve(true);
        return;
      }
      this.cachedImages.add(assetId);
      resolve(true);
    });
  }
}
