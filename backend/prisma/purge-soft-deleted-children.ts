/**
 * One-time purge of child profiles the old "delete" only marked deleted
 * (children.deleted_at set), together with all of their data.
 *
 *   npx tsx prisma/purge-soft-deleted-children.ts           # dry run: counts only
 *   npx tsx prisma/purge-soft-deleted-children.ts --apply   # deletes
 *
 * Prints counts per table, never names or ids. Uses the same deletion plan as
 * DELETE /api/children/:id (src/modules/account-deletion/deletion-plan.ts), in
 * one transaction. Take a pg_dump first.
 */
import { prisma } from '../src/config/database.js';
import {
  countChildrenData,
  purgeChildrenForOperator,
} from '../src/modules/account-deletion/account-deletion.service.js';

const apply = process.argv.includes('--apply');

const BACKUP_REMINDER = [
  'Reminder: take a backup first, e.g.',
  '  pg_dump "${DATABASE_URL%%\\?*}" --no-owner --no-privileges | gzip > ~/backups/before-purge.sql.gz',
  '',
].join('\n');

function printCounts(counts: Record<string, number>) {
  for (const [table, n] of Object.entries(counts)) if (n > 0) console.log(`  ${table.padEnd(48)} ${n}`);
}

async function main() {
  console.log(BACKUP_REMINDER);

  const rows = await prisma.$queryRawUnsafe<{ id: string }[]>(
    `SELECT "id" FROM "children" WHERE "deleted_at" IS NOT NULL`,
  );
  const ids = rows.map((r) => r.id);
  console.log(`Child profiles marked deleted: ${ids.length}`);
  if (ids.length === 0) return;

  console.log('Rows that would be removed (per table, non-zero only):');
  printCounts(await countChildrenData(prisma, ids));

  if (!apply) {
    console.log('\nDry run: nothing deleted. Re-run with --apply to delete.');
    return;
  }
  await purgeChildrenForOperator(ids);
  const left = await prisma.$queryRawUnsafe<{ n: number }[]>(
    `SELECT count(*)::int AS n FROM "children" WHERE "deleted_at" IS NOT NULL`,
  );
  console.log(`\nDone. Child profiles marked deleted remaining: ${left[0].n}`);
}

main()
  .catch((error) => {
    console.error('Purge failed; the transaction was rolled back:', (error as Error).message);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
