/**
 * The one place that builds the S3 key of a lesson's video and audio.
 *
 * Bucket layout (petalpath-assets-prod, ap-south-1), case-sensitive:
 *   videos/<GRADE>/<file>.mp4          audio/<GRADE>/<file>.mp3
 *   GRADE = PRE_NURSERY | NURSERY | LKG | UKG (exactly; uppercase, underscore)
 *   Only NURSERY has subfolders: videos/NURSERY/<alphabet|numbers|shapes|
 *   lines_and_curves>/<file>, audio/NURSERY/<numbers|shapes>/<file>.
 *   PRE_NURSERY, LKG and UKG are always flat.
 *   audio/mentor_audio/<Mentor>/... is not grade-based and never changes.
 *
 * Every key is built by `buildVideoKey` / `buildAudioKey`, which enforce those
 * rules and throw on anything else (a lowercase grade, a subfolder outside
 * NURSERY), so a malformed key fails loudly here instead of 404ing on a phone.
 *
 * `video-resolver.ts` / `audio-resolver.ts` still decide *which* file a lesson
 * plays and return it in the old layout; `toGradedKey` moves it into the new
 * one. File names never change.
 */

export const GRADES = ['PRE_NURSERY', 'NURSERY', 'LKG', 'UKG'] as const;
export type GradeFolder = (typeof GRADES)[number];

const GRADE_SET: ReadonlySet<string> = new Set(GRADES);
const SUBFOLDER = /^[a-z0-9_]+$/;

function buildKey(root: 'videos' | 'audio', ext: '.mp4' | '.mp3', grade: string, file: string, subfolder?: string): string {
  if (!GRADE_SET.has(grade)) {
    throw new Error(`media-paths: grade must be one of ${GRADES.join(', ')} (exact case), got "${grade}"`);
  }
  if (!file || file.includes('/') || !file.endsWith(ext)) {
    throw new Error(`media-paths: "${file}" is not a bare ${ext} file name`);
  }
  if (subfolder !== undefined) {
    if (grade !== 'NURSERY') {
      throw new Error(`media-paths: only NURSERY has subfolders; ${grade} is flat (got subfolder "${subfolder}")`);
    }
    if (!SUBFOLDER.test(subfolder)) throw new Error(`media-paths: invalid subfolder "${subfolder}"`);
    return `${root}/${grade}/${subfolder}/${file}`;
  }
  return `${root}/${grade}/${file}`;
}

/** videos/<GRADE>/<file>.mp4, or videos/NURSERY/<subfolder>/<file>.mp4. */
export function buildVideoKey(grade: GradeFolder, file: string, subfolder?: string): string {
  return buildKey('videos', '.mp4', grade, file, subfolder);
}

/** audio/<GRADE>/<file>.mp3, or audio/NURSERY/<subfolder>/<file>.mp3. */
export function buildAudioKey(grade: GradeFolder, file: string, subfolder?: string): string {
  return buildKey('audio', '.mp3', grade, file, subfolder);
}

/** Mentor voice lines: not grade-based, left exactly as they are. */
export const MENTOR_AUDIO_PREFIX = 'audio/mentor_audio/';

/**
 * Old shared audio folders → their place in the new layout. The destination
 * comes from the folder, not the lesson: Pre-Nursery's number and shape
 * lessons play the same files as Nursery's, which live under NURSERY.
 */
export const LEGACY_AUDIO_FOLDERS: Readonly<Record<string, { grade: GradeFolder; subfolder?: string }>> = {
  alphabet_audio: { grade: 'PRE_NURSERY' },
  lines_curves: { grade: 'PRE_NURSERY' },
  numbers: { grade: 'NURSERY', subfolder: 'numbers' },
  shapes: { grade: 'NURSERY', subfolder: 'shapes' },
};

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

const build = (kind: MediaKind, grade: GradeFolder, file: string, subfolder?: string) =>
  kind === 'video' ? buildVideoKey(grade, file, subfolder) : buildAudioKey(grade, file, subfolder);

/**
 * Old key → bucket key for a lesson in `grade`.
 *
 *   prenursery/videos/<f>         → videos/PRE_NURSERY/<f>   (likewise each grade; audio too)
 *   videos/<sub>/<f>, Nursery     → videos/NURSERY/<sub>/<f> (subfolder kept)
 *   videos/<sub>/<f>, other grade → videos/<GRADE>/<f>       (flat)
 *   audio/alphabet_audio/<f>      → audio/PRE_NURSERY/<f>
 *   audio/lines_curves/<f>        → audio/PRE_NURSERY/<f>
 *   audio/numbers/<f>             → audio/NURSERY/numbers/<f>
 *   audio/shapes/<f>              → audio/NURSERY/shapes/<f>
 *   audio/mentor_audio/...        → unchanged
 *
 * Idempotent: a key already in the new layout is validated and returned
 * unchanged, so the database migration can be re-run safely. Throws on a
 * shape it does not know rather than guessing a path that would 404.
 */
export function toGradedKey(oldKey: string, grade: GradeId, kind: MediaKind): string {
  const key = oldKey.trim().replace(/^\/+/, '');
  if (key === '' || key.toLowerCase() === COMING_SOON) return COMING_SOON;
  if (kind === 'audio' && key.startsWith(MENTOR_AUDIO_PREFIX)) return key;

  const root = ROOT[kind];
  const parts = key.split('/');
  const file = parts[parts.length - 1]!;

  // Already new: <root>/<GRADE>/[<sub>/]<f> — rebuilt, which re-checks the rules.
  if (parts[0] === root && GRADE_SET.has(parts[1] ?? '') && (parts.length === 3 || parts.length === 4)) {
    const rebuilt = build(kind, parts[1] as GradeFolder, file, parts.length === 4 ? parts[2] : undefined);
    if (rebuilt !== key) throw new Error(`media-paths: malformed ${kind} key "${oldKey}"`);
    return key;
  }

  // <grade>/<root>/<f>
  if (parts.length === 3 && OLD_GRADE_PREFIX[parts[0]!] && parts[1] === root) {
    return build(kind, GRADE_FOLDER[grade] as GradeFolder, file);
  }

  // <root>/<sub>/<f> — the old shared folders
  if (parts.length === 3 && parts[0] === root) {
    if (kind === 'audio') {
      const target = LEGACY_AUDIO_FOLDERS[parts[1]!];
      if (!target) throw new Error(`media-paths: no mapping for old audio folder "${parts[1]}" ("${oldKey}")`);
      return buildAudioKey(target.grade, file, target.subfolder);
    }
    return grade === 'nursery'
      ? buildVideoKey('NURSERY', file, parts[1])
      : buildVideoKey(GRADE_FOLDER[grade] as GradeFolder, file);
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
  return c ? buildVideoKey('NURSERY', `english_${c.n}_letter_${c.letter}.mp4`, 'alphabet') : null;
}

/** `audio/NURSERY/english_001_letter_a_listen.mp3` … — not recorded yet. */
export function nurseryCapitalListenAudio(lessonId: string): string | null {
  const c = capIndex(lessonId);
  return c ? buildAudioKey('NURSERY', `english_${c.n}_letter_${c.letter}_listen.mp3`) : null;
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
  pn_oral_greetings_hello_bye: buildVideoKey('PRE_NURSERY', 'english_002_hello_bye.mp4'),
  pn_myself: buildVideoKey('PRE_NURSERY', 'evs_001_all_about_me.mp4'),
  pn_head: buildVideoKey('PRE_NURSERY', 'english_004_head.mp4'),
  pn_eyes: buildVideoKey('PRE_NURSERY', 'english_005_eyes.mp4'),
  pn_nose: buildVideoKey('PRE_NURSERY', 'english_006_nose.mp4'),
  pn_ears: buildVideoKey('PRE_NURSERY', 'english_007_ears.mp4'),
  pn_mouth: buildVideoKey('PRE_NURSERY', 'english_008_mouth.mp4'),
  pn_hands: buildVideoKey('PRE_NURSERY', 'english_009_hands.mp4'),
  pn_legs: buildVideoKey('PRE_NURSERY', 'english_010_legs.mp4'),
  pn_feet: buildVideoKey('PRE_NURSERY', 'english_011_feet.mp4'),
  lkg_cap_az_rev: buildVideoKey('LKG', 'english_001_capital_a_z_revision.mp4'),
  lkg_letter_sounds: buildVideoKey('LKG', 'english_003_letter_sounds_introduction.mp4'),
  lkg_wf_at_blend: buildVideoKey('LKG', 'english_005_short_a_blend_at.mp4'),
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
  ].map((w, i) => buildVideoKey('PRE_NURSERY', `alphabet_${String(i + 1).padStart(3, '0')}_${w}.mp4`)),
  ...['english_004_head', 'english_005_eyes', 'english_006_nose', 'english_007_ears',
    'english_008_mouth', 'english_009_hands', 'english_010_legs', 'english_011_feet',
  ].map((f) => buildVideoKey('PRE_NURSERY', `${f}.mp4`)),
  buildVideoKey('LKG', 'english_003_letter_sounds_introduction.mp4'),
  buildVideoKey('LKG', 'english_005_short_a_blend_at.mp4'),
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
