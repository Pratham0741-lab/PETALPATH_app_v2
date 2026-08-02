/**
 * Shared types for the PetalPath activity schema synchronization and validation pipeline.
 *
 * These types are engine-agnostic. Each activity type (drag_drop, trace, tap, quiz)
 * registers its own validator and synchronizer via the ActivityRegistry.
 */

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

export type ValidationSeverity = 'error' | 'warning' | 'info';

export interface ValidationIssue {
  severity: ValidationSeverity;
  field: string;
  message: string;
  activityId?: string;
  fileName?: string;
}

export interface ValidationResult {
  valid: boolean;
  issues: ValidationIssue[];
}

export function mergeResults(...results: ValidationResult[]): ValidationResult {
  const issues = results.flatMap((r) => r.issues);
  return {
    valid: issues.every((i) => i.severity !== 'error'),
    issues,
  };
}

// ---------------------------------------------------------------------------
// Synchronization
// ---------------------------------------------------------------------------

export interface SyncChange {
  field: string;
  action: 'added' | 'modified' | 'removed';
  before?: unknown;
  after?: unknown;
}

export interface SyncResult {
  modified: boolean;
  changes: SyncChange[];
  activity: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Curriculum reference types
// ---------------------------------------------------------------------------

export interface CurriculumActivity {
  type: string;
  name?: string;
}

export interface CurriculumNode {
  id: string;
  subject?: string;
  activities?: CurriculumActivity[];
}

export interface CurriculumTheme {
  id: string;
  title: string;
  nodes: CurriculumNode[];
}

export interface CurriculumGradeFile {
  grade: { id: string; name: string };
  themes: CurriculumTheme[];
}

// ---------------------------------------------------------------------------
// Reports
// ---------------------------------------------------------------------------

export interface FileReport {
  fileName: string;
  activityId: string;
  modified: boolean;
  changes: SyncChange[];
  validationIssues: ValidationIssue[];
}

export interface MigrationReport {
  activityType: string;
  timestamp: string;
  dryRun: boolean;
  processed: number;
  modified: number;
  unchanged: number;
  errors: ValidationIssue[];
  warnings: ValidationIssue[];
  files: FileReport[];
}

// ---------------------------------------------------------------------------
// Registry contracts
// ---------------------------------------------------------------------------

/**
 * A Validator knows how to validate a specific activity type.
 * It receives the parsed activity JSON and optionally curriculum data.
 */
export interface ActivityValidator {
  validate(
    activity: Record<string, unknown>,
    context: { fileName: string; curriculumNodes: Map<string, CurriculumNode> },
  ): ValidationResult;
}

/**
 * A Synchronizer knows how to bring a specific activity type
 * into compliance with its latest spec version.
 * It ONLY touches fields that are spec-required and missing.
 */
export interface ActivitySynchronizer {
  synchronize(
    activity: Record<string, unknown>,
    context: { fileName: string },
  ): SyncResult;
}

/**
 * Schema definition for an activity type, used by the registry.
 */
export interface ActivitySchemaDefinition {
  activityType: string;
  specVersion: string;
  activitiesDir: string;
  manifestFile: string;
  validator: ActivityValidator;
  synchronizer: ActivitySynchronizer;
}
