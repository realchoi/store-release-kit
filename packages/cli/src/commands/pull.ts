import type { Command } from 'commander';
import fs from 'fs-extra';
import { join } from 'node:path';
import { loadProjectConfig, writeLocaleMetadata } from '@store-release-kit/core';
import { createStoreAdapter, type StoreAdapterName } from '@store-release-kit/adapters';
import { logger } from '../utils/logger.js';
import { parseStoreProvider } from '../utils/options.js';

interface PullOptions {
  version: string;
  provider?: StoreAdapterName;
  in?: string;
  force?: boolean;
}

interface PullCommandResult {
  message: string;
  writtenLocales: string[];
  skippedLocales: string[];
}

export async function runPullCommand(
  projectDir: string,
  options: PullOptions,
): Promise<PullCommandResult> {
  const providerName = parseStoreProvider(options.provider);
  const config = await loadProjectConfig(projectDir);
  const adapter = createStoreAdapter(providerName);
  const result = await adapter.pullRelease({
    config,
    version: options.version,
    ...(options.in ? { sourceDir: options.in } : {}),
  });
  const writtenLocales: string[] = [];
  const skippedLocales: string[] = [];

  if (result.release) {
    for (const metadata of Object.values(result.release.locales)) {
      const filePath = join(projectDir, 'releases', options.version, 'locales', `${metadata.locale}.yml`);
      if (!options.force && (await fs.pathExists(filePath))) {
        skippedLocales.push(metadata.locale);
        logger.warn(`跳过 ${metadata.locale}：locale 文件已存在。使用 --force 可覆盖。`);
        continue;
      }

      await writeLocaleMetadata(projectDir, options.version, metadata);
      writtenLocales.push(metadata.locale);
    }
  }

  logger.info(result.message);

  return {
    message: result.message,
    writtenLocales,
    skippedLocales,
  };
}

export function registerPullCommand(program: Command): void {
  program
    .command('pull')
    .description('Pull release metadata from a store provider. First release is mock only.')
    .requiredOption('--version <version>', 'Release version')
    .option('--provider <provider>', 'Store provider: mock, appstoreconnect, fastlane', 'mock')
    .option('--in <path>', 'Input directory for local providers such as fastlane')
    .option('--force', 'Overwrite existing locale files', false)
    .action(async (options: PullOptions) => {
      await runPullCommand(process.cwd(), options);
    });
}
