import type { StoreAdapterName } from '@store-release-kit/adapters';
import type { TranslatorProviderName } from '@store-release-kit/translators';

export type ExportFormat = 'fastlane' | 'json';

const EXPORT_FORMATS = ['fastlane', 'json'] as const satisfies readonly ExportFormat[];
const STORE_PROVIDERS = [
  'mock',
  'appstoreconnect',
  'fastlane',
] as const satisfies readonly StoreAdapterName[];
const TRANSLATION_PROVIDERS = [
  'mock',
  'openai',
  'deepl',
] as const satisfies readonly TranslatorProviderName[];

function parseChoice<T extends string>(value: string, choices: readonly T[], label: string): T {
  if ((choices as readonly string[]).includes(value)) {
    return value as T;
  }

  throw new Error(`Unsupported ${label} "${value}". Expected one of: ${choices.join(', ')}.`);
}

export function parseExportFormat(value: string | undefined): ExportFormat {
  return parseChoice(value ?? 'fastlane', EXPORT_FORMATS, 'export format');
}

export function parseStoreProvider(value: string | undefined): StoreAdapterName {
  return parseChoice(value ?? 'mock', STORE_PROVIDERS, 'store provider');
}

export function parseTranslationProvider(value: string | undefined): TranslatorProviderName {
  return parseChoice(value ?? 'mock', TRANSLATION_PROVIDERS, 'translation provider');
}
