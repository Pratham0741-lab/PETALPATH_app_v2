/**
 * Checks every video/audio key the app will be served against CloudFront.
 *
 *   npx tsx scripts/check-media.ts
 *
 * Fails (exit 1) if a key the API hands out as playable does not load — the
 * "video won't play" bug, caught before a child sees it. Also lists keys still
 * marked pending (served as "coming soon") whose file now exists, so they can
 * be removed from PENDING_MEDIA in src/shared/utils/media-paths.ts.
 *
 * Read-only: HEAD requests to the CDN. Does not touch S3 or the database.
 */
import { curriculumLoader } from '../src/modules/curriculum/curriculum-loader.js';
import { resolveVideoKey } from '../src/shared/utils/video-resolver.js';
import { resolveAudioKey } from '../src/shared/utils/audio-resolver.js';
import {
  COMING_SOON,
  audioPathFor,
  isPendingMedia,
  videoPathFor,
  type GradeId,
} from '../src/shared/utils/media-paths.js';
import { env } from '../src/config/env.js';

const CDN = env.CDN_BASE_URL.replace(/\/$/, '');
const keys = new Map<string, string[]>();
for (const grade of ['prenursery', 'nursery', 'lkg', 'ukg'] as GradeId[]) {
  for (const node of curriculumLoader.getLessons(grade)) {
    for (const key of [
      videoPathFor(node.id, grade, resolveVideoKey(node)),
      audioPathFor(node.id, grade, resolveAudioKey(node)),
    ]) {
      if (key === COMING_SOON) continue;
      keys.set(key, [...(keys.get(key) ?? []), node.id]);
    }
  }
}

const entries = [...keys.entries()];
const broken: string[] = [];
const nowUploaded: string[] = [];
let ok = 0;
let pending = 0;
let next = 0;
async function worker() {
  while (next < entries.length) {
    const [key, lessons] = entries[next++];
    const res = await fetch(`${CDN}/${key}`, { method: 'HEAD' });
    if (isPendingMedia(key)) {
      pending++;
      if (res.ok) nowUploaded.push(key);
    } else if (res.ok) ok++;
    else broken.push(`${res.status}  ${key}  (${lessons.length} lesson(s), e.g. ${lessons[0]})`);
  }
}
await Promise.all(Array.from({ length: 16 }, worker));

console.log(`${CDN}\n  playable and loading: ${ok}\n  coming soon (pending): ${pending}\n  BROKEN: ${broken.length}`);
if (nowUploaded.length) {
  console.log('\nPending but now uploaded — remove from PENDING_MEDIA:');
  nowUploaded.sort().forEach((k) => console.log(`  ${k}`));
}
if (broken.length) {
  console.log('\nServed as playable but not loading:');
  broken.sort().forEach((k) => console.log(`  ${k}`));
  process.exitCode = 1;
}
