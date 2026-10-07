/**
 * Undo curriculum progress credited to the wrong skill by the old name-matched
 * lesson -> skill links, and credit the right one.
 *
 * DRY RUN BY DEFAULT.
 *   npx tsx prisma/repair-misattributed-skill-progress.ts            # dry run
 *   npx tsx prisma/repair-misattributed-skill-progress.ts --apply    # write
 *
 * ORDER MATTERS: run this BEFORE `link-lessons-to-skills.ts --apply`. It finds
 * the wrong skill by reading the current (wrong) `Lesson.skillId`; once the
 * links are corrected there is nothing left to compare against. Run after the
 * relink, it correctly reports zero repairs — and repairs nothing.
 *
 * Scope is deliberately narrow. Only `ChildSkillCurriculum` was affected: the
 * lesson-completion path and `backfill-completed-skills.ts` both marked
 * `lesson.skillId` COMPLETED. Mastery (`SkillHealth`, `SkillHistory`) is keyed
 * by the lesson id itself, which is the correct skill, so it was never wrong
 * and is not touched.
 *
 * Three other writers also set COMPLETED — placement, the mastery engine, and a
 * correctly linked lesson — so a wrongly credited row is only reverted when all
 * of these hold:
 *   - the child completed a lesson that was linked to that skill by mistake;
 *   - the row's completedAt matches that lesson's completion (+-5 min), i.e. it
 *     was written by the completion path for that lesson, not by placement;
 *   - no correctly linked completed lesson justifies the skill.
 * Anything else is listed and left alone.
 *
 * Reverted rows go back to ACTIVE if the engine had activated them
 * (`activatedAt` set), else AVAILABLE. The pre-credit state was never recorded,
 * so this is a reconstruction; every reverted row is printed for review.
 */
import { PrismaClient, CurriculumState } from '@prisma/client';

const prisma = new PrismaClient();
const APPLY = process.argv.includes('--apply');
const MATCH_WINDOW_MS = 5 * 60 * 1000;

async function main() {
  console.log(APPLY ? '=== APPLY ===' : '=== DRY RUN (pass --apply to write) ===');

  const skillIdByCode = new Map(
    (await prisma.skill.findMany({ select: { id: true, skillCode: true } }))
      .filter((s) => s.skillCode)
      .map((s) => [s.skillCode as string, s.id]),
  );

  const completions = await prisma.lessonProgress.findMany({
    where: { status: 'COMPLETED', lesson: { deletedAt: null } },
    select: {
      childId: true,
      completedAt: true,
      lesson: { select: { id: true, title: true, skillId: true } },
    },
  });

  // Every skill legitimately earned by a completed lesson, per child.
  const justified = new Set<string>();
  for (const c of completions) {
    const own = skillIdByCode.get(c.lesson.id);
    if (own) justified.add(`${c.childId}|${own}`);
  }

  const credit: { childId: string; skillId: string; at: Date; why: string }[] = [];
  const revert: { childId: string; skillId: string; to: CurriculumState; why: string }[] = [];
  const leftAlone: string[] = [];

  for (const c of completions) {
    const correct = skillIdByCode.get(c.lesson.id);
    const wrong = c.lesson.skillId;
    if (!correct || !wrong || wrong === correct) continue; // link was right

    const tag = `"${c.lesson.title}" (${c.lesson.id})`;

    // 1. The skill that should have been credited.
    const right = await prisma.childSkillCurriculum.findUnique({
      where: { childId_skillId: { childId: c.childId, skillId: correct } },
    });
    if (right?.state !== CurriculumState.COMPLETED) {
      credit.push({
        childId: c.childId,
        skillId: correct,
        at: c.completedAt ?? new Date(),
        why: `${tag}: ${correct} was ${right?.state ?? 'absent'}`,
      });
    }

    // 2. The skill that was credited instead.
    const w = await prisma.childSkillCurriculum.findUnique({
      where: { childId_skillId: { childId: c.childId, skillId: wrong } },
    });
    if (w?.state !== CurriculumState.COMPLETED) continue;

    if (justified.has(`${c.childId}|${wrong}`)) {
      leftAlone.push(`${tag}: ${wrong} kept — a correctly linked lesson completed it`);
      continue;
    }
    const fromThisLesson =
      !!w.completedAt &&
      !!c.completedAt &&
      Math.abs(w.completedAt.getTime() - c.completedAt.getTime()) <= MATCH_WINDOW_MS;
    if (!fromThisLesson) {
      leftAlone.push(
        `${tag}: ${wrong} kept — completedAt ${w.completedAt?.toISOString() ?? 'null'} ` +
          `does not match the lesson (${c.completedAt?.toISOString() ?? 'null'}); another writer set it`,
      );
      continue;
    }
    revert.push({
      childId: c.childId,
      skillId: wrong,
      to: w.activatedAt ? CurriculumState.ACTIVE : CurriculumState.AVAILABLE,
      why: `${tag}: ${wrong} COMPLETED only by this mis-link`,
    });
  }

  // A wrong skill can be reached by two mis-linked lessons; revert it once.
  const revertUnique = [...new Map(revert.map((r) => [`${r.childId}|${r.skillId}`, r])).values()];
  const creditUnique = [...new Map(credit.map((r) => [`${r.childId}|${r.skillId}`, r])).values()];

  console.log(`\ncompleted lesson records examined: ${completions.length}`);
  console.log(`\nto CREDIT (correct skill -> COMPLETED): ${creditUnique.length}`);
  creditUnique.forEach((r) => console.log(`  child ${r.childId.slice(0, 8)}  ${r.why}`));
  console.log(`\nto REVERT (wrongly credited skill): ${revertUnique.length}`);
  revertUnique.forEach((r) => console.log(`  child ${r.childId.slice(0, 8)}  ${r.why} -> ${r.to}`));
  console.log(`\nleft alone (not provably from the mis-link): ${leftAlone.length}`);
  leftAlone.forEach((s) => console.log(`  ${s}`));

  if (!APPLY) {
    console.log('\nDry run: nothing written.');
    return;
  }

  await prisma.$transaction([
    ...creditUnique.map((r) =>
      prisma.childSkillCurriculum.upsert({
        where: { childId_skillId: { childId: r.childId, skillId: r.skillId } },
        update: { state: CurriculumState.COMPLETED, completedAt: r.at, priority: 0 },
        create: {
          childId: r.childId,
          skillId: r.skillId,
          state: CurriculumState.COMPLETED,
          unlockRatio: 1,
          priority: 0,
          completedAt: r.at,
        },
      }),
    ),
    ...revertUnique.map((r) =>
      prisma.childSkillCurriculum.update({
        where: { childId_skillId: { childId: r.childId, skillId: r.skillId } },
        data: { state: r.to, completedAt: null },
      }),
    ),
  ]);
  console.log(`\nApplied: ${creditUnique.length} credited, ${revertUnique.length} reverted.`);
}

main()
  .catch((e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
