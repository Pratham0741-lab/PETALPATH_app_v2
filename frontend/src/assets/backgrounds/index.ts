import { ImageSourcePropType } from 'react-native';

/**
 * Full‑screen background wallpapers, keyed by screen. Passed to
 * `AppShell backgroundImage`, which scales each scene to cover the screen
 * without distortion (`utils/coverFrame`). On a landscape tablet the 16:9
 * painting from `TABLET_SCREEN_BACKGROUNDS` is drawn instead (`backgroundFor`).
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

/**
 * Landscape-tablet versions of the same scenes, painted 16:9 (1672×941) so a
 * wide screen shows the whole composition instead of a crop of the tall phone
 * art. Same keys, same treatment: re-encoded from PNG to JPEG at quality 86
 * with no crop or resize, and blurred, dimmed and scrimmed at runtime by
 * `AppShell` exactly like the phone scenes.
 */
export const TABLET_SCREEN_BACKGROUNDS: Record<string, ImageSourcePropType> = {
  home: require('./bg_home_tablet.jpg') as ImageSourcePropType,
  explore: require('./bg_explore_tablet.jpg') as ImageSourcePropType,
  camera: require('./bg_camera_tablet.jpg') as ImageSourcePropType,
  mentors: require('./bg_mentors_tablet.jpg') as ImageSourcePropType,
  rewards: require('./bg_rewards_tablet.jpg') as ImageSourcePropType,
  profile: require('./bg_profile_tablet.jpg') as ImageSourcePropType,
  watch: require('./bg_watch_tablet.jpg') as ImageSourcePropType,
  listen: require('./bg_listen_tablet.jpg') as ImageSourcePropType,
  speak: require('./bg_speak_tablet.jpg') as ImageSourcePropType,
  trace: require('./bg_trace_tablet.jpg') as ImageSourcePropType,
  match: require('./bg_match_tablet.jpg') as ImageSourcePropType,
  lesson: require('./bg_lesson_tablet.jpg') as ImageSourcePropType,
  celebrate: require('./bg_celebrate_tablet.jpg') as ImageSourcePropType,
  welcome: require('./bg_welcome_tablet.jpg') as ImageSourcePropType,
  login: require('./bg_login_tablet.jpg') as ImageSourcePropType,
  childSelect: require('./bg_child_select_tablet.jpg') as ImageSourcePropType,
};

/** Phone scene → its tablet painting, looked up by the source itself. */
const TABLET_BY_SOURCE = new Map<ImageSourcePropType, ImageSourcePropType>(
  Object.entries(SCREEN_BACKGROUNDS)
    .filter(([key, src]) => !!src && !!TABLET_SCREEN_BACKGROUNDS[key])
    .map(([key, src]) => [src as ImageSourcePropType, TABLET_SCREEN_BACKGROUNDS[key]]),
);

/**
 * The wallpaper to draw: the 16:9 painting on a landscape tablet, the phone
 * scene everywhere else. Portrait tablets keep the tall phone art — it is the
 * closer shape, and a 16:9 scene on an 800×1280 screen would be cropped to a
 * narrow vertical strip. Phones are unaffected.
 */
export function backgroundFor(
  source: ImageSourcePropType | undefined,
  isMobile: boolean,
  width: number,
  height: number,
): ImageSourcePropType | undefined {
  if (!source || isMobile || width <= height) return source;
  return TABLET_BY_SOURCE.get(source) ?? source;
}
