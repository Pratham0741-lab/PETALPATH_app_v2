/**
 * Mark skills COMPLETED for lessons that were already finished.
 *
 * Lesson completion only started advancing the skill once `Lesson.skillId`
 * existed, so any lesson finished before that left its skill at whatever state
 * the curriculum engine had given it (typically AVAILABLE). Those flowers stay
 * seeds and the subject patch hides them, even though the work is done.
 *
 * This reconciles history: every LessonProgress marked COMPLETED, whose lesson
 * now has a skill, gets that skill set to COMPLETED for that child.
 *
 * Safe to re-run — it only moves rows that are not already COMPLETED, and never
 * downgrades a skill.
 *
 *   npx tsx prisma/backfill-completed-skills.ts
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const completed = await prisma.lessonProgress.findMany({
    where: {
      status: 'COMPLETED',
      lesson: { skillId: { not: null }, deletedAt: null },
    },
    select: {
      childId: true,
      completedAt: true,
      lesson: { select: { title: true, skillId: true } },
    },
  });

  console.log(`completed lessons with a skill: ${completed.length}`);

  let updated = 0;
  let alreadyDone = 0;

  for (const row of completed) {
    const skillId = row.lesson.skillId!;
    const existing = await prisma.childSkillCurriculum.findUnique({
      where: { childId_skillId: { childId: row.childId, skillId } },
      select: { state: true },
    });

    if (existing?.state === 'COMPLETED') {
      alreadyDone += 1;
      continue;
    }

    await prisma.childSkillCurriculum.upsert({
      where: { childId_skillId: { childId: row.childId, skillId } },
      update: {
        state: 'COMPLETED',
        completedAt: row.completedAt ?? new Date(),
        priority: 0,
      },
      create: {
        childId: row.childId,
        skillId,
        state: 'COMPLETED',
        unlockRatio: 1,
        priority: 0,
        completedAt: row.completedAt ?? new Date(),
      },
    });
    updated += 1;
  }

  console.log(`already COMPLETED: ${alreadyDone}`);
  console.log(`updated:           ${updated}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
