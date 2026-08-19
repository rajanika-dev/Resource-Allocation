/** Base class for errors that should be sent to the client as-is, with a specific status code. */
export class ApiError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
  ) {
    super(message);
    this.name = new.target.name;
  }
}

export class ValidationError extends ApiError {
  constructor(message: string) {
    super(400, message);
  }
}

export class NotFoundError extends ApiError {
  constructor(message: string) {
    super(404, message);
  }
}

/** Bad Gateway: the mock connectors / demo source files failed to load. */
export class SyncFailedError extends ApiError {
  constructor(message: string) {
    super(502, `Sync failed: ${message}`);
  }
}

/** True for the connection-level errors postgres.js / Node raise when Postgres is unreachable. */
export function isDatabaseUnavailableError(error: unknown): boolean {
  const code = (error as { code?: string } | undefined)?.code;
  return code === "ECONNREFUSED" || code === "ETIMEDOUT" || code === "CONNECTION_ENDED" || code === "ENOTFOUND";
}
