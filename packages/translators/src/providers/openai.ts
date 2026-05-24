import 'dotenv/config';
import type { LocaleMetadata } from '@store-release-kit/core';
import type { TranslateReleaseInput, TranslatedRelease, TranslatorProvider } from '../types.js';
import { readRetryConfig, requestWithRetry, type RetryConfig } from './http.js';
import { assertLockedTerms, normalizeTranslatedLocale } from './shared.js';

const OPENAI_RESPONSES_URL = 'https://api.openai.com/v1/responses';
const DEFAULT_OPENAI_MODEL = 'gpt-5-mini';

interface OpenAITranslatorOptions {
  apiKey?: string;
  model?: string;
  fetcher?: typeof fetch;
  maxRetries?: number;
  retryDelayMs?: number;
  timeoutMs?: number;
}

interface OpenAITranslationPayload {
  locales: Record<string, LocaleMetadata>;
}

const LOCALE_METADATA_SCHEMA_FIELDS = [
  'locale',
  'name',
  'subtitle',
  'promotionalText',
  'description',
  'keywords',
  'whatsNew',
  'translatorNotes',
] as const;

const NULLABLE_STRING_FIELDS = [
  'name',
  'subtitle',
  'promotionalText',
  'description',
  'whatsNew',
] as const;
const NULLABLE_ARRAY_FIELDS = ['keywords', 'translatorNotes'] as const;

function buildJsonSchema(targetLocales: string[]): Record<string, unknown> {
  return {
    type: 'object',
    additionalProperties: false,
    required: ['locales'],
    properties: {
      locales: {
        type: 'object',
        additionalProperties: false,
        required: targetLocales,
        properties: Object.fromEntries(
          targetLocales.map((locale) => [
            locale,
            {
              type: 'object',
              additionalProperties: false,
              required: LOCALE_METADATA_SCHEMA_FIELDS,
              properties: {
                locale: { type: 'string', enum: [locale] },
                name: { type: ['string', 'null'] },
                subtitle: { type: ['string', 'null'] },
                promotionalText: { type: ['string', 'null'] },
                description: { type: ['string', 'null'] },
                keywords: { type: ['array', 'null'], items: { type: 'string' } },
                whatsNew: { type: ['string', 'null'] },
                translatorNotes: { type: ['array', 'null'], items: { type: 'string' } },
              },
            },
          ]),
        ),
      },
    },
  };
}

function buildPrompt(input: TranslateReleaseInput): string {
  return JSON.stringify(
    {
      instruction:
        'Translate App Store release metadata. Preserve meaning, keep app-store copy natural, obey glossary locked terms, and return only fields present in the schema.',
      sourceLocale: input.sourceLocale,
      targetLocales: input.targetLocales,
      source: input.source,
      glossary: input.glossary,
      styleGuide: input.styleGuide,
      fieldRules: input.fieldRules,
    },
    null,
    2,
  );
}

function parseResponseBody(body: unknown): OpenAITranslationPayload {
  if (typeof body !== 'object' || body === null) {
    throw new Error('OpenAI response body is not an object.');
  }

  const maybeOutputText = (body as { output_text?: unknown }).output_text;
  if (typeof maybeOutputText === 'string') {
    return JSON.parse(maybeOutputText) as OpenAITranslationPayload;
  }

  const output = (body as { output?: Array<{ content?: Array<{ text?: string }> }> }).output;
  const text = output
    ?.flatMap((item) => item.content ?? [])
    .map((content) => content.text)
    .find((value): value is string => typeof value === 'string');

  if (!text) {
    throw new Error('OpenAI response did not include output_text.');
  }

  return JSON.parse(text) as OpenAITranslationPayload;
}

function assertObject(value: unknown, message: string): asserts value is Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error(message);
  }
}

function assertNullableString(value: unknown, path: string): void {
  if (value !== undefined && value !== null && typeof value !== 'string') {
    throw new Error(`OpenAI response field ${path} must be a string or null.`);
  }
}

function assertNullableStringArray(value: unknown, path: string): void {
  if (value === undefined || value === null) {
    return;
  }

  if (!Array.isArray(value) || value.some((item) => typeof item !== 'string')) {
    throw new Error(`OpenAI response field ${path} must be an array of strings or null.`);
  }
}

function validateOpenAIMetadata(locale: string, metadata: unknown): LocaleMetadata {
  assertObject(metadata, `OpenAI response locale ${locale} must be an object.`);

  for (const field of NULLABLE_STRING_FIELDS) {
    assertNullableString(metadata[field], `${locale}.${field}`);
  }

  for (const field of NULLABLE_ARRAY_FIELDS) {
    assertNullableStringArray(metadata[field], `${locale}.${field}`);
  }

  if (metadata.locale !== undefined && metadata.locale !== locale) {
    throw new Error(`OpenAI response field ${locale}.locale must be "${locale}".`);
  }

  return { ...metadata, locale } as LocaleMetadata;
}

function validateOpenAIPayload(
  payload: OpenAITranslationPayload,
  targetLocales: string[],
): Record<string, LocaleMetadata> {
  assertObject(payload.locales, 'OpenAI response locales must be an object.');

  return Object.fromEntries(
    targetLocales.map((locale) => {
      if (!(locale in payload.locales)) {
        throw new Error(`OpenAI response missing locale ${locale}.`);
      }

      return [locale, validateOpenAIMetadata(locale, payload.locales[locale])];
    }),
  );
}

function removeNullFields(metadata: LocaleMetadata): LocaleMetadata {
  const cleaned: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(metadata)) {
    if (value !== null) {
      cleaned[key] = value;
    }
  }

  return cleaned as LocaleMetadata;
}

export class OpenAITranslator implements TranslatorProvider {
  name = 'openai' as const;

  private readonly apiKey: string | undefined;
  private readonly model: string;
  private readonly fetcher: typeof fetch;
  private readonly retryConfig: RetryConfig;

  constructor(options: OpenAITranslatorOptions = {}) {
    const retryConfig = readRetryConfig();

    this.apiKey = options.apiKey ?? process.env.OPENAI_API_KEY;
    this.model = options.model ?? process.env.OPENAI_MODEL ?? DEFAULT_OPENAI_MODEL;
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
      throw new Error('OPENAI_API_KEY is not set.');
    }

    const response = await requestWithRetry(
      OPENAI_RESPONSES_URL,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.model,
          input: buildPrompt(input),
          text: {
            format: {
              type: 'json_schema',
              name: 'store_release_translation',
              strict: true,
              schema: buildJsonSchema(input.targetLocales),
            },
          },
        }),
      },
      {
        fetcher: this.fetcher,
        providerName: 'OpenAI',
        ...this.retryConfig,
      },
    );

    if (!response.ok) {
      throw new Error(`OpenAI translation failed with HTTP ${response.status}: ${await response.text()}`);
    }

    const payload = parseResponseBody(await response.json());
    const validatedLocales = validateOpenAIPayload(payload, input.targetLocales);
    const locales = Object.fromEntries(
      Object.entries(validatedLocales).map(([locale, metadata]) => [
        locale,
        normalizeTranslatedLocale(input, locale, removeNullFields(metadata)),
      ]),
    );

    assertLockedTerms(input, locales);

    return { locales };
  }
}
