import type { LocaleMetadata } from '../schema/locale.js';
import type { ValidationIssue } from './rules.js';

export const APP_STORE_TEXT_FIELD_LIMITS = {
  name: 30,
  subtitle: 30,
  promotionalText: 170,
  description: 4000,
  whatsNew: 4000,
} as const;

export const APP_STORE_KEYWORDS_MAX_BYTES = 100;
export const APP_STORE_KEYWORD_MAX_LENGTH = 100;

type TextField = keyof typeof APP_STORE_TEXT_FIELD_LIMITS;

const TEXT_FIELD_ISSUE_CODES: Record<TextField, string> = {
  name: 'NAME_TOO_LONG',
  subtitle: 'SUBTITLE_TOO_LONG',
  promotionalText: 'PROMOTIONAL_TEXT_TOO_LONG',
  description: 'DESCRIPTION_TOO_LONG',
  whatsNew: 'WHATS_NEW_TOO_LONG',
};

function utf8ByteLength(value: string): number {
  return new TextEncoder().encode(value).length;
}

function validateTextField(
  metadata: LocaleMetadata,
  localeName: string,
  field: TextField,
): ValidationIssue | undefined {
  const value = metadata[field];
  const maxLength = APP_STORE_TEXT_FIELD_LIMITS[field];

  if (!value || value.length <= maxLength) {
    return undefined;
  }

  return {
    code: TEXT_FIELD_ISSUE_CODES[field],
    message: `Locale ${localeName} ${field} is ${value.length} characters; max is ${maxLength}.`,
    path: `locales.${localeName}.${field}`,
    locale: localeName,
  };
}

export function validateAppStoreFieldRules(
  localeName: string,
  metadata: LocaleMetadata,
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  for (const field of Object.keys(APP_STORE_TEXT_FIELD_LIMITS) as TextField[]) {
    const issue = validateTextField(metadata, localeName, field);
    if (issue) {
      issues.push(issue);
    }
  }

  if (metadata.keywords?.length) {
    const keywordsText = metadata.keywords.join(',');
    const keywordsBytes = utf8ByteLength(keywordsText);

    if (keywordsBytes > APP_STORE_KEYWORDS_MAX_BYTES) {
      issues.push({
        code: 'KEYWORDS_TOO_LONG',
        message: `Locale ${localeName} keywords are ${keywordsBytes} bytes; max is ${APP_STORE_KEYWORDS_MAX_BYTES}.`,
        path: `locales.${localeName}.keywords`,
        locale: localeName,
      });
    }

    for (const [index, keyword] of metadata.keywords.entries()) {
      if (keyword.length <= APP_STORE_KEYWORD_MAX_LENGTH) {
        continue;
      }

      issues.push({
        code: 'KEYWORD_TOO_LONG',
        message: `Locale ${localeName} keyword ${index + 1} is ${keyword.length} characters; max is ${APP_STORE_KEYWORD_MAX_LENGTH}.`,
        path: `locales.${localeName}.keywords.${index}`,
        locale: localeName,
      });
    }
  }

  return issues;
}
