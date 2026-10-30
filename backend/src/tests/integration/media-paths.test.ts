/**
 * Every lesson's video/audio key must match the bucket as it really is (see
 * media-paths.ts): videos under their own videos/<GRADE>/ (Nursery keeps
 * subfolders), shared audio still in its old audio/<sub>/ folders,
 * and Nursery capitals on their own media. scripts/check-media.ts verifies the
 * same keys against CloudFront.
 *
 * Pure: reads the curriculum and the path functions, no database.
 */
import { curriculumLoader } from '../../modules/curriculum/curriculum-loader.js';
import { resolveVideoKey } from '../../shared/utils/video-resolver.js';
import { resolveAudioKey } from '../../shared/utils/audio-resolver.js';
import {
  COMING_SOON,
  buildAudioKey,
  buildVideoKey,
  GRADE_FOLDER,
  type GradeId,
  audioPathFor,
  isPendingMedia,
  servedMediaKey,
  toGradedKey,
  videoPathFor,
} from '../../shared/utils/media-paths.js';
import { storageService } from '../../shared/services/storage.service.js';

const GRADES: GradeId[] = ['prenursery', 'nursery', 'lkg', 'ukg'];

const lessons = GRADES.flatMap((grade) =>
  curriculumLoader.getLessons(grade).map((node) => ({
    grade,
    id: node.id,
    video: videoPathFor(node.id, grade, resolveVideoKey(node)),
    audio: audioPathFor(node.id, grade, resolveAudioKey(node)),
  })),
);

const wired = lessons.flatMap((l) => [
  { ...l, kind: 'video' as const, key: l.video, root: 'videos' },
  { ...l, kind: 'audio' as const, key: l.audio, root: 'audio' },
]).filter((x) => x.key !== COMING_SOON);

describe('media paths', () => {
  it('covers the whole curriculum', () => {
    expect(lessons.length).toBe(1209);
    expect(wired.length).toBeGreaterThan(0);
  });

  it.each(wired.map((w) => [w.kind, w.id, w.key, w.grade, w.root] as const))(
    '%s %s → %s is in a real bucket folder, exact case',
    (kind, _id, key, grade, root) => {
      if (kind === 'video') {
        // Always its own grade folder.
        expect(key.startsWith(`${root}/${GRADE_FOLDER[grade]}/`)).toBe(true);
        expect(key).toMatch(/^videos\/(PRE_NURSERY|NURSERY|LKG|UKG)\/[^/]/);
      } else {
        // Grade-based: audio/<GRADE>/<f>, or audio/NURSERY/<sub>/<f>. Never an old folder.
        expect(key).toMatch(/^audio\/((PRE_NURSERY|LKG|UKG)\/[^/]+|NURSERY\/([a-z_]+\/)?[^/]+)\.mp3$/);
      }
    },
  );

  it('has no subfolders outside NURSERY', () => {
    const bad = wired.filter((w) => w.key.split('/').length !== 3 && w.key.split('/')[1] !== 'NURSERY');
    expect(bad.map((b) => b.key)).toEqual([]);
  });

  it('gives Nursery capitals their dedicated video and the "Capital A" alphabet audio', () => {
    const caps = lessons.filter((l) => /^n_cap_[a-z]$/.test(l.id));
    expect(caps).toHaveLength(26);
    for (const c of caps) {
      const letter = c.id.slice(-1);
      const n = String(letter.charCodeAt(0) - 96).padStart(3, '0');
      expect(c.video).toBe(`videos/NURSERY/alphabet/english_${n}_letter_${letter}.mp4`);
      // The same clip the Pre-Nursery Letter / Sound lessons play.
      expect(c.audio).toBe(`audio/PRE_NURSERY/alphabet_${n}_${letter}.mp3`);
      expect(lessons.find((l) => l.id === `pn_letter_${letter}`)?.audio).toBe(c.audio);
    }
  });

  it('maps the old layouts as specified', () => {
    expect(toGradedKey('prenursery/videos/english_002_hello_bye.mp4', 'prenursery', 'video')).toBe(
      'videos/PRE_NURSERY/english_002_hello_bye.mp4',
    );
    expect(toGradedKey('prenursery/audio/english_004_head_listen.mp3', 'prenursery', 'audio')).toBe(
      'audio/PRE_NURSERY/english_004_head_listen.mp3',
    );
    // Shared clips: Pre-Nursery has its own flat copies, Nursery keeps subfolders.
    expect(toGradedKey('videos/alphabet/alphabet_001_a_apple.mp4', 'prenursery', 'video')).toBe(
      'videos/PRE_NURSERY/alphabet_001_a_apple.mp4',
    );
    expect(toGradedKey('videos/numbers/numbers_001_one.mp4', 'nursery', 'video')).toBe(
      'videos/NURSERY/numbers/numbers_001_one.mp4',
    );
    expect(toGradedKey('lkg/videos/english_001_capital_a_z_revision.mp4', 'lkg', 'video')).toBe(
      'videos/LKG/english_001_capital_a_z_revision.mp4',
    );
    expect(videoPathFor('n_cap_a', 'nursery', 'videos/alphabet/alphabet_001_a_apple.mp4')).toBe(
      'videos/NURSERY/alphabet/english_001_letter_a.mp4',
    );
  });

  it('is idempotent, keeps coming soon, and refuses unknown shapes', () => {
    const k = 'videos/NURSERY/numbers/numbers_001_one.mp4';
    expect(toGradedKey(k, 'nursery', 'video')).toBe(k);
    expect(toGradedKey(COMING_SOON, 'ukg', 'audio')).toBe(COMING_SOON);
    expect(() => toGradedKey('random/file.mp4', 'lkg', 'video')).toThrow();
  });

  it('serves not-yet-recorded audio as coming soon instead of a dead URL', () => {
    const pending = 'audio/NURSERY/english_001_letter_a_listen.mp3';
    expect(isPendingMedia(pending)).toBe(true);
    expect(servedMediaKey(pending)).toBe(COMING_SOON);
    expect(storageService.getAudioUrl(pending)).toBeNull();
    const live = 'audio/NURSERY/numbers/numbers_001_one.mp3';
    expect(servedMediaKey(live)).toBe(live);
    expect(storageService.getAudioUrl(live)).toMatch(/\/audio\/NURSERY\/numbers\/numbers_001_one\.mp3$/);
    // Videos missing from the bucket are coming soon too.
    expect(servedMediaKey('videos/PRE_NURSERY/english_004_head.mp4')).toBe(COMING_SOON);
  });

  describe('audio mapping (old -> new, file names unchanged)', () => {
    const letters = 'abcdefghijklmnopqrstuvwxyz'.split('');
    const n3 = (i: number) => String(i).padStart(3, '0');
    const cases: [string, string][] = [
      ...letters.map((l, i): [string, string] => [
        `audio/alphabet_audio/alphabet_${n3(i + 1)}_${l}.mp3`,
        `audio/PRE_NURSERY/alphabet_${n3(i + 1)}_${l}.mp3`,
      ]),
      ...['001_standing_line', '002_sleeping_line', '003_left_slanting_line', '004_right_slanting_line',
        '005_big_curve', '006_small_curve', '007_zigzag_line'].map((f): [string, string] => [
        `audio/lines_curves/lines_curves_${f}.mp3`,
        `audio/PRE_NURSERY/lines_curves_${f}.mp3`,
      ]),
      ...['001_one', '002_two', '003_three', '004_four', '005_five', '006_six', '007_seven', '008_eight',
        '009_nine', '010_ten'].map((f): [string, string] => [
        `audio/numbers/numbers_${f}.mp3`,
        `audio/NURSERY/numbers/numbers_${f}.mp3`,
      ]),
      ...['001_circle', '002_oval', '003_triangle', '004_square', '005_rectangle', '006_pentagon'].map(
        (f): [string, string] => [`audio/shapes/shapes_${f}.mp3`, `audio/NURSERY/shapes/shapes_${f}.mp3`],
      ),
    ];

    it('covers all 49 shared audio files', () => {
      expect(cases).toHaveLength(49);
    });

    it.each(cases)('%s -> %s', (from, to) => {
      // Same result whichever grade's lesson plays it: the folder decides.
      for (const grade of ['prenursery', 'nursery', 'lkg', 'ukg'] as const) {
        expect(toGradedKey(from, grade, 'audio')).toBe(to);
      }
      expect(toGradedKey(to, 'nursery', 'audio')).toBe(to); // idempotent
    });

    it('leaves mentor audio exactly as it is', () => {
      for (const k of [
        'audio/mentor_audio/Barnaby/mentor_barnaby_step_video_en.mp3',
        'audio/mentor_audio/cleo/cleo_welcome_general_en.mp3',
        'audio/mentor_audio/finn/finn_roadmap_en.mp3',
        'audio/mentor_audio/Penny/penny_welcome_general_en.mp3',
        'audio/mentor_audio/toby/toby_en.mp3',
      ]) {
        expect(toGradedKey(k, 'prenursery', 'audio')).toBe(k);
      }
    });

    it('refuses an old audio folder it has no mapping for', () => {
      expect(() => toGradedKey('audio/colours/colours_001_red.mp3', 'nursery', 'audio')).toThrow(/no mapping/);
    });

    it('supports the new audio patterns (not uploaded yet)', () => {
      expect(buildAudioKey('NURSERY', 'english_001_letter_a_listen.mp3')).toBe('audio/NURSERY/english_001_letter_a_listen.mp3');
      expect(buildAudioKey('NURSERY', 'english_001_letter_a_label.mp3')).toBe('audio/NURSERY/english_001_letter_a_label.mp3');
      expect(buildAudioKey('LKG', 'english_002_x_listen.mp3')).toBe('audio/LKG/english_002_x_listen.mp3');
      expect(buildAudioKey('UKG', 'english_001_short_a_initial_sound_identification_listen.mp3')).toBe(
        'audio/UKG/english_001_short_a_initial_sound_identification_listen.mp3',
      );
    });
  });

  describe('key builders enforce the layout', () => {
    it('build the documented video keys', () => {
      expect(buildVideoKey('PRE_NURSERY', 'english_002_hello_bye.mp4')).toBe('videos/PRE_NURSERY/english_002_hello_bye.mp4');
      expect(buildVideoKey('NURSERY', 'english_001_letter_a.mp4', 'alphabet')).toBe('videos/NURSERY/alphabet/english_001_letter_a.mp4');
      for (const sub of ['alphabet', 'numbers', 'shapes', 'lines_and_curves']) {
        expect(buildVideoKey('NURSERY', 'x.mp4', sub)).toBe(`videos/NURSERY/${sub}/x.mp4`);
      }
      expect(buildVideoKey('LKG', 'x.mp4')).toBe('videos/LKG/x.mp4');
      expect(buildVideoKey('UKG', 'x.mp4')).toBe('videos/UKG/x.mp4');
    });

    it.each(['PRE_NURSERY', 'LKG', 'UKG'] as const)('a subfolder under %s throws', (grade) => {
      expect(() => buildAudioKey(grade, 'x.mp3', 'numbers')).toThrow(/only NURSERY has subfolders/);
      expect(() => buildVideoKey(grade, 'x.mp4', 'alphabet')).toThrow(/only NURSERY has subfolders/);
      // ...and so does a stored key shaped that way.
      expect(() => toGradedKey(`audio/${grade}/numbers/x.mp3`, 'nursery', 'audio')).toThrow();
    });

    it.each(['pre_nursery', 'nursery', 'Nursery', 'lkg', 'ukg', 'PRENURSERY'])('grade "%s" throws', (grade) => {
      expect(() => buildAudioKey(grade as any, 'x.mp3')).toThrow(/exact case/);
      expect(() => buildVideoKey(grade as any, 'x.mp4')).toThrow(/exact case/);
    });

    it('rejects a path or the wrong extension as a file name', () => {
      expect(() => buildAudioKey('NURSERY', 'numbers/x.mp3')).toThrow();
      expect(() => buildAudioKey('NURSERY', 'x.mp4')).toThrow();
      expect(() => buildVideoKey('NURSERY', 'x.mp3')).toThrow();
    });
  });
});
