export class AdaptiveIntelligenceError extends Error {
  readonly code: string;
  readonly details: Record<string, unknown>;

  constructor(code: string, message: string, details: Record<string, unknown> = {}) {
    super(message);
    this.name = 'AdaptiveIntelligenceError';
    this.code = code;
    this.details = details;
  }
}

export class ContextLoadError extends AdaptiveIntelligenceError {
  constructor(message: string, details: Record<string, unknown> = {}) {
    super('CONTEXT_LOAD_ERROR', message, details);
    this.name = 'ContextLoadError';
  }
}

export class DecisionError extends AdaptiveIntelligenceError {
  constructor(step: string, message: string, details: Record<string, unknown> = {}) {
    super('DECISION_ERROR', `Decision "${step}" failed: ${message}`, { step, ...details });
    this.name = 'DecisionError';
  }
}
