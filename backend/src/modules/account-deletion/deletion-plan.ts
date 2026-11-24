/**
 * What deleting a child or a parent account removes, table by table.
 *
 * Deletion never relies on ON DELETE CASCADE. Every table that holds a child's
 * or a parent's data is listed here and deleted explicitly, dependents first,
 * so the result is the same whatever the database's constraint rules are (a
 * production database whose constraints drifted from schema.prisma included).
 * The FK constraints still act as a safety net: a row this plan missed would
 * either cascade or make the transaction fail, never be left silently.
 *
 * deletion-plan.test.ts checks this list against both the real constraints in
 * the database (pg_constraint) and schema.prisma: adding a table that refers to
 * children or users without adding it here fails the build.
 *
 * Table and column names are SQL identifiers taken only from this file; they
 * are validated below and never come from a request.
 */

/** Rows whose `column` holds the id directly. */
export interface DirectStep {
  readonly table: string;
  readonly column: string;
}

/**
 * Rows reached through another table: `table.column` refers to
 * `via.table.via.key`, and the `via` rows are found by `via.column`.
 */
export interface ViaStep extends DirectStep {
  readonly via: { readonly table: string; readonly key: string; readonly column: string };
}

export type Step = DirectStep | ViaStep;

export const isVia = (s: Step): s is ViaStep => 'via' in s;

/**
 * Everything about one or more children, deleted by child id. Dependents of
 * child-keyed tables come first; `children` itself is not in this list (the
 * service deletes it last, scoped to the owning parent).
 */
export const CHILD_STEPS: readonly Step[] = [
  // Rows that hang off a child's session plans and learning events.
  { table: 'session_events', column: 'session_plan_id', via: { table: 'session_plans', key: 'id', column: 'child_id' } },
  { table: 'session_blocks', column: 'session_plan_id', via: { table: 'session_plans', key: 'id', column: 'child_id' } },
  { table: 'learning_evidence', column: 'event_id', via: { table: 'learning_events', key: 'event_id', column: 'child_id' } },
  // practices.debt_id refers to learning_debts, so practices go first.
  { table: 'practices', column: 'child_id' },

  // Progress, mastery, scores and rewards.
  { table: 'LessonProgress', column: 'childId' },
  { table: 'Questionnaire', column: 'childId' },
  { table: 'Reward', column: 'childId' },
  { table: 'video_progress', column: 'child_id' },
  { table: 'listen_progress', column: 'child_id' },
  { table: 'speak_progress', column: 'child_id' },
  { table: 'write_progress', column: 'child_id' },
  { table: 'story_progress', column: 'child_id' },
  { table: 'module_progress', column: 'child_id' },
  { table: 'category_progress', column: 'child_id' },
  { table: 'stars', column: 'child_id' },
  { table: 'child_stickers', column: 'child_id' },
  { table: 'child_badges', column: 'child_id' },
  { table: 'child_baselines', column: 'child_id' },
  { table: 'child_skill_curriculum', column: 'child_id' },
  { table: 'assessment_attempts', column: 'child_id' },
  { table: 'knowledge_states', column: 'child_id' },
  { table: 'topic_states', column: 'child_id' },
  { table: 'skill_health', column: 'child_id' },
  { table: 'skill_history', column: 'child_id' },
  { table: 'learner_state', column: 'child_id' },
  { table: 'learning_profiles', column: 'child_id' },
  { table: 'learning_debts', column: 'child_id' },
  { table: 'learning_evidence', column: 'child_id' },
  { table: 'learning_events', column: 'child_id' },
  { table: 'modality_performances', column: 'child_id' },
  { table: 'recovery_modes', column: 'child_id' },
  { table: 'regression_logs', column: 'child_id' },
  { table: 'reinforcement_events', column: 'child_id' },
  { table: 'reinforcement_history', column: 'child_id' },
  { table: 'reinforcement_queue', column: 'child_id' },
  { table: 'topic_reinforcement_queues', column: 'child_id' },
  { table: 'adaptation_events', column: 'child_id' },
  { table: 'dynamic_roadmaps', column: 'child_id' },
  { table: 'session_plans', column: 'child_id' },

  // Analytics about the child.
  { table: 'analytics_histories', column: 'child_id' },
  { table: 'analytics_snapshots', column: 'child_id' },
  { table: 'metric_snapshots', column: 'child_id' },
  { table: 'subject_analytics', column: 'child_id' },
  { table: 'trend_events', column: 'child_id' },

  // Feedback written about the child's lessons, messages, classroom places.
  { table: 'feedback', column: 'child_id' },
  { table: 'notifications', column: 'child_id' },
  { table: 'classroom_learners', column: 'child_id' },
];

/**
 * Everything keyed to the parent account itself, deleted by user id, before
 * the parent's children (CHILD_STEPS) and the `users` row.
 */
export const USER_STEPS: readonly Step[] = [
  // Classrooms the account runs as a teacher, and their enrolments.
  { table: 'classroom_learners', column: 'classroom_id', via: { table: 'classrooms', key: 'id', column: 'teacher_id' } },
  { table: 'classrooms', column: 'teacher_id' },
  { table: 'notifications', column: 'user_id' },
  { table: 'feedback', column: 'parent_id' },
  { table: 'refresh_tokens', column: 'user_id' },
];

/** The owning tables, deleted last by the service. */
export const CHILDREN_TABLE: DirectStep = { table: 'children', column: 'user_id' };
export const USERS_TABLE = 'users';

const IDENTIFIER = /^[A-Za-z_][A-Za-z0-9_]*$/;
for (const s of [...CHILD_STEPS, ...USER_STEPS, CHILDREN_TABLE]) {
  const names = [s.table, s.column, ...(isVia(s) ? [s.via.table, s.via.key, s.via.column] : [])];
  for (const n of names) if (!IDENTIFIER.test(n)) throw new Error(`deletion-plan: bad identifier "${n}"`);
}

const q = (identifier: string) => `"${identifier}"`;

/** `WHERE` clause selecting a step's rows for the ids in $param (a text[]). */
export function whereFor(step: Step, param = 1): string {
  const ids = `$${param}::text[]`;
  if (isVia(step)) {
    return `${q(step.column)} IN (SELECT ${q(step.via.key)} FROM ${q(step.via.table)} WHERE ${q(step.via.column)} = ANY(${ids}))`;
  }
  return `${q(step.column)} = ANY(${ids})`;
}

export const deleteSql = (step: Step) => `DELETE FROM ${q(step.table)} WHERE ${whereFor(step)}`;

/**
 * Count queries for a dry run, one per table: each counts the DISTINCT rows
 * that any of the given steps would delete from that table. A row reachable
 * by two steps (e.g. a notification carrying both the parent's and the
 * child's id) is deleted once, so it is counted once. Parameters: $1 user
 * ids, $2 child ids.
 */
export function countQueries(
  userSteps: readonly Step[],
  childSteps: readonly Step[],
): { table: string; sql: string }[] {
  const byTable = new Map<string, string[]>();
  const add = (step: Step, param: number) => {
    const clauses = byTable.get(step.table) ?? [];
    clauses.push(`(${whereFor(step, param)})`);
    byTable.set(step.table, clauses);
  };
  userSteps.forEach((s) => add(s, 1));
  childSteps.forEach((s) => add(s, 2));
  return [...byTable].map(([table, clauses]) => ({
    table,
    sql: `SELECT count(*)::int AS n FROM ${q(table)} WHERE ${clauses.join(' OR ')}`,
  }));
}

/* -------------------------------------------------------------------------- */
/* Coverage: is every reference to a deleted row handled?                      */
/* -------------------------------------------------------------------------- */

export interface ForeignKey {
  readonly table: string;
  readonly column: string;
  readonly references: string;
}

/**
 * References into deleted tables that the plan deliberately does not follow,
 * with the reason. Anything else pointing at a deleted table must be a step.
 */
export const NOT_FOLLOWED: Readonly<Record<string, string>> = {
  'children.user_id': 'children are deleted by the service, after USER_STEPS',
  'practices.debt_id': 'practices are deleted by child_id before learning_debts',
};

/**
 * Foreign keys that point at a table this plan deletes from (or at children /
 * users) but are not handled by any step. Empty means the plan is complete for
 * the given set of constraints.
 */
export function missingFromPlan(fks: readonly ForeignKey[]): string[] {
  const steps = [...CHILD_STEPS, ...USER_STEPS];
  const handled = new Set(steps.map((s) => `${s.table}.${s.column}`));
  const deletedTables = new Set(['children', USERS_TABLE, ...steps.map((s) => s.table)]);
  return fks
    .filter((fk) => deletedTables.has(fk.references))
    .map((fk) => `${fk.table}.${fk.column}`)
    .filter((key) => !handled.has(key) && !(key in NOT_FOLLOWED))
    .sort();
}
