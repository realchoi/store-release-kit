import { describe, expect, it } from 'vitest';
import { formatValidationReport, type ValidationResult } from '../src/index.js';

describe('formatValidationReport', () => {
  it('formats grouped human-readable validation output', () => {
    const result: ValidationResult = {
      ok: false,
      warnings: [
        {
          code: 'TARGET_LOCALE_MISSING',
          message: 'Target locale ja is missing.',
          path: 'locales.ja',
          locale: 'ja',
        },
      ],
      errors: [
        {
          code: 'NAME_TOO_LONG',
          message: 'Locale en-US name is 31 characters; max is 30.',
          path: 'locales.en-US.name',
          locale: 'en-US',
        },
      ],
    };

    expect(formatValidationReport(result)).toBe(
      [
        'Validation failed: 1 error(s), 1 warning(s).',
        '',
        'Errors:',
        '- [en-US] NAME_TOO_LONG at locales.en-US.name: Locale en-US name is 31 characters; max is 30.',
        '',
        'Warnings:',
        '- [ja] TARGET_LOCALE_MISSING at locales.ja: Target locale ja is missing.',
      ].join('\n'),
    );
  });
});
