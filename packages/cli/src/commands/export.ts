import fs from 'fs-extra';
import { join } from 'node:path';
import type { Command } from 'commander';
import { loadReleaseProject } from '@store-release-kit/core';
import { createStoreAdapter } from '@store-release-kit/adapters';
import { logger } from '../utils/logger.js';
import { parseExportFormat, type ExportFormat } from '../utils/options.js';

interface ExportOptions {
  version: string;
  format?: ExportFormat;
  out?: string;
}

export async function runExportCommand(projectDir: string, options: ExportOptions): Promise<void> {
  const format = parseExportFormat(options.format);
  const project = await loadReleaseProject(projectDir, options.version);
  const outDir = options.out ?? join(projectDir, 'dist', 'fastlane-metadata');

  if (format === 'json') {
    await fs.ensureDir(outDir);
    const filePath = join(outDir, `release-${options.version}.json`);
    await fs.writeJson(filePath, project, { spaces: 2 });
    logger.success(`JSON 已导出：${filePath}`);
    return;
  }

  const adapter = createStoreAdapter('fastlane');
  const result = await adapter.exportRelease?.({ project, format, outDir });

  logger.success(`Fastlane metadata 已导出到 ${outDir}`);
  logger.info(`生成文件数：${result?.files.length ?? 0}`);
}

export function registerExportCommand(program: Command): void {
  program
    .command('export')
    .description('Export release metadata.')
    .requiredOption('--version <version>', 'Release version')
    .option('--format <format>', 'Export format: fastlane or json', 'fastlane')
    .option('--out <path>', 'Output directory')
    .action(async (options: ExportOptions) => {
      await runExportCommand(process.cwd(), options);
    });
}
