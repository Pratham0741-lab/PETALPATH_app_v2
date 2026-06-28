/**
 * API Error Handling
 *
 * Converts raw network/HTTP errors into user-friendly messages.
 * All API errors thrown by the client are instances of ApiError.
 */

export class ApiError extends Error {
  /** HTTP status code (0 for network failures) */
  public readonly statusCode: number;
  /** Child-friendly message safe to display in UI */
  public readonly userMessage: string;
  /** True when the device couldn't reach the server at all */
  public readonly isNetworkError: boolean;

  constructor(
    statusCode: number,
    serverMessage: string,
    userMessage: string,
    isNetworkError = false,
  ) {
    super(serverMessage);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.userMessage = userMessage;
    this.isNetworkError = isNetworkError;
  }
}

/**
 * Convert any caught error into a child-friendly string for display.
 */
export function toUserMessage(error: unknown): string {
  if (error instanceof ApiError) {
    return error.userMessage;
  }
  if (error instanceof Error) {
    // Timeout
    if (error.name === 'AbortError') {
      return 'Server took too long to respond. Please try again.';
    }
    return error.message || 'Something went wrong. Please try again.';
  }
  return 'Something went wrong. Please try again.';
}
