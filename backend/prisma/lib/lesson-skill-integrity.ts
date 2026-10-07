/**
 * The invariant every lesson -> skill link must satisfy, in one place, so the
 * scripts that write the link and the scripts that read it cannot disagree.
 *
 * Why this exists: the first backfill matched lessons to skills by *name* and
 * reported "1209/1209 linked, 0 unmatched". Both numbers were true and the
 * result was wrong — 99 lessons were linked to a skill from a different grade,
 * because skill names carry grade suffixes ("Addition to 10 (LKG)") and a
 * plain-named lesson matched another grade's unsuffixed skill instead. A
 * "linked" count measures that a link exists, not that it is right. Anything
 * that reports progress on this link now has to pass `assertIntegrity`.
 *
 * The rules, strongest first:
 *   1. A lesson links to the skill whose `skillCode` equals the lesson's `id`.
 *      Both tables are generated from the same curriculum node ids, so this is
 *      an exact key, not a heuristic.
 *   2. The lesson's grade (from its category) equals the skill's grade (the
 *      `skillCode` prefix). Redundant with (1) today, but kept so a future
 *      content import that breaks (1) still cannot cross grades silently.
 */
import type { PrismaClient } from '@prisma/client';

/** Category title -> skillCode prefix. */
export const GRADE_PREFIX: Record<string, string> = {
  'Pre-Nursery': 'pn',
  Nursery: 'n',
  LKG: 'lkg',
  UKG: 'ukg',
};

export const skillGrade = (skillCode: string | null | undefined): string | null =>
  skillCode ? skillCode.split('_')[0] : null;

export interface IntegrityRow {
  lessonId: string;
  title: string;
  grade: string | null;
  skillCode: string | null;
}

export interface IntegrityReport {
  total: number;
  /** Lessons passing both rules — the only number fit to call "linked". */
  correct: number;
  unlinked: IntegrityRow[];
  /** Linked, but the skill is from another grade. */
  crossGrade: IntegrityRow[];
  /** Linked within the grade, but not to the lesson's own skill. */
  wrongSkill: IntegrityRow[];
  /** Category title not in GRADE_PREFIX, so the grade rule cannot be checked. */
  unknownGrade: IntegrityRow[];
}

export async function checkIntegrity(prisma: PrismaClient): Promise<IntegrityReport> {
  const lessons = await prisma.lesson.findMany({
    where: { deletedAt: null },
    select: {
      id: true,
      title: true,
      skill: { select: { skillCode: true } },
      module: { select: { category: { select: { title: true } } } },
    },
  });

  const report: IntegrityReport = {
    total: lessons.length,
    correct: 0,
    unlinked: [],
    crossGrade: [],
    wrongSkill: [],
    unknownGrade: [],
  };

  for (const l of lessons) {
    const grade = GRADE_PREFIX[l.module.category?.title ?? ''] ?? null;
    const row: IntegrityRow = {
      lessonId: l.id,
      title: l.title,
      grade,
      skillCode: l.skill?.skillCode ?? null,
    };
    if (!grade) report.unknownGrade.push(row);
    else if (!row.skillCode) report.unlinked.push(row);
    else if (skillGrade(row.skillCode) !== grade) report.crossGrade.push(row);
    else if (row.skillCode !== l.id) report.wrongSkill.push(row);
    else report.correct += 1;
  }
  return report;
}

export function printIntegrity(label: string, r: IntegrityReport): void {
  console.log(`\n[${label}]`);
  console.log(`  lessons            ${r.total}`);
  console.log(`  correct            ${r.correct}`);
  console.log(`  unlinked           ${r.unlinked.length}`);
  console.log(`  cross-grade        ${r.crossGrade.length}`);
  console.log(`  same grade, wrong  ${r.wrongSkill.length}`);
  console.log(`  unknown grade      ${r.unknownGrade.length}`);
}

/**
 * Throws unless every lesson is linked, within its grade, to its own skill.
 * Callers run this after writing and before reporting success, so a run that
 * leaves a single bad link exits non-zero instead of printing a clean total.
 */
export function assertIntegrity(r: IntegrityReport): void {
  const bad = r.unlinked.length + r.crossGrade.length + r.wrongSkill.length + r.unknownGrade.length;
  if (bad === 0 && r.correct === r.total) return;
  const sample = [...r.crossGrade, ...r.wrongSkill, ...r.unlinked, ...r.unknownGrade]
    .slice(0, 10)
    .map((x) => `    ${x.grade ?? '?'} "${x.title}" (${x.lessonId}) -> ${x.skillCode ?? 'null'}`)
    .join('\n');
  throw new Error(
    `Lesson->skill integrity FAILED: ${r.correct}/${r.total} correct, ${bad} bad.\n${sample}`,
  );
}
