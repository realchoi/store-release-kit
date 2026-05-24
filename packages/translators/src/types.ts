import type { Glossary, LocaleMetadata } from '@store-release-kit/core';

export type TranslatorProviderName = 'mock' | 'openai' | 'deepl';

export interface TranslateReleaseInput {
  sourceLocale: string;
  targetLocales: string[];
  source: LocaleMetadata;
  glossary?: Glossary;
  styleGuide?: string;
  fieldRules?: Record<string, { maxLength?: number }>;
}

export interface TranslatedRelease {
  locales: Record<string, LocaleMetadata>;
}

export interface TranslatorProvider {
  name: TranslatorProviderName;
  translateRelease(input: TranslateReleaseInput): Promise<TranslatedRelease>;
}
