export class ExecutionPlanningError extends Error {
  readonly code: string;
  readonly details: Record<string, unknown>;

  constructor(code: string, message: string, details: Record<string, unknown> = {}) {
    super(message);
    this.name = 'ExecutionPlanningError';
    this.code = code;
    this.details = details;
  }
}

export class AllocationError extends ExecutionPlanningError {
  constructor(message: string, details: Record<string, unknown> = {}) {
    super('ALLOCATION_ERROR', message, details);
    this.name = 'AllocationError';
  }
}

export class ConflictResolutionError extends ExecutionPlanningError {
  constructor(message: string, details: Record<string, unknown> = {}) {
    super('CONFLICT_RESOLUTION_ERROR', message, details);
    this.name = 'ConflictResolutionError';
  }
}
