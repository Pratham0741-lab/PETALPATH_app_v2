import { ImageSourcePropType } from 'react-native';

/** Collectible stickers, keyed by the name the backend sends. */
export const STICKER_IMAGES: Record<string, ImageSourcePropType> = {
  star: require('./sticker_star.png') as ImageSourcePropType,
  rainbow: require('./sticker_rainbow.png') as ImageSourcePropType,
  heart: require('./sticker_heart.png') as ImageSourcePropType,
  trophy: require('./sticker_trophy.png') as ImageSourcePropType,
  crown: require('./sticker_crown.png') as ImageSourcePropType,
  rocket: require('./sticker_rocket.png') as ImageSourcePropType,
  flower: require('./sticker_flower.png') as ImageSourcePropType,
  butterfly: require('./sticker_butterfly.png') as ImageSourcePropType,
};

export const REWARD_IMAGES = {
  chest: require('./reward_chest.png') as ImageSourcePropType,
  empty: require('./reward_empty.png') as ImageSourcePropType,
};

/**
 * Best-effort match of a sticker/badge name to artwork. Names arrive from the
 * backend as free text ("Gold Star", "Rainbow Reader"), so this matches on a
 * keyword rather than requiring an exact key, and falls back to the star.
 */
export function getStickerImage(name: string): ImageSourcePropType {
  const lower = (name ?? '').toLowerCase();
  for (const key of Object.keys(STICKER_IMAGES)) {
    if (lower.includes(key)) return STICKER_IMAGES[key];
  }
  return STICKER_IMAGES.star;
}
