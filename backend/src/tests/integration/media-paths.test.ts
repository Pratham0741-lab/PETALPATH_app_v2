/**
 * Every lesson's video/audio key must sit in the per-grade S3 layout:
 *   videos/<GRADE>/<file>, audio/<GRADE>/<file>, GRADE = PRE_NURSERY|NURSERY|LKG|UKG
 * with subfolders only under NURSERY, and Nursery capitals on their own media.
 *
 * Pure: reads the curriculum and the path functions, no database.
 */
import { curriculumLoader } from '../../modules/curriculum/curriculum-loader.js';
import { resolveVideoKey } from '../../shared/utils/video-resolver.js';
import { resolveAudioKey } from '../../shared/utils/audio-resolver.js';
import {
  COMING_SOON,
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
    '%s %s → %s is under its own grade folder, exact case',
    (_kind, _id, key, grade, root) => {
      // Exact case: `pre_nursery`, `Nursery`, `prenursery` all fail.
      expect(key.startsWith(`${root}/${GRADE_FOLDER[grade]}/`)).toBe(true);
      expect(key).toMatch(/^(videos|audio)\/(PRE_NURSERY|NURSERY|LKG|UKG)\/[^/]/);
    },
  );

  it('has no subfolders outside NURSERY', () => {
    const bad = wired.filter((w) => w.grade !== 'nursery' && w.key.split('/').length !== 3);
    expect(bad.map((b) => b.key)).toEqual([]);
  });

  it('gives Nursery capitals their dedicated media, never the shared alphabet files', () => {
    const caps = lessons.filter((l) => /^n_cap_[a-z]$/.test(l.id));
    expect(caps).toHaveLength(26);
    for (const c of caps) {
      const letter = c.id.slice(-1);
      const n = String(letter.charCodeAt(0) - 96).padStart(3, '0');
      expect(c.video).toBe(`videos/NURSERY/alphabet/english_${n}_letter_${letter}.mp4`);
      expect(c.audio).toBe(`audio/NURSERY/english_${n}_letter_${letter}_listen.mp3`);
      expect(c.video).not.toMatch(/alphabet_0\d\d_/);
      expect(c.audio).not.toMatch(/alphabet_0\d\d_/);
    }
  });

  it('maps the old layouts as specified', () => {
    expect(toGradedKey('prenursery/videos/english_002_hello_bye.mp4', 'prenursery', 'video')).toBe(
      'videos/PRE_NURSERY/english_002_hello_bye.mp4',
    );
    expect(toGradedKey('prenursery/audio/english_004_head_listen.mp3', 'prenursery', 'audio')).toBe(
      'audio/PRE_NURSERY/english_004_head_listen.mp3',
    );
    expect(toGradedKey('videos/alphabet/alphabet_001_a_apple.mp4', 'prenursery', 'video')).toBe(
      'videos/PRE_NURSERY/alphabet_001_a_apple.mp4',
    );
    expect(toGradedKey('videos/numbers/numbers_001_one.mp4', 'nursery', 'video')).toBe(
      'videos/NURSERY/numbers/numbers_001_one.mp4',
    );
    expect(toGradedKey('lkg/videos/english_001_capital_a_z_revision.mp4', 'lkg', 'video')).toBe(
      'videos/LKG/english_001_capital_a_z_revision.mp4',
    );
    expect(toGradedKey('audio/alphabet_audio/alphabet_001_a.mp3', 'nursery', 'audio')).toBe(
      'audio/NURSERY/alphabet_audio/alphabet_001_a.mp3',
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
  });
});
