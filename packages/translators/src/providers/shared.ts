import type { LocaleMetadata } from '@store-release-kit/core';
import type { TranslateReleaseInput } from '../types.js';

export const TRANSLATABLE_TEXT_FIELDS = [
  'name',
  'subtitle',
  'promotionalText',
  'description',
  'whatsNew',
] as const;

export type TranslatableTextField = (typeof TRANSLATABLE_TEXT_FIELDS)[number];

export function localeToDeepLLanguage(locale: string): string {
  const normalized = locale.replace('_', '-');
  const upper = normalized.toUpperCase();

  if (upper === 'ZH-HANS') {
    return 'ZH';
  }

  if (upper === 'ZH-HANT') {
    return 'ZH-HANT';
  }

  return upper;
}

export function normalizeTranslatedLocale(
  input: TranslateReleaseInput,
  locale: string,
  metadata: LocaleMetadata,
): LocaleMetadata {
  return {
    ...metadata,
    locale,
    supportUrl: metadata.supportUrl ?? input.source.supportUrl,
    marketingUrl: metadata.marketingUrl ?? input.source.marketingUrl,
    reviewStatus: 'machine',
  };
}

export function assertLockedTerms(
  input: TranslateReleaseInput,
  locales: Record<string, LocaleMetadata>,
): void {
  if (!input.glossary) {
    return;
  }

  for (const [locale, metadata] of Object.entries(locales)) {
    const translatedText = TRANSLATABLE_TEXT_FIELDS.map((field) => metadata[field] ?? '').join('\n');

    for (const term of input.glossary.terms) {
      if (!term.locked) {
        continue;
      }

      const expected = term.translations[locale];
      if (!expected || translatedText.includes(expected)) {
        continue;
      }

      throw new Error(`Locked glossary term "${term.source}" must be translated as "${expected}" for ${locale}.`);
    }
  }
}
