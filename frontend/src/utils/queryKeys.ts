export const queryKeys = {
  auth: {
    me: ['auth', 'me'] as const,
    session: ['auth', 'session'] as const,
  },
  children: {
    all: ['children'] as const,
    detail: (id: string) => ['children', id] as const,
  },
  dashboard: {
    overview: (childId: string) => ['dashboard', 'overview', childId] as const,
    stats: (childId: string) => ['dashboard', 'stats', childId] as const,
  },
  roadmap: {
    all: (childId: string) => ['roadmap', childId] as const,
    detail: (childId: string, lessonId: string) => ['roadmap', childId, 'lesson', lessonId] as const,
  },
  curriculum: {
    all: ['curriculum'] as const,
  },
  lessons: {
    all: ['lessons'] as const,
    detail: (id: string) => ['lessons', id] as const,
    byModule: (moduleId: string) => ['lessons', 'module', moduleId] as const,
    byCategory: (categoryId: string) => ['lessons', 'category', categoryId] as const,
  },
  activities: {
    byLesson: (lessonId: string) => ['activities', lessonId] as const,
    detail: (id: string) => ['activities', id] as const,
  },
  progress: {
    overview: (childId: string) => ['progress', 'overview', childId] as const,
    child: (childId: string) => ['progress', childId] as const,
    lesson: (childId: string, lessonId: string) => ['progress', childId, lessonId] as const,
  },
  mastery: {
    child: (childId: string) => ['mastery', childId] as const,
    skill: (childId: string, skillId: string) => ['mastery', childId, skillId] as const,
  },
  recommendations: {
    child: (childId: string) => ['recommendations', childId] as const,
    adaptive: (childId: string) => ['recommendations', 'adaptive', childId] as const,
    reinforcement: (childId: string) => ['recommendations', 'reinforcement', childId] as const,
    aiTutor: (childId: string) => ['recommendations', 'ai-tutor', childId] as const,
  },
  rewards: {
    all: (childId: string) => ['rewards', childId] as const,
    overview: (childId: string) => ['rewards', 'overview', childId] as const,
    stickers: (childId: string) => ['rewards', 'stickers', childId] as const,
    badges: (childId: string) => ['rewards', 'badges', childId] as const,
    xp: (childId: string) => ['rewards', 'xp', childId] as const,
    coins: (childId: string) => ['rewards', 'coins', childId] as const,
    achievements: (childId: string) => ['rewards', 'achievements', childId] as const,
    challenges: (childId: string) => ['rewards', 'challenges', childId] as const,
    streak: (childId: string) => ['rewards', 'streak', childId] as const,
    history: (childId: string) => ['rewards', 'history', childId] as const,
  },
  placements: {
    child: (childId: string) => ['placements', childId] as const,
  },
  mentors: {
    all: ['mentors'] as const,
    detail: (id: string) => ['mentors', id] as const,
  },
  assessments: {
    all: ['assessments'] as const,
    detail: (id: string) => ['assessments', id] as const,
    attempts: (childId: string) => ['assessments', 'attempts', childId] as const,
    attempt: (childId: string, attemptId: string) => ['assessments', 'attempts', childId, attemptId] as const,
  },
  placement: {
    questionnaire: (ageGroup?: string) => ['placement', 'questionnaire', ageGroup] as const,
    result: (childId: string, attemptId: string) => ['placement', 'result', childId, attemptId] as const,
  },
  notifications: {
    all: ['notifications'] as const,
    unread: ['notifications', 'unread'] as const,
  },
  stories: {
    all: ['stories'] as const,
    detail: (id: string) => ['stories', id] as const,
  },
  quiz: {
    detail: (id: string) => ['quiz', id] as const,
    submit: (id: string) => ['quiz', 'submit', id] as const,
  },
  game: {
    detail: (id: string) => ['game', id] as const,
  },
  reading: {
    detail: (id: string) => ['reading', id] as const,
  },
  activityProgress: {
    video: (id: string) => ['activityProgress', 'video', id] as const,
    listen: (id: string) => ['activityProgress', 'listen', id] as const,
    speak: (id: string) => ['activityProgress', 'speak', id] as const,
    write: (id: string) => ['activityProgress', 'write', id] as const,
  },
  analytics: {
    overview: (childId: string) => ['analytics', 'overview', childId] as const,
    activity: (childId: string, period: string) => ['analytics', 'activity', period, childId] as const,
    progress: (childId: string) => ['analytics', 'progress', childId] as const,
    rewards: (childId: string) => ['analytics', 'rewards', childId] as const,
    timeline: (childId: string, page: number) => ['analytics', 'timeline', childId, page] as const,
    subjects: (childId: string) => ['analytics', 'subjects', childId] as const,
    report: (childId: string, window: string) => ['analytics', 'report', window, childId] as const,
    trends: (childId: string) => ['analytics', 'trends', childId] as const,
  },
  parent: {
    dashboard: (childId: string) => ['parent', 'dashboard', childId] as const,
    curriculum: (childId: string) => ['parent', 'curriculum', childId] as const,
    weeklyReport: (childId: string) => ['parent', 'weeklyReport', childId] as const,
    monthlyReport: (childId: string) => ['parent', 'monthlyReport', childId] as const,
    learningHistory: (childId: string, page: number) => ['parent', 'learningHistory', childId, page] as const,
    skillMastery: (childId: string) => ['parent', 'skillMastery', childId] as const,
  },
} as const;
