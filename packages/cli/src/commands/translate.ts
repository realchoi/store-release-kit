import fs from 'fs-extra';
import { join } from 'node:path';
import { parse } from 'yaml';
import type { Command } from 'commander';
import {
  GlossarySchema,
  type Glossary,
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
  dryRun?: boolean;
  allowNetwork?: boolean;
  fields?: string;
  styleGuide?: string;
  glossary?: string;
}

interface TranslateCommandResult {
  generatedLocales: string[];
  writtenLocales: string[];
  skippedLocales: string[];
}

const TRANSLATABLE_FIELDS = [
  'name',
  'subtitle',
  'promotionalText',
  'description',
  'keywords',
  'whatsNew',
] as const;

type TranslatableField = (typeof TRANSLATABLE_FIELDS)[number];

const REVIEWED_STATUSES = new Set(['human-reviewed', 'approved']);

function parseLocales(value: string | undefined, fallback: string[]): string[] {
  if (!value) {
    return fallback;
  }

  return value
    .split(',')
    .map((locale) => locale.trim())
    .filter(Boolean);
}

function parseFields(value: string | undefined): TranslatableField[] {
  if (!value) {
    return [...TRANSLATABLE_FIELDS];
  }

  const fields = value
    .split(',')
    .map((field) => field.trim())
    .filter(Boolean);

  for (const field of fields) {
    if (!(TRANSLATABLE_FIELDS as readonly string[]).includes(field)) {
      throw new Error(
        `Unsupported translation field "${field}". Expected one of: ${TRANSLATABLE_FIELDS.join(', ')}.`,
      );
    }
  }

  return fields as TranslatableField[];
}

function pickLocaleFields(metadata: LocaleMetadata, fields: TranslatableField[]): LocaleMetadata {
  const picked: LocaleMetadata = { locale: metadata.locale };

  for (const field of fields) {
    if (metadata[field] !== undefined) {
      picked[field] = metadata[field] as never;
    }
  }

  if (metadata.supportUrl) picked.supportUrl = metadata.supportUrl;
  if (metadata.marketingUrl) picked.marketingUrl = metadata.marketingUrl;

  return picked;
}

async function readTextOrFile(projectDir: string, value: string | undefined): Promise<string | undefined> {
  if (!value) {
    return undefined;
  }

  const filePath = join(projectDir, value);
  if (await fs.pathExists(filePath)) {
    return fs.readFile(filePath, 'utf8');
  }

  return value;
}

async function loadGlossaryOverride(
  projectDir: string,
  path: string | undefined,
): Promise<Glossary | undefined> {
  if (!path) {
    return undefined;
  }

  const filePath = join(projectDir, path);
  const result = GlossarySchema.safeParse(parse(await fs.readFile(filePath, 'utf8')));
  if (!result.success) {
    throw new Error(`Invalid glossary file ${filePath}: ${result.error.message}`);
  }

  return result.data;
}

function mergeLocale(
  existing: LocaleMetadata | undefined,
  generated: LocaleMetadata,
  force: boolean,
  fields: TranslatableField[],
): LocaleMetadata {
  if (!existing) {
    return generated;
  }

  const merged: LocaleMetadata = { ...existing, locale: existing.locale };
  let changed = false;

  for (const field of fields) {
    const value = generated[field];
    if (value === undefined || (!force && existing[field] !== undefined)) {
      continue;
    }

    merged[field] = value as never;
    changed = true;
  }

  if (changed || force) {
    merged.reviewStatus = 'machine';
    merged.translatorNotes = generated.translatorNotes ?? existing.translatorNotes;
  }

  if (force) {
    merged.supportUrl = generated.supportUrl ?? existing.supportUrl;
    merged.marketingUrl = generated.marketingUrl ?? existing.marketingUrl;
  }

  return merged;
}

export async function runTranslateCommand(
  projectDir: string,
  options: TranslateOptions,
): Promise<TranslateCommandResult> {
  const providerName = parseTranslationProvider(options.provider);
  if (providerName !== 'mock' && !options.allowNetwork) {
    throw new Error(
      `Translation provider "${providerName}" requires --allow-network to call external APIs.`,
    );
  }

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
  const fields = parseFields(options.fields);
  const provider = createTranslatorProvider(providerName);
  const glossary = (await loadGlossaryOverride(projectDir, options.glossary)) ?? project.glossary;
  const styleGuide = await readTextOrFile(projectDir, options.styleGuide);
  const translateInput = {
    sourceLocale,
    targetLocales,
    source: pickLocaleFields(source, fields),
    ...(glossary ? { glossary } : {}),
    ...(styleGuide ? { styleGuide } : {}),
  };
  const translated = await provider.translateRelease(translateInput);
  const generatedLocales: string[] = [];
  const writtenLocales: string[] = [];
  const skippedLocales: string[] = [];

  for (const locale of targetLocales) {
    const generated = translated.locales[locale];
    if (!generated) {
      continue;
    }

    const targetFile = join(projectDir, 'releases', options.version, 'locales', `${locale}.yml`);
    const existing = project.locales[locale];
    const generatedForFields = pickLocaleFields(generated, fields);

    if (
      (await fs.pathExists(targetFile)) &&
      existing?.reviewStatus &&
      REVIEWED_STATUSES.has(existing.reviewStatus) &&
      !options.force
    ) {
      skippedLocales.push(locale);
      logger.warn(`跳过 ${locale}：已有已审核内容。使用 --force 可覆盖。`);
      continue;
    }

    const merged = mergeLocale(existing, generatedForFields, options.force ?? false, fields);
    generatedLocales.push(locale);

    if (options.dryRun) {
      logger.info(`[dry-run] 将生成 ${locale} metadata。`);
      logger.log(JSON.stringify(merged, null, 2));
      continue;
    }

    await writeLocaleMetadata(projectDir, options.version, merged);
    writtenLocales.push(locale);
    logger.success(`已写入 ${locale} metadata。`);
  }

  return { generatedLocales, writtenLocales, skippedLocales };
}

export function registerTranslateCommand(program: Command): void {
  program
    .command('translate')
    .description('Generate target locale metadata with a translation provider.')
    .requiredOption('--version <version>', 'Release version')
    .option('--from <locale>', 'Source locale')
    .option('--to <locales>', 'Comma-separated target locales')
    .option('--provider <provider>', 'Translation provider: mock, openai, deepl', 'mock')
    .option('--dry-run', 'Preview generated metadata without writing files', false)
    .option('--allow-network', 'Allow network translation providers to call external APIs', false)
    .option('--force', 'Overwrite reviewed metadata', false)
    .option('--fields <fields>', 'Comma-separated fields to translate')
    .option('--style-guide <text-or-path>', 'Style guide text or project-relative file path')
    .option('--glossary <path>', 'Glossary YAML file path')
    .action(async (options: TranslateOptions) => {
      await runTranslateCommand(process.cwd(), options);
    });
}
