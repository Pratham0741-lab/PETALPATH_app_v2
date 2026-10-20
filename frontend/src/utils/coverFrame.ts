import { Image, ImageSourcePropType, ImageStyle } from 'react-native';

/**
 * Where a wallpaper crop sits vertically: 0 keeps the top of the scene, 1 the
 * bottom. 0.7 keeps the garden in view with a band of sky above it — the scenes
 * keep the part that makes them read as a place in their lower half, and a
 * centred crop of a landscape window lands on empty sky.
 */
export const WALLPAPER_ANCHOR_Y = 0.7;

/**
 * Absolute frame that makes `source` cover a `width`×`height` box without
 * distortion — scaled uniformly until the box is filled, the overflow cropped
 * by the parent (give it `overflow: 'hidden'`).
 *
 * The wallpapers are painted 9:16. Drawing them with `resizeMode="stretch"`
 * showed the whole picture by distorting it to the window: a mild elongation on
 * a phone, but on a landscape tablet the scene was squashed to about a third of
 * its height. Exact pixel sizes rather than `absoluteFill`/percentages, which
 * resolve against whatever the parent measures.
 */
export function coverFrame(
  source: ImageSourcePropType | undefined,
  width: number,
  height: number,
  anchorY: number = WALLPAPER_ANCHOR_Y,
): ImageStyle {
  const intrinsic = source ? Image.resolveAssetSource(source) : null;
  const iw = intrinsic?.width || width;
  const ih = intrinsic?.height || height;
  const scale = Math.max(width / iw, height / ih);
  const drawW = iw * scale;
  const drawH = ih * scale;
  return {
    position: 'absolute',
    left: (width - drawW) / 2,
    top: (height - drawH) * anchorY,
    width: drawW,
    height: drawH,
  };
}
