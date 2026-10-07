/**
 * Export lesson feedback as CSV, joined with the lesson's title and grade.
 *
 *   npx tsx prisma/export-feedback-csv.ts                       # to stdout
 *   npx tsx prisma/export-feedback-csv.ts --out feedback.csv
 *   npx tsx prisma/export-feedback-csv.ts --since 2026-10-01    # created on/after
 *
 * Read-only. Names and emails are not exported: parent and child appear only
 * as ids. Comments are free text from parents and may still contain personal
 * details despite the on-screen note, so treat the file accordingly.
 *
 * Grade is the lesson's category title (Pre-Nursery, Nursery, LKG, UKG).
 */
import { PrismaClient } from '@prisma/client';
import { writeFileSync } from 'fs';

const prisma = new PrismaClient();

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

/**
 * RFC 4180 quoting, plus a guard against spreadsheet formula injection: a
 * comment starting with `=`, `+`, `-` or `@` would otherwise run as a formula
 * when the file is opened in Excel or Sheets.
 */
function cell(value: unknown): string {
  if (value === null || value === undefined) return '';
  let s = value instanceof Date ? value.toISOString() : String(value);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

const HEADER = [
  'created_at',
  'feedback_id',
  'lesson_id',
  'lesson_title',
  'grade',
  'module',
  'rating',
  'reasons',
  'comment',
  'app_version',
  'child_id',
  'parent_id',
];

async function main() {
  const sinceArg = arg('--since');
  const since = sinceArg ? new Date(sinceArg) : undefined;
  if (since && Number.isNaN(since.getTime())) throw new Error(`Invalid --since date: ${sinceArg}`);

  const rows = await prisma.feedback.findMany({
    where: since ? { createdAt: { gte: since } } : undefined,
    orderBy: { createdAt: 'asc' },
    include: {
      lesson: {
        select: {
          title: true,
          module: { select: { title: true, category: { select: { title: true } } } },
        },
      },
    },
  });

  const lines = [HEADER.join(',')];
  for (const f of rows) {
    lines.push(
      [
        f.createdAt,
        f.id,
        f.lessonId,
        f.lesson.title,
        f.lesson.module.category?.title ?? '',
        f.lesson.module.title,
        f.rating,
        f.reasons.join(';'),
        f.comment,
        f.appVersion,
        f.childId,
        f.parentId,
      ]
        .map(cell)
        .join(','),
    );
  }
  // CRLF per RFC 4180; BOM so Excel reads UTF-8 comments correctly.
  const csv = '﻿' + lines.join('\r\n') + '\r\n';

  const out = arg('--out');
  if (out) {
    writeFileSync(out, csv, 'utf8');
    console.error(`Wrote ${rows.length} feedback row(s) to ${out}`);
  } else {
    process.stdout.write(csv);
  }
}

main()
  .catch((e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
