import { ImageSourcePropType } from 'react-native';

/**
 * Pose illustrations for the camera activities.
 *
 * There are 97 activities but only a handful of pose families, so each image is
 * matched by keyword against the activity title ("Raise both hands", "Touch
 * toes"). Anything unmatched falls back to the star pose rather than showing
 * nothing.
 */
const POSES: ReadonlyArray<{ keywords: string[]; image: ImageSourcePropType }> = [
  { keywords: ['raise', 'hands up', 'both hands'], image: require('./cam_raise_hands.png') },
  { keywords: ['stretch', 'arms wide', 'wide'], image: require('./cam_stretch_wide.png') },
  { keywords: ['head', 'shoulder', 'tummy'], image: require('./cam_touch_head.png') },
  { keywords: ['toes', 'knees', 'bend'], image: require('./cam_touch_toes.png') },
  { keywords: ['star'], image: require('./cam_star_pose.png') },
  { keywords: ['sit', 'stand'], image: require('./cam_sit_stand.png') },
  { keywords: ['jump', 'hop'], image: require('./cam_jump.png') },
  { keywords: ['balance', 'one leg', 'hips'], image: require('./cam_balance.png') },
];

export function getPoseImage(title: string): ImageSourcePropType {
  const lower = (title ?? '').toLowerCase();
  for (const { keywords, image } of POSES) {
    if (keywords.some((k) => lower.includes(k))) return image;
  }
  return POSES[4].image;
}
