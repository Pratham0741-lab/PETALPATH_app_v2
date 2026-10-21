/**
 * The one place that decides the S3 key of a lesson's video and audio.
 *
 * Bucket layout (petalpath-assets-prod), case-sensitive, AS IT REALLY IS —
 * verified against CloudFront on 2026-10-21 (scripts/check-media.ts):
 *   videos/<GRADE>/<file>             grade-specific videos
 *   videos/NURSERY/<sub>/<file>       shared clips (alphabet, numbers, shapes,
 *                                     lines_and_curves). Stored ONCE, under
 *                                     NURSERY, and played by Pre-Nursery too.
 *   audio/<sub>/<file>                shared audio has NOT been moved to grade
 *                                     folders; it is still in the old layout.
 * The manifest describes a fuller per-grade reorganisation that was never
 * carried out in the bucket; these rules follow the bucket, not the manifest.
 * File names never change.
 *
 * `video-resolver.ts` / `audio-resolver.ts` still decide *which* file a lesson
 * plays, unchanged, and return it in the old shared layout
 * (`videos/alphabet/alphabet_001_a_apple.mp4`). This module moves that key into
 * the lesson's grade folder. The grade always comes from the lesson's own grade
 * in the curriculum, never from the old path: the same shared clip lives in
 * both PRE_NURSERY and NURSERY.
 *
 * Source of truth for every key here: petalpath_assets_manifest_corrected.xlsx.
 */

export type GradeId = 'prenursery' | 'nursery' | 'lkg' | 'ukg';
export type MediaKind = 'video' | 'audio';

export const GRADE_FOLDER: Record<GradeId, string> = {
  prenursery: 'PRE_NURSERY',
  nursery: 'NURSERY',
  lkg: 'LKG',
  ukg: 'UKG',
};

/** Not a file: the app shows "coming soon". */
export const COMING_SOON = 'coming_soon';

const ROOT: Record<MediaKind, string> = { video: 'videos', audio: 'audio' };

/** Old per-grade prefixes: `prenursery/videos/<f>`, `lkg/audio/<f>`, … */
const OLD_GRADE_PREFIX: Record<string, GradeId> = {
  prenursery: 'prenursery',
  nursery: 'nursery',
  lkg: 'lkg',
  ukg: 'ukg',
};

const NEW_FOLDERS = new Set(Object.values(GRADE_FOLDER));

/**
 * Old key → bucket key for a lesson in `grade`.
 *
 *   prenursery/videos/<f>  → videos/PRE_NURSERY/<f>   (likewise lkg, ukg, nursery; audio too)
 *   videos/<sub>/<f>       → videos/NURSERY/<sub>/<f> (every grade: the shared clip lives there)
 *   audio/<sub>/<f>        → audio/<sub>/<f>          (unchanged: shared audio was never moved)
 *
 * Idempotent: a key already in the new layout is returned unchanged, so the
 * database migration can be re-run safely. Throws on a shape it does not know
 * rather than guessing a path that would 404.
 */
export function toGradedKey(oldKey: string, grade: GradeId, kind: MediaKind): string {
  const key = oldKey.trim().replace(/^\/+/, '');
  if (key === '' || key.toLowerCase() === COMING_SOON) return COMING_SOON;

  const root = ROOT[kind];
  const folder = GRADE_FOLDER[grade];
  const parts = key.split('/');
  const file = parts[parts.length - 1]!;

  // Already new: videos/<GRADE>/…
  if (parts[0] === root && NEW_FOLDERS.has(parts[1] ?? '')) return key;

  // <grade>/<root>/<f>
  if (parts.length === 3 && OLD_GRADE_PREFIX[parts[0]!] && parts[1] === root) {
    return `${root}/${folder}/${file}`;
  }

  // <root>/<sub>/<f> — the old shared folders
  if (parts.length === 3 && parts[0] === root) {
    return kind === 'video' ? `videos/${GRADE_FOLDER.nursery}/${parts[1]}/${file}` : key;
  }

  throw new Error(`media-paths: unrecognised ${kind} key "${oldKey}"`);
}

// ---------------------------------------------------------------------------
// Nursery capital letters: dedicated media, not the shared alphabet clips
// ---------------------------------------------------------------------------

const CAP = /^n_cap_([a-z])$/;

function capIndex(lessonId: string): { n: string; letter: string } | null {
  const m = CAP.exec(lessonId);
  if (!m) return null;
  const letter = m[1]!;
  return { n: String(letter.charCodeAt(0) - 96).padStart(3, '0'), letter };
}

/** `videos/NURSERY/alphabet/english_001_letter_a.mp4` … `_026_letter_z.mp4`. */
export function nurseryCapitalVideo(lessonId: string): string | null {
  const c = capIndex(lessonId);
  return c ? `videos/NURSERY/alphabet/english_${c.n}_letter_${c.letter}.mp4` : null;
}

/** `audio/NURSERY/english_001_letter_a_listen.mp3` … — not recorded yet. */
export function nurseryCapitalListenAudio(lessonId: string): string | null {
  const c = capIndex(lessonId);
  return c ? `audio/NURSERY/english_${c.n}_letter_${c.letter}_listen.mp3` : null;
}

// ---------------------------------------------------------------------------
// Lessons whose media exists in S3 but which the resolvers never mapped
// ---------------------------------------------------------------------------

/**
 * Status "Done" in the manifest, with no rule in the resolvers to reach them:
 * they were uploaded after the resolvers were written. Listed by lesson id
 * with their exact manifest key.
 */
const ADDED_VIDEOS: Record<string, string> = {
  pn_oral_greetings_hello_bye: 'videos/PRE_NURSERY/english_002_hello_bye.mp4',
  pn_head: 'videos/PRE_NURSERY/english_004_head.mp4',
  pn_eyes: 'videos/PRE_NURSERY/english_005_eyes.mp4',
  pn_nose: 'videos/PRE_NURSERY/english_006_nose.mp4',
  pn_ears: 'videos/PRE_NURSERY/english_007_ears.mp4',
  pn_mouth: 'videos/PRE_NURSERY/english_008_mouth.mp4',
  pn_hands: 'videos/PRE_NURSERY/english_009_hands.mp4',
  pn_legs: 'videos/PRE_NURSERY/english_010_legs.mp4',
  pn_feet: 'videos/PRE_NURSERY/english_011_feet.mp4',
  lkg_cap_az_rev: 'videos/LKG/english_001_capital_a_z_revision.mp4',
  lkg_letter_sounds: 'videos/LKG/english_003_letter_sounds_introduction.mp4',
  lkg_wf_at_blend: 'videos/LKG/english_005_short_a_blend_at.mp4',
};

// ---------------------------------------------------------------------------
// Public API — what seeding and the API fallback call
// ---------------------------------------------------------------------------

/**
 * The video key for a lesson. `legacyKey` is what `resolveVideoKey` returned.
 */
export function videoPathFor(lessonId: string, grade: GradeId, legacyKey: string): string {
  return nurseryCapitalVideo(lessonId) ?? ADDED_VIDEOS[lessonId] ?? toGradedKey(legacyKey, grade, 'video');
}

/**
 * The listen-activity audio key for a lesson. `legacyKey` is what
 * `resolveAudioKey` returned. Nursery capitals get their own (unrecorded)
 * narration and never fall back to the shared alphabet audio.
 */
export function audioPathFor(lessonId: string, grade: GradeId, legacyKey: string): string {
  return nurseryCapitalListenAudio(lessonId) ?? toGradedKey(legacyKey, grade, 'audio');
}

/**
 * Keys that are wired but whose file is not in S3 yet (manifest "To make").
 *
 * The database stores the real key, so nothing needs re-seeding when the file
 * lands; until then the API reports these as coming soon, which the app already
 * shows as a friendly "Audio coming soon" card instead of a broken player.
 * Remove a key here the day its file is uploaded.
 */
/**
 * Wired videos whose files are not in the bucket (checked 2026-10-21): the
 * Pre-Nursery letter clips, the body-part clips, and two LKG phonics clips.
 * Listed by the exact key they will have once uploaded.
 */
const MISSING_VIDEOS = [
  ...[
    'a_apple', 'b_ball', 'c_cat', 'd_dog', 'e_egg', 'f_fish', 'g_grapes', 'h_house', 'i_icecream',
    'j_jar', 'k_kite', 'l_lion', 'm_mango', 'n_nest', 'o_owl', 'p_parrot', 'q_queen', 'r_rabbit',
    's_sun', 't_tiger', 'u_umbrella', 'v_van', 'w_watch', 'x_xylophone', 'y_yak', 'z_zebra',
  ].map((w, i) => `videos/NURSERY/alphabet/alphabet_${String(i + 1).padStart(3, '0')}_${w}.mp4`),
  ...['english_004_head', 'english_005_eyes', 'english_006_nose', 'english_007_ears',
    'english_008_mouth', 'english_009_hands', 'english_010_legs', 'english_011_feet',
  ].map((f) => `videos/PRE_NURSERY/${f}.mp4`),
  'videos/LKG/english_003_letter_sounds_introduction.mp4',
  'videos/LKG/english_005_short_a_blend_at.mp4',
];

export const PENDING_MEDIA: ReadonlySet<string> = new Set([
  ...'abcdefghijklmnopqrstuvwxyz'.split('').map((l) => nurseryCapitalListenAudio(`n_cap_${l}`)!),
  ...MISSING_VIDEOS,
]);

export function isPendingMedia(key: string | null | undefined): boolean {
  return !!key && PENDING_MEDIA.has(key.trim().replace(/^\/+/, ''));
}

/** What the API should expose for a stored key: the key, or coming soon. */
export function servedMediaKey(key: string | null | undefined): string | null | undefined {
  return isPendingMedia(key) ? COMING_SOON : key;
}

/** Grade id from the lesson's category title, as stored in the database. */
export const GRADE_BY_CATEGORY_TITLE: Record<string, GradeId> = {
  'Pre-Nursery': 'prenursery',
  Nursery: 'nursery',
  LKG: 'lkg',
  UKG: 'ukg',
};
