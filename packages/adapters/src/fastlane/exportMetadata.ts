import fs from 'fs-extra';
import { join } from 'node:path';
import type { ExportReleaseInput, ExportReleaseResult } from '../types.js';

const FIELD_FILE_MAP = {
  name: 'name.txt',
  subtitle: 'subtitle.txt',
  promotionalText: 'promotional_text.txt',
  description: 'description.txt',
  keywords: 'keywords.txt',
  whatsNew: 'release_notes.txt',
  supportUrl: 'support_url.txt',
  marketingUrl: 'marketing_url.txt',
} as const;

type FastlaneField = keyof typeof FIELD_FILE_MAP;

function valueToText(value: string | string[] | undefined): string | undefined {
  if (!value || (Array.isArray(value) && value.length === 0)) {
    return undefined;
  }

  return Array.isArray(value) ? value.join(',') : value;
}

export async function exportFastlaneMetadata(
  input: Pick<ExportReleaseInput, 'project' | 'outDir'>,
): Promise<ExportReleaseResult> {
  const files: string[] = [];

  for (const [locale, metadata] of Object.entries(input.project.locales)) {
    const localeDir = join(input.outDir, locale);
    await fs.ensureDir(localeDir);

    for (const [field, fileName] of Object.entries(FIELD_FILE_MAP) as [FastlaneField, string][]) {
      const text = valueToText(metadata[field]);
      if (!text) {
        continue;
      }

      const filePath = join(localeDir, fileName);
      await fs.writeFile(filePath, text, 'utf8');
      files.push(filePath);
    }
  }

  return { outDir: input.outDir, files };
}
