export const ALLOWED_SUBJECTS = [
  'English',
  'Fine Motor & Cognitive Skills',
  'Social-Emotional Learning & Life Skills',
  'Hindi',
  'Environmental Studies / General Awareness',
  'Maths'
] as const;

export const ALLOWED_MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December'
] as const;

export const GRADES = ['prenursery', 'nursery', 'lkg', 'ukg'] as const;

export const ACTIVITY_STARS_CONFIG: Record<string, number> = {
  video: 1,
  listen: 1,
  speak: 3,
  write: 3,
};

export const GRADE_AGE_GROUP_MAP: Record<string, string> = {
  prenursery: '2–3 years',
  nursery: '3–4 years',
  lkg: '4–5 years',
  ukg: '5–6 years',
};

/**
 * Canonical grade-key -> `Skill.originalGrade` number. Kept in lockstep with the
 * curriculum seeder, where `originalGrade` defaults to the grade's `gradeNumber`
 * (prenursery=1 … ukg=4). This is the single source of truth for turning a
 * normalized grade key into the number the skill rows are tagged with, so the
 * Explore garden can be filtered to exactly the child's grade.
 */
export const GRADE_NUMBER_MAP: Record<(typeof GRADES)[number], number> = {
  prenursery: 1,
  nursery: 2,
  lkg: 3,
  ukg: 4,
};

