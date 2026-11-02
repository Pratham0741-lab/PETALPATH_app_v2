/**
 * Baseline questionnaire engine: which item comes next, and what the answers
 * mean. Pure — an item bank and the answers so far in, decisions out — so it
 * is unit-testable (features/baseline/__tests__) and the session can resume
 * from the saved answers alone: the next item is a function of them.
 *
 * Adaptive rule, per domain (subject), like a computer-adaptive exam: start at
 * difficulty 2; a correct answer moves up one level, a miss or "I don't know"
 * moves down one. 2-4 items per domain: a domain stops after 4 items, or after
 * 2 consecutive misses at the lowest difficulty (so the child is never
 * frustrated), or when the overall budget (up to 18 items, parent questions
 * included) runs out. The bank holds 3 items per difficulty per domain, so the
 * walk always finds an unused item at exactly the level it wants.
 */
import {
  BASELINE_DOMAINS,
  IDK,
  type Answer,
  type AssessmentItem,
  type Baseline,
  type BaselineDomain,
  type BaselineGrade,
  type DomainLevel,
  type DomainResult,
  type ItemBank,
  type ItemOption,
} from './types';

export interface EngineConfig {
  startDifficulty: 1 | 2 | 3;
  maxItemsPerDomain: number;
  maxTotalItems: number;
  /** Strengths / focus areas listed at most this many each. */
  maxListed: number;
}

export const DEFAULT_ENGINE_CONFIG: EngineConfig = {
  startDifficulty: 2,
  maxItemsPerDomain: 4,
  maxTotalItems: 18,
  maxListed: 3,
};

const clampDifficulty = (d: number) => (d < 1 ? 1 : d > 3 ? 3 : d) as 1 | 2 | 3;

export function itemsFor(bank: ItemBank, grade: BaselineGrade): AssessmentItem[] {
  return bank.items.filter((i) => i.grade === grade);
}

const isParentItem = (i: AssessmentItem) => i.type === 'parent_observed';

/** Domains with child (hands-on) items for the grade, in canonical order. */
export function childDomains(bank: ItemBank, grade: BaselineGrade): BaselineDomain[] {
  const items = itemsFor(bank, grade).filter((i) => !isParentItem(i));
  return BASELINE_DOMAINS.filter((d) => items.some((i) => i.domain === d));
}

export function parentItems(bank: ItemBank, grade: BaselineGrade): AssessmentItem[] {
  const items = itemsFor(bank, grade).filter(isParentItem);
  return BASELINE_DOMAINS.flatMap((d) => items.filter((i) => i.domain === d));
}

/** Options shown for an item: parent items with none use the shared Yes / Sometimes / Not yet. */
export function optionsFor(bank: ItemBank, item: AssessmentItem): ItemOption[] {
  return item.options.length > 0 ? item.options : bank.common.parent_options;
}

/** Credit for a response: 0-1. "I don't know" is always 0. */
export function creditFor(bank: ItemBank, item: AssessmentItem, response: string): number {
  if (response === IDK) return 0;
  if (isParentItem(item)) {
    const opt = optionsFor(bank, item).find((o) => o.id === response);
    if (opt?.credit !== undefined) return opt.credit;
    return response === item.correct_option ? 1 : 0;
  }
  return response === item.correct_option ? 1 : 0;
}

export function makeAnswer(bank: ItemBank, item: AssessmentItem, response: string): Answer {
  return {
    itemId: item.id,
    domain: item.domain,
    difficulty: item.difficulty,
    response,
    credit: creditFor(bank, item, response),
    parent: isParentItem(item),
  };
}

/** Is this domain finished, given its child answers so far? */
export function domainDone(answers: readonly Answer[], config: EngineConfig = DEFAULT_ENGINE_CONFIG): boolean {
  if (answers.length >= config.maxItemsPerDomain) return true;
  const n = answers.length;
  // Early stop: the last two answers were both misses, the second already at
  // the lowest difficulty — going on would only ask easier-than-easiest.
  if (n >= 2 && answers[n - 1].credit === 0 && answers[n - 2].credit === 0 && answers[n - 1].difficulty === 1) {
    return true;
  }
  return false;
}

/** The difficulty the next item in a domain should be, from its answers so far. */
export function nextDifficulty(answers: readonly Answer[], config: EngineConfig = DEFAULT_ENGINE_CONFIG): 1 | 2 | 3 {
  if (answers.length === 0) return config.startDifficulty;
  const last = answers[answers.length - 1];
  return clampDifficulty(last.difficulty + (last.credit >= 1 ? 1 : -1));
}

/**
 * Picks an unused item in the domain closest to the wanted difficulty
 * (preferring easier on ties, so a gap in the bank never makes it harder).
 */
function pickItem(pool: readonly AssessmentItem[], used: ReadonlySet<string>, wanted: number): AssessmentItem | null {
  const free = pool.filter((i) => !used.has(i.id));
  if (free.length === 0) return null;
  return [...free].sort((a, b) => {
    const da = Math.abs(a.difficulty - wanted);
    const db = Math.abs(b.difficulty - wanted);
    if (da !== db) return da - db;
    if (a.difficulty !== b.difficulty) return a.difficulty - b.difficulty;
    return pool.indexOf(a) - pool.indexOf(b);
  })[0];
}

/**
 * The next hands-on item for the child, or null when the child part is done.
 * Parent items are reserved first so the whole questionnaire stays within
 * `maxTotalItems`.
 */
export function nextChildItem(
  bank: ItemBank,
  grade: BaselineGrade,
  answers: readonly Answer[],
  config: EngineConfig = DEFAULT_ENGINE_CONFIG,
): AssessmentItem | null {
  const all = itemsFor(bank, grade);
  const used = new Set(answers.map((a) => a.itemId));
  const childAnswers = answers.filter((a) => !a.parent);
  const reserved = Math.min(parentItems(bank, grade).length, config.maxTotalItems);
  const childBudget = config.maxTotalItems - reserved;
  if (childAnswers.length >= childBudget) return null;

  for (const domain of childDomains(bank, grade)) {
    const domainAnswers = childAnswers.filter((a) => a.domain === domain);
    if (domainDone(domainAnswers, config)) continue;
    const pool = all.filter((i) => i.domain === domain && !isParentItem(i));
    // A domain past its first two items only gets a third if the budget
    // still covers at least two items for each domain not yet started.
    const unstarted = childDomains(bank, grade).filter(
      (d) => !childAnswers.some((a) => a.domain === d) && d !== domain,
    ).length;
    if (domainAnswers.length >= 2 && childAnswers.length + 1 + unstarted * 2 > childBudget) continue;
    const item = pickItem(pool, used, nextDifficulty(domainAnswers, config));
    if (item) return item;
  }
  return null;
}

/** The next parent observation question, or null when the parent part is done. */
export function nextParentItem(
  bank: ItemBank,
  grade: BaselineGrade,
  answers: readonly Answer[],
  config: EngineConfig = DEFAULT_ENGINE_CONFIG,
): AssessmentItem | null {
  if (answers.length >= config.maxTotalItems) return null;
  const used = new Set(answers.map((a) => a.itemId));
  return parentItems(bank, grade).find((i) => !used.has(i.id)) ?? null;
}

// ---------------------------------------------------------------------------
// Scoring
// ---------------------------------------------------------------------------

/**
 * Level from hands-on answers. The level is the highest difficulty answered
 * correctly (none → Not yet). A miss at or below that difficulty contradicts
 * it, so the level drops one step and confidence is low. Confidence is high
 * only for three answers that agree with each other (every correct answer is
 * easier than every miss).
 */
export function scoreChildDomain(answers: readonly Answer[]): DomainResult {
  const correct = answers.filter((a) => a.credit >= 1);
  const missed = answers.filter((a) => a.credit < 1);
  const top = correct.length ? Math.max(...correct.map((a) => a.difficulty)) : 0;
  const lowestMiss = missed.length ? Math.min(...missed.map((a) => a.difficulty)) : Infinity;
  const consistent = lowestMiss > top;
  const level = (consistent ? top : Math.max(0, top - 1)) as DomainLevel;
  return { level, confidence: consistent && answers.length >= 3 ? 'high' : 'low' };
}

/**
 * Level from a parent's observations: the average credit (yes 1, sometimes
 * 0.5, not yet 0) mapped onto the four levels. Confidence is high when the
 * observations agree with each other.
 */
export function scoreParentDomain(answers: readonly Answer[]): DomainResult {
  const avg = answers.reduce((s, a) => s + a.credit, 0) / answers.length;
  const level: DomainLevel = avg >= 0.85 ? 3 : avg >= 0.5 ? 2 : avg > 0 ? 1 : 0;
  const agree = answers.every((a) => a.credit === answers[0].credit);
  return { level, confidence: agree && answers.length >= 2 ? 'high' : 'low' };
}

/** Per-domain results. Domains with no answers are absent ("no data"). */
export function scoreDomains(answers: readonly Answer[]): Partial<Record<BaselineDomain, DomainResult>> {
  const out: Partial<Record<BaselineDomain, DomainResult>> = {};
  for (const domain of BASELINE_DOMAINS) {
    const child = answers.filter((a) => a.domain === domain && !a.parent);
    const parent = answers.filter((a) => a.domain === domain && a.parent);
    if (child.length && parent.length) {
      // Both kinds of evidence: average the levels; disagreement lowers confidence.
      const c = scoreChildDomain(child);
      const p = scoreParentDomain(parent);
      out[domain] = {
        level: Math.floor((c.level + p.level) / 2) as DomainLevel,
        confidence: c.confidence === 'high' && p.confidence === 'high' && Math.abs(c.level - p.level) <= 1 ? 'high' : 'low',
      };
    } else if (child.length) {
      out[domain] = scoreChildDomain(child);
    } else if (parent.length) {
      out[domain] = scoreParentDomain(parent);
    }
  }
  return out;
}

/**
 * Strengths are the highest-level domains and focus areas the lowest, with
 * these rules for the awkward cases:
 *  - Domains with no data are in neither list.
 *  - Ties: every tied domain qualifies; high confidence first, then the
 *    canonical domain order; at most `maxListed` each.
 *  - All domains at the same level: Developing or Secure → all strengths, no
 *    focus areas; Not yet or Emerging → all focus areas, no strengths. A
 *    domain is never in both lists.
 */
export function strengthsAndFocus(
  domains: Partial<Record<BaselineDomain, DomainResult>>,
  config: EngineConfig = DEFAULT_ENGINE_CONFIG,
): { strengths: BaselineDomain[]; focus_areas: BaselineDomain[] } {
  const scored = BASELINE_DOMAINS.filter((d) => domains[d]);
  if (scored.length === 0) return { strengths: [], focus_areas: [] };

  const order = (list: BaselineDomain[]) =>
    [...list]
      .sort((a, b) => {
        const ca = domains[a]!.confidence === 'high' ? 0 : 1;
        const cb = domains[b]!.confidence === 'high' ? 0 : 1;
        return ca - cb || BASELINE_DOMAINS.indexOf(a) - BASELINE_DOMAINS.indexOf(b);
      })
      .slice(0, config.maxListed);

  const levels = scored.map((d) => domains[d]!.level);
  const max = Math.max(...levels);
  const min = Math.min(...levels);
  const atMax = scored.filter((d) => domains[d]!.level === max);
  const atMin = scored.filter((d) => domains[d]!.level === min);

  if (max === min) {
    return max >= 2 ? { strengths: order(atMax), focus_areas: [] } : { strengths: [], focus_areas: order(atMin) };
  }
  return { strengths: order(atMax), focus_areas: order(atMin) };
}

export function buildBaseline(
  childId: string,
  grade: BaselineGrade,
  answers: readonly Answer[],
  assessedAt: Date,
  config: EngineConfig = DEFAULT_ENGINE_CONFIG,
): Baseline {
  const domains = scoreDomains(answers);
  const { strengths, focus_areas } = strengthsAndFocus(domains, config);
  return {
    child_id: childId,
    assessed_at: assessedAt.toISOString(),
    grade,
    domains,
    strengths,
    focus_areas,
    skipped: false,
  };
}

/** Skipped: no results, so every domain uses the grade's default starting point. */
export function skippedBaseline(childId: string, grade: BaselineGrade, at: Date): Baseline {
  return {
    child_id: childId,
    assessed_at: at.toISOString(),
    grade,
    domains: {},
    strengths: [],
    focus_areas: [],
    skipped: true,
  };
}

/** Grade from the child's age group — same rule as the backend's resolveChildGrade. */
export function gradeForAgeGroup(ageGroup: string | null | undefined): BaselineGrade {
  const g = (ageGroup ?? '').toLowerCase();
  if (g.includes('2') || g.includes('pre')) return 'prenursery';
  if (g.includes('3') || g.includes('nursery')) return 'nursery';
  if (g.includes('4') || g.includes('lkg')) return 'lkg';
  if (g.includes('5') || g.includes('6') || g.includes('ukg')) return 'ukg';
  return 'prenursery';
}
