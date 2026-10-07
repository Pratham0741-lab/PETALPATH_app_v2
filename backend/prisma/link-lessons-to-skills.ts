/**
 * Link every lesson to its skill: `Lesson.skillId` = the skill whose
 * `skillCode` equals the lesson's `id`.
 *
 * DRY RUN BY DEFAULT. Prints what would change and changes nothing.
 *   npx tsx prisma/link-lessons-to-skills.ts            # dry run
 *   npx tsx prisma/link-lessons-to-skills.ts --apply    # write, in one transaction
 *
 * History, because the previous version of this file is the bug it now fixes:
 * it matched on a normalised *name* and reported "1209/1209 linked, 0
 * unmatched". Skill names carry grade suffixes — "Letter A (Nursery)",
 * "Addition to 10 (LKG)" — so a plain-named lesson matched a different grade's
 * unsuffixed skill. 99 lessons were linked across grades: Nursery's "Letter A"
 * pointed at the Pre-Nursery skill, and `n_cap_a` was left with no lessons at
 * all, so that flower could never bloom.
 *
 * The fix is not a better name match. Lessons and skills are both generated
 * from the same curriculum node ids, so `lesson.id === skill.skillCode` is an
 * exact key. It cannot be ambiguous and cannot cross a grade.
 *
 * No fallback: a lesson with no same-grade skill is listed and left unlinked,
 * never matched to the nearest thing in another grade. Success is reported only
 * after `assertIntegrity` passes, so the run exits non-zero rather than printing
 * a clean total over a wrong link.
 *
 * Safe to re-run: rows already correct are untouched.
 */
import { PrismaClient } from '@prisma/client';
import {
  GRADE_PREFIX,
  skillGrade,
  checkIntegrity,
  printIntegrity,
  assertIntegrity,
} from './lib/lesson-skill-integrity';

const prisma = new PrismaClient();
const APPLY = process.argv.includes('--apply');

async function main() {
  console.log(APPLY ? '=== APPLY ===' : '=== DRY RUN (pass --apply to write) ===');

  const before = await checkIntegrity(prisma);
  printIntegrity('before', before);

  const skillByCode = new Map(
    (await prisma.skill.findMany({ select: { id: true, skillCode: true } }))
      .filter((s) => s.skillCode)
      .map((s) => [s.skillCode as string, s.id]),
  );

  const lessons = await prisma.lesson.findMany({
    where: { deletedAt: null },
    select: {
      id: true,
      title: true,
      skillId: true,
      skill: { select: { skillCode: true } },
      module: { select: { category: { select: { title: true } } } },
    },
  });

  const changes: { lessonId: string; title: string; from: string | null; to: string | null }[] = [];
  const noSameGradeSkill: { lessonId: string; title: string; grade: string | null }[] = [];

  for (const l of lessons) {
    const grade = GRADE_PREFIX[l.module.category?.title ?? ''] ?? null;
    const ownSkillId = skillByCode.get(l.id) ?? null;
    const ownGrade = skillGrade(l.id);

    // Strictly within grade: the lesson's own skill must exist and share its
    // grade. Otherwise list it, and clear any existing link rather than keep a
    // cross-grade one.
    const target = ownSkillId && grade && ownGrade === grade ? ownSkillId : null;
    if (!target) noSameGradeSkill.push({ lessonId: l.id, title: l.title, grade });

    if (l.skillId !== target) {
      changes.push({ lessonId: l.id, title: l.title, from: l.skill?.skillCode ?? null, to: target });
    }
  }

  console.log(`\nlinks to change: ${changes.length}`);
  for (const c of changes.slice(0, 12)) {
    console.log(`  "${c.title}" (${c.lessonId}): ${c.from ?? 'null'} -> ${c.to ?? 'null'}`);
  }
  if (changes.length > 12) console.log(`  ...and ${changes.length - 12} more`);

  console.log(`\nlessons with no same-grade skill (left unlinked, no fallback): ${noSameGradeSkill.length}`);
  for (const n of noSameGradeSkill) console.log(`  ${n.grade ?? '?'} "${n.title}" (${n.lessonId})`);

  if (!APPLY) {
    console.log('\nDry run: nothing written.');
    return;
  }

  await prisma.$transaction(
    changes.map((c) =>
      prisma.lesson.update({ where: { id: c.lessonId }, data: { skillId: c.to } }),
    ),
  );

  const after = await checkIntegrity(prisma);
  printIntegrity('after', after);
  // Throws (exit 1) on any bad link — the "linked" total is not printed as a
  // success unless this passes.
  assertIntegrity(after);
  console.log(`\nOK: ${after.correct}/${after.total} lessons linked to their own same-grade skill.`);
}

main()
  .catch((e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
