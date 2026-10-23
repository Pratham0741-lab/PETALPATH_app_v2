export const StorageKeys = {
  AUTH_TOKEN: 'petalpath_auth_token',
  REFRESH_TOKEN: 'petalpath_refresh_token',
  USER: 'petalpath_user',
  THEME_MODE: 'petalpath_theme_mode',
  ONBOARDING_COMPLETE: 'petalpath_onboarding_complete',
  ACTIVE_CHILD: 'petalpath_active_child',
  CHILDREN_LIST: 'petalpath_children_list',
  SETTINGS: 'petalpath_settings',
  RECENT_SEARCHES: 'petalpath_recent_searches',
  DRAFT_LESSON: 'petalpath_draft_lesson',
  /** Baseline questionnaire state per child (features/baseline). */
  BASELINE: 'petalpath_baseline_v1',
  /** Daily usage counters and limits per child (features/usageLimit). */
  USAGE: 'petalpath_usage_v1',
  /** Parental consent per parent account. */
  PARENT_CONSENT: 'petalpath_parent_consent_v1',
} as const;

export type StorageKey = (typeof StorageKeys)[keyof typeof StorageKeys];
