/**
 * Finds media keys the API hands out that are not actually in S3, and logs
 * each one clearly, so a file missing from its new grade folder is spotted
 * instead of failing silently on a child's phone.
 *
 * Read-only: HEAD requests to the CDN. Never writes to or deletes from S3.
 * CloudFront answers 403 (not 404) for a missing S3 object, so both count
 * as missing.
 */
import { prisma } from '../../config/database.js';
import { env } from '../../config/env.js';
import { logger } from '../../utils/logger.js';
import { COMING_SOON, isPendingMedia } from './media-paths.js';

export interface MissingMedia {
  key: string;
  status: number;
  lessons: string[];
}

const cdnBase = () => (env.CDN_BASE_URL || 'https://dy3um9dzarz6y.cloudfront.net').replace(/\/$/, '');

/** HEADs every key (16 at a time); returns the ones that do not load. */
export async function findMissingMedia(
  keys: ReadonlyMap<string, string[]>,
  fetchImpl: typeof fetch = fetch,
): Promise<MissingMedia[]> {
  const entries = [...keys.entries()];
  const missing: MissingMedia[] = [];
  let next = 0;
  const worker = async () => {
    while (next < entries.length) {
      const [key, lessons] = entries[next++]!;
      try {
        const res = await fetchImpl(`${cdnBase()}/${key}`, { method: 'HEAD' });
        if (res.status === 403 || res.status === 404) missing.push({ key, status: res.status, lessons });
      } catch (err) {
        logger.warn({ key, err: (err as Error).message }, 'Media check: could not reach the CDN for this key');
      }
    }
  };
  await Promise.all(Array.from({ length: 16 }, worker));
  return missing.sort((a, b) => a.key.localeCompare(b.key));
}

/** Logs one warning per missing key, naming the key and the lessons that use it. */
export function logMissingMedia(missing: readonly MissingMedia[]): void {
  for (const m of missing) {
    logger.warn(
      { key: m.key, status: m.status, lessons: m.lessons.slice(0, 5), lessonCount: m.lessons.length },
      `MISSING MEDIA in S3: ${m.key}`,
    );
  }
}

/** Every playable key stored in the database (coming soon / pending excluded), with its lessons. */
export async function servedMediaKeys(): Promise<Map<string, string[]>> {
  const include = { activity: { select: { lessonId: true } } } as const;
  const [videos, audios] = await Promise.all([
    prisma.video.findMany({ select: { videoKey: true, ...include } }),
    prisma.audio.findMany({ select: { audioKey: true, ...include } }),
  ]);
  const keys = new Map<string, string[]>();
  const add = (key: string, lessonId: string | undefined) => {
    const k = key.trim().replace(/^\/+/, '');
    if (!k || k === COMING_SOON || isPendingMedia(k)) return;
    keys.set(k, [...(keys.get(k) ?? []), lessonId ?? '?']);
  };
  videos.forEach((v) => add(v.videoKey, v.activity?.lessonId));
  audios.forEach((a) => add(a.audioKey, a.activity?.lessonId));
  return keys;
}

/**
 * One background check after startup. Never blocks or fails the server; set
 * MEDIA_CHECK_ON_START=false to turn it off.
 */
export function checkServedMediaInBackground(): void {
  if (env.NODE_ENV === 'test' || process.env.MEDIA_CHECK_ON_START === 'false') return;
  void (async () => {
    try {
      const keys = await servedMediaKeys();
      const missing = await findMissingMedia(keys);
      if (missing.length) logMissingMedia(missing);
      logger.info({ checked: keys.size, missing: missing.length }, 'Media check finished');
    } catch (err) {
      logger.warn({ err: (err as Error).message }, 'Media check could not run');
    }
  })();
}
