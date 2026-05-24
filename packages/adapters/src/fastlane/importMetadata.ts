import fs from 'fs-extra';
import { join } from 'node:path';
import type { LocaleMetadata } from '@store-release-kit/core';

const FILE_FIELD_MAP = {
  'name.txt': 'name',
  'subtitle.txt': 'subtitle',
  'promotional_text.txt': 'promotionalText',
  'description.txt': 'description',
  'keywords.txt': 'keywords',
  'release_notes.txt': 'whatsNew',
  'support_url.txt': 'supportUrl',
  'marketing_url.txt': 'marketingUrl',
} as const;

type FastlaneFile = keyof typeof FILE_FIELD_MAP;
type StringMetadataField = Exclude<(typeof FILE_FIELD_MAP)[FastlaneFile], 'keywords'>;

export interface ImportFastlaneMetadataInput {
  sourceDir: string;
}

export interface ImportFastlaneMetadataResult {
  locales: Record<string, LocaleMetadata>;
}

function parseKeywords(value: string): string[] {
  return value
    .split(',')
    .map((keyword) => keyword.trim())
    .filter(Boolean);
}

async function readOptionalText(filePath: string): Promise<string | undefined> {
  if (!(await fs.pathExists(filePath))) {
    return undefined;
  }

  const text = await fs.readFile(filePath, 'utf8');
  return text.trimEnd();
}

export async function importFastlaneMetadata(
  input: ImportFastlaneMetadataInput,
): Promise<ImportFastlaneMetadataResult> {
  const entries = await fs.readdir(input.sourceDir, { withFileTypes: true });
  const locales: Record<string, LocaleMetadata> = {};

  for (const entry of entries) {
    if (!entry.isDirectory()) {
      continue;
    }

    const locale = entry.name;
    const metadata: LocaleMetadata = {
      locale,
      reviewStatus: 'human-reviewed',
    };

    for (const [fileName, field] of Object.entries(FILE_FIELD_MAP) as [
      FastlaneFile,
      (typeof FILE_FIELD_MAP)[FastlaneFile],
    ][]) {
      const value = await readOptionalText(join(input.sourceDir, locale, fileName));
      if (!value) {
        continue;
      }

      if (field === 'keywords') {
        metadata.keywords = parseKeywords(value);
        continue;
      }

      metadata[field as StringMetadataField] = value;
    }

    locales[locale] = metadata;
  }

  return { locales };
}
