/**
 * Delete a parent account on request (e.g. an email to the support address),
 * with all of its children and their data, and any website waitlist row for
 * the same email.
 *
 *   npx tsx prisma/delete-account-by-email.ts <email>            # dry run: counts only
 *   npx tsx prisma/delete-account-by-email.ts <email> --apply    # deletes
 *
 * Start the command with a space so bash keeps it out of the shell history
 * (Ubuntu's default HISTCONTROL=ignoreboth). The script prints counts only: it
 * never prints the email, names or ids, and it never sends any email. Uses the
 * same deletion plan as DELETE /api/account, in one transaction. Take a
 * pg_dump first.
 */
import { prisma } from '../src/config/database.js';
import {
  countUserData,
  deleteUserForOperator,
  deleteWaitlistForOperator,
} from '../src/modules/account-deletion/account-deletion.service.js';

const args = process.argv.slice(2);
const apply = args.includes('--apply');
const email = args.find((a) => !a.startsWith('--'))?.trim();

const BACKUP_REMINDER = [
  'Reminder: take a backup first, e.g.',
  '  pg_dump "${DATABASE_URL%%\\?*}" --no-owner --no-privileges | gzip > ~/backups/before-account-delete.sql.gz',
  '',
].join('\n');

async function main() {
  if (!email || !email.includes('@')) {
    console.error('Usage: npx tsx prisma/delete-account-by-email.ts <email> [--apply]');
    process.exitCode = 2;
    return;
  }
  console.log(BACKUP_REMINDER);

  const users = await prisma.$queryRawUnsafe<{ id: string; email: string }[]>(
    `SELECT "id", "email" FROM "users" WHERE lower("email") = lower($1)`,
    email,
  );
  const waitlist = await prisma.$queryRawUnsafe<{ n: number }[]>(
    `SELECT count(*)::int AS n FROM "waitlists" WHERE lower("email") = lower($1)`,
    email,
  );
  console.log(`Accounts with this email: ${users.length}`);
  console.log(`Waitlist rows with this email: ${waitlist[0].n}`);

  for (const user of users) {
    console.log('Rows that would be removed (per table, non-zero only):');
    const counts = await countUserData(prisma, user.id, user.email);
    for (const [table, n] of Object.entries(counts)) if (n > 0) console.log(`  ${table.padEnd(48)} ${n}`);
  }

  if (!apply) {
    console.log('\nDry run: nothing deleted. Re-run with --apply to delete.');
    return;
  }
  // Account deletion also removes the waitlist row; this covers a waitlist-only request.
  for (const user of users) await deleteUserForOperator(user.id, user.email);
  const waitlistOnly = await deleteWaitlistForOperator(email);

  const remaining = await prisma.$queryRawUnsafe<{ n: bigint }[]>(
    `SELECT (SELECT count(*) FROM "users" WHERE lower("email") = lower($1))
          + (SELECT count(*) FROM "waitlists" WHERE lower("email") = lower($1)) AS n`,
    email,
  );
  console.log(`\nDone. Accounts deleted: ${users.length}. Further waitlist rows deleted: ${waitlistOnly}.`);
  console.log(`Rows left with this email (accounts + waitlist): ${Number(remaining[0].n)}`);
}

main()
  .catch((error) => {
    console.error('Deletion failed; the transaction was rolled back:', (error as Error).message);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
