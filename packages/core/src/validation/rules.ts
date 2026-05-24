export const DEFAULT_MAX_KEYWORDS_COUNT = 100;
export const APP_STORE_PROMOTIONAL_TEXT_MAX_LENGTH = 170;

export type ValidationSeverity = 'error' | 'warning';

export interface ValidationIssue {
  code: string;
  message: string;
  path?: string;
  locale?: string;
}

export interface ValidationResult {
  ok: boolean;
  errors: ValidationIssue[];
  warnings: ValidationIssue[];
}

export interface ValidateReleaseOptions {
  strict?: boolean;
  forPush?: boolean;
}

export function createValidationResult(
  errors: ValidationIssue[],
  warnings: ValidationIssue[],
): ValidationResult {
  return {
    ok: errors.length === 0,
    errors,
    warnings,
  };
}
