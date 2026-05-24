import 'dotenv/config';
import type { LocaleMetadata } from '@store-release-kit/core';
import type { TranslateReleaseInput, TranslatedRelease, TranslatorProvider } from '../types.js';
import { assertLockedTerms, normalizeTranslatedLocale } from './shared.js';

const OPENAI_RESPONSES_URL = 'https://api.openai.com/v1/responses';
const DEFAULT_OPENAI_MODEL = 'gpt-5-mini';

interface OpenAITranslatorOptions {
  apiKey?: string;
  model?: string;
  fetcher?: typeof fetch;
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

  constructor(options: OpenAITranslatorOptions = {}) {
    this.apiKey = options.apiKey ?? process.env.OPENAI_API_KEY;
    this.model = options.model ?? process.env.OPENAI_MODEL ?? DEFAULT_OPENAI_MODEL;
    this.fetcher = options.fetcher ?? fetch;
  }

  async translateRelease(input: TranslateReleaseInput): Promise<TranslatedRelease> {
    const apiKey = this.apiKey;
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY is not set.');
    }

    const response = await this.fetcher(OPENAI_RESPONSES_URL, {
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
    });

    if (!response.ok) {
      throw new Error(`OpenAI translation failed with HTTP ${response.status}: ${await response.text()}`);
    }

    const payload = parseResponseBody(await response.json());
    const locales = Object.fromEntries(
      Object.entries(payload.locales).map(([locale, metadata]) => [
        locale,
        normalizeTranslatedLocale(input, locale, removeNullFields(metadata)),
      ]),
    );

    assertLockedTerms(input, locales);

    return { locales };
  }
}
