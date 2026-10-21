/**
 * Move every stored video/audio key to the per-grade S3 layout.
 *
 *   npx tsx prisma/migrate-media-paths.ts                    # dry run: prints old -> new for every row
 *   npx tsx prisma/migrate-media-paths.ts --apply            # writes, in one transaction, after saving a backup
 *   npx tsx prisma/migrate-media-paths.ts --revert <backup>  # down: restores the exact old values from that backup
 *
 * Paths only. Each row keeps the file it already plays; `media-paths.ts` moves
 * it into the lesson's grade folder (grade from the lesson's category, never
 * from the old path), gives Nursery capitals their dedicated media, and wires
 * the manifest videos the resolvers never reached. Idempotent: re-running after
 * --apply changes nothing.
 *
 * The target is derived from the lesson's curriculum node (what the resolvers
 * say it plays), not from the stored value, so rows moved by an earlier run to
 * a layout the bucket does not have are corrected too. Rows whose lesson is
 * not in the curriculum fall back to mapping their stored value.
 *
 * Touches only the `videos.filename` and `audios.filename` columns. Does not
 * touch S3.
 */
import { PrismaClient } from '@prisma/client';
import { mkdirSync, readFileSync, writeFileSync } from 'fs';
import path from 'path';
import { GRADE_BY_CATEGORY_TITLE, audioPathFor, videoPathFor } from '../src/shared/utils/media-paths.js';
import { curriculumLoader } from '../src/modules/curriculum/curriculum-loader.js';
import { resolveVideoKey } from '../src/shared/utils/video-resolver.js';
import { resolveAudioKey } from '../src/shared/utils/audio-resolver.js';

const prisma = new PrismaClient();
const args = process.argv.slice(2);
const APPLY = args.includes('--apply');
const REVERT = args.includes('--revert') ? args[args.indexOf('--revert') + 1] : null;

type Change = { table: 'videos' | 'audios'; id: string; lessonId: string; from: string; to: string };

async function plan(): Promise<{ changes: Change[]; unchanged: number; errors: string[] }> {
  const include = {
    activity: { select: { lesson: { select: { id: true, module: { select: { category: { select: { title: true } } } } } } } },
  } as const;
  const [videos, audios] = await Promise.all([
    prisma.video.findMany({ include, orderBy: { id: 'asc' } }),
    prisma.audio.findMany({ include, orderBy: { id: 'asc' } }),
  ]);

  const changes: Change[] = [];
  const errors: string[] = [];
  let unchanged = 0;

  const visit = (table: Change['table'], id: string, current: string, lesson: any) => {
    const lessonId: string = lesson?.id ?? '?';
    const grade = GRADE_BY_CATEGORY_TITLE[lesson?.module?.category?.title ?? ''];
    if (!grade) {
      errors.push(`${table} ${id} (lesson ${lessonId}): unknown grade "${lesson?.module?.category?.title}"`);
      return;
    }
    const node = curriculumLoader.getLessons(grade).find((n) => n.id === lessonId);
    const legacy = node ? (table === 'videos' ? resolveVideoKey(node) : resolveAudioKey(node)) : current;
    let to: string;
    try {
      to = table === 'videos' ? videoPathFor(lessonId, grade, legacy) : audioPathFor(lessonId, grade, legacy);
    } catch (e) {
      errors.push(`${table} ${id} (lesson ${lessonId}): ${(e as Error).message}`);
      return;
    }
    if (to === current) {
      unchanged += 1;
      console.log(`  =  ${table.padEnd(6)} ${lessonId.padEnd(34)} ${current}`);
    } else {
      changes.push({ table, id, lessonId, from: current, to });
      console.log(`  -> ${table.padEnd(6)} ${lessonId.padEnd(34)} ${current}  ->  ${to}`);
    }
  };

  for (const v of videos) visit('videos', v.id, v.videoKey, v.activity?.lesson);
  for (const a of audios) visit('audios', a.id, a.audioKey, a.activity?.lesson);
  return { changes, unchanged, errors };
}

async function write(rows: { table: Change['table']; id: string; value: string }[]) {
  await prisma.$transaction(
    rows.map((r) =>
      r.table === 'videos'
        ? prisma.video.update({ where: { id: r.id }, data: { videoKey: r.value } })
        : prisma.audio.update({ where: { id: r.id }, data: { audioKey: r.value } }),
    ),
  );
}

async function main() {
  if (REVERT) {
    const backup: Change[] = JSON.parse(readFileSync(REVERT, 'utf8'));
    console.log(`=== REVERT: restoring ${backup.length} rows from ${REVERT} ===`);
    await write(backup.map((c) => ({ table: c.table, id: c.id, value: c.from })));
    console.log('Reverted.');
    return;
  }

  console.log(APPLY ? '=== APPLY ===' : '=== DRY RUN (pass --apply to write) ===');
  const { changes, unchanged, errors } = await plan();
  const count = (t: string) => changes.filter((c) => c.table === t).length;
  console.log(`\nto change: ${changes.length} (videos ${count('videos')}, audios ${count('audios')})  unchanged: ${unchanged}`);

  if (errors.length) {
    console.log(`\n${errors.length} row(s) could not be mapped — nothing will be written:`);
    errors.forEach((e) => console.log(`  ${e}`));
    process.exitCode = 1;
    return;
  }
  if (!APPLY || changes.length === 0) {
    if (!APPLY) console.log('\nDry run: nothing written.');
    return;
  }

  const dir = path.resolve(process.cwd(), '..', 'backups');
  mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `media-paths-${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
  writeFileSync(file, JSON.stringify(changes, null, 2));
  console.log(`\nBackup (for --revert): ${file}`);

  await write(changes.map((c) => ({ table: c.table, id: c.id, value: c.to })));
  console.log(`Applied ${changes.length} change(s).`);
}

main()
  .catch((e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
