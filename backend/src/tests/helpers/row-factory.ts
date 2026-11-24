/**
 * Inserts a valid row into any table, driven by the database's own metadata
 * (information_schema + pg_constraint), so deletion tests can put data in
 * every table without a hand-written fixture per table.
 *
 * Required columns get type-appropriate values; required foreign keys get a
 * parent row, created on demand and reused within one factory (catalog rows
 * such as lessons or skills are shared by every family in a test). Columns
 * that refer to `children` or `users` take the ids from `person` so a row
 * belongs to exactly one child and parent.
 */
import crypto from 'crypto';
import { prisma } from '../../config/database.js';

interface Column {
  name: string;
  type: string; // format_type(), e.g. 'text', 'timestamp(3) without time zone', '"SessionStatus"'
  category: string; // pg_type.typcategory: S string, N numeric, B boolean, D date/time, A array, E enum, U user (json/uuid)
  typname: string;
  notNull: boolean;
  hasDefault: boolean;
}

interface Fk {
  column: string;
  references: string;
  key: string;
}

export interface Person {
  childId?: string;
  userId?: string;
}

const meta = new Map<string, { columns: Column[]; fks: Fk[] }>();

async function tableMeta(table: string) {
  const cached = meta.get(table);
  if (cached) return cached;
  const columns = await prisma.$queryRawUnsafe<Column[]>(
    `SELECT a.attname AS name, format_type(a.atttypid, a.atttypmod) AS type, t.typcategory AS category,
            t.typname AS typname, a.attnotnull AS "notNull", a.atthasdef AS "hasDefault"
     FROM pg_attribute a JOIN pg_type t ON t.oid = a.atttypid
     WHERE a.attrelid = $1::regclass AND a.attnum > 0 AND NOT a.attisdropped`,
    `"${table}"`,
  );
  const fks = await prisma.$queryRawUnsafe<Fk[]>(
    `SELECT a.attname AS column, rcl.relname AS references, ra.attname AS key
     FROM pg_constraint c
     JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = c.conkey[1]
     JOIN pg_class rcl ON rcl.oid = c.confrelid
     JOIN pg_attribute ra ON ra.attrelid = c.confrelid AND ra.attnum = c.confkey[1]
     WHERE c.contype = 'f' AND c.conrelid = $1::regclass`,
    `"${table}"`,
  );
  const m = { columns, fks };
  meta.set(table, m);
  return m;
}

async function enumLabel(typname: string): Promise<string> {
  const rows = await prisma.$queryRawUnsafe<{ l: string }[]>(
    `SELECT e.enumlabel AS l FROM pg_enum e JOIN pg_type t ON t.oid = e.enumtypid WHERE t.typname = $1 ORDER BY e.enumsortorder LIMIT 1`,
    typname,
  );
  return rows[0].l;
}

async function valueFor(col: Column): Promise<string> {
  if (col.category === 'E') return enumLabel(col.typname);
  if (col.category === 'A') return '{}';
  if (col.category === 'B') return 'false';
  if (col.category === 'N') return '1';
  if (col.category === 'D') return new Date().toISOString();
  if (col.typname === 'json' || col.typname === 'jsonb') return '{}';
  if (col.typname === 'uuid') return crypto.randomUUID();
  // Text: unique enough for unique constraints, and a valid id for text keys.
  return crypto.randomUUID();
}

/** True when the table has a column referring to children or users. */
async function isPersonTable(table: string): Promise<boolean> {
  const { fks } = await tableMeta(table);
  return table === 'children' || table === 'users' || fks.some((f) => f.references === 'children' || f.references === 'users');
}

async function refersToChild(table: string): Promise<boolean> {
  const { fks } = await tableMeta(table);
  return table === 'children' || fks.some((f) => f.references === 'children');
}

export class RowFactory {
  /** One shared parent row per catalog (non-person) table. */
  private shared = new Map<string, Record<string, unknown>>();
  /** Rows inserted per owner label, per table. */
  readonly ledger = new Map<string, Record<string, number>>();

  /**
   * Inserts a row for `person`, recorded in the ledger under `owner`. Required
   * references to other person-owned tables get a new row for the same person;
   * it is recorded under `owner` if it refers to a child, else under
   * `parentOwner` (a row only the parent owns, e.g. a classroom, is not part of
   * the child's data). References to catalog tables reuse one shared row.
   */
  async insert(
    table: string,
    person: Person,
    overrides: Record<string, string> = {},
    owner = 'catalog',
    parentOwner = owner,
  ): Promise<Record<string, unknown>> {
    const { columns, fks } = await tableMeta(table);
    const names: string[] = [];
    const values: string[] = [];
    const casts: string[] = [];
    for (const col of columns) {
      let value: string | undefined = overrides[col.name];
      const fk = fks.find((f) => f.column === col.name);
      if (value === undefined && fk?.references === 'children') value = person.childId;
      if (value === undefined && fk?.references === 'users') value = person.userId;
      if (value === undefined && fk && col.notNull) {
        const parent = (await isPersonTable(fk.references))
          ? await this.insert(fk.references, person, {}, (await refersToChild(fk.references)) ? owner : parentOwner, parentOwner)
          : await this.sharedRow(fk.references);
        value = String(parent[fk.key]);
      }
      if (value === undefined && col.notNull && !col.hasDefault) value = await valueFor(col);
      if (value === undefined) continue;
      names.push(`"${col.name}"`);
      values.push(value);
      casts.push(`$${values.length}::${col.type}`);
    }
    const rows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
      `INSERT INTO "${table}" (${names.join(', ')}) VALUES (${casts.join(', ')}) RETURNING *`,
      ...values,
    );
    const counts = this.ledger.get(owner) ?? {};
    counts[table] = (counts[table] ?? 0) + 1;
    this.ledger.set(owner, counts);
    return rows[0];
  }

  /** Ledger totals for several owners, per table. */
  owned(...owners: string[]): Record<string, number> {
    const total: Record<string, number> = {};
    for (const o of owners) for (const [t, n] of Object.entries(this.ledger.get(o) ?? {})) total[t] = (total[t] ?? 0) + n;
    return total;
  }

  private async sharedRow(table: string): Promise<Record<string, unknown>> {
    if (table === 'children' || table === 'users') {
      throw new Error(`row-factory: a required reference to ${table} needs a person`);
    }
    let row = this.shared.get(table);
    if (!row) {
      row = await this.insert(table, {});
      this.shared.set(table, row);
    }
    return row;
  }
}

/** Row count of every table in the public schema. */
export async function countAllTables(): Promise<Record<string, number>> {
  const tables = await prisma.$queryRawUnsafe<{ t: string }[]>(
    `SELECT table_name AS t FROM information_schema.tables
     WHERE table_schema = 'public' AND table_type = 'BASE TABLE' AND table_name <> '_prisma_migrations'`,
  );
  const counts: Record<string, number> = {};
  for (const { t } of tables) {
    const r = await prisma.$queryRawUnsafe<{ n: number }[]>(`SELECT count(*)::int AS n FROM "${t}"`);
    counts[t] = r[0].n;
  }
  return counts;
}

/** before - after, per table, non-zero only. */
export function diffCounts(before: Record<string, number>, after: Record<string, number>) {
  const d: Record<string, number> = {};
  for (const t of Object.keys(before)) if (before[t] !== after[t]) d[t] = before[t] - after[t];
  return d;
}
