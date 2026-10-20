import { create } from 'zustand';
import type { ImageSourcePropType } from 'react-native';

/**
 * The wallpaper the focused screen is showing, published by `AppShell` on
 * tablets so the sidebar can draw the same scene behind its frosted tint.
 *
 * The sidebar sits beside the screen, and the screen container clips anything
 * drawn outside it, so the scene cannot simply run on underneath. Instead the
 * sidebar paints its own copy with identical geometry — both sized to the full
 * window — and the two meet without a seam.
 */
export interface Wallpaper {
  source?: ImageSourcePropType;
  opacity: number;
  blur: number;
  scrim: number;
  backgroundColor: string;
}

interface WallpaperState {
  wallpaper: Wallpaper | null;
  setWallpaper: (w: Wallpaper) => void;
}

export const useWallpaperStore = create<WallpaperState>((set, get) => ({
  wallpaper: null,
  setWallpaper: (w) => {
    const cur = get().wallpaper;
    if (
      cur &&
      cur.source === w.source &&
      cur.opacity === w.opacity &&
      cur.blur === w.blur &&
      cur.scrim === w.scrim &&
      cur.backgroundColor === w.backgroundColor
    ) {
      return;
    }
    set({ wallpaper: w });
  },
}));
