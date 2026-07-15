export class RecommendationError extends Error {
  readonly code: string;
  readonly details: Record<string, unknown>;

  constructor(code: string, message: string, details: Record<string, unknown> = {}) {
    super(message);
    this.name = 'RecommendationError';
    this.code = code;
    this.details = details;
  }
}

export class ContextLoadError extends RecommendationError {
  constructor(message: string, details: Record<string, unknown> = {}) {
    super('CONTEXT_LOAD_ERROR', message, details);
    this.name = 'ContextLoadError';
  }
}

export class RecommendationGenerationError extends RecommendationError {
  constructor(step: string, message: string, details: Record<string, unknown> = {}) {
    super('GENERATION_ERROR', `Step "${step}" failed: ${message}`, { step, ...details });
    this.name = 'RecommendationGenerationError';
  }
}
