import { curriculumLoader } from './curriculum-loader.js';
import { GradeCurriculum, CurriculumNode, NodeReward, NodeMastery } from './curriculum.types.js';
import { GRADE_NUMBER_MAP } from './curriculum.config.js';

export class CurriculumService {
  /**
   * Retrieves curriculum by grade.
   */
  public getCurriculumByGrade(gradeId: string): Readonly<GradeCurriculum> | undefined {
    return curriculumLoader.getCurriculumByGrade(gradeId);
  }

  /**
   * Retrieves lessons by ID.
   */
  public getLessonById(lessonId: string): Readonly<CurriculumNode> | undefined {
    return curriculumLoader.getLesson(lessonId);
  }

  /**
   * Retrieves all lessons in a grade matching a specific subject.
   */
  public getLessonsBySubject(gradeId: string, subject: string): readonly CurriculumNode[] {
    return curriculumLoader.getLessonsBySubject(gradeId, subject);
  }

  /**
   * Retrieves all lessons in a grade matching a specific month.
   */
  public getLessonsByMonth(gradeId: string, month: string): readonly CurriculumNode[] {
    return curriculumLoader.getLessonsByMonth(gradeId, month);
  }

  /**
   * Retrieves all lessons in a grade in curriculum order (sequenced by themes and theme node order).
   */
  public getLessonsInCurriculumOrder(gradeId: string): readonly CurriculumNode[] {
    return curriculumLoader.getLessons(gradeId);
  }

  /**
   * Retrieves all lessons belonging to a specific theme/module across all grades.
   */
  public getLessonsByTheme(themeId: string): readonly CurriculumNode[] {
    const allCurricula = curriculumLoader.loadAllCurricula();
    for (const cur of allCurricula.values()) {
      const theme = cur.themes.find((t) => t.id === themeId);
      if (theme) {
        return theme.nodes;
      }
    }
    return [];
  }

  /**
   * Retrieves prerequisite information for a lesson.
   */
  public getPrerequisites(lessonId: string): readonly string[] {
    const lesson = this.getLessonById(lessonId);
    return lesson ? lesson.prerequisites : [];
  }

  /**
   * Retrieves reward information (XP, coins) for a lesson.
   */
  public getReward(lessonId: string): Readonly<NodeReward> | undefined {
    const lesson = this.getLessonById(lessonId);
    return lesson ? lesson.reward : undefined;
  }

  /**
   * Retrieves mastery information (required_score, attempts) for a lesson.
   */
  public getMastery(lessonId: string): Readonly<NodeMastery> | undefined {
    const lesson = this.getLessonById(lessonId);
    return lesson ? lesson.mastery : undefined;
  }

  /**
   * Resolves the child's age group label to the corresponding curriculum grade key.
   */
  public resolveChildGrade(child: { ageGroup?: string }): string {
    const group = child.ageGroup?.toLowerCase() || '';
    if (group.includes('2') || group.includes('pre')) return 'prenursery';
    if (group.includes('3') || group.includes('nursery')) return 'nursery';
    if (group.includes('4') || group.includes('lkg')) return 'lkg';
    if (group.includes('5') || group.includes('6') || group.includes('ukg')) return 'ukg';
    return 'prenursery';
  }

  /**
   * Resolves the child's age group to its `Skill.originalGrade` number
   * (prenursery=1 … ukg=4). Reuses `resolveChildGrade` for normalization so the
   * many stored `ageGroup` formats (range strings, `PRE_NURSERY`, `lkg`, …) all
   * collapse to one number the Explore garden can filter skill rows by.
   */
  public resolveChildGradeNumber(child: { ageGroup?: string }): number {
    const gradeKey = this.resolveChildGrade(child) as keyof typeof GRADE_NUMBER_MAP;
    return GRADE_NUMBER_MAP[gradeKey] ?? GRADE_NUMBER_MAP.prenursery;
  }

  /**
   * The set of skill codes that belong to a grade, taken straight from that
   * grade's curriculum JSON (each node's `id` is the skill's `skillCode`).
   *
   * This is the authoritative grade filter. `Skill.originalGrade` is null across
   * the seeded dataset, so filtering on it lets every grade through; the skill
   * codes are grade-prefixed and always present, and the loader already owns the
   * per-grade node list. Returns an empty set for an unknown grade, which callers
   * treat as "don't filter" rather than "hide everything".
   */
  public getGradeSkillCodes(gradeKey: string): Set<string> {
    return new Set(curriculumLoader.getLessons(gradeKey).map((n) => n.id));
  }

  /**
   * Retrieves the grade key a specific lesson belongs to.
   */
  public getGradeOfLesson(lessonId: string): string | undefined {
    return curriculumLoader.getLessonIndex(lessonId)?.gradeId;
  }

  /**
   * Retrieves the lesson-level assessment from the curriculum metadata.
   */
  public getAssessment(lessonId: string) {
    const node = this.getLessonById(lessonId);
    return node?.assessment;
  }
}

export const curriculumService = new CurriculumService();
