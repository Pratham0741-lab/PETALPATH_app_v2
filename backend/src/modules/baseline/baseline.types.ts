/** The eight baseline domains, matching the app's item bank (assessment_items.json). */
export const BASELINE_DOMAINS = [
  'english',
  'maths',
  'hindi',
  'fine_motor',
  'cognitive',
  'sel',
  'life_skills',
  'evs',
] as const;

export type BaselineDomain = (typeof BASELINE_DOMAINS)[number];

export const BASELINE_GRADES = ['prenursery', 'nursery', 'lkg', 'ukg'] as const;
export type BaselineGrade = (typeof BASELINE_GRADES)[number];

/** 0 Not yet, 1 Emerging, 2 Developing, 3 Secure. */
export type DomainLevel = 0 | 1 | 2 | 3;

export interface DomainResult {
  level: DomainLevel;
  confidence: 'high' | 'low';
}

/** The record as stored and as sent over the API (snake_case, per the spec). */
export interface BaselineRecord {
  child_id: string;
  assessed_at: string;
  grade: BaselineGrade;
  domains: Partial<Record<BaselineDomain, DomainResult>>;
  strengths: BaselineDomain[];
  focus_areas: BaselineDomain[];
  skipped: boolean;
}
