import fs from 'fs-extra';
import { join } from 'node:path';
import type { Command } from 'commander';
import {
  type LocaleMetadata,
  loadReleaseProject,
  writeLocaleMetadata,
} from '@store-release-kit/core';
import {
  createTranslatorProvider,
  type TranslatorProviderName,
} from '@store-release-kit/translators';
import { logger } from '../utils/logger.js';
import { parseTranslationProvider } from '../utils/options.js';

interface TranslateOptions {
  version: string;
  from?: string;
  to?: string;
  provider?: TranslatorProviderName;
  force?: boolean;
}

function parseLocales(value: string | undefined, fallback: string[]): string[] {
  if (!value) {
    return fallback;
  }

  return value
    .split(',')
    .map((locale) => locale.trim())
    .filter(Boolean);
}

function mergeLocale(
  existing: LocaleMetadata | undefined,
  generated: LocaleMetadata,
  force: boolean,
): LocaleMetadata {
  if (!existing || force || existing.reviewStatus !== 'human-reviewed') {
    return { ...existing, ...generated, locale: generated.locale };
  }

  return {
    ...generated,
    ...existing,
    locale: existing.locale,
  };
}

export async function runTranslateCommand(
  projectDir: string,
  options: TranslateOptions,
): Promise<void> {
  const providerName = parseTranslationProvider(options.provider);
  const project = await loadReleaseProject(projectDir, options.version);
  const sourceLocale = options.from ?? project.base.sourceLocale;
  const source = project.locales[sourceLocale];

  if (!source) {
    throw new Error(`Source locale ${sourceLocale} does not exist.`);
  }

  const targetLocales = parseLocales(
    options.to,
    project.config.targetLocales.filter((locale) => locale !== sourceLocale),
  );
  const provider = createTranslatorProvider(providerName);
  const translateInput = {
    sourceLocale,
    targetLocales,
    source,
    ...(project.glossary ? { glossary: project.glossary } : {}),
  };
  const translated = await provider.translateRelease(translateInput);

  for (const locale of targetLocales) {
    const generated = translated.locales[locale];
    if (!generated) {
      continue;
    }

    const targetFile = join(projectDir, 'releases', options.version, 'locales', `${locale}.yml`);
    const existing = project.locales[locale];

    if (
      (await fs.pathExists(targetFile)) &&
      existing?.reviewStatus === 'human-reviewed' &&
      !options.force
    ) {
      logger.warn(`跳过 ${locale}：已有 human-reviewed 内容。使用 --force 可覆盖。`);
      continue;
    }

    await writeLocaleMetadata(
      projectDir,
      options.version,
      mergeLocale(existing, generated, options.force ?? false),
    );
    logger.success(`已生成 ${locale} metadata。`);
  }
}

export function registerTranslateCommand(program: Command): void {
  program
    .command('translate')
    .description('Generate target locale metadata with a translation provider.')
    .requiredOption('--version <version>', 'Release version')
    .option('--from <locale>', 'Source locale')
    .option('--to <locales>', 'Comma-separated target locales')
    .option('--provider <provider>', 'Translation provider: mock, openai, deepl', 'mock')
    .option('--force', 'Overwrite reviewed metadata', false)
    .action(async (options: TranslateOptions) => {
      await runTranslateCommand(process.cwd(), options);
    });
}
