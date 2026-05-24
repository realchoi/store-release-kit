import { describe, expect, it } from 'vitest';
import { runTranslatorLiveSmoke } from '../src/liveSmoke.js';

describe('runTranslatorLiveSmoke', () => {
  it('skips OpenAI smoke when OPENAI_API_KEY is not set', async () => {
    const result = await runTranslatorLiveSmoke({
      env: {},
      provider: 'openai',
    });

    expect(result).toEqual({
      provider: 'openai',
      status: 'skipped',
      reason: 'OPENAI_API_KEY is not set.',
    });
  });

  it('skips DeepL smoke when DEEPL_API_KEY is not set', async () => {
    const result = await runTranslatorLiveSmoke({
      env: {},
      provider: 'deepl',
    });

    expect(result).toEqual({
      provider: 'deepl',
      status: 'skipped',
      reason: 'DEEPL_API_KEY is not set.',
    });
  });

  it('rejects unsupported live smoke providers', async () => {
    await expect(
      runTranslatorLiveSmoke({
        env: {},
        provider: 'mock' as never,
      }),
    ).rejects.toThrow('Unsupported translator live smoke provider "mock". Expected one of: openai, deepl.');
  });
});
