import fs from 'fs';
import path from 'path';
import { GradeCurriculum, GradeMetadata, CurriculumNode } from './curriculum.types.js';
import { GRADES } from './curriculum.config.js';
import { validateCurriculum, ValidationErrorDetail, CurriculumValidationError } from './curriculum-validator.js';
import { logger } from '../../utils/logger.js';

/**
 * Deep freezes an object recursively to guarantee absolute immutability.
 */
export function deepFreeze<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }

  // Freeze properties of this object
  Object.freeze(obj);

  // Recursively freeze nested objects/arrays
  Object.getOwnPropertyNames(obj).forEach((prop) => {
    const value = (obj as any)[prop];
    if (value !== null && (typeof value === 'object' || typeof value === 'function')) {
      deepFreeze(value);
    }
  });

  return obj;
}

export class CurriculumLoader {
  private cache = new Map<string, GradeCurriculum>();
  private isLoaded = false;
  private lessonIndexMap = new Map<string, { gradeId: string; themeId: string; node: Readonly<CurriculumNode> }>();


  /**
   * Helper to locate the curriculum cbse directory.
   * Can check process.cwd()/curriculum/cbse or process.cwd()/../curriculum/cbse.
   */
  private getCurriculumDir(): string {
    const primaryPath = path.join(process.cwd(), 'curriculum', 'cbse');
    const secondaryPath = path.join(process.cwd(), '..', 'curriculum', 'cbse');

    if (fs.existsSync(primaryPath)) {
      return primaryPath;
    }
    if (fs.existsSync(secondaryPath)) {
      return secondaryPath;
    }
    // Fallback/Default
    return primaryPath;
  }

  /**
   * Loads all curriculum files, runs validation pipeline, deep-freezes them, and caches them in memory.
   * Fails fast if any validation fails.
   */
  public loadAllCurricula(): ReadonlyMap<string, GradeCurriculum> {
    if (this.isLoaded) {
      return this.cache;
    }

    const curriculumDir = this.getCurriculumDir();
    const allErrors: ValidationErrorDetail[] = [];
    const globalNodeIds = new Set<string>();

    const loadedData: Array<{ gradeId: string; data: any }> = [];

    // 1. Read files and parse JSON
    for (const grade of GRADES) {
      const fileName = `${grade}.json`;
      const filePath = path.join(curriculumDir, fileName);

      if (!fs.existsSync(filePath)) {
        allErrors.push({
          gradeId: grade,
          themeId: 'N/A',
          lessonId: 'N/A',
          validationType: 'JSON Load',
          expected: 'Curriculum JSON file must exist on disk',
          actual: `File not found: ${filePath}`
        });
        continue;
      }

      try {
        const fileContent = fs.readFileSync(filePath, 'utf-8');
        const parsed = JSON.parse(fileContent);

        // Filter out 'identify' activities from all themes and lesson nodes
        if (parsed.themes) {
          for (const theme of parsed.themes) {
            if (theme.nodes) {
              for (const node of theme.nodes) {
                if (node.activities) {
                  node.activities = node.activities.filter((act: any) => act.type !== 'identify');
                }
              }
            }
          }
        }

        loadedData.push({ gradeId: grade, data: parsed });
      } catch (err: any) {
        allErrors.push({
          gradeId: grade,
          themeId: 'N/A',
          lessonId: 'N/A',
          validationType: 'JSON Parse',
          expected: 'File content must be a valid JSON',
          actual: err?.message || String(err)
        });
      }
    }

    // 2. Validate JSON structure & integrity schemas
    if (allErrors.length === 0) {
      for (const item of loadedData) {
        const errors = validateCurriculum(item.data, `${item.gradeId}.json`, globalNodeIds);
        allErrors.push(...errors);
      }
    }

    // 3. Fail fast if any errors collected
    if (allErrors.length > 0) {
      const valError = new CurriculumValidationError(allErrors);
      logger.error('Curriculum validation startup check failed:\n' + valError.formatDiagnostics());
      throw valError;
    }

    // 4. Deep freeze and cache
    for (const item of loadedData) {
      const frozen = deepFreeze(item.data as GradeCurriculum);
      this.cache.set(item.gradeId, frozen);

      // Index all lessons for O(1) lookup
      for (const theme of frozen.themes) {
        for (const node of theme.nodes) {
          this.lessonIndexMap.set(node.id, {
            gradeId: item.gradeId,
            themeId: theme.id,
            node,
          });
        }
      }
    }

    this.isLoaded = true;
    return this.cache;
  }

  /**
   * Retrieves a loaded grade curriculum. Loads them first if not already loaded.
   */
  public getCurriculumByGrade(gradeId: string): Readonly<GradeCurriculum> | undefined {
    this.ensureLoaded();
    return this.cache.get(gradeId);
  }

  /**
   * Retrieves a grade's metadata block.
   */
  public getGradeMetadata(gradeId: string): Readonly<GradeMetadata> | undefined {
    const cur = this.getCurriculumByGrade(gradeId);
    return cur?.grade;
  }

  /**
   * Scans all grades to retrieve a specific lesson node.
   */
  public getLesson(lessonId: string): Readonly<CurriculumNode> | undefined {
    this.ensureLoaded();
    return this.lessonIndexMap.get(lessonId)?.node;
  }

  /**
   * Retrieves lookup index containing grade and theme info for a lesson.
   */
  public getLessonIndex(lessonId: string) {
    this.ensureLoaded();
    return this.lessonIndexMap.get(lessonId);
  }

  /**
   * Retrieves all lessons for a specific grade.
   */
  public getLessons(gradeId: string): readonly CurriculumNode[] {
    const cur = this.getCurriculumByGrade(gradeId);
    if (!cur) return [];
    return cur.themes.flatMap((t) => t.nodes);
  }

  /**
   * Retrieves all lessons matching a specific subject in a grade.
   */
  public getLessonsBySubject(gradeId: string, subject: string): readonly CurriculumNode[] {
    const lessons = this.getLessons(gradeId);
    return lessons.filter((n) => n.curriculum.subject === subject);
  }

  /**
   * Retrieves all lessons matching a specific month in a grade.
   */
  public getLessonsByMonth(gradeId: string, month: string): readonly CurriculumNode[] {
    const lessons = this.getLessons(gradeId);
    return lessons.filter((n) => n.curriculum.month === month);
  }

  /**
   * Retrieves a lesson by theme and order sequence in a grade.
   */
  public getLessonByOrder(gradeId: string, themeId: string, order: number): Readonly<CurriculumNode> | undefined {
    const cur = this.getCurriculumByGrade(gradeId);
    if (!cur) return undefined;
    const theme = cur.themes.find((t) => t.id === themeId);
    return theme?.nodes.find((n) => n.order === order);
  }

  private ensureLoaded(): void {
    if (!this.isLoaded) {
      this.loadAllCurricula();
    }
  }
}

export const curriculumLoader = new CurriculumLoader();
