import React from 'react';
import { Image, ImageSourcePropType, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { illustrationSizes } from '../../theme';

/**
 * Illustration — the seam between the app and its character artwork.
 *
 * The reference design's personality lives in about ten painted characters: an
 * elephant reading, a boombox, a parrot on a branch, a bee, a panda in a garden,
 * a star with a face on the completion screen. Those are raster illustrations;
 * the app's own `AvatarGlyph` and `SceneBand` are flat SVG built from the
 * palette, and no amount of SVG reaches that look. So rather than fake it, this
 * component makes the artwork a drop-in.
 *
 * How it behaves before any art exists: `ILLUSTRATIONS` is empty, every lookup
 * misses, and each call site renders its `fallback` — which is whatever it
 * already showed. Nothing changes visually and nothing is broken. The day a file
 * lands in `assets/illustrations` and its line in `ILLUSTRATIONS` is uncommented,
 * every screen using that slot switches over at once.
 *
 * ## Why the registry is a hand-maintained map of literal requires
 *
 * Metro resolves `require()` at bundle time from a static string, so
 * `require(`../../assets/illustrations/${name}.png`)` does not work — the path
 * cannot be built from a variable. Worse, a `require()` of a file that does not
 * exist is a *bundler* error, not a runtime one: it fails the whole app, not one
 * screen. That is why the entries below are commented out rather than written
 * ahead of the files. Uncomment a line only once its file is on disk.
 *
 * See `src/assets/illustrations/README.md` for the manifest — what each slot
 * depicts, its aspect ratio, and the export sizes needed.
 */

export type IllustrationName =
  /** Watch & Learn — the reference's elephant reading a book. */
  | 'watch'
  /** Listen & Choose — the reference's boombox. */
  | 'listen'
  /** Speak & Learn — the reference's parrot on a branch. */
  | 'speak'
  /** Match & Learn — the reference's bee. */
  | 'match'
  /** Trace & Draw — the reference's letter character holding a pencil. */
  | 'trace'
  /** Completion screens — the star character with a face. */
  | 'celebrate'
  /** Mentors — the panda in its garden. */
  | 'mentor'
  /** Camera activities — the garden and tree behind "Water the Tree". */
  | 'camera'
  /** First run and profile setup — the cherry-blossom branch. */
  | 'welcome'
  /** Empty states — a gentle "nothing here yet" character. */
  | 'empty';

/**
 * Width ÷ height for each slot, so a caller only ever passes one dimension and
 * cannot squash the art by guessing the other. Characters are square; the two
 * scene slots are landscape banners.
 */
const ASPECT: Record<IllustrationName, number> = {
  watch: 1,
  listen: 1,
  speak: 1,
  match: 1,
  trace: 1,
  celebrate: 1,
  mentor: 1,
  camera: 16 / 9,
  welcome: 16 / 9,
  empty: 1,
};

/**
 * The asset registry. Empty until real artwork exists — see the file header for
 * why these are commented out rather than pre-written.
 *
 * Metro picks up `@2x` and `@3x` siblings automatically, so only the base name is
 * ever referenced here.
 */
export const ILLUSTRATIONS: Partial<Record<IllustrationName, ImageSourcePropType>> = {
  watch: require('../../assets/illustrations/watch.png'),
  listen: require('../../assets/illustrations/listen.png'),
  speak: require('../../assets/illustrations/speak.png'),
  match: require('../../assets/illustrations/match.png'),
  trace: require('../../assets/illustrations/trace.png'),
  celebrate: require('../../assets/illustrations/celebrate.png'),
  mentor: require('../../assets/illustrations/mentor.png'),
  camera: require('../../assets/illustrations/camera.png'),
  welcome: require('../../assets/illustrations/welcome.png'),
  empty: require('../../assets/illustrations/empty.png'),
};

/** True when `name` has artwork bundled, so a caller can branch on it. */
export const hasIllustration = (name: IllustrationName): boolean =>
  ILLUSTRATIONS[name] !== undefined;

export type IllustrationSize = keyof typeof illustrationSizes;

export interface IllustrationProps {
  name: IllustrationName;
  /** Width token — sm 120, md 160, lg 200, xl 280. Height follows the aspect. */
  size?: IllustrationSize | number;
  /**
   * Rendered when this slot has no artwork bundled. Pass whatever the screen
   * shows today — an `IconWell`, an `AvatarGlyph`, a scene — so the screen is
   * complete before the art arrives and improves when it lands.
   */
  fallback?: React.ReactNode;
  /**
   * Spoken description. Required in spirit: an illustration that carries meaning
   * needs one, and a purely decorative one should pass `decorative` instead.
   */
  accessibilityLabel?: string;
  /** Hides the image from the screen reader — for art that repeats nearby text. */
  decorative?: boolean;
  style?: StyleProp<ViewStyle>;
}

export const Illustration: React.FC<IllustrationProps> = ({
  name,
  size = 'md',
  fallback = null,
  accessibilityLabel,
  decorative = false,
  style,
}) => {
  const source = ILLUSTRATIONS[name];
  const width = typeof size === 'number' ? size : illustrationSizes[size];
  const height = Math.round(width / ASPECT[name]);

  if (!source) {
    return <>{fallback}</>;
  }

  return (
    <View style={[styles.wrap, { width, height }, style]}>
      <Image
        source={source}
        /* `contain`, never `cover`: these are characters on transparent
           backgrounds, and cropping one costs it its head. */
        resizeMode="contain"
        style={styles.image}
        accessible={!decorative && !!accessibilityLabel}
        accessibilityLabel={decorative ? undefined : accessibilityLabel}
        accessibilityRole={decorative ? 'none' : 'image'}
        importantForAccessibility={decorative ? 'no-hide-descendants' : 'yes'}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
    /* An illustration is a fixed box; it must not be stretched by a flex parent
       or shrunk by a long label beside it. */
    flexShrink: 0,
    flexGrow: 0,
  },
  image: {
    width: '100%',
    height: '100%',
  },
});

export default Illustration;
