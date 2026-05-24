import 'dotenv/config';
import { NotImplementedError } from '@store-release-kit/core';
import type { TranslateReleaseInput, TranslatedRelease, TranslatorProvider } from '../types.js';

export class DeepLTranslator implements TranslatorProvider {
  name = 'deepl' as const;

  async translateRelease(_input: TranslateReleaseInput): Promise<TranslatedRelease> {
    const apiKey = process.env.DEEPL_API_KEY;

    if (!apiKey) {
      throw new NotImplementedError(
        'DEEPL_API_KEY is not set. DeepL translator is a skeleton and does not call the API yet.',
      );
    }

    throw new NotImplementedError(
      'DeepL translator skeleton is reserved for future implementation with glossary and field rules.',
    );
  }
}
