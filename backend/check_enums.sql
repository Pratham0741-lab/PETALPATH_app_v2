SELECT typname FROM pg_type WHERE typname IN ('MetricCategory', 'KnowledgeStateType', 'LearningDebtType', 'PracticeType', 'RecoveryModeStatus') ORDER BY typname;
