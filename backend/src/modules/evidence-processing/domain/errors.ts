export class EvidenceProcessingError extends Error {
  readonly code: string;
  readonly details: Record<string, unknown>;

  constructor(code: string, message: string, details: Record<string, unknown> = {}) {
    super(message);
    this.name = 'EvidenceProcessingError';
    this.code = code;
    this.details = details;
  }
}

export class ValidationError extends EvidenceProcessingError {
  constructor(message: string, details: Record<string, unknown> = {}) {
    super('VALIDATION_ERROR', message, details);
    this.name = 'ValidationError';
  }
}

export class MissingFieldError extends ValidationError {
  constructor(field: string) {
    super(`Missing required field: ${field}`, { field });
    this.name = 'MissingFieldError';
  }
}

export class ProcessingFailedError extends EvidenceProcessingError {
  constructor(step: string, message: string, details: Record<string, unknown> = {}) {
    super('PROCESSING_FAILED', `Step "${step}" failed: ${message}`, { step, ...details });
    this.name = 'ProcessingFailedError';
  }
}
