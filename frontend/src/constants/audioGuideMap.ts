/**
 * Audio Guide Map — maps mentor characterTypes to audio folder names
 * and defines guide keys to file name patterns.
 *
 * Audio files are served from CloudFront CDN or the configured STORAGE_URL.
 */



// ---------- Mentor → Folder mapping ----------

const MENTOR_FOLDER_MAP: Record<string, string> = {
  panda: 'Penny',
  rabbit: 'Barnaby',
  cat: 'cleo',
  fox: 'finn',
  tiger: 'toby',
};

// ---------- Mentor → filename prefix ----------
// Some folders use different prefix patterns for their files
const MENTOR_PREFIX_MAP: Record<string, string> = {
  panda: 'penny',
  rabbit: 'barnaby',
  cat: 'cleo',
  fox: 'finn',
  tiger: 'toby',
};

// ---------- Guide Keys ----------

export type GuideKey =
  | 'welcome'
  | 'roadmap'
  | 'video'
  | 'listen'
  | 'speak'
  | 'write'
  | 'reward'
  | 'lesson_complete'
  | 'great_job'
  | 'try_again';

/**
 * Returns the filename for a given guide key and mentor prefix.
 * Files that don't exist yet return null (user will add them later).
 */
const getGuideFilename = (prefix: string, guideKey: GuideKey): string | null => {
  switch (guideKey) {
    case 'welcome':
      return `${prefix}_welcome_general_en.mp3`;
    case 'roadmap':
      return `${prefix}_roadmap_en.mp3`;
    case 'video':
      return `mentor_${prefix}_step_video_en.mp3`;
    case 'listen':
      return `mentor_${prefix}_step_learn_en.mp3`;
    case 'speak':
      return `mentor_${prefix}_step_speech_en.mp3`;
    case 'write':
      return `mentor_${prefix}_step_writing_en.mp3`;
    case 'reward':
    case 'lesson_complete':
      return `mentor_${prefix}_step_reward_en.mp3`;
    case 'great_job':
      // Placeholder — user will add dedicated file later
      return null;
    case 'try_again':
      // Placeholder — user will add dedicated file later
      return null;
    default:
      return null;
  }
};

// ---------- Base URL ----------

import { STORAGE_URL } from '../config/api';

const CDN_URL = process.env.EXPO_PUBLIC_CDN_BASE_URL;
const AUDIO_BASE_URL = CDN_URL
  ? `${CDN_URL.replace(/\/$/, '')}/audio`
  : `${STORAGE_URL}/audio`;

// ---------- Public API ----------

/**
 * Get the folder name for a mentor characterType
 */
export const getMentorFolder = (characterType: string): string => {
  return MENTOR_FOLDER_MAP[characterType] || 'Penny';
};

/**
 * Get the full audio URL for a guide key + mentor characterType.
 * Returns null if the audio file doesn't exist yet.
 */
export const getGuideUrl = (characterType: string, guideKey: GuideKey): string | null => {
  const folder = getMentorFolder(characterType);
  const prefix = MENTOR_PREFIX_MAP[characterType] || 'penny';
  const filename = getGuideFilename(prefix, guideKey);
  if (!filename) return null;
  return `${AUDIO_BASE_URL}/mentor_audio/${folder}/${filename}`;
};

/**
 * All supported guide keys for validation/iteration.
 */
export const ALL_GUIDE_KEYS: GuideKey[] = [
  'welcome',
  'roadmap',
  'video',
  'listen',
  'speak',
  'write',
  'reward',
  'lesson_complete',
  'great_job',
  'try_again',
];

/**
 * Human-friendly labels for each guide key (for logging/debug).
 */
export const GUIDE_LABELS: Record<GuideKey, string> = {
  welcome: 'Welcome',
  roadmap: 'Roadmap',
  video: 'Watch Carefully',
  listen: 'Listen Carefully',
  speak: 'Say It Loud',
  write: 'Trace Slowly',
  reward: 'Reward',
  lesson_complete: 'Lesson Complete',
  great_job: 'Great Job',
  try_again: 'Try Again',
};
