import type { ZodError } from 'zod';

export class StoreReleaseKitError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = 'StoreReleaseKitError';
  }
}

export class NotImplementedError extends StoreReleaseKitError {
  constructor(message: string) {
    super(message, 'NOT_IMPLEMENTED');
    this.name = 'NotImplementedError';
  }
}

export function formatZodError(error: ZodError): string {
  return error.issues
    .map((issue) => {
      const path = issue.path.length > 0 ? issue.path.join('.') : '<root>';
      return `${path}: ${issue.message}`;
    })
    .join('\n');
}
