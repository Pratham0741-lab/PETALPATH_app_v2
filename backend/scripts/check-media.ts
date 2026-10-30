/**
 * Checks every video/audio key the curriculum resolves to against CloudFront.
 *
 *   npx tsx scripts/check-media.ts
 *
 * Fails (exit 1) and logs each key that the API hands out as playable but
 * that does not load — e.g. a file not yet copied into its new grade folder.
 * Also lists keys still marked pending (served as "coming soon") whose file
 * now exists, so they can be removed from PENDING_MEDIA in
 * src/shared/utils/media-paths.ts.
 *
 * Read-only: HEAD requests to the CDN. Does not touch S3 or the database.
 *
 * CloudFront caches answers (query strings are not part of the cache key), so
 * for a while after a file is moved or deleted in S3 an edge can still report
 * it as present. After moving files, wait for the cache to expire or create a
 * CloudFront invalidation for the moved paths before trusting a clean result.
 */
import { curriculumLoader } from '../src/modules/curriculum/curriculum-loader.js';
import { resolveVideoKey } from '../src/shared/utils/video-resolver.js';
import { resolveAudioKey } from '../src/shared/utils/audio-resolver.js';
import { COMING_SOON, audioPathFor, isPendingMedia, videoPathFor, type GradeId } from '../src/shared/utils/media-paths.js';
import { findMissingMedia, logMissingMedia } from '../src/shared/utils/media-check.js';

const playable = new Map<string, string[]>();
const pending = new Map<string, string[]>();
for (const grade of ['prenursery', 'nursery', 'lkg', 'ukg'] as GradeId[]) {
  for (const node of curriculumLoader.getLessons(grade)) {
    for (const key of [
      videoPathFor(node.id, grade, resolveVideoKey(node)),
      audioPathFor(node.id, grade, resolveAudioKey(node)),
    ]) {
      if (key === COMING_SOON) continue;
      const map = isPendingMedia(key) ? pending : playable;
      map.set(key, [...(map.get(key) ?? []), node.id]);
    }
  }
}

const broken = await findMissingMedia(playable);
const pendingMissing = new Set((await findMissingMedia(pending)).map((m) => m.key));
const nowUploaded = [...pending.keys()].filter((k) => !pendingMissing.has(k)).sort();

console.log(
  `playable and loading: ${playable.size - broken.length}\ncoming soon (pending): ${pending.size}\nBROKEN: ${broken.length}`,
);
if (nowUploaded.length) {
  console.log('\nPending but now uploaded — remove from PENDING_MEDIA:');
  nowUploaded.forEach((k) => console.log(`  ${k}`));
}
if (broken.length) {
  console.log('\nServed as playable but missing in S3:');
  broken.forEach((m) => console.log(`  ${m.status}  ${m.key}  (${m.lessons.length} lesson(s), e.g. ${m.lessons[0]})`));
  logMissingMedia(broken);
  process.exitCode = 1;
}
