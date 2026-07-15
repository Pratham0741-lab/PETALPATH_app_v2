export class ProcessingError {
  readonly code: string;
  readonly message: string;
  readonly details: Record<string, unknown>;

  constructor(code: string, message: string, details: Record<string, unknown> = {}) {
    this.code = code;
    this.message = message;
    this.details = details;
  }
}
