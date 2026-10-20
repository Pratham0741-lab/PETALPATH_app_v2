/**
 * The one place that decides the S3 key of a lesson's video and audio.
 *
 * Bucket layout (petalpath-assets-prod), case-sensitive:
 *   videos/<GRADE>/<file>      audio/<GRADE>/<file>
 *   GRADE = PRE_NURSERY | NURSERY | LKG | UKG
 * Only NURSERY keeps subfolders (alphabet, numbers, shapes, …); every other
 * grade is flat. File names never change.
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
 * Old key → new key for a lesson in `grade`.
 *
 *   prenursery/videos/<f>          → videos/PRE_NURSERY/<f>   (likewise lkg, ukg, nursery; audio too)
 *   videos/<sub>/<f>, Pre-Nursery  → videos/PRE_NURSERY/<f>   (subfolder dropped)
 *   videos/<sub>/<f>, Nursery      → videos/NURSERY/<sub>/<f> (subfolder kept)
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
    return grade === 'nursery' ? `${root}/${folder}/${parts[1]}/${file}` : `${root}/${folder}/${file}`;
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
export const PENDING_MEDIA: ReadonlySet<string> = new Set(
  'abcdefghijklmnopqrstuvwxyz'.split('').map((l) => nurseryCapitalListenAudio(`n_cap_${l}`)!),
);

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
