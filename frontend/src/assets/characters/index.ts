import { ImageSourcePropType } from 'react-native';
import type { AvatarSpecies } from '../../components/design/AvatarGlyph';

/**
 * Real character artwork registry (uploaded PNGs). `AvatarGlyph` renders the
 * avatar bust for a species when one exists here, falling back to its drawn SVG
 * face otherwise. Full‑body mentor portraits are used by the mentor screens.
 *
 * `require()` needs a literal path and the file to exist, so these are written
 * out explicitly — every referenced file is present on disk.
 */
export const AVATAR_IMAGES: Partial<Record<AvatarSpecies, ImageSourcePropType>> = {
  panda: require('./avatar_panda.png'),
  bunny: require('./avatar_bunny.png'),
  cat: require('./avatar_cat.png'),
  fox: require('./avatar_fox.png'),
  tiger: require('./avatar_tiger.png'),
  bear: require('./avatar_bear.png'),
  flower: require('./avatar_flower.png'),
};

/** Full‑body standing mentors (Penny Panda, Barnaby Bunny, …). */
export const MENTOR_IMAGES: Partial<Record<AvatarSpecies, ImageSourcePropType>> = {
  panda: require('./mentor_panda.png'),
  bunny: require('./mentor_bunny.png'),
  cat: require('./mentor_cat.png'),
  fox: require('./mentor_fox.png'),
  tiger: require('./mentor_tiger.png'),
};
