import { curriculumLoader } from './curriculum-loader.js';
import { GradeCurriculum, CurriculumNode, NodeReward, NodeMastery } from './curriculum.types.js';

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
