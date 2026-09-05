import { ImageSourcePropType } from 'react-native';
import type { BloomStage } from '../../types/garden';

/**
 * The five growth stages a skill passes through, as illustrations.
 *
 * These replaced the drawn SVG flowers. One consequence worth knowing: the SVG
 * accepted a `tint` so each subject's blooms took the subject's colour, and a
 * painted PNG cannot. Subject identity is still carried by the planter bed and
 * the soil strip behind the flowers, which remain subject-coloured.
 */
export const BLOOM_IMAGES: Record<BloomStage, ImageSourcePropType> = {
  seed: require('./bloom_seed.png') as ImageSourcePropType,
  sprout: require('./bloom_sprout.png') as ImageSourcePropType,
  bud: require('./bloom_bud.png') as ImageSourcePropType,
  opening: require('./bloom_opening.png') as ImageSourcePropType,
  bloom: require('./bloom_bloom.png') as ImageSourcePropType,
};
