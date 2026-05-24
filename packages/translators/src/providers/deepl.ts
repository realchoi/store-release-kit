import 'dotenv/config';
import type { LocaleMetadata } from '@store-release-kit/core';
import type { TranslateReleaseInput, TranslatedRelease, TranslatorProvider } from '../types.js';
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
}

interface DeepLTranslationResponse {
  translations: Array<{
    text: string;
  }>;
}

export class DeepLTranslator implements TranslatorProvider {
  name = 'deepl' as const;

  private readonly apiKey: string | undefined;
  private readonly apiUrl: string;
  private readonly fetcher: typeof fetch;

  constructor(options: DeepLTranslatorOptions = {}) {
    this.apiKey = options.apiKey ?? process.env.DEEPL_API_KEY;
    this.apiUrl = options.apiUrl ?? process.env.DEEPL_API_URL ?? DEFAULT_DEEPL_URL;
    this.fetcher = options.fetcher ?? fetch;
  }

  async translateRelease(input: TranslateReleaseInput): Promise<TranslatedRelease> {
    const apiKey = this.apiKey;
    if (!apiKey) {
      throw new Error('DEEPL_API_KEY is not set.');
    }

    const locales: Record<string, LocaleMetadata> = {};

    for (const locale of input.targetLocales) {
      const fields = TRANSLATABLE_TEXT_FIELDS.filter((field) => input.source[field]);
      const response = await this.fetcher(this.apiUrl, {
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
      });

      if (!response.ok) {
        throw new Error(`DeepL translation failed with HTTP ${response.status}: ${await response.text()}`);
      }

      const body = (await response.json()) as DeepLTranslationResponse;
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
