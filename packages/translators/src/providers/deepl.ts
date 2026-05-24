import 'dotenv/config';
import type { LocaleMetadata } from '@store-release-kit/core';
import type { TranslateReleaseInput, TranslatedRelease, TranslatorProvider } from '../types.js';
import { readRetryConfig, requestWithRetry, type RetryConfig } from './http.js';
import {
  assertLockedTerms,
  localeToDeepLLanguage,
  normalizeTranslatedLocale,
  TRANSLATABLE_TEXT_FIELDS,
} from './shared.js';

const DEFAULT_DEEPL_URL = 'https://api.deepl.com/v2/translate';

interface DeepLTranslatorOptions {
  apiKey?: string;
  apiUrl?: string;
  fetcher?: typeof fetch;
  maxRetries?: number;
  retryDelayMs?: number;
  timeoutMs?: number;
}

interface DeepLTranslationResponse {
  translations: Array<{
    text: string;
  }>;
}

function validateDeepLResponse(
  body: unknown,
  locale: string,
  expectedCount: number,
): DeepLTranslationResponse {
  if (
    typeof body !== 'object' ||
    body === null ||
    !Array.isArray((body as { translations?: unknown }).translations)
  ) {
    throw new Error('DeepL response translations must be an array.');
  }

  const translations = (body as { translations: unknown[] }).translations;
  if (translations.length !== expectedCount) {
    throw new Error(
      `DeepL response returned ${translations.length} translations for ${locale}, expected ${expectedCount}.`,
    );
  }

  for (const [index, translation] of translations.entries()) {
    const text = (translation as { text?: unknown } | null)?.text;
    if (typeof text !== 'string') {
      throw new Error(`DeepL response translation ${index} for ${locale} must include text.`);
    }
  }

  return body as DeepLTranslationResponse;
}

export class DeepLTranslator implements TranslatorProvider {
  name = 'deepl' as const;

  private readonly apiKey: string | undefined;
  private readonly apiUrl: string;
  private readonly fetcher: typeof fetch;
  private readonly retryConfig: RetryConfig;

  constructor(options: DeepLTranslatorOptions = {}) {
    const retryConfig = readRetryConfig();

    this.apiKey = options.apiKey ?? process.env.DEEPL_API_KEY;
    this.apiUrl = options.apiUrl ?? process.env.DEEPL_API_URL ?? DEFAULT_DEEPL_URL;
    this.fetcher = options.fetcher ?? fetch;
    this.retryConfig = {
      maxRetries: options.maxRetries ?? retryConfig.maxRetries,
      retryDelayMs: options.retryDelayMs ?? retryConfig.retryDelayMs,
      timeoutMs: options.timeoutMs ?? retryConfig.timeoutMs,
    };
  }

  async translateRelease(input: TranslateReleaseInput): Promise<TranslatedRelease> {
    const apiKey = this.apiKey;
    if (!apiKey) {
      throw new Error('DEEPL_API_KEY is not set.');
    }

    const locales: Record<string, LocaleMetadata> = {};

    for (const locale of input.targetLocales) {
      const fields = TRANSLATABLE_TEXT_FIELDS.filter((field) => input.source[field]);
      const response = await requestWithRetry(
        this.apiUrl,
        {
          method: 'POST',
          headers: {
            Authorization: `DeepL-Auth-Key ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            text: fields.map((field) => input.source[field]),
            source_lang: localeToDeepLLanguage(input.sourceLocale),
            target_lang: localeToDeepLLanguage(locale),
          }),
        },
        {
          fetcher: this.fetcher,
          providerName: 'DeepL',
          ...this.retryConfig,
        },
      );

      if (!response.ok) {
        throw new Error(`DeepL translation failed with HTTP ${response.status}: ${await response.text()}`);
      }

      const body = validateDeepLResponse(await response.json(), locale, fields.length);
      const metadata: LocaleMetadata = { locale };

      for (const [index, field] of fields.entries()) {
        metadata[field] = body.translations[index]?.text;
      }

      if (input.source.keywords?.length) {
        metadata.keywords = input.source.keywords;
      }

      locales[locale] = normalizeTranslatedLocale(input, locale, metadata);
    }

    assertLockedTerms(input, locales);

    return { locales };
  }
}
