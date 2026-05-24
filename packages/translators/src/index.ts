export * from './types.js';
export * from './providers/mock.js';
export * from './providers/openai.js';
export * from './providers/deepl.js';

import { DeepLTranslator } from './providers/deepl.js';
import { MockTranslator } from './providers/mock.js';
import { OpenAITranslator } from './providers/openai.js';
import type { TranslatorProvider, TranslatorProviderName } from './types.js';

export function createTranslatorProvider(name: TranslatorProviderName): TranslatorProvider {
  switch (name) {
    case 'mock':
      return new MockTranslator();
    case 'openai':
      return new OpenAITranslator();
    case 'deepl':
      return new DeepLTranslator();
  }
}
