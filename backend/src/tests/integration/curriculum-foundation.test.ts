import { validateCurriculum, ValidationErrorDetail } from '../../modules/curriculum/curriculum-validator.js';
import { curriculumLoader } from '../../modules/curriculum/curriculum-loader.js';
import { GRADES } from '../../modules/curriculum/curriculum.config.js';

describe('Curriculum Foundation - Schema and Integrity Validation', () => {
  const validMockNode = {
    id: 'pn_test_lesson',
    title: 'Test Lesson',
    order: 1,
    difficulty: 1,
    estimated_minutes: 5,
    prerequisites: [],
    activities: [
      {
        type: 'listen',
        difficulty: 1,
        estimated_minutes: 2,
        repeatable: true
      }
    ],
    reward: {
      xp: 10,
      coins: 5
    },
    mastery: {
      required_score: 80,
      attempts: 3
    },
    curriculum: {
      subject: 'English',
      month: 'April',
      learning_outcome: 'Outcome here',
      original_topic: 'Topic here'
    }
  };

  const createValidMockGrade = (nodes: any[] = [validMockNode]) => ({
    grade: {
      id: 'pre_nursery',
      name: 'Pre-Nursery',
      description: 'Play and oral-based learning'
    },
    themes: [
      {
        id: 'theme_1',
        title: 'Theme 1',
        order: 1,
        nodes
      }
    ]
  });

  it('passes validation for fully valid schema structure', () => {
    const validData = createValidMockGrade();
    const errors = validateCurriculum(validData, 'prenursery.json');
    expect(errors).toHaveLength(0);
  });

  it('fails validation when mandatory grade metadata is missing', () => {
    const data: any = {
      themes: []
    };
    const errors = validateCurriculum(data, 'prenursery.json');
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].validationType).toBe('Metadata Presence');
  });

  it('fails validation when lesson IDs are duplicate within the grade', () => {
    const data = createValidMockGrade([
      { ...validMockNode, id: 'dup_id', order: 1 },
      { ...validMockNode, id: 'dup_id', order: 2 }
    ]);
    const errors = validateCurriculum(data, 'prenursery.json');
    const idErrors = errors.filter(e => e.validationType === 'ID Uniqueness');
    expect(idErrors).toHaveLength(1);
    expect(idErrors[0].actual).toContain("Duplicate lesson ID 'dup_id'");
  });

  it('fails validation when a theme has duplicate order values', () => {
    const data = {
      grade: { id: 'pn', name: 'PN', description: 'Desc' },
      themes: [
        { id: 'theme1', title: 'T1', order: 1, nodes: [validMockNode] },
        { id: 'theme2', title: 'T2', order: 1, nodes: [validMockNode] }
      ]
    };
    const errors = validateCurriculum(data, 'prenursery.json');
    const orderErrors = errors.filter(e => e.validationType === 'Order Integrity');
    expect(orderErrors).toHaveLength(1);
    expect(orderErrors[0].actual).toContain("Duplicate theme order '1'");
  });

  it('fails validation when a node has duplicate order values within a theme', () => {
    const data = createValidMockGrade([
      { ...validMockNode, id: 'lesson_1', order: 1 },
      { ...validMockNode, id: 'lesson_2', order: 1 }
    ]);
    const errors = validateCurriculum(data, 'prenursery.json');
    const orderErrors = errors.filter(e => e.validationType === 'Order Integrity');
    expect(orderErrors).toHaveLength(1);
    expect(orderErrors[0].actual).toContain("Duplicate lesson order '1'");
  });

  it('fails validation when activities array is empty', () => {
    const data = createValidMockGrade([
      { ...validMockNode, activities: [] }
    ]);
    const errors = validateCurriculum(data, 'prenursery.json');
    const actErrors = errors.filter(e => e.validationType === 'Business Rules');
    expect(actErrors).toHaveLength(1);
    expect(actErrors[0].expected).toContain('Activities array must not be empty');
  });

  it('fails validation when a lesson has duplicate activity types', () => {
    const data = createValidMockGrade([
      {
        ...validMockNode,
        activities: [
          { type: 'listen', difficulty: 1, estimated_minutes: 2, repeatable: true },
          { type: 'listen', difficulty: 2, estimated_minutes: 3, repeatable: false }
        ]
      }
    ]);
    const errors = validateCurriculum(data, 'prenursery.json');
    const actErrors = errors.filter(e => e.validationType === 'Business Rules');
    expect(actErrors).toHaveLength(1);
    expect(actErrors[0].actual).toContain("Duplicate activity type 'listen'");
  });

  it('fails validation when a prerequisite lesson does not exist in the same grade', () => {
    const data = createValidMockGrade([
      { ...validMockNode, id: 'lesson_a', prerequisites: ['non_existent_prereq'] }
    ]);
    const errors = validateCurriculum(data, 'prenursery.json');
    const refErrors = errors.filter(e => e.validationType === 'Reference Check');
    expect(refErrors).toHaveLength(1);
    expect(refErrors[0].actual).toContain("'non_existent_prereq' (non-existent ID)");
  });

  it('fails validation when a lesson references itself as a prerequisite', () => {
    const data = createValidMockGrade([
      { ...validMockNode, id: 'lesson_a', prerequisites: ['lesson_a'] }
    ]);
    const errors = validateCurriculum(data, 'prenursery.json');
    const refErrors = errors.filter(e => e.validationType === 'Reference Check');
    expect(refErrors.some(e => e.expected.includes('must not list itself as a prerequisite'))).toBe(true);
  });

  it('fails validation when prerequisite circular dependencies are detected', () => {
    const data = createValidMockGrade([
      { ...validMockNode, id: 'lesson_a', prerequisites: ['lesson_b'], order: 1 },
      { ...validMockNode, id: 'lesson_b', prerequisites: ['lesson_a'], order: 2 }
    ]);
    const errors = validateCurriculum(data, 'prenursery.json');
    const cycleErrors = errors.filter(e => e.validationType === 'DAG Cycle Detection');
    expect(cycleErrors).toHaveLength(1);
    expect(cycleErrors[0].actual).toContain('Prerequisite dependency cycle detected');
  });

  it('fails validation when rewards contain invalid non-negative thresholds', () => {
    const data = createValidMockGrade([
      { ...validMockNode, reward: { xp: -10, coins: 5 } }
    ]);
    const errors = validateCurriculum(data, 'prenursery.json');
    const rewardErrors = errors.filter(e => e.validationType === 'Business Rules');
    expect(rewardErrors).toHaveLength(1);
    expect(rewardErrors[0].expected).toContain('Reward xp must be a non-negative integer');
  });

  it('fails validation when mastery required score is out of bounds', () => {
    const data = createValidMockGrade([
      { ...validMockNode, mastery: { required_score: 105, attempts: 3 } }
    ]);
    const errors = validateCurriculum(data, 'prenursery.json');
    const masteryErrors = errors.filter(e => e.validationType === 'Business Rules');
    expect(masteryErrors).toHaveLength(1);
    expect(masteryErrors[0].expected).toContain('required_score must be between 0 and 100');
  });

  it('fails validation when curriculum subject is not allowed', () => {
    const data = createValidMockGrade([
      { ...validMockNode, curriculum: { ...validMockNode.curriculum, subject: 'Astronomy' } }
    ]);
    const errors = validateCurriculum(data, 'prenursery.json');
    const subjectErrors = errors.filter(e => e.validationType === 'Business Rules');
    expect(subjectErrors).toHaveLength(1);
    expect(subjectErrors[0].actual).toBe("'Astronomy'");
  });

  it('fails validation when curriculum month is not allowed', () => {
    const data = createValidMockGrade([
      { ...validMockNode, curriculum: { ...validMockNode.curriculum, month: 'Undecimber' } }
    ]);
    const errors = validateCurriculum(data, 'prenursery.json');
    const monthErrors = errors.filter(e => e.validationType === 'Business Rules');
    expect(monthErrors).toHaveLength(1);
    expect(monthErrors[0].actual).toBe("'Undecimber'");
  });
});

describe('Curriculum Loader & Caching Service', () => {
  beforeAll(() => {
    // Ensure all curricula are loaded and cached
    curriculumLoader.loadAllCurricula();
  });

  it('successfully loads all grade JSON curriculum configurations', () => {
    for (const grade of GRADES) {
      const cur = curriculumLoader.getCurriculumByGrade(grade);
      expect(cur).toBeDefined();
      expect(cur?.grade.id).toBeDefined();
      expect(cur?.themes.length).toBeGreaterThan(0);
    }
  });

  it('enforces deep-freezing immutability on cached items', () => {
    const cur = curriculumLoader.getCurriculumByGrade('prenursery') as any;
    expect(cur).toBeDefined();
    expect(Object.isFrozen(cur)).toBe(true);
    expect(Object.isFrozen(cur.grade)).toBe(true);
    expect(Object.isFrozen(cur.themes)).toBe(true);
    expect(Object.isFrozen(cur.themes[0])).toBe(true);
    expect(Object.isFrozen(cur.themes[0].nodes[0])).toBe(true);

    expect(() => {
      cur.grade.name = 'Mutated Grade Name';
    }).toThrow();
  });

  it('exposes getter helpers correctly', () => {
    const metadata = curriculumLoader.getGradeMetadata('prenursery');
    expect(metadata).toBeDefined();
    expect(metadata?.name).toBe('Pre-Nursery');

    const allLessons = curriculumLoader.getLessons('prenursery');
    expect(allLessons.length).toBeGreaterThan(0);

    const firstLessonId = allLessons[0].id;
    const lesson = curriculumLoader.getLesson(firstLessonId);
    expect(lesson).toBeDefined();
    expect(lesson?.id).toBe(firstLessonId);

    // Subject filtering helper
    const englishLessons = curriculumLoader.getLessonsBySubject('prenursery', 'English');
    expect(englishLessons.length).toBeGreaterThan(0);
    expect(englishLessons.every(l => l.curriculum.subject === 'English')).toBe(true);

    // Month filtering helper
    const aprilLessons = curriculumLoader.getLessonsByMonth('prenursery', 'April');
    expect(aprilLessons.length).toBeGreaterThan(0);
    expect(aprilLessons.every(l => l.curriculum.month === 'April')).toBe(true);

    // Order getter helper
    const orderLesson = curriculumLoader.getLessonByOrder('prenursery', 'settling_in', 1);
    expect(orderLesson).toBeDefined();
    expect(orderLesson?.id).toBe('pn_free_play_and_settlingin');
  });
});
