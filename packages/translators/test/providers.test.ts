import { describe, expect, it } from 'vitest';
import { DeepLTranslator, OpenAITranslator, TranslatorError } from '../src/index.js';

const source = {
  locale: 'zh-Hans',
  name: '番茄计划',
  subtitle: '专注',
  description: '番茄计划帮助你专注。',
  keywords: ['番茄钟', '专注'],
  whatsNew: '新增周报。',
  supportUrl: 'https://example.com/support',
  marketingUrl: 'https://example.com',
};

describe('OpenAITranslator', () => {
  it('requires an API key and wraps failures in TranslatorError', async () => {
    const translator = new OpenAITranslator({ apiKey: '', fetcher: async () => new Response() });

    await expect(
      translator.translateRelease({
        sourceLocale: 'zh-Hans',
        targetLocales: ['en-US'],
        source,
      }),
    ).rejects.toBeInstanceOf(TranslatorError);
  });

  it('retries transient HTTP failures before parsing successful responses', async () => {
    let attempts = 0;
    const fetcher: typeof fetch = async () => {
      attempts += 1;
      if (attempts === 1) {
        return new Response('rate limited', { status: 429 });
      }

      return new Response(
        JSON.stringify({
          output_text: JSON.stringify({
            locales: {
              'en-US': {
                locale: 'en-US',
                name: 'Pomodoro Plan',
              },
            },
          }),
        }),
        { status: 200 },
      );
    };

    const translator = new OpenAITranslator({
      apiKey: 'test-key',
      fetcher,
      maxRetries: 1,
      model: 'test-model',
      retryDelayMs: 0,
    });
    const result = await translator.translateRelease({
      sourceLocale: 'zh-Hans',
      targetLocales: ['en-US'],
      source,
    });

    expect(attempts).toBe(2);
    expect(result.locales['en-US']?.name).toBe('Pomodoro Plan');
  });

  it('uses the Responses API with structured output and parses locales', async () => {
    const requests: unknown[] = [];
    const fetcher: typeof fetch = async (_url, init) => {
      requests.push(JSON.parse(String(init?.body)));
      return new Response(
        JSON.stringify({
          output_text: JSON.stringify({
            locales: {
              'en-US': {
                locale: 'en-US',
                name: 'Pomodoro Plan',
                subtitle: 'Focus',
                description: 'Pomodoro Plan helps you focus.',
                keywords: ['pomodoro', 'focus'],
                whatsNew: 'Added weekly reports.',
              },
            },
          }),
        }),
        { status: 200 },
      );
    };

    const translator = new OpenAITranslator({ apiKey: 'test-key', fetcher, model: 'test-model' });
    const result = await translator.translateRelease({
      sourceLocale: 'zh-Hans',
      targetLocales: ['en-US'],
      source,
    });

    expect(requests[0]).toMatchObject({
      model: 'test-model',
      text: {
        format: {
          type: 'json_schema',
          name: 'store_release_translation',
          strict: true,
        },
      },
    });
    expect(JSON.stringify(requests[0])).toContain('Obey glossary locked terms');
    expect(JSON.stringify(requests[0])).toContain('Preserve URLs exactly');
    expect(
      (
        requests[0] as {
          text: { format: { schema: { properties: { locales: { properties: Record<string, { required: string[] }> } } } } };
        }
      ).text.format.schema.properties.locales.properties['en-US']?.required,
    ).toEqual([
      'locale',
      'name',
      'subtitle',
      'promotionalText',
      'description',
      'keywords',
      'whatsNew',
      'translatorNotes',
    ]);
    expect(result.locales['en-US']).toMatchObject({
      locale: 'en-US',
      name: 'Pomodoro Plan',
      reviewStatus: 'machine',
      supportUrl: 'https://example.com/support',
    });
  });

  it('rejects translations that violate locked glossary terms', async () => {
    const fetcher: typeof fetch = async () =>
      new Response(
        JSON.stringify({
          output_text: JSON.stringify({
            locales: {
              'en-US': {
                locale: 'en-US',
                name: 'Tomato Plan',
                description: 'Tomato Plan helps you focus.',
              },
            },
          }),
        }),
        { status: 200 },
      );

    const translator = new OpenAITranslator({ apiKey: 'test-key', fetcher, model: 'test-model' });

    await expect(
      translator.translateRelease({
        sourceLocale: 'zh-Hans',
        targetLocales: ['en-US'],
        source,
        glossary: {
          terms: [
            {
              source: '番茄计划',
              translations: {
                'en-US': 'Pomodoro Plan',
              },
              locked: true,
            },
          ],
        },
      }),
    ).rejects.toThrow('Locked glossary term');
  });

  it('rejects responses that do not include every requested target locale', async () => {
    const fetcher: typeof fetch = async () =>
      new Response(
        JSON.stringify({
          output_text: JSON.stringify({
            locales: {},
          }),
        }),
        { status: 200 },
      );

    const translator = new OpenAITranslator({ apiKey: 'test-key', fetcher, model: 'test-model' });

    await expect(
      translator.translateRelease({
        sourceLocale: 'zh-Hans',
        targetLocales: ['en-US'],
        source,
      }),
    ).rejects.toThrow('OpenAI response missing locale en-US.');
  });

  it('rejects non-JSON OpenAI output', async () => {
    const fetcher: typeof fetch = async () =>
      new Response(
        JSON.stringify({
          output_text: 'not json',
        }),
        { status: 200 },
      );

    const translator = new OpenAITranslator({ apiKey: 'test-key', fetcher, model: 'test-model' });

    await expect(
      translator.translateRelease({
        sourceLocale: 'zh-Hans',
        targetLocales: ['en-US'],
        source,
      }),
    ).rejects.toBeInstanceOf(TranslatorError);
  });

  it('rejects responses with malformed locale metadata', async () => {
    const fetcher: typeof fetch = async () =>
      new Response(
        JSON.stringify({
          output_text: JSON.stringify({
            locales: {
              'en-US': {
                locale: 'en-US',
                name: 42,
              },
            },
          }),
        }),
        { status: 200 },
      );

    const translator = new OpenAITranslator({ apiKey: 'test-key', fetcher, model: 'test-model' });

    await expect(
      translator.translateRelease({
        sourceLocale: 'zh-Hans',
        targetLocales: ['en-US'],
        source,
      }),
    ).rejects.toThrow('OpenAI response field en-US.name must be a string or null.');
  });
});

describe('DeepLTranslator', () => {
  it('retries transient network failures before parsing successful responses', async () => {
    let attempts = 0;
    const fetcher: typeof fetch = async (_url, init) => {
      attempts += 1;
      if (attempts === 1) {
        throw new Error('network down');
      }

      const body = JSON.parse(String(init?.body)) as { text: string[] };
      return new Response(
        JSON.stringify({
          translations: body.text.map((text) => ({ text: `[en] ${text}` })),
        }),
        { status: 200 },
      );
    };

    const translator = new DeepLTranslator({
      apiKey: 'test-key',
      fetcher,
      maxRetries: 1,
      retryDelayMs: 0,
    });
    const result = await translator.translateRelease({
      sourceLocale: 'zh-Hans',
      targetLocales: ['en-US'],
      source,
    });

    expect(attempts).toBe(2);
    expect(result.locales['en-US']?.name).toBe('[en] 番茄计划');
  });

  it('translates text fields with the DeepL translate endpoint', async () => {
    const requests: Array<{ url: string; body: Record<string, unknown> }> = [];
    const fetcher: typeof fetch = async (url, init) => {
      const body = JSON.parse(String(init?.body)) as { text: string[] };
      requests.push({ url: String(url), body });
      return new Response(
        JSON.stringify({
          translations: body.text.map((text) => ({ text: `[en] ${text}` })),
        }),
        { status: 200 },
      );
    };

    const translator = new DeepLTranslator({ apiKey: 'test-key', fetcher });
    const result = await translator.translateRelease({
      sourceLocale: 'zh-Hans',
      targetLocales: ['en-US'],
      source,
    });

    expect(requests[0]).toMatchObject({
      url: 'https://api.deepl.com/v2/translate',
      body: {
        source_lang: 'ZH',
        target_lang: 'EN-US',
      },
    });
    expect(result.locales['en-US']).toMatchObject({
      locale: 'en-US',
      name: '[en] 番茄计划',
      reviewStatus: 'machine',
      supportUrl: 'https://example.com/support',
    });
  });

  it('rejects responses with fewer translations than requested fields', async () => {
    const fetcher: typeof fetch = async () =>
      new Response(
        JSON.stringify({
          translations: [{ text: 'Pomodoro Plan' }],
        }),
        { status: 200 },
      );

    const translator = new DeepLTranslator({ apiKey: 'test-key', fetcher });

    await expect(
      translator.translateRelease({
        sourceLocale: 'zh-Hans',
        targetLocales: ['en-US'],
        source,
      }),
    ).rejects.toThrow('DeepL response returned 1 translations for en-US, expected 4.');
  });

  it('rejects malformed translation entries', async () => {
    const fetcher: typeof fetch = async (url, init) => {
      const body = JSON.parse(String(init?.body)) as { text: string[] };
      return new Response(
        JSON.stringify({
          translations: body.text.map(() => ({ text: 123 })),
        }),
        { status: 200 },
      );
    };

    const translator = new DeepLTranslator({ apiKey: 'test-key', fetcher });

    await expect(
      translator.translateRelease({
        sourceLocale: 'zh-Hans',
        targetLocales: ['en-US'],
        source,
      }),
    ).rejects.toThrow('DeepL response translation 0 for en-US must include text.');
  });
});
