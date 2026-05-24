import type { Command } from 'commander';
import { loadProjectConfig } from '@store-release-kit/core';
import { createStoreAdapter, type StoreAdapterName } from '@store-release-kit/adapters';
import { logger } from '../utils/logger.js';

interface PullOptions {
  version: string;
  provider?: StoreAdapterName;
}

export async function runPullCommand(projectDir: string, options: PullOptions): Promise<void> {
  const config = await loadProjectConfig(projectDir);
  const adapter = createStoreAdapter(options.provider ?? 'mock');
  const result = await adapter.pullRelease({ config, version: options.version });

  logger.info(result.message);
}

export function registerPullCommand(program: Command): void {
  program
    .command('pull')
    .description('Pull release metadata from a store provider. First release is mock only.')
    .requiredOption('--version <version>', 'Release version')
    .option('--provider <provider>', 'Store provider: mock, appstoreconnect, fastlane', 'mock')
    .action(async (options: PullOptions) => {
      await runPullCommand(process.cwd(), options);
    });
}
