import 'dotenv/config';
import { NotImplementedError } from '@store-release-kit/core';
import type { TranslateReleaseInput, TranslatedRelease, TranslatorProvider } from '../types.js';

export class OpenAITranslator implements TranslatorProvider {
  name = 'openai' as const;

  async translateRelease(_input: TranslateReleaseInput): Promise<TranslatedRelease> {
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      throw new NotImplementedError(
        'OPENAI_API_KEY is not set. OpenAI translator is a skeleton and does not call the API yet.',
      );
    }

    throw new NotImplementedError(
      'OpenAI translator skeleton is reserved for future implementation with glossary and field rules.',
    );
  }
}
