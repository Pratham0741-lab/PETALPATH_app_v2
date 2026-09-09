/**
 * Backfill `Lesson.skillId` for content that predates the column.
 *
 * Lessons and skills were authored as separate hierarchies, so there is no id to
 * join on — the only thing they share is the name ("Letter A" as a lesson, and
 * "Letter A" as the skill it teaches). This matches on a normalised name and
 * writes the link, which is a one-off cost so that from here on the join is a
 * real foreign key rather than string comparison at read time.
 *
 * Safe to re-run: it only fills lessons whose `skillId` is still null, and
 * reports anything it could not match rather than guessing.
 *
 *   npx tsx prisma/link-lessons-to-skills.ts
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/** Lowercase, collapse whitespace, drop punctuation — "Letter  A!" -> "letter a". */
const normalise = (value: string): string =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

async function main() {
  const skills = await prisma.skill.findMany({ select: { id: true, name: true } });
  const byName = new Map<string, string>();
  for (const skill of skills) {
    byName.set(normalise(skill.name), skill.id);
  }

  const lessons = await prisma.lesson.findMany({
    where: { skillId: null, deletedAt: null },
    select: { id: true, title: true },
  });

  let linked = 0;
  const unmatched: string[] = [];

  for (const lesson of lessons) {
    const skillId = byName.get(normalise(lesson.title));
    if (!skillId) {
      unmatched.push(lesson.title);
      continue;
    }
    await prisma.lesson.update({ where: { id: lesson.id }, data: { skillId } });
    linked += 1;
  }

  console.log(`skills:   ${skills.length}`);
  console.log(`lessons:  ${lessons.length} unlinked`);
  console.log(`linked:   ${linked}`);
  console.log(`unmatched: ${unmatched.length}`);
  if (unmatched.length) {
    console.log('\nNo skill with a matching name for:');
    for (const title of unmatched.slice(0, 40)) console.log('  -', title);
    if (unmatched.length > 40) console.log(`  ...and ${unmatched.length - 40} more`);
    console.log('\nThese need mapping by hand; their flowers stay seeds until then.');
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
