import { curriculumService } from '../curriculum/index.js';
import type { CurriculumNode } from '../curriculum/curriculum.types.js';
import { NotFoundError, ValidationError } from '../../utils/errors.js';
import { baselineRepository, BaselineRepository } from './baseline.repository.js';
import type { BaselineBody } from './baseline.validators.js';
import type { BaselineDomain, BaselineRecord, DomainResult } from './baseline.types.js';
import { buildPlacement, domainOfNode, startingLessonFor, EMPTY_PLACEMENT, type Placement } from './placement.js';

type BaselineRow = NonNullable<Awaited<ReturnType<BaselineRepository['findByChildId']>>>;

function toRecord(row: BaselineRow): BaselineRecord {
  return {
    child_id: row.childId,
    assessed_at: row.assessedAt.toISOString(),
    grade: row.grade as BaselineRecord['grade'],
    domains: row.domains as BaselineRecord['domains'],
    strengths: row.strengths as BaselineDomain[],
    focus_areas: row.focusAreas as BaselineDomain[],
    skipped: row.skipped,
  };
}

export class BaselineService {
  constructor(private readonly repo: BaselineRepository = baselineRepository) {}

  async save(childId: string, body: BaselineBody): Promise<{ baseline: BaselineRecord; created: boolean }> {
    if (body.child_id && body.child_id !== childId) {
      throw new ValidationError('child_id does not match the URL');
    }
    if (!(await this.repo.findChild(childId))) throw new NotFoundError('Child profile not found');
    const { row, created } = await this.repo.upsert(childId, body);
    return { baseline: toRecord(row), created };
  }

  async get(childId: string): Promise<BaselineRecord | null> {
    const row = await this.repo.findByChildId(childId);
    return row ? toRecord(row) : null;
  }

  /**
   * Placement for the child's grade, for the roadmap and lesson-access checks.
   * No baseline, a skipped one, or a baseline taken in another grade (the
   * child has since changed age group) → the grade's default starting point.
   */
  async getPlacement(childId: string, gradeId: string, gradeLessons: readonly CurriculumNode[]): Promise<Placement> {
    const baseline = await this.get(childId);
    if (!baseline || baseline.grade !== gradeId) return EMPTY_PLACEMENT;
    return buildPlacement(gradeLessons, baseline);
  }

  /**
   * The lesson a domain starts at for this child, chosen from the curriculum
   * JSON by the baseline level. Null when there is no usable baseline for the
   * domain — callers then use the grade's default first lesson.
   */
  async getStartingLesson(childId: string, domain: BaselineDomain): Promise<CurriculumNode | null> {
    const child = await this.repo.findChild(childId);
    if (!child) throw new NotFoundError('Child profile not found');
    const gradeId = curriculumService.resolveChildGrade(child);
    const baseline = await this.get(childId);
    const result: DomainResult | undefined = baseline?.domains[domain];
    if (!baseline || baseline.skipped || baseline.grade !== gradeId || !result) return null;
    const lessons = curriculumService.getLessonsInCurriculumOrder(gradeId).filter((n) => domainOfNode(n) === domain);
    return startingLessonFor(lessons, result);
  }

  async recordConsent(userId: string, version: string) {
    const saved = await this.repo.recordConsent(userId, version, new Date());
    return { version: saved.parentalConsentVersion, accepted_at: saved.parentalConsentAt?.toISOString() ?? null };
  }
}

export const baselineService = new BaselineService();

/** Convenience export with the spec's name. */
export const getStartingLesson = (childId: string, domain: BaselineDomain) =>
  baselineService.getStartingLesson(childId, domain);
