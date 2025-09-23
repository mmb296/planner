// Custom error class for HTTP errors
export class HttpError extends Error {
  public status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
  }
}

// Custom error class for authentication failures (401/403 HTTP errors)
export class AuthenticationError extends HttpError {
  constructor(message: string = 'Authentication failed', status: number = 401) {
    super(message, status);
    this.name = 'AuthenticationError';
  }
}
