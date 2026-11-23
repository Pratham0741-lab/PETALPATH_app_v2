/**
 * The four classes a child can be in, for choosing and showing a child's class
 * instead of a bare age.
 *
 * The server still stores an integer `age` and derives the class from it
 * (backend children.service determineAgeGroup: 2 → 2–3, 3 → 3–4, 4 → 4–5,
 * 5 and above → 5–6). Choosing a class therefore sends that class's
 * `age`. Older profiles saved with age 6 still read as UKG.
 */
export type GradeId = 'prenursery' | 'nursery' | 'lkg' | 'ukg';

export interface GradeOption {
  readonly id: GradeId;
  /** Class name shown to parents. */
  readonly name: string;
  /** Age range in years, shown under the name. */
  readonly ages: string;
  /** The age sent to the server when this class is chosen. */
  readonly age: number;
}

export const GRADE_OPTIONS: readonly GradeOption[] = [
  { id: 'prenursery', name: 'Pre-Nursery', ages: '2–3', age: 2 },
  { id: 'nursery', name: 'Nursery', ages: '3–4', age: 3 },
  { id: 'lkg', name: 'LKG', ages: '4–5', age: 4 },
  { id: 'ukg', name: 'UKG', ages: '5–6', age: 5 },
];

/** The class a stored age belongs to (ages above the last class read as it). */
export function gradeForAge(age: number | null | undefined): GradeOption {
  const a = typeof age === 'number' && Number.isFinite(age) ? age : GRADE_OPTIONS[0].age;
  let match = GRADE_OPTIONS[0];
  for (const g of GRADE_OPTIONS) if (a >= g.age) match = g;
  return match;
}

/** "Nursery (3–4 yrs)" */
export function gradeLabel(age: number | null | undefined): string {
  const g = gradeForAge(age);
  return `${g.name} (${g.ages} yrs)`;
}
