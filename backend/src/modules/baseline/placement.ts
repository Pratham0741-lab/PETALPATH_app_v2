/**
 * Baseline placement: where in each domain a child starts.
 *
 * Pure — curriculum nodes and a baseline in, lesson ids out — so it can be
 * unit-tested without a database. The service feeds it the child's grade
 * lessons; the roadmap and the lesson-access check consume the result.
 *
 * The domain → lesson mapping lives in curriculum/baseline/domain-map.json:
 * the curriculum has six subjects, two of which each cover two baseline
 * domains (Fine Motor & Cognitive, SEL & Life Skills), separated by keywords
 * in the lesson's `original_topic`.
 */
import fs from 'fs';
import path from 'path';
import type { CurriculumNode } from '../curriculum/curriculum.types.js';
import { BASELINE_DOMAINS, type BaselineDomain, type BaselineRecord, type DomainResult } from './baseline.types.js';

export interface DomainRule {
  readonly id: BaselineDomain;
  readonly subject: string;
  readonly topicIncludes?: readonly string[];
}

export interface DomainMap {
  readonly domains: readonly DomainRule[];
  readonly levelOffset: Readonly<Record<string, number>>;
}

let cached: DomainMap | null = null;

/** Loads curriculum/baseline/domain-map.json (same lookup as the curriculum loader). */
export function loadDomainMap(): DomainMap {
  if (cached) return cached;
  const candidates = [
    path.join(process.cwd(), 'curriculum', 'baseline', 'domain-map.json'),
    path.join(process.cwd(), '..', 'curriculum', 'baseline', 'domain-map.json'),
  ];
  const file = candidates.find((p) => fs.existsSync(p));
  if (!file) throw new Error('curriculum/baseline/domain-map.json not found');
  const parsed = JSON.parse(fs.readFileSync(file, 'utf-8')) as DomainMap;
  for (const rule of parsed.domains) {
    if (!BASELINE_DOMAINS.includes(rule.id)) {
      throw new Error(`domain-map.json: unknown domain "${rule.id}"`);
    }
  }
  cached = parsed;
  return parsed;
}

/** The baseline domain a lesson belongs to, or null if no rule matches. */
export function domainOfNode(node: CurriculumNode, map: DomainMap = loadDomainMap()): BaselineDomain | null {
  const subject = node.curriculum?.subject;
  const topic = (node.curriculum?.original_topic ?? node.title ?? '').toLowerCase();
  for (const rule of map.domains) {
    if (rule.subject !== subject) continue;
    if (rule.topicIncludes && !rule.topicIncludes.some((k) => topic.includes(k.toLowerCase()))) continue;
    return rule.id;
  }
  return null;
}

/**
 * The lesson a domain starts at for a given baseline level.
 *
 * Levels 0 (Not yet) and 1 (Emerging) start at the domain's first lesson.
 * Higher levels skip ahead by `levelOffset` curriculum-difficulty steps above
 * the domain's easiest lesson, landing on the first lesson (in curriculum
 * order) at or above that difficulty. A low-confidence result starts one step
 * lower, so a lucky guess never jumps a child past what they know.
 *
 * Returns null when the grade has no lessons in the domain.
 */
export function startingLessonFor(
  domainLessons: readonly CurriculumNode[],
  result: DomainResult,
  map: DomainMap = loadDomainMap(),
): CurriculumNode | null {
  if (domainLessons.length === 0) return null;
  let offset = map.levelOffset[String(result.level)] ?? 0;
  if (result.confidence === 'low') offset = Math.max(0, offset - 1);
  if (offset === 0) return domainLessons[0];
  const easiest = Math.min(...domainLessons.map((n) => n.difficulty));
  const target = easiest + offset;
  return domainLessons.find((n) => n.difficulty >= target) ?? domainLessons[0];
}

export interface Placement {
  /** Domain → starting lesson id. */
  readonly startingLessons: ReadonlyMap<BaselineDomain, string>;
  /** Lessons opened by placement: everything up to and including each start. */
  readonly unlocked: ReadonlySet<string>;
  /** Lessons before a start: open, but never chosen as the current lesson. */
  readonly placedPast: ReadonlySet<string>;
}

export const EMPTY_PLACEMENT: Placement = {
  startingLessons: new Map(),
  unlocked: new Set(),
  placedPast: new Set(),
};

/**
 * Placement for a whole grade. A skipped baseline, or a domain with no data,
 * leaves that domain at the grade's default starting point (the normal unlock
 * rules), which is exactly what EMPTY_PLACEMENT produces.
 */
export function buildPlacement(
  gradeLessons: readonly CurriculumNode[],
  baseline: Pick<BaselineRecord, 'domains' | 'skipped'> | null,
  map: DomainMap = loadDomainMap(),
): Placement {
  if (!baseline || baseline.skipped) return EMPTY_PLACEMENT;

  const byDomain = new Map<BaselineDomain, CurriculumNode[]>();
  for (const node of gradeLessons) {
    const d = domainOfNode(node, map);
    if (!d) continue;
    const list = byDomain.get(d) ?? [];
    list.push(node);
    byDomain.set(d, list);
  }

  const startingLessons = new Map<BaselineDomain, string>();
  const unlocked = new Set<string>();
  const placedPast = new Set<string>();
  for (const [domain, result] of Object.entries(baseline.domains) as [BaselineDomain, DomainResult][]) {
    const lessons = byDomain.get(domain) ?? [];
    const start = startingLessonFor(lessons, result, map);
    if (!start) continue;
    startingLessons.set(domain, start.id);
    for (const node of lessons) {
      unlocked.add(node.id);
      if (node.id === start.id) break;
      placedPast.add(node.id);
    }
  }
  return { startingLessons, unlocked, placedPast };
}
