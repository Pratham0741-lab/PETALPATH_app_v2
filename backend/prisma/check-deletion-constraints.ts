/**
 * Read-only: compares this database's real foreign keys with schema.prisma and
 * checks that the deletion plan covers every reference to a child or a parent.
 * Run it on a server before deploying deletion.
 *
 *   npx tsx prisma/check-deletion-constraints.ts
 *
 * Prints table and column names only, never data. Exit code 1 when the plan
 * misses a reference.
 */
import { Prisma } from '@prisma/client';
import { prisma } from '../src/config/database.js';
import { missingFromPlan } from '../src/modules/account-deletion/deletion-plan.js';

const RULE: Record<string, string> = { a: 'NO ACTION', r: 'RESTRICT', c: 'CASCADE', n: 'SET NULL', d: 'SET DEFAULT' };
const SCHEMA_RULE: Record<string, string> = { Cascade: 'CASCADE', SetNull: 'SET NULL', Restrict: 'RESTRICT', NoAction: 'NO ACTION' };

async function main() {
  const fks = await prisma.$queryRawUnsafe<{ tbl: string; col: string; ref: string; rule: string }[]>(`
    SELECT cl.relname AS tbl, a.attname AS col, rcl.relname AS ref, c.confdeltype::text AS rule
    FROM pg_constraint c
    JOIN pg_class cl ON cl.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = cl.relnamespace
    JOIN pg_class rcl ON rcl.oid = c.confrelid
    JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = c.conkey[1]
    WHERE c.contype = 'f' AND n.nspname = 'public'`);
  const byKey = new Map(fks.map((f) => [`${f.tbl}.${f.col}`, f]));

  let mismatches = 0;
  const models = Prisma.dmmf.datamodel.models;
  const tableOf = Object.fromEntries(models.map((m) => [m.name, m.dbName ?? m.name]));
  for (const m of models) {
    for (const f of m.fields) {
      if (f.kind !== 'object' || !f.relationFromFields?.length) continue;
      const colField = m.fields.find((x) => x.name === f.relationFromFields![0])!;
      const key = `${tableOf[m.name]}.${colField.dbName ?? colField.name}`;
      const wanted = SCHEMA_RULE[f.relationOnDelete ?? ''] ?? (colField.isRequired ? 'RESTRICT' : 'SET NULL');
      const real = byKey.get(key);
      const actual = real ? RULE[real.rule] : 'NO CONSTRAINT';
      if (actual !== wanted) {
        mismatches++;
        console.log(`MISMATCH  ${key.padEnd(44)} schema=${wanted.padEnd(9)} database=${actual}`);
      }
    }
  }
  console.log(`schema.prisma vs database: ${mismatches} mismatch(es)`);

  const missing = missingFromPlan(fks.map((f) => ({ table: f.tbl, column: f.col, references: f.ref })));
  for (const key of missing) console.log(`NOT IN DELETION PLAN  ${key}`);
  console.log(`deletion plan coverage: ${missing.length === 0 ? 'complete' : `${missing.length} missing`}`);
  if (missing.length > 0) process.exitCode = 1;
}

main().finally(() => prisma.$disconnect());
