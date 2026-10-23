/** Baseline questionnaire types. Mirrors backend/src/modules/baseline/baseline.types.ts. */

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

export type BaselineGrade = 'prenursery' | 'nursery' | 'lkg' | 'ukg';

export type ItemType = 'tap_choice' | 'count_tap' | 'match' | 'parent_observed';

export interface ItemOption {
  id: string;
  image?: string;
  label: string;
  /** Parent-observed answers only: 1 yes, 0.5 sometimes, 0 not yet. */
  credit?: number;
}

export interface AssessmentItem {
  id: string;
  domain: BaselineDomain;
  grade: BaselineGrade;
  skill: string;
  difficulty: 1 | 2 | 3;
  type: ItemType;
  prompt_text: string;
  prompt_audio: string | null;
  images: string[];
  options: ItemOption[];
  correct_option: string;
}

export interface ItemBank {
  version: number;
  common: {
    intro_audio: string | null;
    encouragement_text: string;
    encouragement_audio: string | null;
    answer_sound: string | null;
    idk_image: string | null;
    parent_options: ItemOption[];
  };
  items: AssessmentItem[];
}

/** "I don't know" is a real answer, scored like a miss but never shown as wrong. */
export const IDK = '__idk__';

export interface Answer {
  itemId: string;
  domain: BaselineDomain;
  difficulty: 1 | 2 | 3;
  /** Option id, or IDK. */
  response: string;
  /** 0-1. Child items: 1 correct, 0 otherwise. Parent items: the option's credit. */
  credit: number;
  parent: boolean;
}

/** 0 Not yet, 1 Emerging, 2 Developing, 3 Secure. */
export type DomainLevel = 0 | 1 | 2 | 3;

export interface DomainResult {
  level: DomainLevel;
  confidence: 'high' | 'low';
}

/** The record written for the child and sent to POST /children/:id/baseline. */
export interface Baseline {
  child_id: string;
  assessed_at: string;
  grade: BaselineGrade;
  domains: Partial<Record<BaselineDomain, DomainResult>>;
  strengths: BaselineDomain[];
  focus_areas: BaselineDomain[];
  skipped: boolean;
}
