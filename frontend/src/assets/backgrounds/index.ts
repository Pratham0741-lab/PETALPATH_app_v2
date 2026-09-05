import { ImageSourcePropType } from 'react-native';

/**
 * Full‑screen background wallpapers, keyed by screen. Passed to
 * `AppShell backgroundImage`, which stretches each scene to fill the screen —
 * nothing is cropped off any edge.
 *
 * The full 941×1672 artwork, re-encoded from PNG to JPEG (`scripts/
 * compress-backgrounds.mjs`). No crop or resize: identical pixels, a tenth of
 * the bytes. The PNGs were ~1.5MB each and Android decoded one on every screen
 * mount, which is what made switching tabs feel slow.
 */
export const SCREEN_BACKGROUNDS: Record<string, ImageSourcePropType | undefined> = {
  home: require('./bg_home.jpg') as ImageSourcePropType,
  explore: require('./bg_explore.jpg') as ImageSourcePropType,
  camera: require('./bg_camera.jpg') as ImageSourcePropType,
  mentors: require('./bg_mentors.jpg') as ImageSourcePropType,
  rewards: require('./bg_rewards.jpg') as ImageSourcePropType,
  profile: require('./bg_profile.jpg') as ImageSourcePropType,
  // Activity scenes
  watch: require('./bg_watch.jpg') as ImageSourcePropType,
  listen: require('./bg_listen.jpg') as ImageSourcePropType,
  speak: require('./bg_speak.jpg') as ImageSourcePropType,
  trace: require('./bg_trace.jpg') as ImageSourcePropType,
  match: require('./bg_match.jpg') as ImageSourcePropType,
  // Lesson flow
  lesson: require('./bg_lesson.jpg') as ImageSourcePropType,
  celebrate: require('./bg_celebrate.jpg') as ImageSourcePropType,
  // Entry flow (before a child is chosen)
  welcome: require('./bg_welcome.jpg') as ImageSourcePropType,
  login: require('./bg_login.jpg') as ImageSourcePropType,
  childSelect: require('./bg_child_select.jpg') as ImageSourcePropType,
};
